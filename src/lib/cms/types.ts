/**
 * Provider-onafhankelijke CMS-laag. De rest van de app praat alleen met dit
 * interface; WordPress, Shopify en de custom blog-API implementeren het elk.
 */

/** Eén post zoals het CMS hem teruggeeft (zonder body in lijsten). */
export interface CmsPost {
  /** Provider-native identifier waarmee we later kunnen updaten/verwijderen. */
  id: string;
  slug: string;
  title: string;
  body?: string;
}

export interface PublishInput {
  title: string;
  /** Body in Markdown; providers zetten dit zelf om naar HTML indien nodig. */
  bodyMarkdown: string;
  excerpt?: string;
  slug?: string;
  /** Featured image: https-URL of data-URI (base64). */
  coverUrl?: string;
  author?: string;
  tags?: string[];
  /** true = direct live, false = concept/draft in het CMS. */
  publish: boolean;
}

export interface CmsProvider {
  /** Menselijke naam van de provider, voor logs en foutmeldingen. */
  readonly name: string;
  /** Verbindingstest; geeft het aantal bestaande posts terug. */
  testConnection(): Promise<number>;
  /** Bestaande posts (id + slug + titel), voor dedup en interne links. */
  listPosts(): Promise<CmsPost[]>;
  /** Volledige body van één post. */
  getPostBody(idOrSlug: string): Promise<string>;
  /** Maakt een nieuwe post; geeft de aangemaakte post terug (met id + slug). */
  createPost(input: PublishInput): Promise<CmsPost>;
  /** Werkt een bestaande post bij. */
  updatePost(idOrSlug: string, input: PublishInput): Promise<CmsPost>;
  /** Verwijdert een post (bijv. een ingepland concept dat wordt geannuleerd). */
  deletePost(idOrSlug: string): Promise<void>;
}

export class CmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsError";
  }
}

/** Data-URI (of https-URL) opsplitsen in mimetype + base64 voor uploads. */
export function parseDataUri(
  value: string
): { mime: string; base64: string } | null {
  const match = value.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}
