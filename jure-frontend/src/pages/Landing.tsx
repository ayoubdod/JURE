// src/pages/Landing.tsx — cinematic LegalTech homepage (public marketing only).
import React, { useRef } from "react";
import { Link } from "react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useInView,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  FileText,
  KeyRound,
  Landmark,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import FaqSection from "@/components/landing/FaqSection";
import FloatingChip from "@/components/landing/FloatingChip";
import MediaSlot from "@/components/landing/MediaSlot";
import {
  CaseWorkspaceFrame,
  ChatFrame,
  JuriaFrame,
  LibraryFrame,
} from "@/components/landing/ProductFrame";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";
import { HOME_CONTENT } from "@/marketing/content/home";
import {
  faqPageJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from "@/marketing/structuredData";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/landing.css";

const EASE = [0.22, 1, 0.36, 1] as const;

const ProductStage: React.FC<{
  children: React.ReactNode;
  floats?: React.ReactNode;
  className?: string;
}> = ({ children, floats, className = "" }) => (
  <div className={`landing-product-stage relative ${className}`}>
    <div className="landing-product-stage__glow" aria-hidden />
    <div className="landing-product-stage__frame relative z-[1]">{children}</div>
    {floats}
  </div>
);

const FeatureRow: React.FC<{
  index: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  linkLabel: string;
  linkTo: string;
  badge?: string;
  reverse?: boolean;
  rtl?: boolean;
  product: React.ReactNode;
  onLink?: () => void;
}> = ({
  index,
  icon,
  title,
  body,
  linkLabel,
  linkTo,
  badge,
  reverse,
  rtl,
  product,
  onLink,
}) => {
  const textFrom = reverse ? (rtl ? -30 : 30) : rtl ? 30 : -30;
  const productFrom = reverse ? (rtl ? 50 : -50) : rtl ? -50 : 50;

  return (
    <div
      className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
        reverse ? "" : ""
      }`}
    >
      <Reveal
        x={textFrom}
        className={reverse ? "lg:order-2" : ""}
        duration={0.7}
      >
        <div className={rtl ? "text-right" : "text-start"}>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64499D] dark:text-[#CFC2FF] mb-3">
            {icon} {index}
            {badge && (
              <span className="ms-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide text-[9px]">
                {badge}
              </span>
            )}
          </span>
          <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            {body}
          </p>
          <Link
            to={linkTo}
            onClick={onLink}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#64499D] dark:text-[#CFC2FF] hover:underline"
          >
            {linkLabel} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </Reveal>
      <Reveal
        x={productFrom}
        delay={0.08}
        className={reverse ? "lg:order-1" : ""}
        duration={0.75}
      >
        {product}
      </Reveal>
    </div>
  );
};

const TrustItem: React.FC<{
  children: React.ReactNode;
  delay: number;
  className?: string;
}> = ({ children, delay, className }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: EASE, delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
};

const Landing: React.FC = () => {
  const { lang, dir, path } = useMarketingLang();
  const reduce = useReducedMotion();
  const t = HOME_CONTENT[lang];
  const rtl = dir === "rtl";

  const heroRef = useRef<HTMLElement>(null);
  const showcaseRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -48]);
  const heroVisualY = useTransform(
    heroProgress,
    [0, 1],
    reduce ? [0, 0] : [0, -28]
  );
  const heroVisualScale = useTransform(
    heroProgress,
    [0, 1],
    reduce ? [1, 1] : [1, 1.04]
  );

  const { scrollYProgress: showcaseProgress } = useScroll({
    target: showcaseRef,
    offset: ["start end", "end start"],
  });
  const showcaseScale = useTransform(
    showcaseProgress,
    [0.15, 0.55],
    reduce ? [1, 1] : [1, 1.05]
  );
  const showcaseY = useTransform(
    showcaseProgress,
    [0.15, 0.55],
    reduce ? [0, 0] : [0, -20]
  );
  const showcaseTextOpacity = useTransform(
    showcaseProgress,
    [0.2, 0.45],
    reduce ? [1, 1] : [0, 1]
  );
  const showcaseTextX = useTransform(
    showcaseProgress,
    [0.2, 0.45],
    reduce ? [0, 0] : [rtl ? -30 : 30, 0]
  );

  const jsonLd = [
    organizationJsonLd(lang),
    webSiteJsonLd(lang),
    softwareApplicationJsonLd(lang),
    faqPageJsonLd(t.faq.entries),
  ];

  const enter = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay: 0 } }
      : {
          initial: { opacity: 0, y: 20, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.75, delay, ease: EASE },
        };

  const heroFloats = (
    <>
      <FloatingChip
        className="hidden md:block absolute -start-3 top-[12%] z-[2]"
        delay={0.2}
        duration={4.4}
      >
        <div className="landing-float-chip__card flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-[#64499D]" />
          <span>{t.floats.notification}</span>
        </div>
      </FloatingChip>
      <FloatingChip
        className="hidden md:block absolute -end-2 top-[28%] z-[2]"
        delay={0.8}
        duration={4.8}
      >
        <div className="landing-float-chip__card flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#64499D]" />
          <span>{t.floats.deadline}</span>
        </div>
      </FloatingChip>
      <FloatingChip
        className="hidden lg:block absolute start-[8%] -bottom-3 z-[2]"
        delay={1.4}
        duration={5}
      >
        <div className="landing-float-chip__card flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#64499D]" />
          <span>{t.floats.aiSuggestion}</span>
        </div>
      </FloatingChip>
      <FloatingChip
        className="hidden lg:block absolute end-[10%] bottom-[8%] z-[2]"
        delay={0.5}
        duration={3.8}
      >
        <div className="landing-float-chip__card flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#64499D]" />
          <span>{t.floats.document}</span>
        </div>
      </FloatingChip>
    </>
  );

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="none">
      <RouteSeo routeKey="home" lang={lang} jsonLd={jsonLd} />

      {/* ============ HERO ============ */}
      <section
        ref={heroRef}
        className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-28"
      >
        <motion.div style={{ y: heroY }} className="text-center">
          <motion.p
            className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase text-[#64499D] dark:text-[#CFC2FF] mb-4"
            {...enter(0)}
          >
            {t.hero.eyebrow}
          </motion.p>

          <motion.h1
            className="text-[1.85rem] sm:text-5xl xl:text-[3.35rem] font-bold leading-[1.12] sm:leading-[1.08] text-slate-900 dark:text-white max-w-3xl mx-auto tracking-tight"
            {...enter(0.1)}
          >
            {t.hero.h1a}{" "}
            <span className="landing-hero-shimmer bg-gradient-to-r from-[#64499D] via-[#8B6FD1] to-[#64499D] bg-clip-text text-transparent">
              {t.hero.h1b}
            </span>
          </motion.h1>

          <motion.p
            className="mt-4 sm:mt-5 text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed"
            {...enter(0.18)}
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
            {...enter(0.26)}
          >
            <Button
              asChild
              size="lg"
              className="landing-cta-btn w-full sm:w-auto bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white px-8 shadow-lg shadow-[#64499D]/25"
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
                onClick={() =>
                  track(MarketingEvents.HeroSecondaryCta, { source: "hero", lang })
                }
              >
                {t.hero.ctaSecondary}
              </Link>
            </Button>
          </motion.div>

          <motion.div
            className="mt-5 flex flex-wrap items-center justify-center gap-2"
            {...enter(0.3)}
          >
            {t.hero.trustChips.map((chip) => (
              <span
                key={chip}
                className="text-[11px] sm:text-xs font-medium px-3 py-1.5 rounded-full bg-[#64499D]/8 text-[#64499D] dark:bg-[#64499D]/20 dark:text-[#CFC2FF]"
              >
                {chip}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-12 sm:mt-16"
          style={{ y: heroVisualY, scale: heroVisualScale }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 35, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: reduce ? 0 : 0.35, ease: EASE }}
        >
          <ProductStage floats={heroFloats}>
            <MediaSlot
              src="/images/hero-product.png"
              fileName="hero-product.png"
              alt={t.hero.imageAlt}
              aspect="aspect-[16/10]"
              fallback={<CaseWorkspaceFrame lang={lang} />}
            />
          </ProductStage>
        </motion.div>
      </section>

      {/* ============ PROBLEM ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal x={rtl ? 30 : -30}>
            <div className={rtl ? "text-right" : "text-start"}>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
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
          <Reveal delay={0.1} x={rtl ? -40 : 40}>
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
              <div className="landing-glass landing-panel-glow rounded-2xl px-6 py-8 text-center">
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

      {/* ============ PRODUCT SHOWCASE ============ */}
      <section
        ref={showcaseRef}
        className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20 landing-showcase"
      >
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-10 lg:gap-14 items-center">
          <motion.div style={{ scale: showcaseScale, y: showcaseY }} className="origin-center">
            <ProductStage>
              <MediaSlot
                src="/images/showcase-dashboard.png"
                fileName="showcase-dashboard.png"
                alt={t.showcase.title}
                aspect="aspect-[16/10]"
                fallback={<CaseWorkspaceFrame lang={lang} />}
              />
            </ProductStage>
          </motion.div>
          <motion.div
            style={{ opacity: showcaseTextOpacity, x: showcaseTextX }}
            className={rtl ? "text-right" : "text-start"}
          >
            <span className="text-xs font-semibold tracking-[0.16em] uppercase text-[#64499D] dark:text-[#CFC2FF]">
              {t.showcase.eyebrow}
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.showcase.title}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.showcase.body}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============ FEATURE SECTIONS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-28 space-y-24 sm:space-y-32">
        <div className="text-center max-w-3xl mx-auto">
          <Reveal>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.pillars.title}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              {t.pillars.subtitle}
            </p>
          </Reveal>
        </div>

        <FeatureRow
          index="01"
          icon={<Briefcase className="w-4 h-4" />}
          title={t.pillars.matter.title}
          body={t.pillars.matter.body}
          linkLabel={t.pillars.matter.link}
          linkTo={path("legal-case-management")}
          rtl={rtl}
          product={
            <ProductStage
              floats={
                <FloatingChip
                  className="hidden sm:block absolute -end-2 top-6 z-[2]"
                  delay={0.3}
                  duration={4.5}
                >
                  <div className="landing-float-chip__card flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {t.floats.caseStatus}
                  </div>
                </FloatingChip>
              }
            >
              <MediaSlot
                src="/images/feature-cases.png"
                fileName="feature-cases.png"
                alt={t.pillars.matter.title}
                fallback={<CaseWorkspaceFrame lang={lang} />}
              />
            </ProductStage>
          }
        />

        <FeatureRow
          index="02"
          icon={<FileText className="w-4 h-4" />}
          title={t.pillars.documents.title}
          body={t.pillars.documents.body}
          linkLabel={t.pillars.documents.link}
          linkTo={path("legal-document-management")}
          reverse
          rtl={rtl}
          product={
            <ProductStage
              floats={
                <FloatingChip
                  className="hidden sm:block absolute -start-2 bottom-8 z-[2]"
                  delay={0.6}
                  duration={4.2}
                >
                  <div className="landing-float-chip__card flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#64499D]" />
                    {t.floats.document}
                  </div>
                </FloatingChip>
              }
            >
              <MediaSlot
                src="/images/feature-documents.png"
                fileName="feature-documents.png"
                alt={t.pillars.documents.title}
                fallback={<LibraryFrame lang={lang} />}
              />
            </ProductStage>
          }
        />

        <FeatureRow
          index="03"
          icon={<Users className="w-4 h-4" />}
          title={t.pillars.collaboration.title}
          body={t.pillars.collaboration.body}
          linkLabel={t.pillars.collaboration.link}
          linkTo={path("features")}
          rtl={rtl}
          onLink={() =>
            track(MarketingEvents.HeroSecondaryCta, { source: "pillar_collaboration", lang })
          }
          product={
            <ProductStage
              floats={
                <FloatingChip
                  className="hidden sm:block absolute -end-2 top-10 z-[2]"
                  delay={0.4}
                  duration={4.6}
                >
                  <div className="landing-float-chip__card flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#64499D]" />
                    {t.floats.client}
                  </div>
                </FloatingChip>
              }
            >
              <MediaSlot
                src="/images/feature-collaboration.png"
                fileName="feature-collaboration.png"
                alt={t.pillars.collaboration.title}
                fallback={<ChatFrame lang={lang} />}
              />
            </ProductStage>
          }
        />
      </section>

      {/* ============ JURIA ============ */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-28">
        <div className="landing-juria-panel relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] px-5 sm:px-10 md:px-14 py-12 sm:py-16">
          <div className="landing-juria-panel__glow" aria-hidden />
          <div className="landing-juria-panel__particles" aria-hidden />
          <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <Reveal x={rtl ? 30 : -30}>
              <div className={rtl ? "text-right" : "text-start"}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold text-[#E8DFFF] mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t.pillars.ai.badge}
                </span>
                <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                  {t.pillars.ai.title}
                </h2>
                <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                  {t.pillars.ai.body}
                </p>
                <p className="mt-4 text-sm font-semibold text-[#CFC2FF]">
                  {t.pillars.ai.disclaimer}
                </p>
                <Button
                  asChild
                  className="mt-6 bg-white text-[#3E2D71] hover:bg-slate-100 landing-cta-btn"
                >
                  <Link to={path("juria")}>
                    {t.pillars.ai.link}
                    <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                  </Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.1} x={rtl ? -40 : 40} scale={0.97}>
              <div className="relative">
                <MediaSlot
                  src="/images/juria-preview.png"
                  fileName="juria-preview.png"
                  alt={t.pillars.ai.title}
                  className="landing-juria-preview"
                  fallback={<JuriaFrame lang={lang} />}
                />
                <FloatingChip
                  className="hidden sm:block absolute -start-3 bottom-6 z-[2]"
                  delay={1}
                  duration={5}
                >
                  <div className="landing-float-chip__card landing-float-chip__card--on-dark flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t.floats.aiSuggestion}
                  </div>
                </FloatingChip>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF / TRUST ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.trust.title}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
              {t.trust.subtitle}
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {t.trust.stats.map((stat, i) => (
            <TrustItem key={stat.label} delay={i * 0.08}>
              <div className="text-center px-4 py-6">
                <div className="text-3xl sm:text-4xl font-bold text-[#64499D] dark:text-[#CFC2FF] tabular-nums tracking-tight">
                  {stat.value}
                  {stat.suffix}
                </div>
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {stat.label}
                </div>
              </div>
            </TrustItem>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {t.trust.logoLabels.map((label, i) => (
            <TrustItem key={label} delay={0.24 + i * 0.08}>
              <div className="landing-logo-slot px-5 py-3 rounded-xl text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                {label}
                <span className="block text-[10px] font-mono text-slate-400 mt-1 opacity-70">
                  logo-{i + 1}.svg
                </span>
              </div>
            </TrustItem>
          ))}
        </div>
      </section>

      {/* ============ SECURITY ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Reveal scale={0.98}>
          <div className="rounded-3xl bg-gradient-to-br from-[#2A1F4A] via-[#3E2D71] to-[#2A1F4A] text-white px-6 sm:px-12 py-10 sm:py-14 relative overflow-hidden">
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div className={rtl ? "text-right" : "text-start"}>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#CFC2FF] mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {t.security.title}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
                  {t.security.body}
                </p>
                <Button asChild className="mt-5 bg-white text-[#3E2D71] hover:bg-slate-100">
                  <Link
                    to={path("security")}
                    onClick={() =>
                      track(MarketingEvents.SecurityCta, { source: "home_band", lang })
                    }
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

      {/* ============ AUDIENCES ============ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
        <Reveal>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-10">
            {t.audiences.title}
          </h2>
        </Reveal>
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
                  rtl ? "text-right" : ""
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

      <FaqSection title={t.faq.title} faqs={t.faq.entries} className="py-14 sm:py-20" />

      {/* ============ FINAL CTA ============ */}
      <FinalCta t={t} lang={lang} path={path} />
    </MarketingShell>
  );
};

const FinalCta: React.FC<{
  t: (typeof HOME_CONTENT)["en"];
  lang: "en" | "fr" | "ar";
  path: (slug?: string) => string;
}> = ({ t, lang, path }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
      <motion.div
        className="landing-glass landing-panel-glow rounded-3xl px-6 sm:px-12 py-12 sm:py-16"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
        animate={inView ? { opacity: 1, scale: 1 } : undefined}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight whitespace-pre-line">
          {t.finalCta.title}
        </h2>
        <p className="mt-4 max-w-xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
          {t.finalCta.body}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="landing-cta-btn w-full sm:w-auto bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white px-8 shadow-lg shadow-[#64499D]/25"
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
        <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">{t.finalCta.tagline}</p>
      </motion.div>
    </section>
  );
};

export default Landing;
