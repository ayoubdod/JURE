// src/pages/Privacy.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Shield, Lock, FileText, Globe, Cookie, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { RouteSeo } from "@/marketing/Seo";

type Lang = "fr" | "en" | "ar";

const privacyFr = {
    htmlLang: "fr",
    dir: "ltr" as "ltr" | "rtl",
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
          "Pour toute question ou demande relative à vos données, écrivez-nous : contact@jure.ma",
      },
    },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
};

type PrivacyCopy = typeof privacyFr;

const STRINGS: Record<Lang, PrivacyCopy> = {
  fr: privacyFr,
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
          "For questions or requests regarding your data, email us at: contact@jure.ma",
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
          "للاستفسارات أو الطلبات المتعلقة ببياناتك: contact@jure.ma",
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

const SectionCard: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({
  icon, title, children,
}) => (
  <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 h-full min-w-0">
    <div className="flex items-center gap-3 mb-3 min-w-0">
      <div className="w-11 h-11 rounded-xl grid place-items-center text-white shrink-0" style={{ background: "#A58CF4" }}>
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold break-words">{title}</h3>
    </div>
    <div className="min-w-0 break-words">{children}</div>
  </div>
);

const Privacy: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const lastUpdated = "2025-08-15";

  const go = (to: string) => navigate(to);

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{ nav: t.nav, auth: t.auth, themeToggle: t.themeToggle, footer: t.footer }}
      dir={t.dir}
      activeNav="none"
    >
      <RouteSeo routeKey="privacy" lang={lang} />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 md:pt-24 md:pb-16">
        <Reveal className="max-w-4xl mx-auto text-center min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl font-bold tracking-tight break-words text-[#64499D] dark:text-white">
            {t.hero.titleA}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 break-words">{t.hero.subtitle}</p>
          <p className="mt-2 text-sm text-neutral-500">
            {t.hero.lastUpdated}: {lastUpdated}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto">
            <Button onClick={() => go("/contact")} className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg landing-btn-primary">
              {t.hero.ctaPrimary} <ArrowRight className="ms-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => go("/status")} className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg border-[#A58CF4]/30">
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </Reveal>

        <div className="landing-divider my-10 sm:my-12 max-w-md mx-auto" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 md:gap-8">
          <Reveal subtle>
            <SectionCard icon={<FileText className="w-5 h-5" />} title={t.sections.intro.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.intro.text}</p>
            </SectionCard>
          </Reveal>

          <Reveal subtle delay={0.05}>
            <SectionCard icon={<Lock className="w-5 h-5" />} title={t.sections.data.title}>
              <ul className="list-disc ms-5 space-y-2 text-slate-700 dark:text-slate-300">
                {t.sections.data.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </SectionCard>
          </Reveal>

          <Reveal subtle delay={0.08}>
            <SectionCard icon={<Shield className="w-5 h-5" />} title={t.sections.use.title}>
              <ul className="list-disc ms-5 space-y-2 text-slate-700 dark:text-slate-300">
                {t.sections.use.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </SectionCard>
          </Reveal>

          <Reveal subtle delay={0.1}>
            <SectionCard icon={<FileText className="w-5 h-5" />} title={t.sections.retention.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.retention.text}</p>
            </SectionCard>
          </Reveal>

          <Reveal subtle delay={0.12}>
            <SectionCard icon={<Globe className="w-5 h-5" />} title={t.sections.transfers.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.transfers.text}</p>
            </SectionCard>
          </Reveal>

          <Reveal subtle delay={0.14}>
            <SectionCard icon={<Cookie className="w-5 h-5" />} title={t.sections.cookies.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.cookies.text}</p>
            </SectionCard>
          </Reveal>

          <Reveal subtle delay={0.16}>
            <SectionCard icon={<Shield className="w-5 h-5" />} title={t.sections.security.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.security.text}</p>
            </SectionCard>
          </Reveal>

          <Reveal subtle delay={0.18}>
            <SectionCard icon={<Globe className="w-5 h-5" />} title={t.sections.rights.title}>
              <ul className="list-disc ms-5 space-y-2 text-slate-700 dark:text-slate-300">
                {t.sections.rights.bullets.map((b: string, i: number) => <li key={i}>{b}</li>)}
              </ul>
            </SectionCard>
          </Reveal>

          <Reveal subtle delay={0.2}>
            <SectionCard icon={<FileText className="w-5 h-5" />} title={t.sections.contact.title}>
              <p className="text-slate-600 dark:text-slate-300">{t.sections.contact.text}</p>
            </SectionCard>
          </Reveal>
        </div>
      </section>
    </MarketingShell>
  );
};

export default Privacy;
