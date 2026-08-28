// src/pages/Features.tsx — platform overview limited to shipped capabilities.
import React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Briefcase,
  BookOpen,
  CalendarClock,
  MessageSquare,
  Landmark,
  KeyRound,
  Globe,
  FileText,
  Users,
  Check,
  Clock,
  ArrowRight,
} from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import FeatureTile from "@/components/landing/FeatureTile";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";

/**
 * Features Page
 * - Shared MarketingShell (nav / lang / theme / footer)
 * - Visual language aligned with Landing (glass, reveal, brand #A58CF4)
 * - Only shipped capabilities are presented as available; planned work lives
 *   under an explicit "Coming soon" section.
 */

type Lang = "fr" | "en" | "ar";

type FeatureItem = { title: string; desc: string };

type DeepCard = { title: string; desc: string; bullets: string[]; badge?: string };

type FeaturesStrings = {
  hero: {
    titleA: string;
    titleB: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust: string;
  };
  highlights: { items: FeatureItem[] };
  deep: { ai: DeepCard; matters: DeepCard; documents: DeepCard; collab: DeepCard };
  comingSoon: { title: string; note: string; items: string[] };
  cta: { title: string; subtitle: string; primary: string; secondary: string };
};

const STRINGS: Record<Lang, FeaturesStrings> = {
  fr: {
    hero: {
      titleA: "Le travail juridique,",
      titleB: "réuni sur une seule plateforme.",
      subtitle:
        "Gestion des dossiers, bibliothèque documentaire, collaboration d'équipe, finance du cabinet et une IA juridique en accès anticipé — en français, anglais et arabe.",
      ctaPrimary: "Voir la démo",
      ctaSecondary: "Nous contacter",
      trust: "Isolation par cabinet • Accès par rôles • FR / EN / AR",
    },

    highlights: {
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

    deep: {
      ai: {
        title: "Juria — assistant IA juridique de JURE",
        badge: "Accès anticipé",
        desc:
          "L'assistant IA juridique de JURE, intégré à vos dossiers — conçu pour que chaque résultat soit relu et validé par un avocat.",
        bullets: [
          "Chat avec l'assistant",
          "Analyse de contrats",
          "Questions-réponses de type recherche",
          "Aide à la rédaction — avec relecture par l'avocat",
        ],
      },
      matters: {
        title: "Gestion des dossiers",
        desc:
          "Structurez dossiers, clients, documents, tâches et échéances dans un flux clair.",
        bullets: [
          "Dossiers reliés aux clients et aux documents",
          "Tâches et échéances par dossier",
          "Calendrier du cabinet",
          "Assignation des membres de l'équipe",
        ],
      },
      documents: {
        title: "Bibliothèque documentaire",
        desc:
          "Centralisez les documents du cabinet et retrouvez-les rapidement.",
        bullets: [
          "Import de documents",
          "Catégories et tags",
          "Recherche sur titre et description",
          "Aperçu PDF et DOCX dans le navigateur",
        ],
      },
      collab: {
        title: "Collaboration d'équipe",
        desc:
          "Échangez en temps réel avec votre équipe, sans quitter la plateforme.",
        bullets: [
          "Messagerie d'équipe en temps réel",
          "Appels audio et vidéo",
          "Notifications",
          "Accès encadré par les rôles",
        ],
      },
    },

    comingSoon: {
      title: "Bientôt",
      note:
        "Ces fonctionnalités sont en préparation et ne sont pas encore disponibles. Nous les annoncerons quand elles seront livrées.",
      items: [
        "Portail clients",
        "Intégrations (Drive, e-signature, API)",
        "SSO",
        "Automatisations et checklists",
        "Recherche sémantique",
        "Versions de documents",
        "Journaux d'audit",
        "Chiffrement au repos",
        "Commentaires avec mentions",
        "Partage externe",
      ],
    },

    cta: {
      title: "Découvrez JURE en pratique",
      subtitle: "Démonstration guidée en quelques minutes — sans carte bancaire.",
      primary: "Voir la démo",
      secondary: "Parler à l'équipe",
    },
  },

  en: {
    hero: {
      titleA: "Legal work,",
      titleB: "brought together in one platform.",
      subtitle:
        "Matter management, a document library, team collaboration, practice finance, and a legal AI in early access — in French, English and Arabic.",
      ctaPrimary: "View demo",
      ctaSecondary: "Contact us",
      trust: "Per-firm isolation • Role-based access • FR / EN / AR",
    },

    highlights: {
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

    deep: {
      ai: {
        title: "Juria — AI legal assistant by JURE",
        badge: "Early access",
        desc:
          "JURE's AI legal assistant, embedded in your matters — built so every output is reviewed and validated by a lawyer.",
        bullets: [
          "Chat with the assistant",
          "Contract analysis",
          "Research-style Q&A",
          "Drafting assistance — with lawyer review",
        ],
      },
      matters: {
        title: "Matter management",
        desc:
          "Bring structure to cases, clients, documents, tasks and deadlines.",
        bullets: [
          "Cases linked to clients and documents",
          "Tasks and deadlines per case",
          "Firm calendar",
          "Team member assignment",
        ],
      },
      documents: {
        title: "Document library",
        desc:
          "Centralize the firm's documents and find them fast.",
        bullets: [
          "Document upload",
          "Categories and tags",
          "Search on title and description",
          "PDF and DOCX preview in the browser",
        ],
      },
      collab: {
        title: "Team collaboration",
        desc:
          "Talk to your team in real time without leaving the platform.",
        bullets: [
          "Real-time team chat",
          "Voice and video calls",
          "Notifications",
          "Access governed by roles",
        ],
      },
    },

    comingSoon: {
      title: "Coming soon",
      note:
        "These capabilities are in the works and not available yet. We'll announce them when they ship.",
      items: [
        "Client portal",
        "Integrations (Drive, e-signature, API)",
        "SSO",
        "Automations and checklists",
        "Semantic search",
        "Document versioning",
        "Audit trails",
        "Encryption at rest",
        "Comments with mentions",
        "External sharing",
      ],
    },

    cta: {
      title: "See JURE in practice",
      subtitle: "Guided demo in minutes — no credit card required.",
      primary: "View demo",
      secondary: "Talk to the team",
    },
  },

  ar: {
    hero: {
      titleA: "العمل القانوني،",
      titleB: "مجموعًا في منصة واحدة.",
      subtitle:
        "إدارة القضايا، مكتبة المستندات، تعاون الفريق، مالية المكتب، وذكاء اصطناعي قانوني في مرحلة الوصول المبكر — بالفرنسية والإنجليزية والعربية.",
      ctaPrimary: "شاهد العرض",
      ctaSecondary: "تواصل معنا",
      trust: "عزل بيانات كل مكتب • وصول حسب الأدوار • FR / EN / AR",
    },

    highlights: {
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
          desc: "مهام مُسندة، مواعيد نهائية، ومفكرة مشتركة للمكتب.",
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

    deep: {
      ai: {
        title: "جوريا — مساعد الذكاء الاصطناعي القانوني من JURE",
        badge: "الوصول المبكر",
        desc:
          "مساعد الذكاء الاصطناعي القانوني من JURE، مدمج في قضاياكم — مصمم بحيث تُراجَع كل نتيجة ويعتمدها محامٍ.",
        bullets: [
          "محادثة مع المساعد",
          "تحليل العقود",
          "أسئلة وأجوبة بأسلوب البحث",
          "مساعدة في الصياغة — مع مراجعة المحامي",
        ],
      },
      matters: {
        title: "إدارة القضايا",
        desc:
          "نظّموا القضايا والموكلين والمستندات والمهام والمواعيد في سير عمل واضح.",
        bullets: [
          "قضايا مرتبطة بالموكلين والمستندات",
          "مهام ومواعيد نهائية لكل قضية",
          "مفكرة المكتب",
          "إسناد أعضاء الفريق",
        ],
      },
      documents: {
        title: "مكتبة المستندات",
        desc:
          "اجمعوا مستندات المكتب في مكان واحد واعثروا عليها بسرعة.",
        bullets: [
          "رفع المستندات",
          "تصنيفات ووسوم",
          "بحث في العنوان والوصف",
          "معاينة PDF وDOCX في المتصفح",
        ],
      },
      collab: {
        title: "تعاون الفريق",
        desc:
          "تواصلوا مع فريقكم في الوقت الحقيقي دون مغادرة المنصة.",
        bullets: [
          "دردشة فريق فورية",
          "مكالمات صوتية ومرئية",
          "إشعارات",
          "وصول محكوم بالأدوار",
        ],
      },
    },

    comingSoon: {
      title: "قريبًا",
      note:
        "هذه الإمكانات قيد الإعداد وغير متاحة بعد. سنعلن عنها عند إطلاقها.",
      items: [
        "بوابة الموكلين",
        "تكاملات (درايف، توقيع إلكتروني، واجهة برمجية)",
        "SSO",
        "أتمتة وقوائم تحقق",
        "بحث دلالي",
        "نسخ المستندات",
        "سجلات التدقيق",
        "التشفير في التخزين",
        "تعليقات مع إشارات",
        "مشاركة خارجية",
      ],
    },

    cta: {
      title: "شاهدوا JURE عمليًا",
      subtitle: "عرض إرشادي خلال دقائق — دون بطاقة بنكية.",
      primary: "شاهد العرض",
      secondary: "تحدث إلى الفريق",
    },
  },
};

const HIGHLIGHT_ICONS = [Sparkles, Briefcase, BookOpen, CalendarClock, MessageSquare, Landmark, KeyRound, Globe];
const HIGHLIGHT_ACCENTS = ["#A58CF4", "#4D3680", "#3E2D71", "#A58CF4", "#6D5AB6", "#A58CF4", "#4D3680", "#3E2D71"];

const Features: React.FC = () => {
  const navigate = useNavigate();
  const { lang, dir, path } = useMarketingLang();
  const t = STRINGS[lang];
  const isRtl = dir === "rtl";

  const go = (to: string) => navigate(to);

  const deepCards = [
    { key: "ai", icon: Sparkles, accent: "#A58CF4", data: t.deep.ai },
    { key: "matters", icon: FileText, accent: "#4D3680", data: t.deep.matters },
    { key: "documents", icon: BookOpen, accent: "#3E2D71", data: t.deep.documents },
    { key: "collab", icon: Users, accent: "#A58CF4", data: t.deep.collab },
  ];

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="features">
      <RouteSeo routeKey="features" lang={lang} />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-12 md:pt-24 md:pb-16">
        <Reveal className="text-center max-w-4xl mx-auto min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight break-words text-[#64499D] dark:text-white">
            {t.hero.titleA}
            <br />
            <span className="landing-hero-shimmer bg-gradient-to-r from-[#A58CF4] via-[#C4B0EF] to-[#A58CF4] bg-clip-text text-transparent">
              {t.hero.titleB}
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-300 leading-relaxed break-words">
            {t.hero.subtitle}
          </p>

          <div
            className={`mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto ${
              isRtl ? "sm:flex-row-reverse" : ""
            }`}
          >
            <Button
              onClick={() => go(path("demo"))}
              size="lg"
              className="landing-cta-btn landing-btn-primary w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium"
            >
              {t.hero.ctaPrimary}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <Button
              onClick={() => go(path("contact"))}
              variant="outline"
              size="lg"
              className="landing-btn-secondary w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg"
            >
              {t.hero.ctaSecondary}
            </Button>
          </div>

          <p className="mt-6 text-sm text-neutral-500">{t.hero.trust}</p>
        </Reveal>
      </section>

      {/* Highlights grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16 md:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {t.highlights.items.map((it, idx) => {
            const Icon = HIGHLIGHT_ICONS[idx] || Sparkles;
            return (
              <FeatureTile
                key={idx}
                icon={<Icon className="w-6 h-6" />}
                title={it.title}
                description={it.desc}
                accent={HIGHLIGHT_ACCENTS[idx] || "#A58CF4"}
                delay={idx * 0.04}
              />
            );
          })}
        </div>
      </section>

      <div className="landing-divider mb-16 md:mb-20" aria-hidden />

      {/* Deep-dive cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16 md:pb-20">
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 ${isRtl ? "md:[direction:rtl]" : ""}`}>
          {deepCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Reveal key={card.key} delay={i * 0.06}>
                <div
                  className={`landing-glass landing-glass-glow rounded-2xl p-5 sm:p-7 h-full min-w-0 group ${
                    card.key === "ai" ? "cursor-pointer" : ""
                  }`}
                  onClick={card.key === "ai" ? () => go(path("juria")) : undefined}
                  role={card.key === "ai" ? "link" : undefined}
                  tabIndex={card.key === "ai" ? 0 : undefined}
                  onKeyDown={
                    card.key === "ai"
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") go(path("juria"));
                        }
                      : undefined
                  }
                >
                  <div className="landing-icon w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight break-words">
                      {card.data.title}
                    </h3>
                    {card.data.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide text-[10px] font-semibold">
                        {card.data.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-5 leading-relaxed break-words">{card.data.desc}</p>
                  <ul className="space-y-2.5 text-neutral-700 dark:text-neutral-300">
                    {card.data.bullets.map((b, bi) => (
                      <li key={bi} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[#A58CF4] dark:text-[#A58CF4] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Coming soon */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16 md:pb-20">
        <Reveal>
          <div className={`landing-glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 min-w-0 ${isRtl ? "text-right" : "text-start"}`}>
            <div className="flex items-center gap-3 mb-3 min-w-0">
              <div className="landing-icon w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold break-words">{t.comingSoon.title}</h2>
            </div>
            <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300 mb-6 break-words">
              {t.comingSoon.note}
            </p>
            <div className="flex flex-wrap gap-2">
              {t.comingSoon.items.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 rounded-full border border-dashed border-[#64499D]/15 dark:border-white/15 text-sm text-neutral-600 dark:text-neutral-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <Reveal>
          <div className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 text-white overflow-hidden landing-band">
            <div className="relative text-center max-w-3xl mx-auto min-w-0">
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 break-words">
                {t.cta.title}
              </h3>
              <p className="text-white/70 text-base sm:text-lg break-words">{t.cta.subtitle}</p>

              <div
                className={`mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto ${
                  isRtl ? "sm:flex-row-reverse" : ""
                }`}
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium landing-btn-on-dark"
                  onClick={() => go(path("demo"))}
                >
                  {t.cta.primary}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium landing-btn-ghost-dark"
                  onClick={() => go(path("contact"))}
                >
                  {t.cta.secondary}
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
};

export default Features;
