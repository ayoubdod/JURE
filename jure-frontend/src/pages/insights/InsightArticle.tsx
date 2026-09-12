// src/pages/insights/InsightArticle.tsx — single article in the deck language.
import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronRight, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { ArticleSeo } from "@/marketing/Seo";
import { getArticle, getRoute } from "@/marketing/routes";
import { localePath, type MarketingLocale } from "@/marketing/site";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/marketing/structuredData";
import { hasArticleBody, loadArticleBody } from "@/marketing/content/insights/loader";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/features-deck.css";

const STRINGS: Record<MarketingLocale, { back: string; published: string; cta: string }> = {
  en: { back: "All insights", published: "Published", cta: "See JURE in action" },
  fr: { back: "Tous les articles", published: "Publié le", cta: "Voir JURE en action" },
  ar: { back: "كل الرؤى", published: "نشر في", cta: "شاهد JURE عمليا" },
};

const InsightArticle: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const { lang, dir, dict, path } = useMarketingLang();
  const [body, setBody] = useState<string | null>(null);
  const article = getArticle(slug);
  const t = STRINGS[lang];

  useEffect(() => {
    let cancelled = false;
    if (article && hasArticleBody(slug)) {
      loadArticleBody(slug, lang).then((text) => {
        if (!cancelled) setBody(text);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [slug, lang, article]);

  if (!article || !hasArticleBody(slug)) {
    return <Navigate to={path("insights")} replace />;
  }

  const homeRoute = getRoute("home");
  const insightsRoute = getRoute("insights");

  const jsonLd = [
    organizationJsonLd(lang),
    webSiteJsonLd(lang),
    articleJsonLd(article, lang),
    breadcrumbJsonLd([
      { name: homeRoute.label[lang], path: localePath(lang) },
      { name: insightsRoute.label[lang], path: localePath(lang, "insights") },
      { name: article.label[lang], path: localePath(lang, `insights/${slug}`) },
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
      <ArticleSeo lang={lang} articleSlug={slug} jsonLd={jsonLd} />
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
            <Link to={path("insights")}>{insightsRoute.label[lang]}</Link>
            <ChevronRight className="w-3 h-3 rtl:rotate-180" aria-hidden />
            <span>{article.label[lang]}</span>
          </nav>
        </div>

        <article className="features-deck__inner insights-article">
          <header className="insights-article__header">
            <p className="insights-article__meta">
              {t.published} {formatDate(article.datePublished)}
            </p>
            <h1 className="insights-article__title">{article.title[lang]}</h1>
            <p className="insights-article__lead">{article.description[lang]}</p>
          </header>

          <div className="insights-article__body">
            {body === null ? (
              <div className="insights-article__skeleton" aria-hidden>
                {[...Array(8)].map((_, i) => (
                  <div key={i} />
                ))}
              </div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            )}
          </div>

          <footer className="insights-article__footer">
            <Link to={path("insights")} className="insights-article__back">
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              {t.back}
            </Link>
            <Link
              to={path("features")}
              className="features-btn features-btn--dark"
              onClick={() => track(MarketingEvents.HeroPrimaryCta, { source: `article_${slug}`, lang })}
            >
              {t.cta}
              <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </Link>
          </footer>
        </article>
      </div>
    </MarketingShell>
  );
};

export default InsightArticle;
