import React, { useLayoutEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  LOCALES,
  DEFAULT_LOCALE,
  OG_IMAGE,
  OG_IMAGE_PATH,
  OG_LOCALE_TAGS,
  ORG,
  absoluteUrl,
  canonicalUrl,
  type MarketingLocale,
} from "./site";
import { getRoute, getArticle } from "./routes";
import { organizationJsonLd, softwareApplicationJsonLd, webSiteJsonLd } from "./structuredData";

type JsonLd = Record<string, unknown>;

export interface SeoProps {
  lang: MarketingLocale;
  /** Marketing slug of the current page ("" = home). Used for canonical + hreflang. */
  slug?: string;
  title: string;
  description: string;
  /** Extra JSON-LD blocks beyond the provided ones. */
  jsonLd?: JsonLd[];
  ogType?: "website" | "article";
  /** Site-relative or absolute image URL. Defaults to the brand OG card. */
  image?: string;
  /** robots meta. Omit for default indexing. */
  robots?: string;
}

/**
 * Clear server-injected tags between <!-- seo:start --> and <!-- seo:end -->
 * once React Helmet owns the document head. Crawlers that never execute JS
 * still receive the injected block from Express; JS sessions avoid duplicates.
 */
function clearServerSeoBlock() {
  if (typeof document === "undefined") return;
  const nodes = Array.from(document.head.childNodes);
  let inBlock = false;
  const toRemove: ChildNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === Node.COMMENT_NODE) {
      const text = node.textContent || "";
      if (text.includes("seo:start")) {
        inBlock = true;
        continue;
      }
      if (text.includes("seo:end")) {
        inBlock = false;
        continue;
      }
    }
    if (inBlock) toRemove.push(node);
  }
  toRemove.forEach((n) => n.parentNode?.removeChild(n));
}

/**
 * Per-page head manager: unique title/description, canonical, hreflang
 * alternates (en/fr/ar + x-default), Open Graph, Twitter and JSON-LD.
 */
export const Seo: React.FC<SeoProps> = ({
  lang,
  slug = "",
  title,
  description,
  jsonLd = [],
  ogType = "website",
  image = OG_IMAGE_PATH,
  robots,
}) => {
  const canonical = canonicalUrl(lang, slug);
  const ogImage = absoluteUrl(image);
  const verification = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION;

  useLayoutEffect(() => {
    clearServerSeoBlock();
  }, []);

  return (
    <Helmet prioritizeSeoTags>
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} />
      <title>{title}</title>
      <meta name="description" content={description} />
      {robots ? <meta name="robots" content={robots} /> : null}
      {verification ? <meta name="google-site-verification" content={verification} /> : null}
      <link rel="canonical" href={canonical} />

      {LOCALES.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={canonicalUrl(locale, slug)}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl(DEFAULT_LOCALE, slug)} />

      <meta property="og:site_name" content={ORG.name} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content={String(OG_IMAGE.width)} />
      <meta property="og:image:height" content={String(OG_IMAGE.height)} />
      <meta property="og:image:alt" content={OG_IMAGE.alt} />
      <meta property="og:locale" content={OG_LOCALE_TAGS[lang]} />
      {LOCALES.filter((locale) => locale !== lang).map((locale) => (
        <meta key={locale} property="og:locale:alternate" content={OG_LOCALE_TAGS[locale]} />
      ))}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content={OG_IMAGE.alt} />

      {jsonLd.map((block, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(block)}
        </script>
      ))}
    </Helmet>
  );
};

/** Convenience wrapper: resolves title/description from the route registry. */
export const RouteSeo: React.FC<
  Omit<SeoProps, "title" | "description" | "slug"> & { routeKey: string }
> = ({ routeKey, lang, jsonLd, ...rest }) => {
  const route = getRoute(routeKey);
  // When a page omits jsonLd, re-emit org/website (and SoftwareApplication on
  // features) so hydrate does not leave the document without structured data
  // after clearServerSeoBlock().
  const resolvedJsonLd =
    jsonLd ??
    [
      organizationJsonLd(lang),
      webSiteJsonLd(lang),
      ...(routeKey === "features" ? [softwareApplicationJsonLd(lang)] : []),
    ];

  return (
    <Seo
      lang={lang}
      slug={route.slug}
      title={route.title[lang]}
      description={route.description[lang]}
      jsonLd={resolvedJsonLd}
      {...rest}
    />
  );
};

/** Convenience wrapper for insight articles. */
export const ArticleSeo: React.FC<{
  lang: MarketingLocale;
  articleSlug: string;
  jsonLd?: JsonLd[];
  robots?: string;
}> = ({ lang, articleSlug, jsonLd, robots }) => {
  const article = getArticle(articleSlug);
  if (!article) return null;
  return (
    <Seo
      lang={lang}
      slug={`insights/${articleSlug}`}
      title={article.title[lang]}
      description={article.description[lang]}
      ogType="article"
      jsonLd={jsonLd}
      robots={robots}
    />
  );
};

export default Seo;
