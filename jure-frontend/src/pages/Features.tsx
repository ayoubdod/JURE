// src/pages/Features.tsx — platform overview in a presentation-deck layout.
import React from "react";
import MarketingShell from "@/components/landing/MarketingShell";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";
import FeaturesDeck from "@/components/landing/FeaturesDeck";
import "@/components/landing/landing.css";
import "@/components/landing/features-deck.css";

/**
 * Features page
 * - Light presentation deck (orbs, mixed bento cards) — not the homepage.
 * - Shipped capabilities first; planned work under an explicit "Coming soon" mosaic.
 */

type Lang = "fr" | "en" | "ar";

type FeatureItem = { title: string; desc: string };

type FeaturesStrings = {
  hero: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust: string;
    imageAlt: string;
  };
  highlights: { titleA: string; titleB: string; note: string; items: FeatureItem[] };
  comingSoon: { titleA: string; titleB: string; note: string; items: FeatureItem[] };
  cta: { kicker: string; title: string; subtitle: string; primary: string; secondary: string };
};

const STRINGS: Record<Lang, FeaturesStrings> = {
  fr: {
    hero: {
      titleA: "Le travail juridique,",
      titleB: "réuni sur une seule plateforme.",
      eyebrow: "La plateforme JURE",
      subtitle:
        "Gestion des dossiers, bibliothèque documentaire, collaboration d'équipe, finance du cabinet et une IA juridique en accès anticipé — en français, anglais et arabe.",
      ctaPrimary: "Commencer",
      ctaSecondary: "Nous contacter",
      trust: "Isolation par cabinet • Accès par rôles • FR / EN / AR",
      imageAlt: "Espace de travail JURE — dossiers, agenda, documents et JURIA",
    },
    highlights: {
      titleA: "Ce que vous pouvez faire",
      titleB: "aujourd'hui.",
      note:
        "Les capacités déjà livrées dans JURE — dossiers, documents, collaboration, finance et JURIA en accès anticipé.",
      items: [
        {
          title: "IA juridique — Accès anticipé",
          desc: "Juria : chat, analyse de contrats, questions-réponses de type recherche et aide à la rédaction — avec relecture par l'avocat.",
        },
        {
          title: "Gestion des dossiers",
          desc: "Chaque dossier relié à son client, ses documents, ses tâches et son équipe.",
        },
        {
          title: "Bibliothèque documentaire",
          desc: "Import, catégories, tags, recherche sur titre et description, aperçu PDF/DOCX.",
        },
        {
          title: "Tâches, échéances & agenda",
          desc: "Tâches assignées, dates limites et calendrier partagé du cabinet.",
        },
        {
          title: "Chat & appels d'équipe",
          desc: "Messagerie en temps réel, appels audio/vidéo et notifications.",
        },
        {
          title: "Finance du cabinet",
          desc: "Suivi financier de la pratique, réservé aux rôles Propriétaire et Admin.",
        },
        {
          title: "Rôles & permissions",
          desc: "Six rôles avec des codes de permission granulaires par cabinet.",
        },
        {
          title: "Trilingue & RTL",
          desc: "Interface complète en français, anglais et arabe, avec prise en charge RTL.",
        },
      ],
    },
    comingSoon: {
      titleA: "Bientôt",
      titleB: "sur la feuille de route.",
      note:
        "Ces fonctionnalités sont en préparation et ne sont pas encore disponibles. Nous les annoncerons quand elles seront livrées.",
      items: [
        {
          title: "Intégrations",
          desc: "Connecter Drive, la signature électronique et une API au flux du cabinet.",
        },
        {
          title: "SSO",
          desc: "Connexion unique via l'annuaire du cabinet, sans comptes séparés.",
        },
        {
          title: "Portail clients",
          desc: "Un espace dédié pour que vos clients suivent dossiers, échéances et documents partagés.",
        },
        {
          title: "Automatisations & checklists",
          desc: "Workflows et listes de contrôle pour standardiser les étapes d'un dossier.",
        },
        {
          title: "Versions de documents",
          desc: "Historique des fichiers, comparaison et retour à une version antérieure.",
        },
        {
          title: "Recherche sémantique",
          desc: "Retrouver des documents par le sens, pas seulement par le titre.",
        },
        {
          title: "Journaux d'audit",
          desc: "Traçabilité des actions sensibles pour le contrôle interne du cabinet.",
        },
        {
          title: "Chiffrement au repos",
          desc: "Renforcement du chiffrement des données stockées côté plateforme.",
        },
        {
          title: "Partage externe",
          desc: "Liens de partage contrôlés hors du cabinet, avec droits limités.",
        },
        {
          title: "Commentaires avec mentions",
          desc: "Discussions dans les dossiers avec @mentions pour alerter un collègue.",
        },
      ],
    },
    cta: {
      kicker: "Pensé pour les cabinets modernes",
      title: "Découvrez JURE en pratique",
      subtitle: "Créez votre espace de travail en quelques minutes — sans carte bancaire.",
      primary: "Commencer",
      secondary: "Parler à l'équipe",
    },
  },

  en: {
    hero: {
      titleA: "Legal work,",
      titleB: "brought together in one platform.",
      eyebrow: "The JURE platform",
      subtitle:
        "Matter management, a document library, team collaboration, practice finance, and a legal AI in early access — in French, English and Arabic.",
      ctaPrimary: "Get started",
      ctaSecondary: "Contact us",
      trust: "Per-firm isolation • Role-based access • FR / EN / AR",
      imageAlt: "JURE workspace — matters, calendar, documents and JURIA",
    },
    highlights: {
      titleA: "What you can do",
      titleB: "today.",
      note:
        "Capabilities already shipping in JURE — matters, documents, collaboration, finance, and JURIA in early access.",
      items: [
        {
          title: "Legal AI — Early access",
          desc: "Juria: chat, contract analysis, research-style Q&A and drafting assistance — with lawyer review.",
        },
        {
          title: "Matter management",
          desc: "Every case connected to its client, documents, tasks and team.",
        },
        {
          title: "Document library",
          desc: "Upload, categories, tags, search on title and description, PDF/DOCX preview.",
        },
        {
          title: "Tasks, deadlines & calendar",
          desc: "Assigned tasks, due dates and a shared firm calendar.",
        },
        {
          title: "Team chat & calls",
          desc: "Real-time messaging, voice/video calls and notifications.",
        },
        {
          title: "Practice finance",
          desc: "Financial tracking for the practice, restricted to Owner and Admin roles.",
        },
        {
          title: "Roles & permissions",
          desc: "Six roles with granular permission codes per firm.",
        },
        {
          title: "Trilingual & RTL",
          desc: "Full interface in French, English and Arabic, with RTL support.",
        },
      ],
    },
    comingSoon: {
      titleA: "Coming soon",
      titleB: "on the roadmap.",
      note:
        "These capabilities are in the works and not available yet. We'll announce them when they ship.",
      items: [
        {
          title: "Integrations",
          desc: "Connect Drive, e-signature and an API into the firm workflow.",
        },
        {
          title: "SSO",
          desc: "Single sign-on through the firm directory, without separate accounts.",
        },
        {
          title: "Client portal",
          desc: "A dedicated space for clients to follow matters, deadlines and shared documents.",
        },
        {
          title: "Automations & checklists",
          desc: "Workflows and checklists to standardize matter steps.",
        },
        {
          title: "Document versioning",
          desc: "File history, comparison and restore to a previous version.",
        },
        {
          title: "Semantic search",
          desc: "Find documents by meaning, not only by title.",
        },
        {
          title: "Audit trails",
          desc: "Traceability for sensitive actions across the firm.",
        },
        {
          title: "Encryption at rest",
          desc: "Stronger encryption for data stored on the platform.",
        },
        {
          title: "External sharing",
          desc: "Controlled share links outside the firm, with limited rights.",
        },
        {
          title: "Comments with mentions",
          desc: "In-matter discussions with @mentions to alert a colleague.",
        },
      ],
    },
    cta: {
      kicker: "Built for modern firms",
      title: "See JURE in practice",
      subtitle: "Create your workspace in minutes — no credit card required.",
      primary: "Get started",
      secondary: "Talk to the team",
    },
  },

  ar: {
    hero: {
      titleA: "العمل القانوني،",
      titleB: "مجموعا في منصة واحدة.",
      eyebrow: "منصة JURE",
      subtitle:
        "إدارة القضايا، مكتبة المستندات، تعاون الفريق، مالية المكتب، وذكاء اصطناعي قانوني في مرحلة الوصول المبكر — بالفرنسية والإنجليزية والعربية.",
      ctaPrimary: "ابدأ الآن",
      ctaSecondary: "تواصل معنا",
      trust: "عزل بيانات كل مكتب • وصول حسب الأدوار • FR / EN / AR",
      imageAlt: "مساحة عمل JURE — القضايا والمفكرة والمستندات وجوريا",
    },
    highlights: {
      titleA: "ما يمكنكم فعله",
      titleB: "اليوم.",
      note:
        "الإمكانات المتاحة الآن في JURE — القضايا والمستندات والتعاون والمالية وجوريا في الوصول المبكر.",
      items: [
        {
          title: "الذكاء الاصطناعي القانوني — الوصول المبكر",
          desc: "جوريا: محادثة، تحليل العقود، أسئلة وأجوبة بأسلوب البحث، ومساعدة في الصياغة — مع مراجعة المحامي.",
        },
        {
          title: "إدارة القضايا",
          desc: "كل قضية مرتبطة بموكلها ومستنداتها ومهامها وفريقها.",
        },
        {
          title: "مكتبة المستندات",
          desc: "رفع، تصنيفات، وسوم، بحث في العنوان والوصف، ومعاينة PDF/DOCX.",
        },
        {
          title: "المهام والمواعيد والمفكرة",
          desc: "مهام مسندة، مواعيد نهائية، ومفكرة مشتركة للمكتب.",
        },
        {
          title: "دردشة ومكالمات الفريق",
          desc: "مراسلة فورية، مكالمات صوتية ومرئية، وإشعارات.",
        },
        {
          title: "مالية المكتب",
          desc: "متابعة مالية للممارسة، مقصورة على دوري المالك ومدير النظام.",
        },
        {
          title: "الأدوار والصلاحيات",
          desc: "ستة أدوار مع صلاحيات دقيقة لكل مكتب.",
        },
        {
          title: "ثلاثي اللغات مع RTL",
          desc: "واجهة كاملة بالفرنسية والإنجليزية والعربية، مع دعم الكتابة من اليمين إلى اليسار.",
        },
      ],
    },
    comingSoon: {
      titleA: "قريبًا",
      titleB: "على خارطة الطريق.",
      note:
        "هذه الإمكانات قيد الإعداد وغير متاحة بعد. سنعلن عنها عند إطلاقها.",
      items: [
        {
          title: "تكاملات",
          desc: "ربط درايف والتوقيع الإلكتروني وواجهة برمجية بسير عمل المكتب.",
        },
        {
          title: "SSO",
          desc: "تسجيل دخول موحّد عبر دليل المكتب دون حسابات منفصلة.",
        },
        {
          title: "بوابة الموكلين",
          desc: "مساحة مخصصة ليتابع الموكلون القضايا والمواعيد والمستندات المشتركة.",
        },
        {
          title: "أتمتة وقوائم تحقق",
          desc: "سير عمل وقوائم تحقق لتوحيد خطوات القضية.",
        },
        {
          title: "نسخ المستندات",
          desc: "سجل الإصدارات والمقارنة والعودة إلى نسخة سابقة.",
        },
        {
          title: "بحث دلالي",
          desc: "العثور على المستندات بالمعنى وليس بالعنوان فقط.",
        },
        {
          title: "سجلات التدقيق",
          desc: "تتبع الإجراءات الحساسة داخل المكتب.",
        },
        {
          title: "التشفير في التخزين",
          desc: "تعزيز تشفير البيانات المخزّنة على المنصة.",
        },
        {
          title: "مشاركة خارجية",
          desc: "روابط مشاركة مضبوطة خارج المكتب بصلاحيات محدودة.",
        },
        {
          title: "تعليقات مع إشارات",
          desc: "نقاشات داخل القضايا مع @إشارات لتنبيه الزميل.",
        },
      ],
    },
    cta: {
      kicker: "للمكاتب الحديثة",
      title: "شاهدوا JURE عمليا",
      subtitle: "أنشئوا مساحة عملكم خلال دقائق — دون بطاقة بنكية.",
      primary: "ابدأ الآن",
      secondary: "تحدث إلى الفريق",
    },
  },
};

const Features: React.FC = () => {
  const { lang, dir, path } = useMarketingLang();

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="features">
      <RouteSeo routeKey="features" lang={lang} />
      <FeaturesDeck t={STRINGS[lang]} lang={lang} path={path} />
    </MarketingShell>
  );
};

export default Features;
