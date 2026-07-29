// src/pages/Privacy.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, FileText, Globe, Cookie, ArrowRight } from "lucide-react";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    hero: {
      titleA: "Politique de confidentialité",
      subtitle:
        "Nous protégeons vos données par conception (privacy-by-design) avec des contrôles d’accès, chiffrement et traçabilité.",
      ctaPrimary: "Contacter le DPO",
      ctaSecondary: "Voir le statut",
      lastUpdated: "Dernière mise à jour",
    },
    sections: {
      intro: {
        title: "Introduction",
        text:
          "Cette Politique explique quelles données nous collectons, comment nous les utilisons, sur quelles bases légales et quels sont vos droits.",
      },
      data: {
        title: "Données que nous collectons",
        bullets: [
          "Données de compte (identité, coordonnées, authentification).",
          "Données d’utilisation (télémétrie, logs, mesures de performance).",
          "Contenus fournis par l’utilisateur (documents, messages, métadonnées).",
          "Données techniques (navigateurs, appareils, adresses IP tronquées).",
        ],
      },
      use: {
        title: "Finalités et bases légales",
        bullets: [
          "Fournir le service et l’assistance (exécution du contrat).",
          "Sécuriser, prévenir la fraude et auditer (intérêt légitime).",
          "Améliorer le produit (intérêt légitime, avec minimisation).",
          "Conformité légale et demandes des autorités.",
        ],
      },
      retention: {
        title: "Conservation",
        text:
          "Nous conservons les données le temps nécessaire aux finalités décrites ou requis par la loi, puis nous les supprimons ou les anonymisons.",
      },
      rights: {
        title: "Vos droits",
        bullets: [
          "Accès, rectification, effacement.",
          "Limitation et opposition au traitement.",
          "Portabilité des données.",
          "Réclamation auprès de l’autorité compétente.",
        ],
      },
      security: {
        title: "Sécurité",
        text:
          "Chiffrement en transit/au repos, contrôles d’accès basés sur les rôles, journaux d’audit, revues de sécurité et sauvegardes.",
      },
      transfers: {
        title: "Transferts internationaux",
        text:
          "Lorsque pertinent, nous utilisons des mécanismes conformes (clauses contractuelles types ou équivalents) et des évaluations d’impact.",
      },
      cookies: {
        title: "Cookies et technologies similaires",
        text:
          "Cookies strictement nécessaires, analytiques et fonctionnels. Vous pouvez gérer vos préférences dans le navigateur.",
      },
      contact: {
        title: "Contact DPO",
        text:
          "Pour toute question ou demande relative à vos données, écrivez-nous : dpo@jure.example",
      },
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
      titleA: "Privacy Policy",
      subtitle:
        "We protect your data by design with access controls, encryption, and auditability.",
      ctaPrimary: "Contact the DPO",
      ctaSecondary: "View Status",
      lastUpdated: "Last updated",
    },
    sections: {
      intro: {
        title: "Introduction",
        text:
          "This Policy explains what data we collect, how we use it, our legal bases, and your rights.",
      },
      data: {
        title: "Data we collect",
        bullets: [
          "Account data (identity, contact, authentication).",
          "Usage data (telemetry, logs, performance metrics).",
          "User-provided content (documents, messages, metadata).",
          "Technical data (browsers, devices, truncated IPs).",
        ],
      },
      use: {
        title: "Purposes & legal bases",
        bullets: [
          "Provide service & support (contract performance).",
          "Security, anti-fraud, and auditing (legitimate interest).",
          "Product improvement (legitimate interest, data minimization).",
          "Legal compliance and regulatory requests.",
        ],
      },
      retention: {
        title: "Retention",
        text:
          "We retain data for as long as needed for the purposes described or as required by law, then erase or anonymize it.",
      },
      rights: {
        title: "Your rights",
        bullets: [
          "Access, rectification, erasure.",
          "Restriction and objection to processing.",
          "Data portability.",
          "Complaint to the competent authority.",
        ],
      },
      security: {
        title: "Security",
        text:
          "Encryption in transit/at rest, role-based access controls, audit logs, security reviews, and backups.",
      },
      transfers: {
        title: "International transfers",
        text:
          "Where relevant, we use compliant mechanisms (e.g., SCCs or equivalents) and transfer impact assessments.",
      },
      cookies: {
        title: "Cookies & similar tech",
        text:
          "Strictly necessary, analytics, and functional cookies. You can manage preferences in your browser.",
      },
      contact: {
        title: "DPO contact",
        text:
          "For questions or requests regarding your data, email us at: dpo@jure.example",
      },
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
      titleA: "سياسة الخصوصية",
      subtitle:
        "نحمي بياناتك وفق مبدأ الخصوصية بالتصميم مع ضوابط وصول وتشفير وسجلات تدقيق.",
      ctaPrimary: "التواصل مع مسؤول حماية البيانات",
      ctaSecondary: "عرض الحالة",
      lastUpdated: "آخر تحديث",
    },
    sections: {
      intro: {
        title: "مقدمة",
        text:
          "توضح هذه السياسة ما نجمعه من بيانات وكيف نستخدمها والأسس القانونية وحقوقك.",
      },
      data: {
        title: "البيانات التي نجمعها",
        bullets: [
          "بيانات الحساب (الهوية، الاتصال، المصادقة).",
          "بيانات الاستخدام (القياسات والسجلات والأداء).",
          "المحتوى المقدم من المستخدم (الوثائق والرسائل والبيانات الوصفية).",
          "البيانات التقنية (المتصفحات والأجهزة وعناوين IP مختصرة).",
        ],
      },
      use: {
        title: "الأغراض والأسس القانونية",
        bullets: [
          "تقديم الخدمة والدعم (تنفيذ العقد).",
          "الأمن ومكافحة الاحتيال والتدقيق (مصلحة مشروعة).",
          "تحسين المنتج (مصلحة مشروعة مع تقليل البيانات).",
          "الامتثال القانوني وطلبات الجهات المنظمة.",
        ],
      },
      retention: {
        title: "الاحتفاظ",
        text:
          "نحتفظ بالبيانات للمدة اللازمة للأغراض الموضحة أو كما يقتضيه القانون، ثم نحذفها أو نجعلها مجهولة.",
      },
      rights: {
        title: "حقوقك",
        bullets: [
          "الوصول والتصحيح والحذف.",
          "تقييد المعالجة والاعتراض عليها.",
          "قابلية نقل البيانات.",
          "تقديم شكوى للجهة المختصة.",
        ],
      },
      security: {
        title: "الأمن",
        text:
          "تشفير أثناء النقل وفي التخزين، صلاحيات مبنية على الأدوار، سجلات تدقيق، مراجعات أمنية ونسخ احتياطية.",
      },
      transfers: {
        title: "النقل الدولي",
        text:
          "عند اللزوم، نعتمد آليات متوافقة (بنود تعاقدية معيارية أو ما يعادلها) وتقييمات أثر النقل.",
      },
      cookies: {
        title: "ملفات تعريف الارتباط",
        text:
          "ضرورية للغاية وتحليلية ووظيفية. يمكنك إدارة التفضيلات من المتصفح.",
      },
      contact: {
        title: "جهة الاتصال",
        text:
          "للاستفسارات أو الطلبات المتعلقة ببياناتك: dpo@jure.example",
      },
    },
    footer: { privacy: "الخصوصية", terms: "الشروط", status: "الحالة", rights: "جميع الحقوق محفوظة." },
  },
};

const useI18n = () => {
  const [lang, setLang] = useState<Lang>(() => {
    const s = localStorage.getItem("lang") as Lang | null;
    if (s === "fr" || s === "en" || s === "ar") return s;
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

const ThemeToggle: React.FC<{ label?: string; title?: string }> = ({ label, title }) => {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", shouldDark);
    setIsDark(shouldDark);
  }, []);
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <Button
      onClick={toggle}
      variant="outline"
      className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
      aria-label={label || "Toggle theme"}
      title={title || "Toggle theme"}
    >
      {isDark ? "☀️" : "🌙"}
    </Button>
  );
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

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({
  icon, title, children,
}) => (
  <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
    <CardHeader className="pb-2">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl grid place-items-center text-white" style={{ background: "#64499D" }}>
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="pt-2">{children}</CardContent>
  </Card>
);

const Privacy: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const lastUpdated = "2025-08-15";

  const go = (to: string) => navigate(to);

  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full blur-3xl opacity-20 dark:opacity-30 animate-blob" style={{ background: "#64499D" }} />
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-2000" style={{ background: "#3E2D71" }} />
        <div className="absolute top-48 left-24 w-72 h-72 rounded-full blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-4000" style={{ background: "#8B6FD1" }} />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[140px] h-10 object-contain" />
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => go("/features")} className="hover:text-[#64499D]"> {t.nav.features} </button>
            <button onClick={() => go("/pricing")} className="hover:text-[#64499D]"> {t.nav.pricing} </button>
            <button onClick={() => go("/about")} className="hover:text-[#64499D]"> {t.nav.about} </button>
            <button onClick={() => go("/contact")} className="hover:text-[#64499D]"> {t.nav.contact} </button>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} onChange={setLang} />
            <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title} />
            <Button onClick={() => go("/signin")} variant="outline" className="border-[#64499D]/30 text-[#64499D]">
              {t.auth.signin}
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-10 md:pt-24 md:pb-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.titleA}
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">{t.hero.subtitle}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t.hero.lastUpdated}: {lastUpdated}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => go("/contact")} className="bg-gradient-to-r from-[#64499D] to-[#4D3680]">
                {t.hero.ctaPrimary} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => go("/status")}>{t.hero.ctaSecondary}</Button>
            </div>
          </div>

          {/* Body */}
          <div className="mt-12 grid md:grid-cols-2 gap-6 md:gap-8">
            <SectionCard icon={<FileText className="w-5 h-5" />} title={t.sections.intro.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.intro.text}</p>
            </SectionCard>

            <SectionCard icon={<Lock className="w-5 h-5" />} title={t.sections.data.title}>
              <ul className="list-disc ms-5 space-y-2 text-slate-700 dark:text-slate-300">
                {t.sections.data.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </SectionCard>

            <SectionCard icon={<Shield className="w-5 h-5" />} title={t.sections.use.title}>
              <ul className="list-disc ms-5 space-y-2 text-slate-700 dark:text-slate-300">
                {t.sections.use.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </SectionCard>

            <SectionCard icon={<FileText className="w-5 h-5" />} title={t.sections.retention.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.retention.text}</p>
            </SectionCard>

            <SectionCard icon={<Globe className="w-5 h-5" />} title={t.sections.transfers.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.transfers.text}</p>
            </SectionCard>

            <SectionCard icon={<Cookie className="w-5 h-5" />} title={t.sections.cookies.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.cookies.text}</p>
            </SectionCard>

            <SectionCard icon={<Shield className="w-5 h-5" />} title={t.sections.security.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.security.text}</p>
            </SectionCard>

            <SectionCard icon={<Globe className="w-5 h-5" />} title={t.sections.rights.title}>
              <ul className="list-disc ms-5 space-y-2 text-slate-700 dark:text-slate-300">
                {t.sections.rights.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </SectionCard>

            <SectionCard icon={<FileText className="w-5 h-5" />} title={t.sections.contact.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.contact.text}</p>
            </SectionCard>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[120px] h-8 object-contain" />
          <div className="flex items-center gap-6 text-sm text-slate-300">
            <button onClick={() => go("/privacy")} className="hover:text-white">{t.footer.privacy}</button>
            <button onClick={() => go("/terms")} className="hover:text-white">{t.footer.terms}</button>
            <button onClick={() => go("/status")} className="hover:text-white">{t.footer.status}</button>
          </div>
          <div className="text-slate-400 text-sm">© {year} JURE. {t.footer.rights}</div>
        </div>
      </footer>

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

export default Privacy;
