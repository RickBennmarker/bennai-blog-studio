import { chatJson } from "../openrouter";
import { getSettings } from "../store";
import { crawlSite, readSitemap, fetchReadableText } from "../seo/crawl";
import type { CmsProviderId } from "../types";

export interface RecentPost {
  title: string;
  url: string;
}

export interface CompanyProfile {
  site_name: string;
  niche: string;
  audience: string;
  language: string;
  tone: string;
  author: string;
}

export interface SetupExtract extends CompanyProfile {
  site_url: string;
  detected_cms: CmsProviderId;
  recent_posts: RecentPost[];
  pages_scanned: number;
}

const BLOG_URL = /\/(blog|nieuws|news|artikel|articles|posts?|kennis|inspiratie)\//i;

/** Best-effort CMS-detectie op basis van de HTML/URL van de homepage. */
function detectCms(html: string, finalUrl: string): CmsProviderId {
  const h = html.toLowerCase();
  if (
    finalUrl.includes("myshopify.com") ||
    h.includes("cdn.shopify.com") ||
    h.includes("shopify.theme") ||
    h.includes('content="shopify"')
  ) {
    return "shopify";
  }
  if (
    h.includes("/wp-content/") ||
    h.includes("/wp-json") ||
    h.includes('name="generator" content="wordpress')
  ) {
    return "wordpress";
  }
  return "";
}

/**
 * Analyseert een bedrijfs-URL: crawlt de site, detecteert het CMS, haalt de
 * recente blogs op en laat het model een bedrijfsprofiel + tone-of-voice
 * destilleren. Wordt door de setup-wizard gebruikt om alles voor te vullen.
 */
export async function analyzeCompany(rawUrl: string): Promise<SetupExtract> {
  const settings = await getSettings();
  const url = rawUrl.trim().replace(/\/+$/, "");
  const base = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  // 1. Homepage ophalen voor CMS-detectie.
  let homeHtml = "";
  let finalUrl = base;
  try {
    const res = await fetch(base, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": "BennAI-Setup/1.0" },
    });
    finalUrl = res.url || base;
    homeHtml = await res.text();
  } catch {
    throw new Error(
      `Kon ${base} niet bereiken. Klopt de URL en is de site online?`
    );
  }
  const detected_cms = detectCms(homeHtml, finalUrl);

  // 2. Pagina's crawlen voor inhoud + recente blogs.
  const pages = await crawlSite(base);
  const sitemapUrls = await readSitemap(`${base}/sitemap.xml`);

  const recent_posts: RecentPost[] = [];
  const seen = new Set<string>();
  for (const p of pages) {
    if (BLOG_URL.test(p.url) && p.title && !seen.has(p.url)) {
      seen.add(p.url);
      recent_posts.push({ title: p.title.replace(/\s*[|–-]\s*[^|–-]+$/, "").trim(), url: p.url });
    }
  }
  // Vul aan vanuit de sitemap (die bevat vaak meer blog-URL's dan we crawlen).
  for (const u of sitemapUrls) {
    if (recent_posts.length >= 10) break;
    if (BLOG_URL.test(u) && !seen.has(u)) {
      seen.add(u);
      const slug = u.replace(/\/+$/, "").split("/").pop() ?? "";
      recent_posts.push({ title: slug.replace(/[-_]/g, " "), url: u });
    }
  }

  // 3. Leesbare tekst van de belangrijkste pagina's als context voor het model.
  const topPages = pages
    .filter((p) => !BLOG_URL.test(p.url))
    .sort((a, b) => b.wordCount - a.wordCount)
    .slice(0, 5);
  const samples = (
    await Promise.all(
      topPages.map(async (p) => {
        const text = await fetchReadableText(p.url);
        return `### ${p.title || p.url}\n${text.slice(0, 2000)}`;
      })
    )
  )
    .filter((s) => s.trim().length > 60)
    .join("\n\n");

  const context = samples || homeHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 4000);

  // 4. Profiel + tone laten destilleren.
  const system = `Je bent een merk- en tekstanalist. Je krijgt tekst van de website van een bedrijf. Leid daaruit een profiel af waarmee een AI voortaan blogs voor dit bedrijf kan schrijven.

Antwoord UITSLUITEND met JSON in exact dit formaat:
{
  "site_name": "de merk-/bedrijfsnaam",
  "niche": "1-2 zinnen: waar het bedrijf over gaat / wat het aanbiedt",
  "audience": "de doelgroep in een paar woorden",
  "language": "de hoofdtaal van de site (bijv. Nederlands)",
  "author": "een logische auteursnaam voor blogs (merk of persoon), of leeg",
  "tone": "een concrete schrijfstijl-instructie van max 120 woorden: aanspreekvorm (je/u/wij), zinslengte, formaliteit, jargon vs. toegankelijk, humor, terugkerende stijlkenmerken — direct toepasbaar, geen inleiding"
}`;

  const profile = await chatJson<CompanyProfile>(
    settings.text_model,
    [
      { role: "system", content: system },
      { role: "user", content: `Website: ${base}\n\nTeksten:\n\n${context}` },
    ],
    1500
  );

  return {
    site_url: base,
    site_name: profile.site_name?.trim() || "",
    niche: profile.niche?.trim() || "",
    audience: profile.audience?.trim() || "",
    language: profile.language?.trim() || settings.language,
    tone: profile.tone?.trim() || "",
    author: profile.author?.trim() || "",
    detected_cms,
    recent_posts: recent_posts.slice(0, 10),
    pages_scanned: pages.length,
  };
}
