/**
 * Truthful JSON-LD builders. Every value emitted here must correspond to
 * visible, verified content — no ratings, reviews, awards, certifications,
 * invented customers or fabricated statistics.
 *
 * IMPORTANT: imported by the Vite build plugin (Node context). Keep it free
 * of JSX, React and app-only imports.
 */
import { SITE_URL, ORG, absoluteUrl, canonicalUrl, type MarketingLocale } from "./site";
import type { InsightArticleMeta } from "./routes";

type JsonLd = Record<string, unknown>;

const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const ORG_DESCRIPTION: Record<MarketingLocale, string> = {
  en: "JURE is a LegalTech company building an AI-native legal work platform that brings matters, documents, tasks, legal research and responsible AI into one secure workspace for law firms and legal teams.",
  fr: "JURE est une entreprise LegalTech qui construit une plateforme de travail juridique native IA réunissant dossiers, documents, tâches, recherche juridique et IA responsable dans un espace de travail sécurisé pour cabinets d'avocats et équipes juridiques.",
  ar: "JURE شركة تقنية قانونية تبني منصة عمل قانوني قائمة على الذكاء الاصطناعي تجمع الملفات والمستندات والمهام والبحث القانوني والذكاء الاصطناعي المسؤول في مساحة عمل آمنة لمكاتب المحاماة والفرق القانونية.",
};

export function organizationJsonLd(locale: MarketingLocale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: ORG.name,
    legalName: ORG.legalName,
    url: SITE_URL,
    logo: absoluteUrl(ORG.logoPath),
    email: ORG.email,
    description: ORG_DESCRIPTION[locale],
    foundingLocation: { "@type": "Place", name: ORG.foundingCountry },
    ...(ORG.sameAs.length > 0 ? { sameAs: ORG.sameAs } : {}),
  };
}

export function webSiteJsonLd(locale: MarketingLocale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: ORG.name,
    url: SITE_URL,
    inLanguage: ["en", "fr", "ar"],
    description: ORG_DESCRIPTION[locale],
    publisher: { "@id": ORG_ID },
  };
}

const APP_DESCRIPTION: Record<MarketingLocale, string> = {
  en: "AI-native legal work platform: matter and case management, client records, document library with preview, tasks and deadlines, shared calendar, real-time team collaboration with voice and video calls, practice finance, and an early-access legal AI assistant with human review.",
  fr: "Plateforme de travail juridique native IA : gestion des dossiers et affaires, fiches clients, bibliothèque documentaire avec prévisualisation, tâches et échéances, agenda partagé, collaboration d'équipe en temps réel avec appels audio et vidéo, finance du cabinet, et un assistant IA juridique en accès anticipé avec relecture humaine.",
  ar: "منصة عمل قانوني قائمة على الذكاء الاصطناعي: إدارة الملفات والقضايا، سجلات العملاء، مكتبة مستندات مع معاينة، مهام ومواعيد نهائية، مفكرة مشتركة، تعاون فريق فوري مع مكالمات صوتية ومرئية، مالية المكتب، ومساعد ذكاء اصطناعي قانوني في مرحلة الوصول المبكر مع مراجعة بشرية.",
};

/** Only verified, shipped capabilities. Keep in sync with the product. */
const APP_FEATURES: Record<MarketingLocale, string[]> = {
  en: [
    "Matter and case management",
    "Client management",
    "Document library with PDF and DOCX preview",
    "Tasks and deadlines",
    "Shared team calendar",
    "Real-time team messaging",
    "Voice and video calls",
    "Role-based access control",
    "Practice finance and invoicing",
    "French, English and Arabic interface with RTL support",
  ],
  fr: [
    "Gestion des dossiers et affaires",
    "Gestion des clients",
    "Bibliothèque documentaire avec prévisualisation PDF et DOCX",
    "Tâches et échéances",
    "Agenda d'équipe partagé",
    "Messagerie d'équipe en temps réel",
    "Appels audio et vidéo",
    "Contrôle d'accès par rôles",
    "Finance du cabinet et facturation",
    "Interface en français, anglais et arabe avec prise en charge RTL",
  ],
  ar: [
    "إدارة الملفات والقضايا",
    "إدارة العملاء",
    "مكتبة مستندات مع معاينة PDF وDOCX",
    "المهام والمواعيد النهائية",
    "مفكرة فريق مشتركة",
    "مراسلة فورية للفريق",
    "مكالمات صوتية ومرئية",
    "التحكم في الوصول حسب الأدوار",
    "مالية المكتب والفوترة",
    "واجهة بالفرنسية والإنجليزية والعربية مع دعم الكتابة من اليمين إلى اليسار",
  ],
};

export function softwareApplicationJsonLd(locale: MarketingLocale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: ORG.name,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Legal practice management software",
    operatingSystem: "Web",
    url: SITE_URL,
    description: APP_DESCRIPTION[locale],
    featureList: APP_FEATURES[locale],
    inLanguage: ["en", "fr", "ar"],
    publisher: { "@id": ORG_ID },
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path, e.g. "/en/legal-ai". */
  path: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export interface FaqEntry {
  question: string;
  answer: string;
}

/** Only emit for FAQs that are visibly rendered on the page. */
export function faqPageJsonLd(faqs: FaqEntry[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function articleJsonLd(article: InsightArticleMeta, locale: MarketingLocale): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title[locale],
    description: article.description[locale],
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    inLanguage: locale,
    author: { "@type": "Organization", name: ORG.name, url: SITE_URL },
    publisher: { "@id": ORG_ID },
    image: absoluteUrl("/og/og-default.jpg"),
    mainEntityOfPage: canonicalUrl(locale, `insights/${article.slug}`),
  };
}
