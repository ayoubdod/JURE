import React, { useLayoutEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  LOCALES,
  DEFAULT_LOCALE,
  OG_IMAGE_PATH,
  ORG,
  absoluteUrl,
  canonicalUrl,
  type MarketingLocale,
} from "./site";
import { getRoute, getArticle } from "./routes";

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
}) => {
  const canonical = canonicalUrl(lang, slug);
  const ogImage = absoluteUrl(image);

  useLayoutEffect(() => {
    clearServerSeoBlock();
  }, []);

  return (
    <Helmet prioritizeSeoTags>
      <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"} />
      <title>{title}</title>
      <meta name="description" content={description} />
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
      <meta property="og:locale" content={lang} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

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
> = ({ routeKey, lang, ...rest }) => {
  const route = getRoute(routeKey);
  return (
    <Seo
      lang={lang}
      slug={route.slug}
      title={route.title[lang]}
      description={route.description[lang]}
      {...rest}
    />
  );
};

/** Convenience wrapper for insight articles. */
export const ArticleSeo: React.FC<{
  lang: MarketingLocale;
  articleSlug: string;
  jsonLd?: JsonLd[];
}> = ({ lang, articleSlug, jsonLd }) => {
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
    />
  );
};

export default Seo;
