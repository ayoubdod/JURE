// src/pages/insights/InsightArticle.tsx — single JURE Insights article.
import React, { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import "@/components/landing/landing.css";

const STRINGS: Record<MarketingLocale, { back: string; published: string; cta: string }> = {
  en: { back: "All insights", published: "Published", cta: "See JURE in action" },
  fr: { back: "Tous les articles", published: "Publié le", cta: "Voir JURE en action" },
  ar: { back: "كل الرؤى", published: "نُشر في", cta: "شاهد JURE عمليًا" },
};

const InsightArticle: React.FC = () => {
  const navigate = useNavigate();
  const { slug = "" } = useParams<{ slug: string }>();
  const { lang, dir, path } = useMarketingLang();
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

      <nav
        aria-label="breadcrumb"
        className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 flex-wrap"
      >
        <button
          type="button"
          onClick={() => navigate(path())}
          className="hover:text-[#64499D] dark:hover:text-[#CFC2FF]"
        >
          {homeRoute.label[lang]}
        </button>
        <ChevronRight className="w-3 h-3 rtl:rotate-180" />
        <button
          type="button"
          onClick={() => navigate(path("insights"))}
          className="hover:text-[#64499D] dark:hover:text-[#CFC2FF]"
        >
          {insightsRoute.label[lang]}
        </button>
        <ChevronRight className="w-3 h-3 rtl:rotate-180" />
        <span className="text-slate-700 dark:text-slate-200 font-medium">{article.label[lang]}</span>
      </nav>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <header className={dir === "rtl" ? "text-right" : ""}>
          <div className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            {t.published} {formatDate(article.datePublished)}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-slate-900 dark:text-white">
            {article.title[lang]}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            {article.description[lang]}
          </p>
        </header>

        <div
          className={`mt-10 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-[#64499D] dark:prose-a:text-[#CFC2FF] prose-headings:scroll-mt-24 ${
            dir === "rtl" ? "text-right" : ""
          }`}
        >
          {body === null ? (
            <div className="space-y-3 animate-pulse" aria-hidden>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 rounded bg-slate-200/70 dark:bg-slate-700/50" />
              ))}
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
          )}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#64499D]/10 dark:border-[#8B6FD1]/15 pt-8">
          <button
            type="button"
            onClick={() => navigate(path("insights"))}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" /> {t.back}
          </button>
          <Button
            onClick={() => {
              track(MarketingEvents.DemoOpened, { source: `article_${slug}`, lang });
              navigate(path("demo"));
            }}
            className="bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
          >
            {t.cta}
          </Button>
        </div>
      </article>
    </MarketingShell>
  );
};

export default InsightArticle;
