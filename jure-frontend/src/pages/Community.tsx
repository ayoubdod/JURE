// src/pages/Community.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { MessageSquare, Heart, Award, Users, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { RouteSeo } from "@/marketing/Seo";

type Lang = "fr" | "en" | "ar";

const communityFr = {
    htmlLang: "fr",
    dir: "ltr" as "ltr" | "rtl",
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
};

type CommunityCopy = typeof communityFr;

const STRINGS: Record<Lang, CommunityCopy> = {
  fr: communityFr,
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
      <RouteSeo routeKey="community" lang={lang} />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-12 md:pt-20 md:pb-16">
        <Reveal className="text-center max-w-3xl mx-auto min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full landing-glass text-xs font-medium text-[#A58CF4] mb-6">
            <Users className="w-3.5 h-3.5" />
            Community
          </div>
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight break-words text-[#64499D] dark:text-white">
            {t.hero.titleA}
            <br />
            <span className="landing-hero-shimmer bg-gradient-to-r from-[#A58CF4] via-[#C4B0EF] to-[#A58CF4] bg-clip-text text-transparent">
              {t.hero.titleB}
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed break-words">
            {t.hero.subtitle}
          </p>
          <div
            className={`mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto ${
              isRtl ? "sm:flex-row-reverse" : ""
            }`}
          >
            <Button
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg landing-btn-primary"
              onClick={() => navigate("/contact")}
            >
              {t.hero.cta}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg landing-btn-secondary"
              onClick={() => navigate("/demo")}
            >
              {t.hero.demo}
            </Button>
          </div>
        </Reveal>
      </section>

      <div className="landing-divider mb-12" aria-hidden />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {t.pillars.map((p: { title: string; desc: string }, i: number) => {
            const Icon = ICONS[i] || Users;
            return (
              <Reveal key={p.title} delay={i * 0.06}>
                <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-7 h-full min-w-0 group">
                  <div className="landing-icon w-12 h-12 rounded-xl flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2 break-words">{p.title}</h3>
                  <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed break-words">{p.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <Reveal>
          <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 text-white landing-band text-center min-w-0">
            <h2 className="relative font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 break-words">{t.cta.title}</h2>
            <p className="relative text-white/70 text-base sm:text-lg mb-8 break-words">{t.cta.subtitle}</p>
            <Button
              size="lg"
              className="relative w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg landing-btn-on-dark"
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
