// src/pages/Community.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { MessageSquare, Heart, Award, Users, ArrowRight } from "lucide-react";
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
      titleA: "Une communauté",
      titleB: "d’avocats qui avancent ensemble",
      subtitle:
        "Échangez sur des cas complexes, partagez vos pratiques et progressez avec des pairs qui utilisent JURE au quotidien.",
      cta: "Nous contacter",
      demo: "Voir la démo",
    },
    pillars: [
      {
        title: "Forums de discussion",
        desc: "Échanges sur cas complexes, jurisprudences et bonnes pratiques du cabinet.",
      },
      {
        title: "Entraide professionnelle",
        desc: "Mentorat, retours d’expérience et soutien entre pairs.",
      },
      {
        title: "Formations exclusives",
        desc: "Webinaires et ateliers animés par des experts juridiques et produit.",
      },
    ],
    cta: {
      title: "Rejoignez le réseau JURE",
      subtitle: "Dites-nous comment vous souhaitez contribuer ou apprendre.",
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
      titleA: "A community",
      titleB: "of lawyers moving forward together",
      subtitle:
        "Discuss complex matters, share practice tips, and grow with peers who use JURE every day.",
      cta: "Contact us",
      demo: "View demo",
    },
    pillars: [
      {
        title: "Discussion forums",
        desc: "Debate complex cases, case law, and firm best practices.",
      },
      {
        title: "Professional peer support",
        desc: "Mentoring, experience sharing, and mutual help.",
      },
      {
        title: "Exclusive trainings",
        desc: "Webinars and workshops led by legal and product experts.",
      },
    ],
    cta: {
      title: "Join the JURE network",
      subtitle: "Tell us how you’d like to contribute or learn.",
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
      titleA: "مجتمع",
      titleB: "من المحامين يتقدم معًا",
      subtitle:
        "ناقش القضايا المعقدة، وشارك أفضل الممارسات، وتطوّر مع زملاء يستخدمون JURE يوميًا.",
      cta: "تواصل معنا",
      demo: "شاهد العرض",
    },
    pillars: [
      {
        title: "منتديات نقاش",
        desc: "نقاش القضايا المعقدة والسوابق وأفضل ممارسات المكتب.",
      },
      {
        title: "دعم مهني بين الأقران",
        desc: "إرشاد وتبادل خبرات ومساعدة متبادلة.",
      },
      {
        title: "دورات حصرية",
        desc: "ندوات وورش عمل يقدمها خبراء قانونيون ومنتج.",
      },
    ],
    cta: {
      title: "انضم إلى شبكة JURE",
      subtitle: "أخبرنا كيف تود المساهمة أو التعلم.",
      primary: "تحدث إلى الفريق",
    },
    footer: { privacy: "الخصوصية", terms: "الشروط", status: "الحالة", rights: "جميع الحقوق محفوظة." },
  },
};

const ICONS = [MessageSquare, Heart, Award];

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

const Community: React.FC = () => {
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
      <section className="max-w-7xl mx-auto px-6 pt-14 pb-12 md:pt-20 md:pb-16">
        <Reveal className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full landing-glass text-xs font-medium text-[#64499D] dark:text-[#CFC2FF] mb-6">
            <Users className="w-3.5 h-3.5" />
            Community
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.titleA}
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#64499D] to-[#4D3680] bg-clip-text text-transparent">
              {t.hero.titleB}
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {t.hero.subtitle}
          </p>
          <div
            className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center ${
              isRtl ? "sm:flex-row-reverse" : ""
            }`}
          >
            <Button
              size="lg"
              className="px-7 py-6 text-lg bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
              onClick={() => navigate("/contact")}
            >
              {t.hero.cta}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-7 py-6 text-lg border-[#64499D]/25 dark:border-[#8B6FD1]/30"
              onClick={() => navigate("/demo")}
            >
              {t.hero.demo}
            </Button>
          </div>
        </Reveal>
      </section>

      <div className="landing-divider mb-12" aria-hidden />

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          {t.pillars.map((p: { title: string; desc: string }, i: number) => {
            const Icon = ICONS[i] || Users;
            const accent = ["#64499D", "#4D3680", "#3E2D71"][i];
            return (
              <Reveal key={p.title} delay={i * 0.06}>
                <div className="landing-glass landing-glass-glow rounded-2xl p-7 h-full">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5"
                    style={{ background: accent }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">{p.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="rounded-3xl p-10 md:p-12 text-white landing-panel-glow bg-gradient-to-br from-[#64499D] via-[#4D3680] to-[#3E2D71] text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">{t.cta.title}</h2>
            <p className="text-purple-100 text-lg mb-8">{t.cta.subtitle}</p>
            <Button
              size="lg"
              className="px-8 py-6 text-lg bg-white text-slate-900 hover:bg-slate-100"
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

export default Community;
