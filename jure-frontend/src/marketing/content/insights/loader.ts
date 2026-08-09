import type { MarketingLocale } from "../../site";

/**
 * Lazy loaders for insight article bodies (markdown, bundled as raw text and
 * code-split per article/locale so the insights index stays light).
 */
const ARTICLE_BODIES: Record<string, Record<MarketingLocale, () => Promise<string>>> = {
  "what-is-legaltech": {
    en: () => import("./what-is-legaltech.en.md?raw").then((m) => m.default),
    fr: () => import("./what-is-legaltech.fr.md?raw").then((m) => m.default),
    ar: () => import("./what-is-legaltech.ar.md?raw").then((m) => m.default),
  },
  "legaltech-in-morocco": {
    en: () => import("./legaltech-in-morocco.en.md?raw").then((m) => m.default),
    fr: () => import("./legaltech-in-morocco.fr.md?raw").then((m) => m.default),
    ar: () => import("./legaltech-in-morocco.ar.md?raw").then((m) => m.default),
  },
  "legal-ai-in-mena": {
    en: () => import("./legal-ai-in-mena.en.md?raw").then((m) => m.default),
    fr: () => import("./legal-ai-in-mena.fr.md?raw").then((m) => m.default),
    ar: () => import("./legal-ai-in-mena.ar.md?raw").then((m) => m.default),
  },
  "legal-technology-african-law-firms": {
    en: () => import("./legal-technology-african-law-firms.en.md?raw").then((m) => m.default),
    fr: () => import("./legal-technology-african-law-firms.fr.md?raw").then((m) => m.default),
    ar: () => import("./legal-technology-african-law-firms.ar.md?raw").then((m) => m.default),
  },
  "responsible-ai-for-lawyers": {
    en: () => import("./responsible-ai-for-lawyers.en.md?raw").then((m) => m.default),
    fr: () => import("./responsible-ai-for-lawyers.fr.md?raw").then((m) => m.default),
    ar: () => import("./responsible-ai-for-lawyers.ar.md?raw").then((m) => m.default),
  },
  "convergence-of-legal-work": {
    en: () => import("./convergence-of-legal-work.en.md?raw").then((m) => m.default),
    fr: () => import("./convergence-of-legal-work.fr.md?raw").then((m) => m.default),
    ar: () => import("./convergence-of-legal-work.ar.md?raw").then((m) => m.default),
  },
};

export function hasArticleBody(slug: string): boolean {
  return slug in ARTICLE_BODIES;
}

export async function loadArticleBody(slug: string, lang: MarketingLocale): Promise<string | null> {
  const loaders = ARTICLE_BODIES[slug];
  if (!loaders) return null;
  return loaders[lang]();
}
