// src/pages/insights/InsightsIndex.tsx — JURE Insights: LegalTech intelligence hub.
import React from "react";
import { useNavigate } from "react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";
import { getRoute, INSIGHT_ARTICLES } from "@/marketing/routes";
import { localePath, type MarketingLocale } from "@/marketing/site";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/marketing/structuredData";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/landing.css";

const STRINGS: Record<MarketingLocale, { h1: string; intro: string; read: string; topics: string[] }> = {
  en: {
    h1: "JURE Insights",
    intro:
      "Original analysis and practical guides on LegalTech, legal AI, responsible AI, legal operations and the future of legal work — written by the team building JURE, with a particular perspective on multilingual and emerging legal markets.",
    read: "Read article",
    topics: ["LegalTech", "Legal AI", "Responsible AI", "Legal operations", "Future of legal work"],
  },
  fr: {
    h1: "JURE Insights",
    intro:
      "Analyses originales et guides pratiques sur la LegalTech, l'IA juridique, l'IA responsable, les legal operations et l'avenir du travail juridique — écrits par l'équipe qui construit JURE, avec une perspective particulière sur les marchés juridiques multilingues et émergents.",
    read: "Lire l'article",
    topics: ["LegalTech", "IA juridique", "IA responsable", "Legal operations", "Avenir du travail juridique"],
  },
  ar: {
    h1: "رؤى JURE",
    intro:
      "تحليلات أصلية وأدلة عملية حول التقنية القانونية والذكاء الاصطناعي القانوني والذكاء الاصطناعي المسؤول والعمليات القانونية ومستقبل العمل القانوني — من الفريق الذي يبني JURE، برؤية خاصة للأسواق القانونية متعددة اللغات والناشئة.",
    read: "اقرأ المقال",
    topics: ["التقنية القانونية", "الذكاء الاصطناعي القانوني", "الذكاء الاصطناعي المسؤول", "العمليات القانونية", "مستقبل العمل القانوني"],
  },
};

const InsightsIndex: React.FC = () => {
  const navigate = useNavigate();
  const { lang, dir, path } = useMarketingLang();
  const t = STRINGS[lang];
  const homeRoute = getRoute("home");
  const insightsRoute = getRoute("insights");

  const jsonLd = [
    organizationJsonLd(lang),
    webSiteJsonLd(lang),
    breadcrumbJsonLd([
      { name: homeRoute.label[lang], path: localePath(lang) },
      { name: insightsRoute.label[lang], path: localePath(lang, "insights") },
    ]),
  ];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="insights">
      <RouteSeo routeKey="insights" lang={lang} jsonLd={jsonLd} />

      <nav
        aria-label="breadcrumb"
        className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"
      >
        <button
          type="button"
          onClick={() => navigate(path())}
          className="hover:text-[#A58CF4] dark:hover:text-[#A58CF4]"
        >
          {homeRoute.label[lang]}
        </button>
        <ChevronRight className="w-3 h-3 rtl:rotate-180" />
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {insightsRoute.label[lang]}
        </span>
      </nav>

      <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white">{t.h1}</h1>
        <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {t.intro}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {t.topics.map((topic) => (
            <span
              key={topic}
              className="text-[11px] sm:text-xs font-medium px-3 py-1 rounded-full bg-[#A58CF4]/8 text-[#A58CF4] dark:bg-[#A58CF4]/20 dark:text-[#A58CF4]"
            >
              {topic}
            </span>
          ))}
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-16">
        <div className="space-y-5">
          {INSIGHT_ARTICLES.map((article, i) => (
            <Reveal key={article.slug} delay={i * 0.06} subtle>
              <button
                type="button"
                onClick={() => {
                  track(MarketingEvents.InsightOpened, { slug: article.slug, source: "index" });
                  navigate(path(`insights/${article.slug}`));
                }}
                className={`landing-glass landing-glass-glow rounded-2xl p-6 sm:p-8 w-full ${
                  dir === "rtl" ? "text-right" : "text-start"
                }`}
              >
                <div className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                  {formatDate(article.datePublished)}
                </div>
                <h2 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
                  {article.title[lang]}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {article.description[lang]}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#A58CF4] dark:text-[#A58CF4]">
                  {t.read} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
};

export default InsightsIndex;
