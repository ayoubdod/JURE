/**
 * Vite build plugin: emits dist/sitemap.xml and dist/seo-manifest.json from
 * the marketing route registry. The Express server (server.mjs) uses the
 * manifest to inject per-URL head tags so crawlers get correct metadata
 * without executing JavaScript.
 */
import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { LOCALES, SITE_URL, canonicalUrl, localePath, DEFAULT_LOCALE } from "../src/marketing/site";
import { MARKETING_ROUTES, INSIGHT_ARTICLES } from "../src/marketing/routes";
import {
  organizationJsonLd,
  webSiteJsonLd,
  softwareApplicationJsonLd,
  articleJsonLd,
} from "../src/marketing/structuredData";

interface SitemapEntry {
  slug: string;
  priority: number;
  changefreq: string;
  lastmod?: string;
}

interface ManifestEntry {
  title: string;
  description: string;
  canonical: string;
  ogType: "website" | "article";
  locale: string;
  jsonLd: unknown[];
}

function collectEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = MARKETING_ROUTES.map((route) => ({
    slug: route.slug,
    priority: route.priority,
    changefreq: route.changefreq,
  }));
  for (const article of INSIGHT_ARTICLES) {
    entries.push({
      slug: `insights/${article.slug}`,
      priority: 0.7,
      changefreq: "monthly",
      lastmod: article.dateModified,
    });
  }
  return entries;
}

function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .flatMap((entry) =>
      LOCALES.map((locale) => {
        const loc = canonicalUrl(locale, entry.slug);
        const alternates = LOCALES.map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${alt}" href="${canonicalUrl(alt, entry.slug)}"/>`
        ).join("\n");
        const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${canonicalUrl(DEFAULT_LOCALE, entry.slug)}"/>`;
        const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : "";
        return [
          "  <url>",
          `    <loc>${loc}</loc>${lastmod}`,
          `    <changefreq>${entry.changefreq}</changefreq>`,
          `    <priority>${entry.priority.toFixed(1)}</priority>`,
          alternates,
          xDefault,
          "  </url>",
        ].join("\n");
      })
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

function buildManifest(): Record<string, ManifestEntry> {
  const manifest: Record<string, ManifestEntry> = {};

  for (const route of MARKETING_ROUTES) {
    for (const locale of LOCALES) {
      const sitewide = [
        organizationJsonLd(locale),
        webSiteJsonLd(locale),
        ...(route.key === "home" || route.key === "features"
          ? [softwareApplicationJsonLd(locale)]
          : []),
      ];
      manifest[localePath(locale, route.slug)] = {
        title: route.title[locale],
        description: route.description[locale],
        canonical: canonicalUrl(locale, route.slug),
        ogType: "website",
        locale,
        jsonLd: sitewide,
      };
    }
  }

  for (const article of INSIGHT_ARTICLES) {
    for (const locale of LOCALES) {
      const slug = `insights/${article.slug}`;
      manifest[localePath(locale, slug)] = {
        title: article.title[locale],
        description: article.description[locale],
        canonical: canonicalUrl(locale, slug),
        ogType: "article",
        locale,
        jsonLd: [organizationJsonLd(locale), webSiteJsonLd(locale), articleJsonLd(article, locale)],
      };
    }
  }

  return manifest;
}

export function seoGenerationPlugin(): Plugin {
  let outDir = "dist";
  return {
    name: "jure-seo-generation",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const entries = collectEntries();
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), buildSitemap(entries), "utf8");
      fs.writeFileSync(
        path.join(outDir, "seo-manifest.json"),
        JSON.stringify(
          { siteUrl: SITE_URL, locales: LOCALES, defaultLocale: DEFAULT_LOCALE, pages: buildManifest() },
          null,
          2
        ),
        "utf8"
      );
      console.log(
        `[jure-seo] wrote sitemap.xml (${entries.length * LOCALES.length} URLs) and seo-manifest.json`
      );
    },
  };
}
