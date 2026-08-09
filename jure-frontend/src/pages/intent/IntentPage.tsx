// src/pages/intent/IntentPage.tsx — shared layout for the 8 high-intent
// landing pages (legal-ai, legal-case-management, ...).
import React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import WorkflowDiagram from "@/components/landing/WorkflowDiagram";
import FaqSection from "@/components/landing/FaqSection";
import {
  CaseWorkspaceFrame,
  ChatFrame,
  JuriaFrame,
  LibraryFrame,
} from "@/components/landing/ProductFrame";
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
import { INTENT_CONTENT } from "@/marketing/content/intent";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/landing.css";

/** Which product frame proves the claims of each page. */
const FRAME_BY_KEY: Record<string, "case" | "juria" | "library" | "chat"> = {
  legalAi: "juria",
  legalCaseManagement: "case",
  legalPracticeManagement: "case",
  legalResearch: "juria",
  legalDocumentManagement: "library",
  legalOperations: "case",
  legalKnowledgeManagement: "library",
  responsibleLegalAi: "juria",
};

const WORKFLOW_ICONS = [Search, Sparkles, FileText, UserCheck, Scale, CheckCircle2];
const MATTER_ICONS = [FileText, Briefcase, CheckCircle2, CalendarClock, Users, UserCheck];

interface IntentPageProps {
  routeKey: string;
}

const IntentPage: React.FC<IntentPageProps> = ({ routeKey }) => {
  const navigate = useNavigate();
  const { lang, dir, dict, path } = useMarketingLang();
  const route = getRoute(routeKey);
  const content = INTENT_CONTENT[routeKey]?.[lang];

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

  const isAiPage = FRAME_BY_KEY[routeKey] === "juria";
  const icons = isAiPage ? WORKFLOW_ICONS : MATTER_ICONS;
  const rtlText = dir === "rtl" ? "text-right" : "";

  const frame = (() => {
    switch (FRAME_BY_KEY[routeKey]) {
      case "juria":
        return <JuriaFrame lang={lang} />;
      case "library":
        return <LibraryFrame lang={lang} />;
      case "chat":
        return <ChatFrame lang={lang} />;
      default:
        return <CaseWorkspaceFrame lang={lang} />;
    }
  })();

  const goDemo = (source: string) => {
    track(MarketingEvents.IntentPageCta, { page: routeKey, source, lang });
    navigate(path("demo"));
  };

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="none">
      <RouteSeo routeKey={routeKey} lang={lang} jsonLd={jsonLd} />

      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className={`max-w-4xl mx-auto px-4 sm:px-6 pt-6 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 ${rtlText}`}
      >
        <button
          type="button"
          onClick={() => navigate(path())}
          className="hover:text-[#64499D] dark:hover:text-[#CFC2FF]"
        >
          {homeRoute.label[lang]}
        </button>
        <ChevronRight className="w-3 h-3 rtl:rotate-180" />
        <span className="text-slate-700 dark:text-slate-200 font-medium">{route.label[lang]}</span>
      </nav>

      {/* H1 + intro */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-10 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-slate-900 dark:text-white">
          {content.h1}
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {content.intro}
        </p>
        <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => goDemo("header")}
            className="w-full sm:w-auto bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white px-8"
          >
            {dict.cta.seeInAction}
            <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
          </Button>
        </div>
      </header>

      {/* Definition + problem */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        <Reveal>
          <div className={rtlText}>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1] shrink-0" />
              {content.definition.title}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {content.definition.body}
            </p>
          </div>
        </Reveal>
        <Reveal>
          <div className={rtlText}>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {content.problem.title}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {content.problem.body}
            </p>
          </div>
        </Reveal>
      </section>

      {/* JURE approach + product frame */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <Reveal>
            <div className={rtlText}>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                {content.approach.title}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.approach.body}
              </p>
              <ul className="mt-4 space-y-2.5">
                {content.approach.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1] mt-0.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>{frame}</Reveal>
        </div>
      </section>

      {/* Workflow */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Reveal>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white text-center mb-6">
            {content.workflow.title}
          </h2>
          <WorkflowDiagram
            ariaLabel={content.workflow.title}
            steps={content.workflow.steps.map((label, i) => ({
              icon: icons[i % icons.length],
              label,
              emphasis: isAiPage && i === content.workflow.steps.length - 2,
            }))}
          />
        </Reveal>
      </section>

      {/* Use cases */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <Reveal>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white text-center mb-8">
            {content.useCases.title}
          </h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {content.useCases.items.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08} subtle>
              <div className={`landing-glass rounded-2xl p-6 h-full ${rtlText}`}>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Security note */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <Reveal>
          <div
            className={`landing-glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4 ${rtlText}`}
          >
            <span className="w-10 h-10 rounded-xl bg-[#64499D]/10 dark:bg-[#64499D]/25 text-[#64499D] dark:text-[#CFC2FF] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {content.security.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.security.body}
              </p>
              <button
                type="button"
                onClick={() => {
                  track(MarketingEvents.SecurityCta, { source: `intent_${routeKey}`, lang });
                  navigate(path("security"));
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
              >
                {dict.cta.exploreSecurity} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <FaqSection title={`FAQ — ${route.label[lang]}`} faqs={content.faqs} className="py-10" />

      {/* Related pages (internal linking) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap justify-center gap-2">
          {content.related.map((key) => {
            const rel = getRoute(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => navigate(path(rel.slug))}
                className="px-3.5 py-1.5 rounded-full landing-glass text-xs font-medium text-[#64499D] dark:text-[#CFC2FF] hover:border-[#64499D]/40 transition-colors"
              >
                {rel.label[lang]}
              </button>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <Reveal>
          <div className="landing-glass landing-panel-glow rounded-3xl px-6 sm:px-12 py-10">
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {content.cta.title}
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300">
              {content.cta.body}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => goDemo("footer")}
                className="w-full sm:w-auto bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white px-8"
              >
                {dict.cta.seeInAction}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  track(MarketingEvents.ContactCta, { source: `intent_${routeKey}`, lang });
                  navigate(path("contact"));
                }}
                className="w-full sm:w-auto border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20 px-8"
              >
                {dict.cta.talkToTeam}
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
};

export default IntentPage;
