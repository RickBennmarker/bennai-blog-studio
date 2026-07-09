import sharp from "sharp";
import { generateImage } from "./openrouter";
import type { Settings } from "./types";

const MAX_WIDTH = 1400;
const WEBP_QUALITY = 82;

/**
 * Genereert een featured image en levert een URL die de blog kan tonen.
 *
 * Standaard: PNG comprimeren naar WebP en meesturen als data-URI — dat werkt
 * voor elk CMS (WordPress en Shopify decoderen het en zetten de cover als
 * featured image; de custom API accepteert het in cover_url). Heeft de custom
 * API een eigen upload-endpoint (cms_config.custom_image_upload_url), dan
 * uploaden we daar en wordt de cover een gewone https-URL.
 */
export async function generateAndUploadImage(
  imagePrompt: string,
  slug: string,
  settings: Settings
): Promise<string> {
  const original = await generateImage(settings.image_model, imagePrompt);

  const webp = await sharp(original)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const uploadUrl = settings.cms_config.custom_image_upload_url;
  if (settings.cms_provider === "custom" && uploadUrl) {
    return uploadToBlog(uploadUrl, settings.cms_config.custom_api_key ?? "", webp, slug);
  }
  return `data:image/webp;base64,${webp.toString("base64")}`;
}

/** Upload naar een image-endpoint van de custom API (optioneel). */
async function uploadToBlog(
  uploadUrl: string,
  key: string,
  image: Buffer,
  slug: string
): Promise<string> {
  if (!key) throw new Error("Custom API-sleutel ontbreekt voor de image-upload.");

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: `${slug}-${Date.now()}.webp`,
      content_type: "image/webp",
      data: image.toString("base64"),
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Afbeelding uploaden mislukt (${res.status}): ${text.slice(0, 300)}`);
  }
  const parsed = JSON.parse(text) as { url?: string; public_url?: string };
  const url = parsed.url ?? parsed.public_url;
  if (!url) throw new Error("Upload-endpoint gaf geen URL terug");
  return url;
}
