import type { CmsConfig } from "../types";
import { markdownToHtml } from "../markdown";
import {
  CmsError,
  parseDataUri,
  type CmsPost,
  type CmsProvider,
  type PublishInput,
} from "./types";

const API_VERSION = "2024-01";

/**
 * Shopify via de Admin REST API. Blogposts leven in Shopify onder een "blog"
 * (meestal "News"); artikelen horen bij een blog_id. De gebruiker maakt een
 * custom app met scope `write_content` en gebruikt het Admin API access token.
 */
export function createShopifyProvider(config: CmsConfig): CmsProvider {
  const store = (config.shopify_store ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  const token = config.shopify_token ?? "";
  if (!store || !token) {
    throw new CmsError(
      "Shopify-koppeling onvolledig: vul je *.myshopify.com domein en Admin API access token in."
    );
  }
  const api = `https://${store}/admin/api/${API_VERSION}`;
  let blogId = config.shopify_blog_id ?? "";

  async function shopify(method: string, path: string, body?: unknown) {
    const res = await fetch(`${api}${path}`, {
      method,
      headers: {
        "X-Shopify-Access-Token": token,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new CmsError(
        `Shopify-fout (${res.status} ${method} ${path}): ${text.slice(0, 300)}`
      );
    }
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  }

  /** Zoek het blog_id op (of gebruik de eerste blog) en cache het. */
  async function resolveBlogId(): Promise<string> {
    if (blogId) return blogId;
    const data = (await shopify("GET", "/blogs.json")) as {
      blogs?: { id: number }[];
    };
    const first = data.blogs?.[0]?.id;
    if (!first) {
      throw new CmsError(
        "Geen blog gevonden in Shopify. Maak eerst een blog aan onder Online Store → Blog posts."
      );
    }
    blogId = String(first);
    return blogId;
  }

  type ShopifyArticle = {
    id: number;
    handle: string;
    title: string;
    body_html?: string;
  };

  function articlePayload(input: PublishInput) {
    const article: Record<string, unknown> = {
      title: input.title,
      body_html: markdownToHtml(input.bodyMarkdown),
      published: input.publish,
    };
    if (input.excerpt) article.summary_html = `<p>${input.excerpt}</p>`;
    if (input.slug) article.handle = input.slug;
    if (input.author) article.author = input.author;
    if (input.tags?.length) article.tags = input.tags.join(", ");
    const parsed = input.coverUrl ? parseDataUri(input.coverUrl) : null;
    if (parsed) article.image = { attachment: parsed.base64 };
    else if (input.coverUrl?.startsWith("http")) article.image = { src: input.coverUrl };
    return { article };
  }

  return {
    name: "Shopify",

    async testConnection() {
      const id = await resolveBlogId();
      const data = (await shopify(
        "GET",
        `/blogs/${id}/articles/count.json`
      )) as { count?: number };
      return data.count ?? 0;
    },

    async listPosts() {
      const id = await resolveBlogId();
      const data = (await shopify(
        "GET",
        `/blogs/${id}/articles.json?limit=250&fields=id,handle,title`
      )) as { articles?: ShopifyArticle[] };
      return (data.articles ?? []).map((a) => ({
        id: String(a.id),
        slug: a.handle,
        title: a.title,
      }));
    },

    async getPostBody(id) {
      const blog = await resolveBlogId();
      const data = (await shopify(
        "GET",
        `/blogs/${blog}/articles/${id}.json?fields=body_html`
      )) as { article?: ShopifyArticle };
      return data.article?.body_html ?? "";
    },

    async createPost(input) {
      const id = await resolveBlogId();
      const data = (await shopify(
        "POST",
        `/blogs/${id}/articles.json`,
        articlePayload(input)
      )) as { article?: ShopifyArticle };
      const a = data.article!;
      return { id: String(a.id), slug: a.handle, title: a.title };
    },

    async updatePost(articleId, input) {
      const id = await resolveBlogId();
      const data = (await shopify(
        "PUT",
        `/blogs/${id}/articles/${articleId}.json`,
        articlePayload(input)
      )) as { article?: ShopifyArticle };
      const a = data.article!;
      return { id: String(a.id), slug: a.handle, title: a.title };
    },

    async deletePost(articleId) {
      const id = await resolveBlogId();
      await shopify("DELETE", `/blogs/${id}/articles/${articleId}.json`);
    },
  };
}
