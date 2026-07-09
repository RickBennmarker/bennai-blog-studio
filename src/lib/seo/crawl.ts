/** Lichte crawler: leest de sitemap en haalt per pagina titel, description en koppen op. */

export interface CrawledPage {
  url: string;
  title: string;
  description: string;
  headings: string[];
  wordCount: number;
}

const MAX_PAGES = 25;
const TIMEOUT_MS = 15_000;

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "AI-Blog-Maker/1.0 (keyword research)" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extract(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match ? decodeEntities(match[1]).trim() : "";
}

/** Leesbare bodytekst van een pagina (paragrafen), voor tone-of-voice-analyse. */
export async function fetchReadableText(url: string): Promise<string> {
  const html = await fetchText(url);
  if (!html) return "";
  const body = html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");
  // Alleen tekst uit koppen en paragrafen — dat is de stem van de site.
  const chunks = [...body.matchAll(/<(h[1-3]|p|li)[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((m) => decodeEntities(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 25);
  return [...new Set(chunks)].join("\n");
}

/** Alle <loc>-URL's uit een sitemap, inclusief geneste sitemap-indexen. */
export async function readSitemap(sitemapUrl: string, depth = 0): Promise<string[]> {
  const xml = await fetchText(sitemapUrl);
  if (!xml) return [];

  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
  const isIndex = /<sitemapindex/i.test(xml);
  if (!isIndex || depth > 1) return locs;

  const nested = await Promise.all(locs.map((loc) => readSitemap(loc, depth + 1)));
  return nested.flat();
}

/** Crawlt de site en geeft een inventaris van bestaande pagina's terug. */
export async function crawlSite(siteUrl: string): Promise<CrawledPage[]> {
  const base = siteUrl.replace(/\/$/, "");
  let urls = await readSitemap(`${base}/sitemap.xml`);
  if (urls.length === 0) urls = [base];

  const selected = urls.slice(0, MAX_PAGES);
  const pages = await Promise.all(
    selected.map(async (url): Promise<CrawledPage | null> => {
      const html = await fetchText(url);
      if (!html) return null;

      const headings = [...html.matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)]
        .map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim())
        .filter((h) => h.length > 2 && h.length < 120)
        .slice(0, 12);

      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ");

      return {
        url,
        title: extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
        description: extract(
          html,
          /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
        ),
        headings,
        wordCount: text.split(/\s+/).filter(Boolean).length,
      };
    })
  );

  return pages.filter((p): p is CrawledPage => p !== null);
}
