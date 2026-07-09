import { chat, chatJson } from "./openrouter";
import type { InternalLink } from "./publish";
import type { Settings } from "./types";

export interface BlogResult {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_description: string;
  tags: string[];
  image_prompt: string;
}

function siteContext(settings: Settings): string {
  const parts = [
    settings.site_name && `Website: ${settings.site_name}`,
    settings.site_url && `URL: ${settings.site_url}`,
    settings.niche && `Niche/onderwerp van de site: ${settings.niche}`,
    settings.audience && `Doelgroep: ${settings.audience}`,
    `Tone of voice: ${settings.tone}`,
    `Taal: ${settings.language}`,
    settings.extra_instructions &&
      `Extra instructies: ${settings.extra_instructions}`,
  ].filter(Boolean);
  return parts.join("\n");
}

/** Optionele SEO-brief vanuit de keyword-analyse. */
export interface ContentBrief {
  keyword: string;
  title_suggestion?: string;
  angle?: string;
  outline?: string[];
  related_keywords?: string[];
}

function briefBlock(brief: ContentBrief): string {
  const lines = [
    `\nSEO-BRIEF — volg deze nauwgezet:`,
    `- Hoofdzoekwoord: "${brief.keyword}". Verwerk dit in de titel, de eerste alinea en minstens één H2.`,
  ];
  if (brief.angle) lines.push(`- Invalshoek: ${brief.angle}`);
  if (brief.title_suggestion)
    lines.push(`- Voorgestelde titel (mag je aanscherpen): ${brief.title_suggestion}`);
  if (brief.outline?.length)
    lines.push(`- Gebruik deze H2-structuur:\n${brief.outline.map((h) => `  • ${h}`).join("\n")}`);
  if (brief.related_keywords?.length)
    lines.push(
      `- Verwerk waar natuurlijk deze verwante zoekwoorden: ${brief.related_keywords.join(", ")}`
    );
  return lines.join("\n");
}

/** Instructieblok voor interne links naar bestaande posts. */
function internalLinksBlock(links: InternalLink[], settings: Settings): string {
  if (links.length === 0) return "";
  const base = settings.site_url.replace(/\/$/, "");
  const list = links
    .slice(0, 20)
    .map((l) => `- "${l.title}" → ${base}/blog/${l.slug}`)
    .join("\n");
  return `\nINTERNE LINKS — belangrijk voor SEO:
- Verwerk 2 tot 4 interne links naar de meest relevante bestaande artikelen hieronder.
- Gebruik natuurlijke, beschrijvende ankertekst in de lopende tekst (geen "klik hier").
- Alleen linken waar het inhoudelijk klopt; forceer geen link die niet past.
- Markdown-formaat: [ankertekst](volledige-url).

Bestaande artikelen om naar te linken:
${list}`;
}

export async function writeBlog(
  topic: string,
  settings: Settings,
  existingTitles: string[] = [],
  brief?: ContentBrief,
  internalLinks: InternalLink[] = []
): Promise<BlogResult> {
  const system = `Je bent een ervaren SEO-blogschrijver. Je schrijft complete, publicatieklare blogartikelen.

${siteContext(settings)}

Regels:
- Schrijf in de opgegeven taal en tone of voice.
- Artikel van 900-1400 woorden in Markdown: pakkende intro, duidelijke H2/H3-tussenkoppen, waar passend een opsomming, en een sterke afsluiting.
- Gebruik GEEN H1 in de content (de titel wordt apart getoond).
- SEO: verwerk het onderwerp natuurlijk in koppen en tekst, geen keyword stuffing.
- De slug is lowercase, woorden gescheiden door streepjes, zonder leestekens.
- image_prompt: een Engelstalige prompt voor een featured image die bij het artikel past. Stijl: ${settings.image_style}
${brief ? briefBlock(brief) : ""}
${internalLinksBlock(internalLinks, settings)}

Antwoord UITSLUITEND met een JSON-object, zonder uitleg eromheen:
{"title": "...", "slug": "...", "excerpt": "2-3 zinnen samenvatting", "content": "volledig artikel in Markdown", "meta_description": "max 155 tekens", "tags": ["...", "..."], "image_prompt": "..."}`;

  const user =
    `Schrijf een blogartikel over: ${topic}` +
    (existingTitles.length
      ? `\n\nDeze artikelen bestaan al op de site (vermijd overlap):\n- ${existingTitles
          .slice(0, 30)
          .join("\n- ")}`
      : "");

  const result = await chatJson<BlogResult>(settings.text_model, [
    { role: "system", content: system },

    { role: "user", content: user },
  ]);

  for (const field of ["title", "slug", "excerpt", "content"] as const) {
    if (!result[field]) throw new Error(`AI-output mist het veld "${field}"`);
  }
  result.slug = result.slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!Array.isArray(result.tags)) result.tags = [];
  return result;
}

export async function suggestTopics(
  settings: Settings,
  existingTitles: string[],
  count = 6
): Promise<string[]> {
  const system = `Je bent contentstrateeg voor deze website:

${siteContext(settings)}

Bedenk concrete, klikwaardige blogonderwerpen die passen bij de site en doelgroep. Vermijd overlap met bestaande artikelen. Antwoord UITSLUITEND met JSON: {"topics": ["...", "..."]}`;

  const user =
    `Geef ${count} nieuwe blogonderwerpen in het ${settings.language}.` +
    (existingTitles.length
      ? `\n\nBestaande artikelen:\n- ${existingTitles.slice(0, 40).join("\n- ")}`
      : "");

  const { topics } = await chatJson<{ topics: string[] }>(
    settings.text_model,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    2000
  );
  if (!Array.isArray(topics) || topics.length === 0) {
    throw new Error("Geen onderwerpen ontvangen van het model");
  }
  return topics.map(String);
}

/** Laat het model één onderwerp kiezen voor een autopilot-run. */
export async function pickAutopilotTopic(
  settings: Settings,
  existingTitles: string[]
): Promise<string> {
  const topics = await suggestTopics(settings, existingTitles, 3);
  return topics[0];
}

export { chat };
