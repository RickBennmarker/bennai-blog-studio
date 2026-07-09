import { updateDraft, log, getSettings } from "./store";
import { getProvider, type CmsPost, type PublishInput } from "./cms";
import type { Draft, Settings } from "./types";

/**
 * Publicatielaag. Praat met het gekozen CMS via de provider-abstractie
 * (WordPress / Shopify / Custom API); de keuze en credentials staan in de
 * instellingen, zodat elk community-lid z'n eigen site koppelt.
 */

function draftToInput(draft: Draft, settings: Settings, publish: boolean): PublishInput {
  return {
    title: draft.title ?? "",
    bodyMarkdown: draft.content ?? "",
    excerpt: draft.excerpt ?? undefined,
    slug: draft.slug ?? undefined,
    coverUrl: draft.image_url ?? undefined,
    author: settings.author || undefined,
    tags: draft.tags ?? [],
    publish,
  };
}

export interface InternalLink {
  title: string;
  slug: string;
}

/** Alle posts die al op de site staan (id + slug + titel). Faalt zacht. */
export async function getProviderPosts(): Promise<CmsPost[]> {
  try {
    const settings = await getSettings();
    return await getProvider(settings).listPosts();
  } catch {
    // Geen (werkende) CMS-koppeling mag het schrijven niet blokkeren.
    return [];
  }
}

/** Bestaande titels op de site, voor deduplicatie van onderwerpen. */
export async function getExistingTitles(): Promise<string[]> {
  return (await getProviderPosts()).map((p) => p.title).filter(Boolean);
}

/** Gepubliceerde posts als linkdoelen (titel + slug) voor interne links. */
export async function getInternalLinks(): Promise<InternalLink[]> {
  return (await getProviderPosts())
    .filter((p) => p.slug && p.title)
    .map((p) => ({ title: p.title, slug: p.slug }));
}

/** Volledige body van één post via de provider (id-adressering). */
export async function getPostBodyById(id: string): Promise<string> {
  try {
    const settings = await getSettings();
    return await getProvider(settings).getPostBody(id);
  } catch {
    return "";
  }
}

/**
 * Publiceert een draft direct naar het gekoppelde CMS.
 * Geeft de post-id (WordPress/Shopify) of slug (custom) van de post terug.
 */
export async function publishDraft(draft: Draft, settings: Settings): Promise<string> {
  if (!draft.title || !draft.content) {
    throw new Error("Draft mist titel of inhoud");
  }
  const post = await getProvider(settings).createPost(draftToInput(draft, settings, true));

  await updateDraft(draft.id, {
    status: "published",
    published_post_id: post.id,
    slug: post.slug || draft.slug,
    published_at: new Date().toISOString(),
    scheduled_for: null,
  });
  await log("publish", `Gepubliceerd: "${draft.title}"`, draft.id);
  return post.id;
}

/**
 * Plant een draft in: pusht hem NU als concept (publish:false) naar het CMS —
 * zo staat hij daar alvast klaar — en bewaart de id + geplande tijd. De cron
 * zet hem op het geplande moment live. Geeft de post-id terug.
 */
export async function scheduleDraft(
  draft: Draft,
  settings: Settings,
  scheduledFor: string
): Promise<string> {
  if (!draft.title || !draft.content) {
    throw new Error("Draft mist titel of inhoud");
  }
  const provider = getProvider(settings);
  const input = draftToInput(draft, settings, false);

  let id = draft.published_post_id ?? "";
  if (id) {
    // Al eerder gepusht: werk het concept bij. Is het intussen weg, maak nieuw.
    try {
      const post = await provider.updatePost(id, input);
      id = post.id;
    } catch {
      const post = await provider.createPost(input);
      id = post.id;
    }
  } else {
    const post = await provider.createPost(input);
    id = post.id;
  }

  await updateDraft(draft.id, {
    status: "scheduled",
    scheduled_for: scheduledFor,
    published_post_id: id,
  });
  await log(
    "publish",
    `Ingepland voor ${new Date(scheduledFor).toLocaleString("nl-NL")}: "${draft.title}"`,
    draft.id
  );
  return id;
}

/** Haalt een ingeplande post uit de planning; verwijdert ook het CMS-concept. */
export async function unscheduleDraft(draft: Draft): Promise<void> {
  if (draft.published_post_id) {
    try {
      const settings = await getSettings();
      await getProvider(settings).deletePost(draft.published_post_id);
    } catch {
      // Concept al weg in het CMS — geen probleem.
    }
  }
  await updateDraft(draft.id, {
    status: "draft",
    scheduled_for: null,
    published_post_id: null,
  });
}

/**
 * Zet een ingeplande post live: stuurt de laatste inhoud + publish:true naar
 * het bestaande CMS-concept (zo winnen bewerkingen na het inplannen).
 */
export async function publishScheduled(draft: Draft, settings: Settings): Promise<void> {
  const id = draft.published_post_id;
  if (!id) {
    // Geen concept bekend: val terug op een gewone publicatie.
    await publishDraft(draft, settings);
    return;
  }
  try {
    await getProvider(settings).updatePost(id, draftToInput(draft, settings, true));
  } catch {
    // Concept is weg in het CMS → publiceer alsnog als nieuwe post.
    await publishDraft(draft, settings);
    return;
  }
  await updateDraft(draft.id, {
    status: "published",
    published_at: new Date().toISOString(),
    scheduled_for: null,
  });
  await log("publish", `Gepubliceerd (gepland): "${draft.title}"`, draft.id);
}

/** Verbindingstest met het gekoppelde CMS: geeft het aantal posts terug. */
export async function testBlogConnection(): Promise<number> {
  const settings = await getSettings();
  return getProvider(settings).testConnection();
}
