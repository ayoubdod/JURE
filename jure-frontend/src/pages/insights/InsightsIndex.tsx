// src/pages/insights/InsightsIndex.tsx — Insights hub in the Features / About deck language.
import React from "react";
import { Link } from "react-router";
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
import "@/components/landing/features-deck.css";

const STRINGS: Record<
  MarketingLocale,
  { titleA: string; titleB: string; note: string; read: string; topics: string[] }
> = {
  en: {
    titleA: "JURE",
    titleB: "Insights.",
    note:
      "Original analysis and practical guides on LegalTech, legal AI, responsible AI, legal operations and the future of legal work — written by the team building JURE.",
    read: "Read article",
    topics: ["LegalTech", "Legal AI", "Responsible AI", "Legal operations", "Future of legal work"],
  },
  fr: {
    titleA: "JURE",
    titleB: "Insights.",
    note:
      "Analyses originales et guides pratiques sur la LegalTech, l'IA juridique, l'IA responsable, les legal operations et l'avenir du travail juridique — écrits par l'équipe qui construit JURE.",
    read: "Lire l'article",
    topics: ["LegalTech", "IA juridique", "IA responsable", "Legal operations", "Avenir du travail juridique"],
  },
  ar: {
    titleA: "رؤى",
    titleB: "JURE.",
    note:
      "تحليلات أصلية وأدلة عملية حول التقنية القانونية والذكاء الاصطناعي القانوني والذكاء الاصطناعي المسؤول والعمليات القانونية ومستقبل العمل القانوني — من الفريق الذي يبني JURE.",
    read: "اقرأ المقال",
    topics: ["التقنية القانونية", "الذكاء الاصطناعي القانوني", "الذكاء الاصطناعي المسؤول", "العمليات القانونية", "مستقبل العمل القانوني"],
  },
};

const InsightsIndex: React.FC = () => {
  const { lang, dir, dict, path } = useMarketingLang();
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
      <div className="features-deck insights-deck">
        <div className="features-orbs" aria-hidden>
          <span className="features-orb features-orb--a" />
          <span className="features-orb features-orb--b" />
          <span className="features-orb features-orb--c" />
          <span className="features-orb features-orb--d" />
        </div>

        <div className="features-deck__inner">
          <nav aria-label={dict.a11y.breadcrumb} className="insights-breadcrumb">
            <Link to={path()}>{homeRoute.label[lang]}</Link>
            <ChevronRight className="w-3 h-3 rtl:rotate-180" aria-hidden />
            <span>{insightsRoute.label[lang]}</span>
          </nav>
        </div>

        <section className="features-hero">
          <div className="features-deck__inner">
            <h1 className="features-hero__title insights-hero__title">
              {t.titleA} <em>{t.titleB}</em>
            </h1>
            <p className="features-hero__lead">{t.note}</p>
            <div className="features-hero__pills">
              {t.topics.map((topic) => (
                <span key={topic} className="features-pill">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="features-block insights-list-block">
          <div className="features-deck__inner">
            <div className="insights-list">
              {INSIGHT_ARTICLES.map((article, i) => (
                <Reveal key={article.slug} delay={i * 0.05} subtle>
                  <Link
                    to={path(`insights/${article.slug}`)}
                    className="insights-card about-panel about-panel--mist"
                    onClick={() =>
                      track(MarketingEvents.InsightOpened, { slug: article.slug, source: "index" })
                    }
                  >
                    <time className="insights-card__date" dateTime={article.datePublished}>
                      {formatDate(article.datePublished)}
                    </time>
                    <h2 className="insights-card__title">{article.title[lang]}</h2>
                    <p className="insights-card__desc">{article.description[lang]}</p>
                    <span className="insights-card__cta">
                      {t.read}
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
};

export default InsightsIndex;
