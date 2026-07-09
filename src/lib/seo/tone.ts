import { chat } from "../openrouter";
import { getSettings } from "../store";
import { getProviderPosts, getPostBodyById } from "../publish";
import { readSitemap, fetchReadableText } from "./crawl";

// Pagina's die niets over de schrijfstijl zeggen — sla ze over.
const SKIP = /\/(login|privacy|privacybeleid|cookie|voorwaarden|terms|kennisbank)/i;

/**
 * Scant de hele site (pagina's + gepubliceerde blogs) en laat Claude er een
 * bruikbare tone-of-voice-beschrijving uit destilleren. Die kun je daarna in
 * Instellingen bewaren, zodat elke nieuwe blog in de stem van de site is.
 */
export async function scanToneOfVoice(): Promise<string> {
  const settings = await getSettings();
  if (!settings.site_url) {
    throw new Error("Vul eerst je site-URL in bij Instellingen.");
  }
  const base = settings.site_url.replace(/\/$/, "");

  // 1. Sitepagina's (op woordaantal zodat we de inhoudelijke pagina's pakken).
  let urls = await readSitemap(`${base}/sitemap.xml`);
  if (urls.length === 0) urls = [base];
  urls = urls.filter((u) => !SKIP.test(u)).slice(0, 8);

  const pageTexts = await Promise.all(
    urls.map(async (url) => ({ url, text: await fetchReadableText(url) }))
  );

  // 2. Bestaande blogartikelen (die dragen de schrijfstem het sterkst).
  const posts = await getProviderPosts();
  const postTexts = await Promise.all(
    posts.slice(0, 4).map(async (p) => ({
      url: `${base}/blog/${p.slug}`,
      text: await getPostBodyById(p.id),
    }))
  );

  const samples = [...postTexts, ...pageTexts]
    .filter((s) => s.text.trim().length > 120)
    .map((s) => `### ${s.url}\n${s.text.slice(0, 2500)}`)
    .join("\n\n");

  if (!samples) {
    throw new Error(
      "Geen leesbare tekst gevonden op de site. Draait de site en is de sitemap bereikbaar?"
    );
  }

  const system = `Je bent een tekstanalist. Je krijgt tekst van een website en leidt daaruit de tone of voice af, zodat een AI voortaan nieuwe blogs in exact dezelfde stem kan schrijven.

Analyseer: aanspreekvorm (je/u/wij), zinslengte en ritme, formaliteit, vakjargon vs. toegankelijkheid, humor, gebruik van voorbeelden, en terugkerende stijlkenmerken.

Schrijf een compacte, concrete instructie (maximaal 120 woorden) die een schrijver direct kan toepassen. Geen inleiding, geen opsomming van wat je hebt geanalyseerd — alleen de bruikbare richtlijn zelf, in het ${settings.language}.`;

  const tone = await chat(
    settings.text_model,
    [
      { role: "system", content: system },
      { role: "user", content: `Websiteteksten:\n\n${samples}` },
    ],
    1200
  );
  return tone.trim();
}
