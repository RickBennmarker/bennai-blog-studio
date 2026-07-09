import { randomUUID } from "node:crypto";
import { chatJson } from "../openrouter";
import { getSettings, saveAnalysis, log } from "../store";
import { getProviderPosts } from "../publish";
import { crawlSite } from "./crawl";
import { generateSeeds, discoverKeywords, type KeywordData } from "./keywords";
import { calculateScore } from "./score";
import { buildVocabulary, isRelevant } from "./relevance";
import type { Analysis, GapLevel, Opportunity, SearchIntent } from "../types";

/** Wat het model per kans moet aanleveren; de score rekenen wij zelf uit. */
interface AiOpportunity {
  keyword: string;
  cluster: string;
  intent: SearchIntent;
  gap: GapLevel;
  existing_url: string | null;
  reason: string;
  title_suggestion: string;
  angle: string;
  outline: string[];
  related_keywords: string[];
}

const VALID_INTENTS: SearchIntent[] = [
  "informatief",
  "commercieel",
  "transactioneel",
  "navigatie",
];
const VALID_GAPS: GapLevel[] = ["ontbreekt", "dun", "bestaat"];

const words = (keyword: string) => keyword.trim().split(/\s+/).length;

/**
 * Selecteert de keywords die naar de AI gaan.
 *
 * Puur op volume sorteren levert alleen generieke koppen op ("ai", "character ai")
 * waar niemand op kan ranken, en gooit juist de long-tail weg waar de kansen zitten.
 * Daarom een mix: koppen, long-tail mét volume, en de rest (o.a. autocomplete).
 */
function shortlist(keywords: KeywordData[], limit = 200): KeywordData[] {
  // volume === 0 is gemeten: hier zoekt niemand op. null is "onbekend" en mag blijven.
  const alive = keywords.filter((k) => k.volume !== 0);
  const byVolume = [...alive].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1));
  const selected = new Map<string, KeywordData>();
  const take = (list: KeywordData[], count: number) => {
    for (const item of list) {
      if (selected.size >= limit || count <= 0) break;
      if (selected.has(item.keyword)) continue;
      selected.set(item.keyword, item);
      count--;
    }
  };

  take(byVolume.filter((k) => (k.volume ?? 0) > 0), 90);
  take(byVolume.filter((k) => (k.volume ?? 0) > 0 && words(k.keyword) >= 3), 60);
  take(
    [...keywords].sort((a, b) => words(b.keyword) - words(a.keyword)),
    limit
  );
  return [...selected.values()];
}

function formatKeywords(keywords: KeywordData[]): string {
  return keywords
    .map((k) => {
      const parts = [k.keyword];
      if (k.volume !== null) parts.push(`volume=${k.volume}`);
      if (k.difficulty !== null) parts.push(`difficulty=${k.difficulty}`);
      return parts.join(" | ");
    })
    .join("\n");
}

/**
 * Volledige keyword-analyse: site crawlen → keywords ontdekken → verrijken →
 * clusteren en gaps bepalen → prioriteren.
 */
export async function runAnalysis(): Promise<Analysis> {
  const settings = await getSettings();
  if (!settings.site_url) {
    throw new Error("Vul eerst je site-URL in bij Instellingen.");
  }

  const pages = await crawlSite(settings.site_url);
  const posts = await getProviderPosts();
  const postTitles = posts.map((p) => p.title).filter(Boolean);

  const seeds = await generateSeeds(settings, pages);

  // Valt DataForSEO uit (niet geverifieerd, geen credit, storing)? Dan gaat de
  // analyse door zonder cijfers in plaats van helemaal te mislukken.
  const discovery = await discoverKeywords(seeds, settings);
  const { keywords: enriched, hasVolumeData: useDataForSeo, warning } = discovery;
  if (warning) await log("error", `Keyword-analyse: ${warning}`);

  const candidates = shortlist(enriched);
  const byKeyword = new Map(enriched.map((k) => [k.keyword.toLowerCase(), k]));

  const inventory = pages
    .map((p) => `- ${p.url} — ${p.title}${p.description ? ` :: ${p.description}` : ""}`)
    .join("\n");

  const system = `Je bent SEO-strateeg en contentplanner. Je krijgt de bestaande pagina's van een website en een lijst zoekwoorden${useDataForSeo ? " met echte maandelijkse zoekvolumes en keyword difficulty (0-100)" : " (zonder volumedata)"}.

Jouw taak:
1. Groepeer de zoekwoorden in 4 tot 7 thematische clusters.
2. Kies 12 tot 18 concrete blogkansen. Per kans één hoofdzoekwoord uit de lijst.
3. Bepaal per kans:
   - intent: informatief | commercieel | transactioneel | navigatie
   - gap: "ontbreekt" (site behandelt dit niet), "dun" (raakt het zijdelings), "bestaat" (er is al een pagina voor)
   - existing_url: de bestaande pagina die dit dekt, of null
   - reason: één zin waarom dit een kans is voor dit bedrijf
   - title_suggestion: een klikwaardige blogtitel in het ${settings.language}
   - angle: de invalshoek in één zin
   - outline: 4 tot 6 H2-koppen
   - related_keywords: 3 tot 6 verwante zoekwoorden uit de lijst

Regels:
- Kies zoekwoorden die dit bedrijf geloofwaardig kan behandelen; negeer irrelevante suggesties (concurrentnamen, vacatures, losse tools, plaatsnamen die niets met het bedrijf te maken hebben).
- Negeer generieke koptermen waar dit bedrijf nooit op kan ranken: losse of vage termen ("ai", "mijn bedrijf", "chatgpt nederlands") en populaire consumententoepassingen (AI-fotobewerking, AI-detectors). Daar staan Wikipedia en grote media.
- Zoekwoorden met extreem veel volume (meer dan 10.000 per maand) zijn zelden een kans. De winst zit in specifieke zoekwoorden van 2 tot 5 woorden, met commerciële relevantie: wie hierop zoekt, zou klant kunnen worden.
- Prioriteer kansen waar de site nog niets over heeft.
- Geen scores of prioriteitsgetallen: die berekenen wij zelf.

Antwoord UITSLUITEND met JSON:
{"clusters":[{"name":"...","summary":"..."}],"opportunities":[{"keyword":"...","cluster":"...","intent":"...","gap":"...","existing_url":null,"reason":"...","title_suggestion":"...","angle":"...","outline":["..."],"related_keywords":["..."]}]}`;

  const user = `Bedrijf: ${settings.site_name || settings.site_url}
Niche: ${settings.niche}
Doelgroep: ${settings.audience}

BESTAANDE PAGINA'S:
${inventory || "(geen)"}

BESTAANDE BLOGARTIKELEN:
${postTitles.length ? postTitles.map((t) => `- ${t}`).join("\n") : "(nog geen)"}

ZOEKWOORDEN:
${formatKeywords(candidates)}`;

  const result = await chatJson<{
    clusters: { name: string; summary: string }[];
    opportunities: AiOpportunity[];
  }>(settings.text_model, [
    { role: "system", content: system },
    { role: "user", content: user },
  ], 16000);

  if (!Array.isArray(result.opportunities) || result.opportunities.length === 0) {
    throw new Error("De analyse leverde geen kansen op. Probeer het opnieuw.");
  }

  // De AI laat zich verleiden door hoog volume ("ai foto maken" bij een
  // AI-trainingsbureau). Zeef die eruit op basis van de woordenschat van het bedrijf.
  const vocabulary = buildVocabulary(
    [
      settings.niche,
      settings.audience,
      settings.extra_instructions,
      ...seeds,
      ...result.clusters.map((c) => `${c.name} ${c.summary}`),
      ...pages.flatMap((p) => [p.title, p.description, ...p.headings]),
    ],
    candidates.map((k) => k.keyword)
  );
  const irrelevant = result.opportunities.filter((o) => !isRelevant(o.keyword, vocabulary));
  const relevant = result.opportunities.filter((o) => isRelevant(o.keyword, vocabulary));
  if (relevant.length === 0) {
    throw new Error("Geen relevante kansen gevonden. Scherp je niche in Instellingen aan.");
  }

  const opportunities: Opportunity[] = relevant.map((item) => {
    const data = byKeyword.get(item.keyword.toLowerCase());
    const intent = VALID_INTENTS.includes(item.intent) ? item.intent : "informatief";
    const gap = VALID_GAPS.includes(item.gap) ? item.gap : "ontbreekt";
    const volume = data?.volume ?? null;
    const difficulty = data?.difficulty ?? null;

    return {
      id: randomUUID(),
      keyword: item.keyword,
      cluster: item.cluster,
      intent,
      gap,
      volume,
      difficulty,
      cpc: data?.cpc ?? null,
      existing_url: item.existing_url || null,
      score: calculateScore({
        volume,
        difficulty,
        intent,
        gap,
        hasVolumeData: useDataForSeo,
      }),
      reason: item.reason,
      title_suggestion: item.title_suggestion,
      angle: item.angle,
      outline: Array.isArray(item.outline) ? item.outline : [],
      related_keywords: Array.isArray(item.related_keywords) ? item.related_keywords : [],
      draft_id: null,
    };
  });

  opportunities.sort((a, b) => b.score - a.score);

  const notes = [warning];
  if (irrelevant.length > 0) {
    notes.push(
      `${irrelevant.length} zoekwoord${irrelevant.length === 1 ? "" : "en"} weggelaten omdat ze niet bij je dienstverlening passen (${irrelevant
        .slice(0, 3)
        .map((o) => `"${o.keyword}"`)
        .join(", ")}).`
    );
  }

  const analysis: Analysis = {
    generated_at: new Date().toISOString(),
    site_url: settings.site_url,
    mode: useDataForSeo ? "dataforseo" : "gratis",
    warning: notes.filter(Boolean).join(" ") || null,
    pages_crawled: pages.length,
    keywords_found: enriched.length,
    clusters: result.clusters ?? [],
    opportunities,
  };

  await saveAnalysis(analysis);
  await log(
    "analyse",
    `Keyword-analyse: ${opportunities.length} kansen uit ${enriched.length} zoekwoorden (${analysis.mode})`
  );
  return analysis;
}
