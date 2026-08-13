/**
 * Crawlable H1 + lead text for marketing pages.
 * Consumed by the Vite SEO build plugin (Node) and injected into HTML
 * so non-JS / first-paint crawlers see real body content.
 *
 * Keep free of React/JSX. Values must match visible page copy.
 */
import type { MarketingLocale } from "./site";
import { MARKETING_ROUTES, INSIGHT_ARTICLES } from "./routes";
import { HOME_CONTENT } from "./content/home";
import { JURIA_CONTENT } from "./content/juria";
import { INTENT_CONTENT } from "./content/intent";
import { SOLUTIONS_CONTENT } from "./content/solutions";
import type { FaqEntry } from "./structuredData";

export interface CrawlSnippet {
  h1: string;
  lead: string;
  faqs?: FaqEntry[];
}

function homeSnippet(locale: MarketingLocale): CrawlSnippet {
  const t = HOME_CONTENT[locale];
  return {
    h1: `${t.hero.h1a} ${t.hero.h1b}`,
    lead: t.hero.subtitle,
    faqs: t.faq.entries,
  };
}

function juriaSnippet(locale: MarketingLocale): CrawlSnippet {
  const t = JURIA_CONTENT[locale];
  return { h1: t.h1, lead: t.intro, faqs: t.faqs };
}

function intentSnippet(routeKey: string, locale: MarketingLocale): CrawlSnippet | null {
  const t = INTENT_CONTENT[routeKey]?.[locale];
  if (!t) return null;
  return { h1: t.h1, lead: t.intro, faqs: t.faqs };
}

function solutionSnippet(routeKey: string, locale: MarketingLocale): CrawlSnippet | null {
  const t = SOLUTIONS_CONTENT[routeKey]?.[locale];
  if (!t) return null;
  return { h1: t.h1, lead: t.intro, faqs: t.faqs };
}

/** Resolve crawl snippet for a marketing route key or insight article slug. */
export function crawlSnippetForRoute(
  routeKey: string,
  locale: MarketingLocale
): CrawlSnippet | null {
  if (routeKey === "home") return homeSnippet(locale);
  if (routeKey === "juria") return juriaSnippet(locale);

  const intent = intentSnippet(routeKey, locale);
  if (intent) return intent;

  const solution = solutionSnippet(routeKey, locale);
  if (solution) return solution;

  const route = MARKETING_ROUTES.find((r) => r.key === routeKey);
  if (!route) return null;
  return {
    h1: route.label[locale],
    // Prefer the SEO description; append a short brand cue so secondary
    // pages are not just a one-liner for non-JS crawlers.
    lead: `${route.description[locale]} — JURE`,
  };
}

export function crawlSnippetForArticle(
  articleSlug: string,
  locale: MarketingLocale
): CrawlSnippet | null {
  const article = INSIGHT_ARTICLES.find((a) => a.slug === articleSlug);
  if (!article) return null;
  return {
    h1: article.title[locale],
    lead: article.description[locale],
  };
}
