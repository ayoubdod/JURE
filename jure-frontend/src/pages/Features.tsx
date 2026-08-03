// src/pages/Features.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Shield,
  Users,
  BookOpen,
  FileText,
  MessageSquare,
  BarChart,
  Database,
  Check,
  ArrowRight,
} from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import FeatureTile from "@/components/landing/FeatureTile";

/**
 * Features Page
 * - Shared MarketingShell (nav / lang / theme / footer)
 * - Visual language aligned with Landing (glass, reveal, brand #64499D)
 */

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },

    hero: {
      titleA: "Des fonctionnalités puissantes,",
      titleB: "conçues pour le métier juridique.",
      subtitle:
        "IA responsable, gestion des dossiers, sécurité de niveau entreprise et collaboration fluide — le tout dans une seule plateforme.",
      ctaPrimary: "Essayer la démo",
      ctaSecondary: "Nous contacter",
      trust: "Privacy-by-design • Contrôle d’accès • Traçabilité",
    },

    highlights: {
      items: [
        { title: "IA juridique", desc: "Recherche, analyse contractuelle et rédaction assistée avec citations." },
        { title: "Gestion de dossiers", desc: "Workflow, tâches, échéances et pièces jointes centralisées." },
        { title: "Collaboration", desc: "Commentaires, mentions, salons d’équipe et partage sécurisé." },
        { title: "Bibliothèque", desc: "Base documentaire, tags, recherche sémantique, versions & références." },
        { title: "Portail clients", desc: "Accès sécurisé aux documents, messages et suivis." },
        { title: "Automations", desc: "Génération de modèles, checklists, validations, et rappels." },
        { title: "Analytique", desc: "Tableaux de bord, KPI par dossier, performance et charge équipe." },
        { title: "Intégrations", desc: "Drive, e-signature, suites bureautiques, SSO et API." },
      ],
    },

    deep: {
      ai: {
        title: "IA juridique responsable",
        desc:
          "Accélérez vos recherches et vos drafts en gardant le contrôle: sources citées, paramètres de confidentialité, et validation par l’humain.",
        bullets: [
          "Analyse de clauses et repérage de risques",
          "Rédaction assistée (mémos, contrats, emails)",
          "Repérage de références et jurisprudence",
          "Paramètres de confidentialité & journaux",
        ],
      },
      security: {
        title: "Sécurité & conformité",
        desc:
          "Conçue pour les environnements sensibles: chiffrement, rôles, audit, et bonnes pratiques de conformité.",
        bullets: [
          "Chiffrement en transit & au repos",
          "Contrôle d’accès granulaire par rôle",
          "Journaux d’audit détaillés",
          "Rétention et politiques de données",
        ],
      },
      matters: {
        title: "Gestion des dossiers",
        desc:
          "Structurez vos dossiers, tâches, échéances, documents et responsabilités dans un flux clair.",
        bullets: [
          "Chronologies, tâches et rappels",
          "Assignations & SLA internes",
          "Modèles et checklists réutilisables",
          "Pièces jointes, notes & versions",
        ],
      },
      collab: {
        title: "Collaboration d’équipe",
        desc:
          "Travaillez en temps réel sur des documents, messages et notes — avec un partage maîtrisé.",
        bullets: [
          "Commentaires avec mentions",
          "Fils de discussion par dossier",
          "Partage interne/externe",
          "Notifications intelligentes",
        ],
      },
    },

    cta: {
      title: "Passez à la pratique augmentée",
      subtitle: "Démonstration guidée en quelques minutes — sans carte bancaire.",
      primary: "Voir la démo",
      secondary: "Parler à l’équipe",
    },

    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },

  en: {
    htmlLang: "en",
    dir: "ltr",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },

    hero: {
      titleA: "Powerful features,",
      titleB: "built for legal work.",
      subtitle:
        "Responsible AI, matter management, enterprise-grade security, and seamless collaboration — all in one platform.",
      ctaPrimary: "Try the demo",
      ctaSecondary: "Talk to sales",
      trust: "Privacy-by-design • Access control • Auditability",
    },

    highlights: {
      items: [
        { title: "Legal AI", desc: "Research, contract analysis, and assisted drafting with citations." },
        { title: "Matter Management", desc: "Workflows, tasks, deadlines, and centralized attachments." },
        { title: "Collaboration", desc: "Comments, mentions, team rooms, and secure sharing." },
        { title: "Knowledge Library", desc: "KB, tags, semantic search, versioning & references." },
        { title: "Client Portal", desc: "Secure access to documents, messages, and status." },
        { title: "Automations", desc: "Templates, checklists, validations, and reminders." },
        { title: "Analytics", desc: "Dashboards, matter KPIs, performance & workload." },
        { title: "Integrations", desc: "Drive, e-signature, office suites, SSO, and API." },
      ],
    },

    deep: {
      ai: {
        title: "Responsible Legal AI",
        desc:
          "Accelerate research and drafting with transparent sources, privacy controls, and human validation.",
        bullets: [
          "Clause analysis & risk spotting",
          "Assisted drafting (memos, contracts, emails)",
          "Reference & case-law surfacing",
          "Privacy controls & audit logs",
        ],
      },
      security: {
        title: "Security & compliance",
        desc:
          "Built for sensitive environments: encryption, roles, audit, and sound compliance practices.",
        bullets: [
          "Encryption at rest & in transit",
          "Granular role-based access",
          "Detailed audit trails",
          "Retention & data policies",
        ],
      },
      matters: {
        title: "Matter management",
        desc:
          "Bring structure to matters, tasks, deadlines, documents, and responsibilities.",
        bullets: [
          "Timelines, tasks & reminders",
          "Assignments & internal SLAs",
          "Reusable templates & checklists",
          "Attachments, notes & versions",
        ],
      },
      collab: {
        title: "Team collaboration",
        desc:
          "Work in real time across docs, messages, and notes — with controlled sharing.",
        bullets: [
          "Comments with mentions",
          "Threaded conversations per matter",
          "Internal/external sharing",
          "Smart notifications",
        ],
      },
    },

    cta: {
      title: "Move to augmented practice",
      subtitle: "Guided demo in minutes — no credit card required.",
      primary: "View demo",
      secondary: "Talk to the team",
    },

    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
  },

  ar: {
    htmlLang: "ar",
    dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },

    hero: {
      titleA: "ميزات قوية،",
      titleB: "مصمّمة لعمل القانون.",
      subtitle:
        "ذكاء اصطناعي مسؤول، إدارة القضايا، أمان بمستوى المؤسسات، وتعاون سلس — كل ذلك في منصة واحدة.",
      ctaPrimary: "جرّب العرض",
      ctaSecondary: "تحدث إلى الفريق",
      trust: "الخصوصية بالتصميم • التحكم بالصلاحيات • سجلات تدقيق",
    },

    highlights: {
      items: [
        { title: "ذكاء قانوني", desc: "بحث، تحليل العقود، وصياغة مدعومة بالاستشهادات." },
        { title: "إدارة القضايا", desc: "سير العمل، المهام، المواعيد النهائية، والمرفقات." },
        { title: "تعاون", desc: "تعليقات، إشارات، غرف فرق، ومشاركة آمنة." },
        { title: "مكتبة المعرفة", desc: "قاعدة معرفية، وسوم، بحث دلالي، نسخ ومراجع." },
        { title: "بوابة العملاء", desc: "وصول آمن للوثائق والرسائل والمتابعة." },
        { title: "أتمتة", desc: "قوالب، قوائم تحقق، اعتماد، وتذكيرات." },
        { title: "تحليلات", desc: "لوحات معلومات، مؤشرات القضايا، الأداء والحمولة." },
        { title: "تكاملات", desc: "درايف، توقيع إلكتروني، أجنحة مكتبية، SSO وواجهة برمجة." },
      ],
    },

    deep: {
      ai: {
        title: "ذكاء قانوني مسؤول",
        desc:
          "سرّع البحث والصياغة مع مصادر واضحة، وضوابط خصوصية، وتحقق بشري.",
        bullets: [
          "تحليل بنود ورصد المخاطر",
          "صياغة مدعومة (مذكرات، عقود، رسائل)",
          "استخراج مراجع وقضاء",
          "ضوابط خصوصية وسجلات تدقيق",
        ],
      },
      security: {
        title: "الأمن والامتثال",
        desc:
          "مصمم للبيئات الحسّاسة: تشفير، أدوار، تدقيق، وممارسات امتثال راسخة.",
        bullets: [
          "تشفير أثناء النقل وفي التخزين",
          "تحكم دقيق في الصلاحيات حسب الأدوار",
          "سجلات تدقيق مفصلة",
          "سياسات بيانات واحتفاظ",
        ],
      },
      matters: {
        title: "إدارة القضايا",
        desc:
          "نظّم القضايا والمهام والمواعيد والمستندات والمسؤوليات في سير واضح.",
        bullets: [
          "جداول زمنية ومهام وتذكيرات",
          "إسناد وسقوف زمنية داخلية",
          "قوالب وقوائم تحقق قابلة لإعادة الاستخدام",
          "مرفقات وملاحظات ونسخ",
        ],
      },
      collab: {
        title: "تعاون الفريق",
        desc:
          "اعملوا في الوقت الحقيقي عبر المستندات والرسائل والملاحظات — مع مشاركة مضبوطة.",
        bullets: [
          "تعليقات مع إشارات",
          "محادثات متسلسلة لكل قضية",
          "مشاركة داخلية/خارجية",
          "إشعارات ذكية",
        ],
      },
    },

    cta: {
      title: "انتقل إلى ممارسة معززة",
      subtitle: "عرض إرشادي خلال دقائق — دون بطاقة بنكية.",
      primary: "شاهد العرض",
      secondary: "تواصل معنا",
    },

    footer: { privacy: "الخصوصية", terms: "الشروط", status: "الحالة", rights: "جميع الحقوق محفوظة." },
  },
};

const useI18n = () => {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored === "fr" || stored === "en" || stored === "ar") return stored;
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("ar")) return "ar";
    return "en";
  });

  useEffect(() => {
    const pack = STRINGS[lang];
    document.documentElement.setAttribute("lang", pack.htmlLang);
    document.documentElement.setAttribute("dir", pack.dir);
    localStorage.setItem("lang", lang);
  }, [lang]);

  return { lang, setLang, t: STRINGS[lang] };
};

const HIGHLIGHT_ICONS = [Zap, FileText, Users, BookOpen, MessageSquare, Database, BarChart, Shield];
const HIGHLIGHT_ACCENTS = ["#64499D", "#4D3680", "#3E2D71", "#8B6FD1", "#6D5AB6", "#64499D", "#4D3680", "#3E2D71"];

const Features: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const isRtl = t.dir === "rtl";

  const go = (to: string) => navigate(to);

  const deepCards = [
    { key: "ai", icon: Zap, accent: "#64499D", data: t.deep.ai },
    { key: "security", icon: Shield, accent: "#4D3680", data: t.deep.security },
    { key: "matters", icon: FileText, accent: "#3E2D71", data: t.deep.matters },
    { key: "collab", icon: Users, accent: "#8B6FD1", data: t.deep.collab },
  ];

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{
        nav: { features: t.nav.features, about: t.nav.about, contact: t.nav.contact },
        auth: t.auth,
        themeToggle: t.themeToggle,
        footer: t.footer,
      }}
      dir={t.dir}
      activeNav="features"
    >
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-12 md:pt-24 md:pb-16">
        <Reveal className="text-center max-w-4xl mx-auto min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight break-words">
            <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.titleA}
            </span>
            <br />
            <span className="relative inline-block mt-1 max-w-full">
              <span
                aria-hidden
                className="absolute inset-0 blur-2xl opacity-40 dark:opacity-50 bg-gradient-to-r from-[#64499D] to-[#8B6FD1]"
              />
              <span className="relative bg-gradient-to-r from-[#64499D] via-[#8B6FD1] to-[#4D3680] bg-clip-text text-transparent">
                {t.hero.titleB}
              </span>
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed break-words">
            {t.hero.subtitle}
          </p>

          <div
            className={`mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto ${
              isRtl ? "sm:flex-row-reverse" : ""
            }`}
          >
            <Button
              onClick={() => go("/demo")}
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium shadow-lg hover:shadow-[0_0_32px_-6px_rgba(100,73,157,0.55)] transition-shadow bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
            >
              {t.hero.ctaPrimary}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <Button
              onClick={() => go("/contact")}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg border-[#64499D]/25 dark:border-[#8B6FD1]/30 text-slate-800 dark:text-slate-100 hover:bg-[#F4F1FF]/80 dark:hover:bg-[#64499D]/15 backdrop-blur-sm"
            >
              {t.hero.ctaSecondary}
            </Button>
          </div>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t.hero.trust}</p>
        </Reveal>
      </section>

      {/* Highlights grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16 md:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {t.highlights.items.map((it: { title: string; desc: string }, idx: number) => {
            const Icon = HIGHLIGHT_ICONS[idx] || Shield;
            return (
              <FeatureTile
                key={idx}
                icon={<Icon className="w-6 h-6" />}
                title={it.title}
                description={it.desc}
                accent={HIGHLIGHT_ACCENTS[idx] || "#64499D"}
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
                <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-7 h-full min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                    style={{ background: card.accent }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-2 break-words">{card.data.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-5 leading-relaxed break-words">{card.data.desc}</p>
                  <ul className="space-y-2.5 text-slate-700 dark:text-slate-300">
                    {card.data.bullets.map((b: string, bi: number) => (
                      <li key={bi} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1] shrink-0 mt-0.5" />
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

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <Reveal>
          <div className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 text-white overflow-hidden landing-panel-glow bg-gradient-to-br from-[#64499D] via-[#4D3680] to-[#3E2D71]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)",
              }}
            />
            <div className="relative text-center max-w-3xl mx-auto min-w-0">
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 break-words">
                {t.cta.title}
              </h3>
              <p className="text-purple-100 text-base sm:text-lg break-words">{t.cta.subtitle}</p>

              <div
                className={`mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto ${
                  isRtl ? "sm:flex-row-reverse" : ""
                }`}
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
                  onClick={() => go("/demo")}
                >
                  {t.cta.primary}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium border-white/70 text-white hover:bg-white/10"
                  onClick={() => go("/contact")}
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
