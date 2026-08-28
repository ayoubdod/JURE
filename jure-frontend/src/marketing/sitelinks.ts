/**
 * Sitelink candidates for Google Search (and the matching homepage list).
 * Google chooses sitelinks; this keeps titles, snippets and URLs consistent
 * with crawlable homepage links and SiteNavigationElement JSON-LD.
 *
 * IMPORTANT: imported by the Vite build plugin (Node context). Keep it free
 * of JSX, React and app-only imports.
 */
import { canonicalUrl, localePath, type MarketingLocale } from "./site";
import { getRoute, type LocalizedText } from "./routes";

export const SITELINK_ROUTE_KEYS = [
  "pricing",
  "about",
  "legalPracticeManagement",
  "legalResearch",
  "features",
  "contact",
] as const;

export type SitelinkRouteKey = (typeof SITELINK_ROUTE_KEYS)[number];

const SITELINK_NAMES: Record<SitelinkRouteKey, LocalizedText> = {
  pricing: { en: "Pricing", fr: "Tarifs", ar: "الأسعار" },
  about: { en: "About", fr: "À propos", ar: "من نحن" },
  legalPracticeManagement: {
    en: "Legal Practice Management",
    fr: "Gestion de cabinet",
    ar: "إدارة مكاتب المحاماة",
  },
  legalResearch: {
    en: "Legal Research",
    fr: "Recherche juridique",
    ar: "البحث القانوني",
  },
  features: { en: "Features", fr: "Fonctionnalités", ar: "الميزات" },
  contact: { en: "Contact Us", fr: "Contact", ar: "اتصل بنا" },
};

/** One-line snippets in the same shape Google shows under sitelink titles. */
const SITELINK_SNIPPETS: Record<SitelinkRouteKey, LocalizedText> = {
  pricing: {
    en: "See JURE pricing for legal practice management software for solo lawyers, firms and legal teams.",
    fr: "Consultez les tarifs JURE pour le logiciel de gestion de cabinet, des indépendants aux équipes.",
    ar: "اطّلع على أسعار JURE لبرنامج إدارة مكاتب المحاماة للمحامين المستقلين والمكاتب والفرق.",
  },
  about: {
    en: "Learn about JURE, the LegalTech platform for modern legal teams across Morocco, MENA and Africa.",
    fr: "Découvrez JURE, la plateforme LegalTech pour les équipes juridiques modernes au Maroc, au Moyen-Orient et en Afrique.",
    ar: "تعرّف على JURE، منصة LegalTech للفرق القانونية الحديثة في المغرب والشرق الأوسط وأفريقيا.",
  },
  legalPracticeManagement: {
    en: "Modern legal practice management software with matters, calendar, tasks, documents and firm finance.",
    fr: "Logiciel moderne de gestion de cabinet : dossiers, agenda, tâches, documents et finance du cabinet.",
    ar: "برنامج حديث لإدارة مكاتب المحاماة يجمع الملفات والمفكرة والمهام والمستندات ومالية المكتب.",
  },
  legalResearch: {
    en: "AI-assisted legal research from question to analysis, with lawyer review at every step.",
    fr: "Recherche juridique assistée par IA, de la question à l'analyse, avec relecture de l'avocat à chaque étape.",
    ar: "بحث قانوني بمساعدة الذكاء الاصطناعي من السؤال إلى التحليل، مع مراجعة المحامي في كل خطوة.",
  },
  features: {
    en: "Matter management, documents, collaboration, practice finance and Juria in one legal workspace.",
    fr: "Gestion des dossiers, documents, collaboration, finance du cabinet et Juria dans un seul espace juridique.",
    ar: "إدارة الملفات والمستندات والتعاون ومالية المكتب وجوريا في مساحة عمل قانونية واحدة.",
  },
  contact: {
    en: "Contact the JURE team for sales, early access, partnerships or support. We reply in FR, EN and AR.",
    fr: "Contactez l'équipe JURE pour la vente, l'accès anticipé, les partenariats ou le support. Réponse en FR, EN et AR.",
    ar: "تواصل مع فريق JURE للمبيعات أو الوصول المبكر أو الشراكات أو الدعم. نرد بالفرنسية والإنجليزية والعربية.",
  },
};

export interface SitelinkEntry {
  key: SitelinkRouteKey;
  slug: string;
  name: string;
  description: string;
  href: string;
  url: string;
}

export function getSitelinks(locale: MarketingLocale): SitelinkEntry[] {
  return SITELINK_ROUTE_KEYS.map((key) => {
    const route = getRoute(key);
    return {
      key,
      slug: route.slug,
      name: SITELINK_NAMES[key][locale],
      description: SITELINK_SNIPPETS[key][locale],
      href: localePath(locale, route.slug),
      url: canonicalUrl(locale, route.slug),
    };
  });
}
