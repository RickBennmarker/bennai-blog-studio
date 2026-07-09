import type { CmsConfig, CmsProviderId, Settings } from "../types";
import { CmsError, type CmsProvider } from "./types";
import { createWordPressProvider } from "./wordpress";
import { createShopifyProvider } from "./shopify";
import { createCustomProvider } from "./custom";

export * from "./types";

/** Bouwt een CMS-provider uit een gekozen type + config (los van settings). */
export function buildProvider(
  provider: CmsProviderId,
  config: CmsConfig
): CmsProvider {
  switch (provider) {
    case "wordpress":
      return createWordPressProvider(config);
    case "shopify":
      return createShopifyProvider(config);
    case "custom":
      return createCustomProvider(config);
    default:
      throw new CmsError(
        "Er is nog geen CMS gekoppeld. Rond eerst de setup af bij Instellingen."
      );
  }
}

/** De provider die bij de opgeslagen instellingen hoort. */
export function getProvider(settings: Settings): CmsProvider {
  return buildProvider(settings.cms_provider, settings.cms_config);
}

export const CMS_LABELS: Record<Exclude<CmsProviderId, "">, string> = {
  wordpress: "WordPress",
  shopify: "Shopify",
  custom: "Custom API",
};
