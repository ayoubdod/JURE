import type { MarketingLocale } from "../site";

/** Shared marketing chrome copy (nav, footer, CTAs). Page content lives with pages. */
export interface MarketingDict {
  nav: {
    platform: string;
    pricing: string;
    security: string;
    insights: string;
    about: string;
    contact: string;
  };
  auth: { signin: string };
  themeToggle: { label: string; title: string };
  cta: {
    seeInAction: string;
    explorePlatform: string;
    talkToTeam: string;
    exploreSecurity: string;
    startWithJure: string;
    readInsights: string;
  };
  badges: {
    earlyAccess: string;
    comingSoon: string;
    availableToday: string;
    planned: string;
    humanInTheLoop: string;
  };
  footer: {
    tagline: string;
    platformHeading: string;
    solutionsHeading: string;
    companyHeading: string;
    legalHeading: string;
    privacy: string;
    terms: string;
    status: string;
    rights: string;
  };
}

const en: MarketingDict = {
  nav: {
    platform: "Platform",
    pricing: "Pricing",
    security: "Security",
    insights: "Insights",
    about: "About",
    contact: "Contact",
  },
  auth: { signin: "Sign in" },
  themeToggle: { label: "Toggle theme", title: "Toggle theme" },
  cta: {
    seeInAction: "See JURE in action",
    explorePlatform: "Explore the platform",
    talkToTeam: "Talk to the team",
    exploreSecurity: "Explore security",
    startWithJure: "Start with JURE",
    readInsights: "Read JURE Insights",
  },
  badges: {
    earlyAccess: "Early access",
    comingSoon: "Coming soon",
    availableToday: "Available today",
    planned: "On our roadmap",
    humanInTheLoop: "Human-in-the-loop",
  },
  footer: {
    tagline: "The AI-native legal work platform.",
    platformHeading: "Platform",
    solutionsHeading: "Legal work",
    companyHeading: "Company",
    legalHeading: "Legal",
    privacy: "Privacy",
    terms: "Terms",
    status: "Status",
    rights: "All rights reserved.",
  },
};

const fr: MarketingDict = {
  nav: {
    platform: "Plateforme",
    pricing: "Tarifs",
    security: "Sécurité",
    insights: "Insights",
    about: "À propos",
    contact: "Contact",
  },
  auth: { signin: "Se connecter" },
  themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
  cta: {
    seeInAction: "Voir JURE en action",
    explorePlatform: "Explorer la plateforme",
    talkToTeam: "Parler à l'équipe",
    exploreSecurity: "Explorer la sécurité",
    startWithJure: "Commencer avec JURE",
    readInsights: "Lire JURE Insights",
  },
  badges: {
    earlyAccess: "Accès anticipé",
    comingSoon: "Bientôt disponible",
    availableToday: "Disponible aujourd'hui",
    planned: "Sur notre feuille de route",
    humanInTheLoop: "Validation humaine",
  },
  footer: {
    tagline: "La plateforme de travail juridique native IA.",
    platformHeading: "Plateforme",
    solutionsHeading: "Travail juridique",
    companyHeading: "Entreprise",
    legalHeading: "Mentions",
    privacy: "Confidentialité",
    terms: "Conditions",
    status: "Statut",
    rights: "Tous droits réservés.",
  },
};

const ar: MarketingDict = {
  nav: {
    platform: "المنصة",
    pricing: "الأسعار",
    security: "الأمان",
    insights: "رؤى",
    about: "من نحن",
    contact: "اتصل بنا",
  },
  auth: { signin: "تسجيل الدخول" },
  themeToggle: { label: "تبديل المظهر", title: "تبديل المظهر" },
  cta: {
    seeInAction: "شاهد JURE عمليًا",
    explorePlatform: "استكشف المنصة",
    talkToTeam: "تحدث إلى الفريق",
    exploreSecurity: "استكشف الأمان",
    startWithJure: "ابدأ مع JURE",
    readInsights: "اقرأ رؤى JURE",
  },
  badges: {
    earlyAccess: "وصول مبكر",
    comingSoon: "قريبًا",
    availableToday: "متاح اليوم",
    planned: "على خارطة الطريق",
    humanInTheLoop: "مراجعة بشرية",
  },
  footer: {
    tagline: "منصة العمل القانوني القائمة على الذكاء الاصطناعي.",
    platformHeading: "المنصة",
    solutionsHeading: "العمل القانوني",
    companyHeading: "الشركة",
    legalHeading: "قانوني",
    privacy: "الخصوصية",
    terms: "الشروط",
    status: "الحالة",
    rights: "جميع الحقوق محفوظة.",
  },
};

export const MARKETING_DICTS: Record<MarketingLocale, MarketingDict> = { en, fr, ar };

export function getMarketingDict(locale: MarketingLocale): MarketingDict {
  return MARKETING_DICTS[locale];
}
