// Audience solution pages: law firms & legal departments.
import React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, CheckCircle2, ChevronRight, FileText, Search, Sparkles, Users } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import FaqSection from "@/components/landing/FaqSection";
import WorkflowDiagram from "@/components/landing/WorkflowDiagram";
import { CaseWorkspaceFrame } from "@/components/landing/ProductFrame";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";
import { getRoute } from "@/marketing/routes";
import { localePath } from "@/marketing/site";
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  webSiteJsonLd,
} from "@/marketing/structuredData";
import { SOLUTIONS_CONTENT } from "@/marketing/content/solutions";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/landing.css";

interface SolutionPageProps {
  routeKey: string;
}

const SolutionPage: React.FC<SolutionPageProps> = ({ routeKey }) => {
  const navigate = useNavigate();
  const { lang, dir, path } = useMarketingLang();
  const route = getRoute(routeKey);
  const content = SOLUTIONS_CONTENT[routeKey]?.[lang];

  if (!content) return null;

  const homeRoute = getRoute("home");
  const jsonLd = [
    organizationJsonLd(lang),
    webSiteJsonLd(lang),
    breadcrumbJsonLd([
      { name: homeRoute.label[lang], path: localePath(lang) },
      { name: route.label[lang], path: localePath(lang, route.slug) },
    ]),
    faqPageJsonLd(content.faqs),
  ];

  const rtlText = dir === "rtl" ? "text-right" : "";

  const goDemo = () => {
    track(MarketingEvents.HeroPrimaryCta, { source: routeKey, lang });
    navigate(path("demo"));
  };

  const workflowIcons = [Briefcase, FileText, CheckCircle2, Users, Sparkles, Search];

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="none">
      <RouteSeo routeKey={routeKey} lang={lang} jsonLd={jsonLd} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
        <nav className={`flex items-center gap-1.5 text-xs text-slate-500 mb-8 ${rtlText}`} aria-label="Breadcrumb">
          <button type="button" onClick={() => navigate(path(""))} className="hover:text-[#64499D]">
            {homeRoute.label[lang]}
          </button>
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          <span className="text-slate-800 dark:text-slate-200">{route.label[lang]}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className={rtlText}>
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-slate-900 dark:text-white">
              {content.h1}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              {content.intro}
            </p>
            <div className="mt-8">
              <Button
                size="lg"
                onClick={goDemo}
                className="bg-gradient-to-r from-[#64499D] to-[#4D3680] text-white"
              >
                {lang === "fr" ? "Voir JURE en action" : lang === "ar" ? "شاهد JURE عمليًا" : "See JURE in action"}
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Button>
            </div>
          </div>
          <Reveal>
            <CaseWorkspaceFrame lang={lang} />
          </Reveal>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h2 className={`text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4 ${rtlText}`}>
          {content.whoTitle}
        </h2>
        <p className={`text-slate-600 dark:text-slate-300 leading-relaxed ${rtlText}`}>{content.whoBody}</p>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">
          {content.challengesTitle}
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {content.challenges.map((c) => (
            <Reveal key={c.title}>
              <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-6 h-full ${rtlText}`}>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{c.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h2 className={`text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4 ${rtlText}`}>
          {content.approachTitle}
        </h2>
        <p className={`text-slate-600 dark:text-slate-300 leading-relaxed mb-6 ${rtlText}`}>{content.approachBody}</p>
        <ul className="space-y-3">
          {content.points.map((p) => (
            <li key={p} className={`flex items-start gap-2 ${rtlText}`}>
              <CheckCircle2 className="w-5 h-5 text-[#64499D] shrink-0 mt-0.5" />
              <span className="text-slate-700 dark:text-slate-200">{p}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center">
          {content.workflowTitle}
        </h2>
        <WorkflowDiagram
          ariaLabel={content.workflowTitle}
          steps={content.workflowSteps.map((label, i) => ({
            icon: workflowIcons[i % workflowIcons.length],
            label,
          }))}
        />
      </section>

      <FaqSection title={lang === "fr" ? "Questions fréquentes" : lang === "ar" ? "الأسئلة الشائعة" : "Frequently asked questions"} entries={content.faqs} />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">
          {lang === "fr" ? "Pages associées" : lang === "ar" ? "صفحات ذات صلة" : "Related"}
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {content.related.map((key) => {
            const rel = getRoute(key);
            return (
              <Button key={key} variant="outline" onClick={() => navigate(path(rel.slug))}>
                {rel.label[lang]}
              </Button>
            );
          })}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{content.cta.title}</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{content.cta.body}</p>
        <Button size="lg" onClick={goDemo} className="mt-8 bg-gradient-to-r from-[#64499D] to-[#4D3680] text-white">
          {lang === "fr" ? "Voir JURE en action" : lang === "ar" ? "شاهد JURE عمليًا" : "See JURE in action"}
        </Button>
      </section>
    </MarketingShell>
  );
};

export default SolutionPage;
