/**
 * Site-wide marketing constants.
 *
 * IMPORTANT: this module is imported by the Vite build plugin (Node context)
 * as well as the app. Keep it free of JSX, React and app-only imports.
 */

export const LOCALES = ["en", "fr", "ar"] as const;
export type MarketingLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: MarketingLocale = "en";
export const RTL_LOCALES: readonly MarketingLocale[] = ["ar"];

const env =
  (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env) ||
  {};

/** Canonical origin used for canonicals, hreflang, sitemap and JSON-LD. */
export const SITE_URL = (env.VITE_SITE_URL || "https://jure.ma").replace(/\/+$/, "");

export const ORG = {
  name: "JURE",
  legalName: "JURE",
  email: "contact@jure.ma",
  logoPath: "/images/jure-logo.png",
  /** Only list profiles that actually exist. None verified yet. */
  sameAs: [] as string[],
  foundingCountry: "Morocco",
} as const;

export const OG_IMAGE_PATH = "/og/og-default.jpg";
export const OG_IMAGE = {
  path: OG_IMAGE_PATH,
  width: 1200,
  height: 630,
  alt: "JURE — LegalTech platform for modern legal teams",
} as const;

/** Open Graph locale tags (BCP 47-ish underscores used by Facebook). */
export const OG_LOCALE_TAGS: Record<MarketingLocale, string> = {
  en: "en_US",
  fr: "fr_FR",
  ar: "ar_MA",
};

export function isMarketingLocale(value: string | undefined): value is MarketingLocale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function dirForLocale(locale: MarketingLocale): "ltr" | "rtl" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // Encode path segments so spaces (etc.) are crawler-safe.
  const encoded = normalized
    .split("/")
    .map((segment) => (segment ? encodeURIComponent(decodeURIComponent(segment)) : ""))
    .join("/");
  return `${SITE_URL}${encoded}`;
}

/** Path for a marketing page in a given locale. `slug` is "" for home. */
export function localePath(locale: MarketingLocale, slug = ""): string {
  return slug ? `/${locale}/${slug}` : `/${locale}`;
}

/** Absolute canonical URL for a marketing page. */
export function canonicalUrl(locale: MarketingLocale, slug = ""): string {
  return absoluteUrl(localePath(locale, slug));
}
