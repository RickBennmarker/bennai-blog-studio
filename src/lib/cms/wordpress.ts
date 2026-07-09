import type { CmsConfig } from "../types";
import { markdownToHtml } from "../markdown";
import {
  CmsError,
  parseDataUri,
  type CmsPost,
  type CmsProvider,
  type PublishInput,
} from "./types";

/**
 * WordPress via de REST API (wp-json/wp/v2) met Application Password.
 * De gebruiker maakt in WordPress onder Gebruikers → Profiel → Application
 * Passwords een wachtwoord aan; dat gebruiken we met Basic Auth.
 */
export function createWordPressProvider(config: CmsConfig): CmsProvider {
  const base = (config.wp_url ?? "").replace(/\/+$/, "");
  const username = config.wp_username ?? "";
  const appPassword = (config.wp_app_password ?? "").replace(/\s+/g, "");
  if (!base || !username || !appPassword) {
    throw new CmsError(
      "WordPress-koppeling onvolledig: vul site-URL, gebruikersnaam en application password in."
    );
  }
  const auth =
    "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
  const api = `${base}/wp-json/wp/v2`;

  async function wp(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<unknown> {
    const res = await fetch(`${api}${path}`, {
      method,
      headers: {
        Authorization: auth,
        ...(body && !headers ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body:
        body === undefined
          ? undefined
          : headers
            ? (body as BodyInit)
            : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new CmsError(
        `WordPress-fout (${res.status} ${method} ${path}): ${text.slice(0, 300)}`
      );
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  type WpPost = {
    id: number;
    slug: string;
    title?: { rendered?: string };
    content?: { rendered?: string };
  };

  /** Data-URI cover uploaden naar de mediabibliotheek; geeft het media-id terug. */
  async function uploadCover(coverUrl?: string): Promise<number | null> {
    if (!coverUrl) return null;
    const parsed = parseDataUri(coverUrl);
    if (!parsed) return null; // externe https-URL: WordPress kan die niet sideloaden
    const ext = parsed.mime.split("/")[1] || "webp";
    const media = (await wp(
      "POST",
      "/media",
      Buffer.from(parsed.base64, "base64"),
      {
        "Content-Type": parsed.mime,
        "Content-Disposition": `attachment; filename="cover-${Date.now()}.${ext}"`,
      }
    )) as { id?: number };
    return media.id ?? null;
  }

  async function writePost(
    input: PublishInput,
    id?: string
  ): Promise<CmsPost> {
    const featured = await uploadCover(input.coverUrl);
    const payload: Record<string, unknown> = {
      title: input.title,
      content: markdownToHtml(input.bodyMarkdown),
      status: input.publish ? "publish" : "draft",
    };
    if (input.excerpt) payload.excerpt = input.excerpt;
    if (input.slug && !id) payload.slug = input.slug;
    if (featured) payload.featured_media = featured;

    const post = (await wp("POST", id ? `/posts/${id}` : "/posts", payload)) as WpPost;
    return {
      id: String(post.id),
      slug: post.slug,
      title: post.title?.rendered ?? input.title,
    };
  }

  return {
    name: "WordPress",

    async testConnection() {
      const posts = (await wp(
        "GET",
        "/posts?per_page=100&status=publish&_fields=id"
      )) as WpPost[];
      return Array.isArray(posts) ? posts.length : 0;
    },

    async listPosts() {
      const posts = (await wp(
        "GET",
        "/posts?per_page=100&status=publish,draft&_fields=id,slug,title"
      )) as WpPost[];
      return (Array.isArray(posts) ? posts : []).map((p) => ({
        id: String(p.id),
        slug: p.slug,
        title: p.title?.rendered ?? "",
      }));
    },

    async getPostBody(idOrSlug) {
      const path = /^\d+$/.test(idOrSlug)
        ? `/posts/${idOrSlug}?_fields=content`
        : `/posts?slug=${encodeURIComponent(idOrSlug)}&_fields=content`;
      const data = (await wp("GET", path)) as WpPost | WpPost[];
      const post = Array.isArray(data) ? data[0] : data;
      return post?.content?.rendered ?? "";
    },

    createPost: (input) => writePost(input),
    updatePost: (id, input) => writePost(input, id),

    async deletePost(id) {
      await wp("DELETE", `/posts/${id}?force=true`);
    },
  };
}
