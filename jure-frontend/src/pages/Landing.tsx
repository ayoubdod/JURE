// src/pages/Landing.tsx — homepage: category-defining narrative for JURE.
import React from "react";
import { Link } from "react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileText,
  KeyRound,
  Landmark,
  Link2,
  Lock,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
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
import { HOME_CONTENT } from "@/marketing/content/home";
import { INSIGHT_ARTICLES } from "@/marketing/routes";
import {
  faqPageJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from "@/marketing/structuredData";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/landing.css";

const SectionHeading: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14 px-4">
    <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white">{title}</h2>
    {subtitle && (
      <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">{subtitle}</p>
    )}
  </div>
);

const Landing: React.FC = () => {
  const { lang, dir, path } = useMarketingLang();
  const reduce = useReducedMotion();
  const t = HOME_CONTENT[lang];

  const jsonLd = [
    organizationJsonLd(lang),
    webSiteJsonLd(lang),
    softwareApplicationJsonLd(lang),
    faqPageJsonLd(t.faq.entries),
  ];

  const workflowIcons1 = [Upload, Link2, CheckCircle2, CalendarClock, Users];
  const workflowIcons2 = [Search, Sparkles, FileText, UserCheck, Scale];

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="none">
      <RouteSeo routeKey="home" lang={lang} jsonLd={jsonLd} />

      {/* ============ HERO ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full landing-glass text-xs font-semibold text-[#64499D] dark:text-[#CFC2FF] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            {t.hero.eyebrow}
          </span>

          <h1 className="text-4xl sm:text-6xl font-bold leading-[1.08] text-slate-900 dark:text-white max-w-4xl mx-auto">
            {t.hero.h1a}{" "}
            <span className="landing-hero-shimmer bg-gradient-to-r from-[#64499D] via-[#8B6FD1] to-[#64499D] bg-clip-text text-transparent">
              {t.hero.h1b}
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-xl font-semibold text-slate-800 dark:text-slate-100">
            {t.hero.verbs}
          </p>

          <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white px-8 shadow-lg shadow-[#64499D]/25"
            >
              <Link
                to={path("demo")}
                onClick={() => track(MarketingEvents.HeroPrimaryCta, { source: "hero", lang })}
              >
                {t.hero.ctaPrimary}
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20 px-8"
            >
              <Link
                to={path("features")}
                onClick={() => track(MarketingEvents.HeroSecondaryCta, { source: "hero", lang })}
              >
                {t.hero.ctaSecondary}
              </Link>
            </Button>
          </div>

          <p className="mt-4">
            <Link
              to={path("pricing")}
              className="text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
            >
              {t.hero.ctaPricing}
            </Link>
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {t.hero.trustChips.map((chip) => (
              <span
                key={chip}
                className="text-[11px] sm:text-xs font-medium px-3 py-1 rounded-full bg-[#64499D]/8 text-[#64499D] dark:bg-[#64499D]/20 dark:text-[#CFC2FF]"
              >
                {chip}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ============ PRODUCT VISUAL ============ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <Reveal>
          <CaseWorkspaceFrame lang={lang} />
        </Reveal>
      </section>

      {/* ============ THE PROBLEM → ONE WORKSPACE ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <Reveal>
            <div className={dir === "rtl" ? "text-right" : ""}>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
                {t.problem.title}
              </h2>
              <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.problem.body1}
              </p>
              <p className="mt-4 text-base sm:text-lg font-semibold text-[#64499D] dark:text-[#CFC2FF]">
                {t.problem.body2}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {t.problem.fragments.map((fragment) => (
                  <div
                    key={fragment}
                    className="px-2 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-center text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40"
                  >
                    {fragment}
                  </div>
                ))}
              </div>
              <div className="flex justify-center text-[#64499D]/60 dark:text-[#8B6FD1]/70">
                <svg width="24" height="28" viewBox="0 0 24 28" fill="none" aria-hidden>
                  <path
                    d="M12 0v22m0 0l-7-7m7 7l7-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="landing-glass landing-panel-glow rounded-2xl px-6 py-7 text-center">
                <div className="flex justify-center mb-3">
                  <img
                    src="/images/jure-logo.png"
                    alt="JURE"
                    className="h-8 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {t.problem.convergenceTitle}
                </div>
                <div className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {t.problem.convergenceSub}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ PLATFORM PILLARS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-16 sm:space-y-24">
        <SectionHeading title={t.pillars.title} subtitle={t.pillars.subtitle} />

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <Reveal>
            <div className={dir === "rtl" ? "text-right" : ""}>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64499D] dark:text-[#CFC2FF] mb-3">
                <Briefcase className="w-4 h-4" /> 01
              </span>
              <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {t.pillars.matter.title}
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.pillars.matter.body}
              </p>
              <Link
                to={path("legal-case-management")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
              >
                {t.pillars.matter.link} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <WorkflowDiagram
              direction="vertical"
              ariaLabel={t.pillars.matter.title}
              steps={[
                { icon: Briefcase, label: t.workflows.docToMatter.steps[1] },
                { icon: FileText, label: t.pillars.documents.title },
                { icon: CheckCircle2, label: t.workflows.docToMatter.steps[2] },
                { icon: CalendarClock, label: t.workflows.docToMatter.steps[3] },
                { icon: Users, label: t.workflows.docToMatter.steps[4], emphasis: true },
              ]}
            />
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <Reveal className="lg:order-2">
            <div className={dir === "rtl" ? "text-right" : ""}>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#64499D] dark:text-[#CFC2FF] mb-3">
                <Sparkles className="w-4 h-4" /> 02
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide text-[9px]">
                  {t.pillars.ai.badge}
                </span>
              </span>
              <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {t.pillars.ai.title}
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.pillars.ai.body}
              </p>
              <p className="mt-3 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF]">
                {t.pillars.ai.disclaimer}
              </p>
              <Link
                to={path("juria")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
              >
                {t.pillars.ai.link} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:order-1">
            <JuriaFrame lang={lang} />
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <Reveal>
            <div className={dir === "rtl" ? "text-right" : ""}>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64499D] dark:text-[#CFC2FF] mb-3">
                <FileText className="w-4 h-4" /> 03
              </span>
              <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {t.pillars.documents.title}
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.pillars.documents.body}
              </p>
              <Link
                to={path("legal-document-management")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
              >
                {t.pillars.documents.link} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <LibraryFrame lang={lang} />
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
          <Reveal className="lg:order-2">
            <div className={dir === "rtl" ? "text-right" : ""}>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64499D] dark:text-[#CFC2FF] mb-3">
                <Users className="w-4 h-4" /> 04
              </span>
              <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {t.pillars.collaboration.title}
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {t.pillars.collaboration.body}
              </p>
              <Link
                to={path("features")}
                onClick={() =>
                  track(MarketingEvents.HeroSecondaryCta, { source: "pillar_collaboration", lang })
                }
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
              >
                {t.pillars.collaboration.link} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:order-1">
            <ChatFrame lang={lang} />
          </Reveal>
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ REAL WORKFLOWS ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading title={t.workflows.title} subtitle={t.workflows.subtitle} />
        <div className="space-y-10">
          <Reveal>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 text-center">
                {t.workflows.docToMatter.title}
              </h3>
              <WorkflowDiagram
                ariaLabel={t.workflows.docToMatter.title}
                steps={t.workflows.docToMatter.steps.map((label, i) => ({
                  icon: workflowIcons1[i],
                  label,
                }))}
              />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-4 text-center">
                {t.workflows.questionToResearch.title}
              </h3>
              <WorkflowDiagram
                ariaLabel={t.workflows.questionToResearch.title}
                steps={t.workflows.questionToResearch.steps.map((label, i) => ({
                  icon: workflowIcons2[i],
                  label,
                  emphasis: i === 3,
                }))}
              />
              <p className="mt-4 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic">
                {t.workflows.questionToResearch.note}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ SECURITY BAND ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Reveal>
          <div className="rounded-3xl bg-gradient-to-br from-[#2A1F4A] via-[#3E2D71] to-[#2A1F4A] text-white px-6 sm:px-12 py-10 sm:py-14 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden>
              <div className="landing-mesh__grid" />
            </div>
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div className={dir === "rtl" ? "text-right" : ""}>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CFC2FF] mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold">{t.security.title}</h2>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                  {t.security.body}
                </p>
                <Button asChild className="mt-5 bg-white text-[#3E2D71] hover:bg-slate-100">
                  <Link
                    to={path("security")}
                    onClick={() => track(MarketingEvents.SecurityCta, { source: "home_band", lang })}
                  >
                    {t.security.cta}
                    <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                  </Link>
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {t.security.items.map((item, i) => {
                  const Icon = [Building2, KeyRound, UserCheck, Lock][i] ?? Lock;
                  return (
                    <div
                      key={item}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/8 border border-white/12"
                    >
                      <Icon className="w-5 h-5 text-[#CFC2FF] shrink-0" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ WHO IT'S FOR ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading title={t.audiences.title} />
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: Landmark, href: "solutions/law-firms", ...t.audiences.firms },
            { icon: Building2, href: "solutions/legal-departments", ...t.audiences.departments },
            { icon: Scale, href: "features", ...t.audiences.lawyers },
          ].map(({ icon: Icon, title, body, href }, i) => (
            <Reveal key={title} delay={i * 0.08} subtle>
              <Link
                to={path(href)}
                className={`landing-glass landing-glass-glow rounded-2xl p-6 h-full w-full text-start hover:ring-1 hover:ring-[#64499D]/30 transition block ${
                  dir === "rtl" ? "text-right" : ""
                }`}
              >
                <span className="w-10 h-10 rounded-xl bg-[#64499D]/10 dark:bg-[#64499D]/25 text-[#64499D] dark:text-[#CFC2FF] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {body}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="landing-divider" />

      {/* ============ INSIGHTS TEASER ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <SectionHeading title={t.insights.title} subtitle={t.insights.subtitle} />
        <div className="grid md:grid-cols-3 gap-5">
          {INSIGHT_ARTICLES.slice(0, 3).map((article, i) => (
            <Reveal key={article.slug} delay={i * 0.08} subtle>
              <Link
                to={path(`insights/${article.slug}`)}
                onClick={() =>
                  track(MarketingEvents.InsightOpened, { slug: article.slug, source: "home" })
                }
                className={`landing-glass landing-glass-glow rounded-2xl p-6 h-full w-full flex flex-col ${
                  dir === "rtl" ? "text-right" : "text-start"
                }`}
              >
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {article.title[lang]}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 flex-1">
                  {article.description[lang]}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF]">
                  {t.insights.readMore} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            to={path("insights")}
            className="text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
          >
            {t.insights.viewAll}
          </Link>
        </div>
      </section>

      <FaqSection title={t.faq.title} faqs={t.faq.entries} className="py-14 sm:py-20" />

      {/* ============ FINAL CTA ============ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 text-center">
        <Reveal>
          <div className="landing-glass landing-panel-glow rounded-3xl px-6 sm:px-12 py-10 sm:py-14">
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              {t.finalCta.title}
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.finalCta.body}
            </p>
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white px-8"
              >
                <Link
                  to="/signup"
                  onClick={() => track(MarketingEvents.SignupCta, { source: "home_final", lang })}
                >
                  {t.finalCta.primary}
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20 px-8"
              >
                <Link
                  to={path("demo")}
                  onClick={() =>
                    track(MarketingEvents.HeroPrimaryCta, { source: "home_final", lang })
                  }
                >
                  {t.finalCta.secondary}
                </Link>
              </Button>
            </div>
            <p className="mt-4">
              <Link
                to={path("pricing")}
                className="text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
              >
                {t.hero.ctaPricing}
              </Link>
            </p>
            <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">{t.finalCta.tagline}</p>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
};

export default Landing;
