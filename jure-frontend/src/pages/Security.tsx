// src/pages/Security.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, FileCheck, Server, ArrowRight, Check } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    nav: { features: "Fonctionnalités", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    hero: {
      titleA: "Sécurité conçue",
      titleB: "pour le secret professionnel",
      subtitle:
        "JURE protège les données sensibles du cabinet avec chiffrement, contrôle d’accès granulaire et traçabilité — sans compromettre la productivité.",
      cta: "Nous contacter",
      docs: "Documentation",
    },
    pillars: [
      {
        title: "Chiffrement",
        desc: "Données protégées en transit et au repos pour sécuriser dossiers et documents.",
      },
      {
        title: "Contrôle d’accès",
        desc: "Rôles et permissions pour limiter l’accès aux seules personnes autorisées.",
      },
      {
        title: "Traçabilité",
        desc: "Journaux d’activité pour comprendre qui a consulté ou modifié quoi.",
      },
      {
        title: "Confidentialité",
        desc: "Approche privacy-by-design adaptée aux exigences du métier juridique.",
      },
    ],
    practices: {
      title: "Pratiques de sécurité",
      items: [
        "Authentification et sessions sécurisées",
        "Séparation des espaces cabinet / utilisateur",
        "Sauvegardes et continuité de service",
        "Revue continue des accès et des dépendances",
      ],
    },
    cta: {
      title: "Des questions sur la sécurité ?",
      subtitle: "Notre équipe peut vous présenter l’architecture et les contrôles en place.",
      primary: "Parler à l’équipe",
    },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },
  en: {
    htmlLang: "en",
    dir: "ltr",
    nav: { features: "Features", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },
    hero: {
      titleA: "Security built",
      titleB: "for professional secrecy",
      subtitle:
        "JURE protects sensitive firm data with encryption, granular access control, and auditability — without slowing your practice.",
      cta: "Contact us",
      docs: "Documentation",
    },
    pillars: [
      {
        title: "Encryption",
        desc: "Data protected in transit and at rest across matters and documents.",
      },
      {
        title: "Access control",
        desc: "Roles and permissions so only the right people can see the right files.",
      },
      {
        title: "Auditability",
        desc: "Activity trails to understand who viewed or changed what.",
      },
      {
        title: "Privacy",
        desc: "Privacy-by-design practices tailored to legal work.",
      },
    ],
    practices: {
      title: "Security practices",
      items: [
        "Secure authentication and sessions",
        "Firm / user workspace isolation",
        "Backups and service continuity",
        "Ongoing access and dependency review",
      ],
    },
    cta: {
      title: "Questions about security?",
      subtitle: "Our team can walk you through the architecture and controls in place.",
      primary: "Talk to the team",
    },
    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl",
    nav: { features: "الميزات", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },
    hero: {
      titleA: "أمان مصمّم",
      titleB: "لسرّية المهنة",
      subtitle:
        "يحمي JURE بيانات المكتب الحساسة بالتشفير والتحكم الدقيق في الصلاحيات والتتبع — دون إبطاء عملك.",
      cta: "تواصل معنا",
      docs: "الوثائق",
    },
    pillars: [
      {
        title: "التشفير",
        desc: "حماية البيانات أثناء النقل والتخزين عبر القضايا والمستندات.",
      },
      {
        title: "التحكم في الوصول",
        desc: "أدوار وصلاحيات ليصل الأشخاص المناسبون فقط إلى الملفات المناسبة.",
      },
      {
        title: "القابلية للتدقيق",
        desc: "سجلات نشاط لمعرفة من اطّلع أو عدّل ماذا.",
      },
      {
        title: "الخصوصية",
        desc: "ممارسات خصوصية بالتصميم ملائمة للعمل القانوني.",
      },
    ],
    practices: {
      title: "ممارسات الأمان",
      items: [
        "مصادقة وجلسات آمنة",
        "عزل مساحات المكتب / المستخدم",
        "نسخ احتياطي واستمرارية الخدمة",
        "مراجعة مستمرة للصلاحيات والتبعيات",
      ],
    },
    cta: {
      title: "أسئلة حول الأمان؟",
      subtitle: "يمكن لفريقنا شرح البنية والضوابط المعمول بها.",
      primary: "تحدث إلى الفريق",
    },
    footer: { privacy: "الخصوصية", terms: "الشروط", status: "الحالة", rights: "جميع الحقوق محفوظة." },
  },
};

const PILLAR_ICONS = [Lock, Eye, FileCheck, Shield];

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

const Security: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const isRtl = t.dir === "rtl";

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{
        nav: t.nav,
        auth: t.auth,
        themeToggle: t.themeToggle,
        footer: t.footer,
      }}
      dir={t.dir}
      activeNav="none"
    >
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-12 md:pt-20 md:pb-16">
        <Reveal className="text-center max-w-3xl mx-auto min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full landing-glass text-xs font-medium text-[#64499D] dark:text-[#CFC2FF] mb-6">
            <Shield className="w-3.5 h-3.5" />
            Security
          </div>
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight break-words">
            <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.titleA}
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#64499D] to-[#4D3680] bg-clip-text text-transparent">
              {t.hero.titleB}
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed break-words">
            {t.hero.subtitle}
          </p>
          <div
            className={`mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto ${
              isRtl ? "sm:flex-row-reverse" : ""
            }`}
          >
            <Button
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
              onClick={() => navigate("/contact")}
            >
              {t.hero.cta}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg border-[#64499D]/25 dark:border-[#8B6FD1]/30"
              onClick={() => navigate("/docs")}
            >
              {t.hero.docs}
            </Button>
          </div>
        </Reveal>
      </section>

      <div className="landing-divider mb-12" aria-hidden />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {t.pillars.map((p: { title: string; desc: string }, i: number) => {
            const Icon = PILLAR_ICONS[i] || Shield;
            const accent = ["#64499D", "#4D3680", "#3E2D71", "#8B6FD1"][i];
            return (
              <Reveal key={p.title} delay={i * 0.05}>
                <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 h-full min-w-0">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white mb-4"
                    style={{ background: accent }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2 break-words">{p.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed break-words">{p.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16">
        <Reveal>
          <div className="landing-glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 min-w-0">
            <div className="flex items-center gap-3 mb-6 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#64499D] to-[#4D3680] flex items-center justify-center text-white shrink-0">
                <Server className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold break-words">{t.practices.title}</h2>
            </div>
            <ul className="space-y-3">
              {t.practices.items.map((item: string) => (
                <li key={item} className="flex items-start gap-3 text-slate-700 dark:text-slate-200">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm md:text-base break-words">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <Reveal>
          <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 text-white landing-panel-glow bg-gradient-to-br from-slate-900 via-[#2A1F4A] to-[#64499D] text-center min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 break-words">{t.cta.title}</h2>
            <p className="text-slate-300 text-base sm:text-lg mb-8 break-words">{t.cta.subtitle}</p>
            <Button
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => navigate("/contact")}
            >
              {t.cta.primary}
            </Button>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
};

export default Security;
