// src/pages/Features.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import ThemeToggle from "@/components/ThemeToggle"; // ✅ shared minimalist toggle

/**
 * Features Page
 * - Independent page aligned with Landing/About (brand, RTL, dark mode)
 * - Primary: #64499D
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

const LangSwitcher: React.FC<{ lang: Lang; onChange: (l: Lang) => void }> = ({ lang, onChange }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
    {(["fr", "en", "ar"] as Lang[]).map((code) => (
      <button
        key={code}
        onClick={() => onChange(code)}
        className={`px-3 py-2 text-sm ${
          lang === code
            ? "bg-[#64499D] text-white"
            : "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        {code === "fr" ? "FR" : code === "en" ? "EN" : "AR"}
      </button>
    ))}
  </div>
);

const Features: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const year = new Date().getFullYear();
  const dirClass = t.dir === "rtl" ? "md:flex-row-reverse" : "";

  const go = (to: string) => navigate(to);

  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full blur-3xl opacity-20 dark:opacity-30 animate-blob" style={{ background: "#64499D" }} />
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-2000" style={{ background: "#3E2D71" }} />
        <div className="absolute top-48 left-24 w-72 h-72 rounded-full blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-4000" style={{ background: "#8B6FD1" }} />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between" aria-label="main navigation">
          <div className="flex items-center gap-3">
            <img src="/images/Jure logo.png" alt="JURE" className="w-[140px] h-10 object-contain" loading="eager" decoding="async" />
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => go("/features")} className="text-[#64499D] dark:text-[#CFC2FF] font-semibold">
              {t.nav.features}
            </button>
            <button onClick={() => go("/pricing")} className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors">
              {t.nav.pricing}
            </button>
            <button onClick={() => go("/about")} className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors">
              {t.nav.about}
            </button>
            <button onClick={() => go("/contact")} className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors">
              {t.nav.contact}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} onChange={setLang} />
            {/* ✅ shared minimalist toggle */}
            <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title} />
            <Button
              onClick={() => go("/signin")}
              variant="outline"
              className="border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20"
            >
              {t.auth.signin}
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-12 md:pt-24 md:pb-16">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
                {t.hero.titleA}
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#64499D] to-[#4D3680] bg-clip-text text-transparent">
                {t.hero.titleB}
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center ${t.dir === "rtl" ? "sm:flex-row-reverse" : ""}`}>
              <Button
                onClick={() => go("/demo")}
                size="lg"
                className="px-7 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
              >
                {t.hero.ctaPrimary}
                <ArrowRight className={`ml-2 h-5 w-5 ${t.dir === "rtl" ? "rotate-180" : ""}`} />
              </Button>
              <Button
                onClick={() => go("/contact")}
                variant="outline"
                size="lg"
                className="px-7 py-6 text-lg border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t.hero.ctaSecondary}
              </Button>
            </div>

            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t.hero.trust}</p>
          </div>
        </section>

        {/* Highlights grid */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {t.highlights.items.map((it: any, idx: number) => {
              const Icon = [Zap, FileText, Users, BookOpen, MessageSquare, Database, BarChart, Shield][idx] || Shield;
              const color =
                idx === 0 ? "#64499D" : idx === 1 ? "#4D3680" : idx === 2 ? "#3E2D71" : idx === 3 ? "#8B6FD1" : "#6D5AB6";
              return (
                <div
                  key={idx}
                  className="group p-7 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm hover:shadow-lg transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white group-hover:scale-105 transition-transform"
                    style={{ background: color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{it.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300">{it.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Deep-dive cards */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-20">
          <div className={`grid md:grid-cols-2 gap-6 md:gap-8 ${t.dir === "rtl" ? "md:[direction:rtl]" : ""}`}>
            {/* AI */}
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: "#64499D" }}>
                  <Zap className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">{t.deep.ai.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{t.deep.ai.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {t.deep.ai.bullets.map((b: string, i: number) => (
                    <li key={i} className="flex items-center">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Security */}
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: "#4D3680" }}>
                  <Shield className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">{t.deep.security.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{t.deep.security.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {t.deep.security.bullets.map((b: string, i: number) => (
                    <li key={i} className="flex items-center">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Matters */}
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: "#3E2D71" }}>
                  <FileText className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">{t.deep.matters.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{t.deep.matters.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {t.deep.matters.bullets.map((b: string, i: number) => (
                    <li key={i} className="flex items-center">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Collaboration */}
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: "#8B6FD1" }}>
                  <Users className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">{t.deep.collab.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{t.deep.collab.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {t.deep.collab.bullets.map((b: string, i: number) => (
                    <li key={i} className="flex items-center">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      {b}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="rounded-3xl p-10 md:p-12 text-white bg-gradient-to-r from-[#64499D] to-[#4D3680]">
            <div className="text-center max-w-3xl mx-auto">
              <h3 className="text-3xl md:text-4xl font-bold mb-3">{t.cta.title}</h3>
              <p className="text-purple-100 text-lg">{t.cta.subtitle}</p>

              <div className={`mt-8 flex flex-col sm:flex-row gap-4 justify-center ${t.dir === "rtl" ? "sm:flex-row-reverse" : ""}`}>
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg font-medium bg-white text-slate-900 hover:bg-slate-100"
                  onClick={() => go("/demo")}
                >
                  {t.cta.primary}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-lg font-medium border-white/70 text-white hover:bg-white/10"
                  onClick={() => go("/contact")}
                >
                  {t.cta.secondary}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-black text-white py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`flex flex-col md:flex-row justify-between items-center gap-6 ${dirClass}`}>
            <div className="flex items-center gap-3">
              <img src="/images/Jure logo.png" alt="JURE" className="w-[120px] h-8 object-contain" loading="lazy" decoding="async" />
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-300">
              <button onClick={() => go("/privacy")} className="hover:text-white">{t.footer.privacy}</button>
              <button onClick={() => go("/terms")} className="hover:text-white">{t.footer.terms}</button>
              <button onClick={() => go("/status")} className="hover:text-white">{t.footer.status}</button>
            </div>
            <div className="text-slate-400 text-sm">© {year} JURE. {t.footer.rights}</div>
          </div>
        </div>
      </footer>

      {/* Scoped animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(20px, -10px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.98); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 12s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default Features;
