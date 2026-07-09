import type { CmsConfig } from "../types";
import {
  CmsError,
  type CmsPost,
  type CmsProvider,
  type PublishInput,
} from "./types";

/**
 * Custom blog-API: een eigen endpoint (bijv. een Lovable/Supabase edge
 * function) met `x-api-key`-auth dat Markdown accepteert en zelf rendert.
 *   POST   /            → nieuwe post ({title, body, excerpt, cover_url, ...})
 *   GET    /            → lijst
 *   GET    /<slug>      → één post (met body)
 *   PATCH  /<slug>      → bijwerken
 *   DELETE /<slug>      → verwijderen
 * Posts zijn hier op slug geadresseerd, dus id === slug.
 */
export function createCustomProvider(config: CmsConfig): CmsProvider {
  const url = (config.custom_publish_url ?? "").replace(/\/+$/, "");
  const key = config.custom_api_key ?? "";
  if (!url || !key) {
    throw new CmsError(
      "Custom API-koppeling onvolledig: vul de publish-URL en API-sleutel in."
    );
  }

  async function call(method: string, path = "", body?: unknown): Promise<unknown> {
    const res = await fetch(`${url}${path}`, {
      method,
      headers: { "x-api-key": key, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new CmsError(
        `Blog-API fout (${res.status} ${method} ${path || "/"}): ${text.slice(0, 300)}`
      );
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  type Post = { slug?: string; title?: string; body?: string; [k: string]: unknown };

  function extractList(data: unknown): Post[] {
    if (Array.isArray(data)) return data as Post[];
    if (data && typeof data === "object") {
      for (const value of Object.values(data)) {
        if (Array.isArray(value)) return value as Post[];
      }
    }
    return [];
  }

  function slugify(text: string): string {
    return (
      text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 80) || "post"
    );
  }

  function payload(input: PublishInput) {
    return {
      title: input.title,
      body: input.bodyMarkdown,
      excerpt: input.excerpt ?? undefined,
      cover_url: input.coverUrl ?? undefined,
      author: input.author || undefined,
      tags: input.tags ?? [],
      publish: input.publish,
    };
  }

  const isDuplicate = (err: unknown) =>
    err instanceof Error && /duplicate key|slug_key|already exists/i.test(err.message);

  return {
    name: "Custom API",

    async testConnection() {
      return extractList(await call("GET")).length;
    },

    async listPosts() {
      return extractList(await call("GET"))
        .filter((p) => p.slug && p.title)
        .map((p) => ({ id: String(p.slug), slug: String(p.slug), title: String(p.title) }));
    },

    async getPostBody(slug) {
      const data = (await call("GET", `/${slug}`)) as { post?: Post } & Post;
      const post = data.post ?? data;
      return String(post?.body ?? "");
    },

    async createPost(input) {
      const base = input.slug || slugify(input.title);
      const candidates = [base, `${base}-${Math.random().toString(36).slice(2, 7)}`];
      let lastError: unknown;
      for (const slug of candidates) {
        try {
          const data = (await call("POST", "", { ...payload(input), slug })) as {
            post?: Post;
          } & Post;
          const created = data.post ?? data;
          const finalSlug = String(created?.slug ?? slug);
          return { id: finalSlug, slug: finalSlug, title: input.title };
        } catch (err) {
          lastError = err;
          if (isDuplicate(err)) continue;
          throw err;
        }
      }
      throw lastError;
    },

    async updatePost(slug, input) {
      await call("PATCH", `/${slug}`, payload(input));
      return { id: slug, slug, title: input.title };
    },

    async deletePost(slug) {
      await call("DELETE", `/${slug}`);
    },
  };
}
