import { createDraft, updateDraft, log } from "./store";
import { writeBlog, type ContentBrief } from "./writer";
import { generateAndUploadImage } from "./images";
import { getExistingTitles, getInternalLinks } from "./publish";
import type { Draft, Settings } from "./types";

/**
 * Volledige pipeline: blog schrijven → afbeelding genereren → draft opslaan.
 * Als de afbeelding mislukt, blijft de tekst-draft gewoon bestaan.
 * Met een brief (uit de keyword-analyse) schrijft het model SEO-gericht.
 */
export async function generateDraft(
  topic: string,
  settings: Settings,
  source: "manual" | "autopilot",
  brief?: ContentBrief
): Promise<Draft> {
  const [existingTitles, internalLinks] = await Promise.all([
    getExistingTitles(),
    getInternalLinks(),
  ]);
  const { id: draftId } = await createDraft(topic, source);

  try {
    const blog = await writeBlog(topic, settings, existingTitles, brief, internalLinks);

    let imageUrl: string | null = null;
    let imageError: string | null = null;
    try {
      imageUrl = await generateAndUploadImage(blog.image_prompt, blog.slug, settings);
    } catch (err) {
      imageError = err instanceof Error ? err.message : String(err);
      await log(
        "error",
        `Afbeelding genereren mislukt voor "${blog.title}": ${imageError}`,
        draftId
      );
    }

    return await updateDraft(draftId, {
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      meta_description: blog.meta_description,
      tags: blog.tags,
      image_prompt: blog.image_prompt,
      image_url: imageUrl,
      status: "draft",
      error: imageError ? `Afbeelding mislukt: ${imageError}` : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateDraft(draftId, { status: "failed", error: message });
    await log("error", `Genereren mislukt voor onderwerp "${topic}": ${message}`, draftId);
    throw err;
  }
}
