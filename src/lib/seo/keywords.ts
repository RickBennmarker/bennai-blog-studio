import { chatJson } from "../openrouter";
import type { Settings } from "../types";
import type { CrawledPage } from "./crawl";

export interface KeywordData {
  keyword: string;
  /** Maandelijks zoekvolume; null als er geen DataForSEO-data is. */
  volume: number | null;
  /** Keyword difficulty 0-100; null zonder DataForSEO. */
  difficulty: number | null;
  cpc: number | null;
}

export interface DiscoveryResult {
  keywords: KeywordData[];
  /** True als er echte zoekvolumes in zitten. */
  hasVolumeData: boolean;
  /** Uitleg als een databron uitviel. */
  warning: string | null;
}

/* ------------------------------ Seed keywords ------------------------------ */

/** Laat Claude seed-keywords afleiden uit het siteprofiel en de gecrawlde pagina's. */
export async function generateSeeds(
  settings: Settings,
  pages: CrawledPage[]
): Promise<string[]> {
  const inventory = pages
    .map((p) => `- ${p.url} — ${p.title}${p.description ? ` (${p.description})` : ""}`)
    .join("\n");

  const { seeds } = await chatJson<{ seeds: string[] }>(
    settings.text_model,
    [
      {
        role: "system",
        content: `Je bent SEO-strateeg. Je bepaalt de kern-zoektermen ("seeds") waarop een bedrijf gevonden zou moeten worden.

Regels:
- Geef 8 tot 12 seeds in het ${settings.language}.
- Seeds zijn kort (1-3 woorden) en breed: ze dienen als startpunt om honderden verwante zoektermen op te halen.
- Denk aan wat een potentiële klant intypt, niet aan hoe het bedrijf zichzelf noemt.
- Mix: diensten, problemen die het bedrijf oplost, en het vakgebied.
- Geen merknamen van het bedrijf zelf.

Antwoord UITSLUITEND met JSON: {"seeds": ["...", "..."]}`,
      },
      {
        role: "user",
        content: `Bedrijf: ${settings.site_name || "onbekend"}
Niche: ${settings.niche}
Doelgroep: ${settings.audience}

Bestaande pagina's:
${inventory || "(geen pagina's gevonden)"}`,
      },
    ],
    2000
  );
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new Error("Geen seed-keywords ontvangen van het model");
  }
  return seeds.map((s) => s.toLowerCase().trim()).filter(Boolean);
}

/* ---------------------------- Google autocomplete --------------------------- */

// Voorvoegsels waarmee mensen daadwerkelijk zoeken; leveren long-tail vragen op.
const PREFIXES = ["hoe", "wat is", "waarom", "beste", "welke"];
const SUFFIXES = ["kosten", "voorbeelden", "tips", "voor mkb", "uitbesteden"];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function suggest(query: string, hl: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${hl}&gl=${hl}&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return [];
  }
}

/**
 * Breidt seeds uit met echte zoeksuggesties van Google.
 *
 * Google knijpt bij te veel requests stilletjes af: je krijgt HTTP 200 met een
 * lege lijst. Daarom rustig aan, en we rapporteren hoeveel queries iets opleverden.
 */
export async function expandWithAutocomplete(
  seeds: string[],
  language: string
): Promise<{ keywords: string[]; hitRate: number }> {
  const hl = language.toLowerCase().startsWith("ned") ? "nl" : "en";
  const topSeeds = seeds.slice(0, 8);
  const queries = [
    ...topSeeds,
    ...topSeeds.map((s) => `${s} `),
    ...topSeeds.slice(0, 5).flatMap((seed) => [
      ...PREFIXES.map((p) => `${p} ${seed}`),
      ...SUFFIXES.map((s) => `${seed} ${s}`),
    ]),
  ];

  const found = new Set(seeds);
  let answered = 0;
  for (let i = 0; i < queries.length; i += 3) {
    const batch = queries.slice(i, i + 3);
    const results = await Promise.all(batch.map((q) => suggest(q, hl)));
    for (const list of results) {
      if (list.length > 0) answered++;
      for (const item of list) {
        const clean = item.toLowerCase().trim();
        if (clean.length > 2 && clean.length < 80) found.add(clean);
      }
    }
    if (i + 3 < queries.length) await sleep(250);
  }

  return { keywords: [...found], hitRate: queries.length ? answered / queries.length : 0 };
}

/* -------------------------------- DataForSEO ------------------------------- */

export function hasDataForSeo(): boolean {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

async function dataForSeo(
  path: string,
  payload: Record<string, unknown>
): Promise<unknown[]> {
  const auth = Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString("base64");

  const res = await fetch(`https://api.dataforseo.com/v3/${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([payload]),
    signal: AbortSignal.timeout(120_000),
  });
  const body = (await res.json()) as {
    status_code?: number;
    status_message?: string;
    tasks?: { status_code?: number; status_message?: string; result?: unknown[] }[];
  };
  const task = body.tasks?.[0];

  // Let op: bij een fout kan de body nog steeds status_code 20000 ("Ok.") bevatten
  // terwijl de HTTP-status 402 is en de fout in de taak zit. Kijk dus naar alle drie.
  if (res.status === 402) {
    throw new Error(
      "DataForSEO-saldo is op. Vul je tegoed aan op app.dataforseo.com om zoekvolumes te blijven ophalen."
    );
  }
  if (!res.ok) {
    throw new Error(
      `DataForSEO HTTP ${res.status}: ${task?.status_message ?? body.status_message ?? "onbekende fout"}`
    );
  }
  if (body.status_code !== 20000) {
    throw new Error(`DataForSEO ${body.status_code}: ${body.status_message ?? "onbekende fout"}`);
  }
  if (task?.status_code !== 20000) {
    throw new Error(`DataForSEO ${task?.status_code}: ${task?.status_message ?? "taak mislukt"}`);
  }
  return task.result ?? [];
}

function locale(settings: Settings) {
  const dutch = settings.language.toLowerCase().startsWith("ned");
  return {
    location_name: dutch ? "Netherlands" : "United States",
    language_name: dutch ? "Dutch" : "English",
  };
}

interface AdsRow {
  keyword?: string;
  search_volume?: number | null;
  cpc?: number | null;
}

interface IdeaRow {
  keyword?: string;
  keyword_info?: { search_volume?: number | null; cpc?: number | null };
  keyword_properties?: { keyword_difficulty?: number | null };
}

export interface KeywordStat {
  volume: number | null;
  cpc: number | null;
  difficulty: number | null;
}

/**
 * DataForSEO geeft difficulty 0 terug als het die niet kent, óók voor termen met
 * duizenden zoekopdrachten. Als "0" zou dat "moeiteloos te ranken" betekenen en
 * de prioriteit kunstmatig opblazen. Behandel het daarom als onbekend.
 */
const normalizeDifficulty = (kd: number | null | undefined): number | null =>
  kd === null || kd === undefined || kd === 0 ? null : kd;

/**
 * Verwante zoektermen die Google zelf associeert met de seeds, mét zoekvolume
 * én difficulty in één call. Rijker en goedkoper dan de Ads-variant.
 */
async function keywordIdeas(
  seeds: string[],
  settings: Settings
): Promise<Map<string, KeywordStat>> {
  const rows = (await dataForSeo("dataforseo_labs/google/keyword_ideas/live", {
    ...locale(settings),
    keywords: seeds.slice(0, 20),
    limit: 300,
    // Termen waar niemand op zoekt hoeven we niet te betalen of te wegen.
    filters: [["keyword_info.search_volume", ">=", 10]],
    order_by: ["keyword_info.search_volume,desc"],
  })) as { items?: IdeaRow[] }[];

  const stats = new Map<string, KeywordStat>();
  for (const result of rows) {
    for (const item of result.items ?? []) {
      if (!item.keyword) continue;
      stats.set(item.keyword.toLowerCase().trim(), {
        volume: item.keyword_info?.search_volume ?? null,
        cpc: item.keyword_info?.cpc ?? null,
        difficulty: normalizeDifficulty(item.keyword_properties?.keyword_difficulty),
      });
    }
  }
  return stats;
}

/** Zoekvolume voor zoektermen die nog geen cijfer hebben. */
async function searchVolume(keywords: string[], settings: Settings): Promise<AdsRow[]> {
  if (keywords.length === 0) return [];
  return (await dataForSeo("keywords_data/google_ads/search_volume/live", {
    ...locale(settings),
    keywords: keywords.slice(0, 700),
  })) as AdsRow[];
}

/** Keyword difficulty voor de kansrijkste termen. */
async function keywordDifficulty(
  keywords: string[],
  settings: Settings
): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  if (keywords.length === 0) return map;

  const rows = (await dataForSeo("dataforseo_labs/google/bulk_keyword_difficulty/live", {
    ...locale(settings),
    keywords: keywords.slice(0, 200),
  })) as { items?: { keyword?: string; keyword_difficulty?: number | null }[] }[];

  for (const result of rows) {
    for (const item of result.items ?? []) {
      if (item.keyword) {
        map.set(item.keyword.toLowerCase(), normalizeDifficulty(item.keyword_difficulty));
      }
    }
  }
  return map;
}

/* ------------------------------- Discovery --------------------------------- */

const bare = (keywords: string[]): KeywordData[] =>
  keywords.map((keyword) => ({ keyword, volume: null, difficulty: null, cpc: null }));

/**
 * Ontdekt zoekwoorden rond de seeds.
 *
 * Zonder DataForSEO: alleen Google autocomplete — echte zoeksuggesties, geen cijfers.
 * Mét DataForSEO: daarbovenop de keyword-ideeën van Google (volume + difficulty),
 * aangevuld met volume voor de autocomplete-termen. Valt DataForSEO uit, dan gaat
 * de analyse door zonder cijfers in plaats van te crashen.
 */
export async function discoverKeywords(
  seeds: string[],
  settings: Settings
): Promise<DiscoveryResult> {
  const { keywords: autocomplete, hitRate } = await expandWithAutocomplete(
    seeds,
    settings.language
  );
  const warnings: string[] = [];
  if (hitRate < 0.3) {
    warnings.push(
      "Google autocomplete gaf weinig terug (mogelijk tijdelijk afgeknepen); zoekwoorden komen vooral uit DataForSEO."
    );
  }

  if (!hasDataForSeo()) {
    return {
      keywords: bare(autocomplete),
      hasVolumeData: false,
      warning: warnings[0] ?? null,
    };
  }

  let stats: Map<string, KeywordStat>;
  try {
    stats = await keywordIdeas(seeds, settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      keywords: bare(autocomplete),
      hasVolumeData: false,
      warning: `Zoekvolumes niet opgehaald, analyse draait zonder cijfers. ${message}`,
    };
  }

  // De autocomplete-termen zitten meestal niet in de ideeënlijst: haal hun volume apart op.
  const missing = [...new Set([...seeds, ...autocomplete])].filter(
    (k) => !stats.has(k.toLowerCase())
  );
  try {
    for (const row of await searchVolume(missing, settings)) {
      if (!row.keyword) continue;
      stats.set(row.keyword.toLowerCase().trim(), {
        volume: row.search_volume ?? null,
        cpc: row.cpc ?? null,
        difficulty: null,
      });
    }
  } catch (err) {
    warnings.push(
      `Geen volume voor de autocomplete-zoekwoorden: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Difficulty ontbreekt nog voor de autocomplete-termen; alleen opvragen waar
  // daadwerkelijk op gezocht wordt, want het kost geld per zoekwoord.
  const needsDifficulty = [...stats.entries()]
    .filter(([, s]) => s.difficulty === null && (s.volume ?? 0) > 0)
    .sort((a, b) => (b[1].volume ?? 0) - (a[1].volume ?? 0))
    .slice(0, 200)
    .map(([keyword]) => keyword);

  if (needsDifficulty.length > 0) {
    try {
      const difficulty = await keywordDifficulty(needsDifficulty, settings);
      for (const [keyword, kd] of difficulty) {
        const stat = stats.get(keyword);
        if (stat) stat.difficulty = kd;
      }
    } catch (err) {
      warnings.push(
        `Geen keyword difficulty: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const all = [...new Set([...seeds, ...autocomplete, ...stats.keys()])];
  return {
    keywords: all.map((keyword) => {
      const stat = stats.get(keyword.toLowerCase());
      return {
        keyword,
        volume: stat?.volume ?? null,
        cpc: stat?.cpc ?? null,
        difficulty: stat?.difficulty ?? null,
      };
    }),
    hasVolumeData: true,
    warning: warnings.length ? warnings.join(" ") : null,
  };
}
