// src/pages/Docs.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, Shield, Code2, PlugZap, FileText, GitBranch, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  en: {
    htmlLang: "en", dir: "ltr",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },
    hero: { title: "Documentation", subtitle: "Guides, API, security, and changelog." },
    sections: {
      start: { title: "Getting started", desc: "Accounts, onboarding, and first matters." },
      api: { title: "API & Webhooks", desc: "Authentication, endpoints, and examples." },
      security: { title: "Security & Compliance", desc: "Encryption, RBAC, audit, retention." },
      integrations: { title: "Integrations", desc: "Drive, e-signature, SSO, office suites." },
      guides: { title: "How-to guides", desc: "Contracts, research, collaboration, and more." },
      changelog: { title: "Changelog", desc: "What’s new and improvements." },
    },
    cta: { status: "Service Status", contact: "Contact", open: "Open" },
    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
  },
  fr: {
    htmlLang: "fr", dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    hero: { title: "Documentation", subtitle: "Guides, API, sécurité et journal des versions." },
    sections: {
      start: { title: "Bien démarrer", desc: "Comptes, onboarding et premiers dossiers." },
      api: { title: "API & Webhooks", desc: "Auth, endpoints et exemples." },
      security: { title: "Sécurité & conformité", desc: "Chiffrement, RBAC, audit, rétention." },
      integrations: { title: "Intégrations", desc: "Drive, e-signature, SSO, suites bureautiques." },
      guides: { title: "Guides pratiques", desc: "Contrats, recherche, collaboration, etc." },
      changelog: { title: "Journal des versions", desc: "Nouveautés et améliorations." },
    },
    cta: { status: "Statut du service", contact: "Contact", open: "Ouvrir" },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },
  ar: {
    htmlLang: "ar", dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },
    hero: { title: "الوثائق", subtitle: "أدلة وواجهة API والأمان وسجلّ التحديثات." },
    sections: {
      start: { title: "البدء", desc: "الحسابات والإعداد وأول القضايا." },
      api: { title: "واجهة API والويب هوكس", desc: "المصادقة ونقاط النهاية والأمثلة." },
      security: { title: "الأمان والامتثال", desc: "التشفير وصلاحيات الأدوار والتدقيق والاحتفاظ." },
      integrations: { title: "التكاملات", desc: "درايف والتوقيع الإلكتروني وSSO والسuites." },
      guides: { title: "أدلة إجرائية", desc: "العقود والبحث والتعاون والمزيد." },
      changelog: { title: "سجلّ التغييرات", desc: "ما الجديد والتحسينات." },
    },
    cta: { status: "حالة الخدمة", contact: "اتصل بنا", open: "فتح" },
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

const Docs: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();

  const tiles = [
    { icon: <BookOpen className="w-6 h-6" />, ...t.sections.start },
    { icon: <Code2 className="w-6 h-6" />, ...t.sections.api },
    { icon: <Shield className="w-6 h-6" />, ...t.sections.security },
    { icon: <PlugZap className="w-6 h-6" />, ...t.sections.integrations },
    { icon: <FileText className="w-6 h-6" />, ...t.sections.guides },
    { icon: <GitBranch className="w-6 h-6" />, ...t.sections.changelog },
  ];

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{ nav: t.nav, auth: t.auth, themeToggle: t.themeToggle, footer: t.footer }}
      dir={t.dir}
      activeNav="none"
    >
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20 md:pt-20">
        <Reveal className="text-center max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.title}
            </span>
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">{t.hero.subtitle}</p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <Button onClick={() => navigate("/status")} variant="outline" className="border-[#64499D]/30">
              {t.cta.status}
            </Button>
            <Button onClick={() => navigate("/contact")} className="bg-gradient-to-r from-[#64499D] to-[#4D3680]">
              {t.cta.contact} <ArrowRight className="w-4 h-4 ms-2" />
            </Button>
          </div>
        </Reveal>

        <div className="landing-divider my-12 max-w-md mx-auto" />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {tiles.map((tile, i) => (
            <Reveal key={i} delay={i * 0.06} subtle>
              <div className="landing-glass landing-glass-glow rounded-2xl p-6 h-full flex flex-col">
                <div
                  className="w-12 h-12 rounded-xl grid place-items-center text-white"
                  style={{ background: "#64499D" }}
                >
                  {tile.icon}
                </div>
                <h3 className="font-display text-xl font-semibold mt-4">{tile.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 flex-1">{tile.desc}</p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/docs")}
                  className="w-full mt-4 border-[#64499D]/25 hover:bg-[#64499D]/10"
                >
                  {t.cta.open}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
};

export default Docs;
