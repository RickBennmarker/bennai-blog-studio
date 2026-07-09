export type DraftStatus =
  | "generating"
  | "draft"
  | "scheduled"
  | "published"
  | "failed";

export interface Draft {
  id: string;
  topic: string;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  meta_description: string | null;
  tags: string[] | null;
  image_url: string | null;
  image_prompt: string | null;
  status: DraftStatus;
  source: "manual" | "autopilot";
  error: string | null;
  published_post_id: string | null;
  published_at: string | null;
  /** ISO-tijd waarop de post live moet gaan (bij status "scheduled"). */
  scheduled_for: string | null;
  created_at: string;
}

/** Welk CMS beheert de website van de gebruiker. */
export type CmsProviderId = "" | "wordpress" | "shopify" | "custom";

/**
 * Verbindingsgegevens voor het gekozen CMS. Alles optioneel: alleen de velden
 * van de gekozen provider zijn ingevuld. Wordt als geheel opgeslagen/vervangen.
 */
export interface CmsConfig {
  // WordPress (REST API + Application Password)
  wp_url?: string;
  wp_username?: string;
  wp_app_password?: string;
  // Shopify (Admin API)
  shopify_store?: string; // xxx.myshopify.com
  shopify_token?: string; // Admin API access token (shpat_...)
  shopify_blog_id?: string; // leeg = eerste blog automatisch
  // Custom blog-API (bijv. Lovable/Supabase edge function)
  custom_publish_url?: string;
  custom_api_key?: string;
  custom_image_upload_url?: string;
}

export interface Settings {
  id: number;
  /** Is de setup-wizard doorlopen? Zo niet, stuurt de app door naar /setup. */
  setup_complete: boolean;
  site_name: string;
  site_url: string;
  niche: string;
  audience: string;
  tone: string;
  language: string;
  extra_instructions: string;
  /** OpenRouter API-sleutel; valt terug op OPENROUTER_API_KEY uit .env. */
  openrouter_key: string;
  text_model: string;
  image_model: string;
  image_style: string;
  author: string;
  cms_provider: CmsProviderId;
  cms_config: CmsConfig;
  autopilot_enabled: boolean;
  autopilot_interval_days: number;
  autopilot_hour: number;
  autopilot_publish_direct: boolean;
  updated_at: string;
}

export type SearchIntent =
  | "informatief"
  | "commercieel"
  | "transactioneel"
  | "navigatie";

/** Hoe goed dekt de site dit onderwerp al af? */
export type GapLevel = "ontbreekt" | "dun" | "bestaat";

export interface Opportunity {
  id: string;
  keyword: string;
  cluster: string;
  intent: SearchIntent;
  volume: number | null;
  difficulty: number | null;
  cpc: number | null;
  gap: GapLevel;
  /** Bestaande pagina die dit onderwerp (deels) dekt. */
  existing_url: string | null;
  /** 0-100, berekend in code — niet door de AI. */
  score: number;
  reason: string;
  title_suggestion: string;
  angle: string;
  outline: string[];
  related_keywords: string[];
  /** Draft die vanuit deze kans is gegenereerd. */
  draft_id: string | null;
}

export interface Analysis {
  generated_at: string;
  site_url: string;
  /** "dataforseo" = met echte zoekvolumes, "gratis" = alleen autocomplete. */
  mode: "dataforseo" | "gratis";
  /** Bijv. waarom er is teruggevallen op de gratis modus. */
  warning: string | null;
  pages_crawled: number;
  keywords_found: number;
  clusters: { name: string; summary: string }[];
  opportunities: Opportunity[];
}

export interface LogEntry {
  id: string;
  kind: "autopilot" | "error" | "publish" | "analyse";
  message: string;
  draft_id: string | null;
  created_at: string;
}
