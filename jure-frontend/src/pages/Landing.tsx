// src/pages/Landing.tsx — premium LegalTech homepage (public marketing only).
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
  Building2,
  Calendar,
  FileText,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import FaqSection from "@/components/landing/FaqSection";
import SitelinkList from "@/components/landing/SitelinkList";
import FloatingChip from "@/components/landing/FloatingChip";
import WorkspaceShowcase from "@/components/landing/WorkspaceShowcase";
import { JuriaFrame, MiniProductCard } from "@/components/landing/ProductFrame";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";
import { HOME_CONTENT } from "@/marketing/content/home";
import {
  faqPageJsonLd,
  organizationJsonLd,
  siteNavigationJsonLd,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from "@/marketing/structuredData";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/landing.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const HERO_PRODUCT_IMG = "/images/landing-page/hero_img.png";

const Landing: React.FC = () => {
  const { lang, dir, path } = useMarketingLang();
  const reduce = useReducedMotion();
  const t = HOME_CONTENT[lang];
  const rtl = dir === "rtl";

  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -36]);
  const heroVisualY = useTransform(
    heroProgress,
    [0, 1],
    reduce ? [0, 0] : [0, 28]
  );
  const floatSlow = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -40]);
  const floatFast = useTransform(heroProgress, [0, 1], reduce ? [0, 0] : [0, -70]);

  const jsonLd = [
    organizationJsonLd(lang),
    webSiteJsonLd(lang),
    softwareApplicationJsonLd(lang),
    siteNavigationJsonLd(lang),
    faqPageJsonLd(t.faq.entries),
  ];

  const enter = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay: 0 } }
      : {
          initial: { opacity: 0, y: 22, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { duration: 0.8, delay, ease: EASE },
        };

  const editorialTone = [
    "landing-value-card--purple",
    "landing-value-card--blue",
    "landing-value-card--white",
    "landing-value-card--violet",
  ];
  const editorialSpan = ["md:col-span-4", "md:col-span-2", "md:col-span-2", "md:col-span-4"];

  return (
    <MarketingShell
      lang={lang}
      onLangChange={() => {}}
      dir={dir}
      activeNav="none"
      darkHero
      closingCta={<FinalCta t={t} lang={lang} path={path} />}
    >
      <RouteSeo routeKey="home" lang={lang} jsonLd={jsonLd} />

      {/* ============ HERO ============ */}
      <section ref={heroRef} className="landing-hero relative">
        <div className="landing-hero-stage px-5 sm:px-10 pt-24 sm:pt-28 pb-0">
          <div className="landing-hero-aurora" aria-hidden />
          <div className="landing-hero-grid" aria-hidden />
          <div className="landing-hero-nodes" aria-hidden />
          <div className="landing-hero-product-glow" aria-hidden />

          <motion.div style={{ y: heroY }} className="landing-hero-copy text-center max-w-7xl mx-auto">
            <motion.p className="landing-hero-kicker mb-5" {...enter(0)}>
              {t.hero.eyebrow}
            </motion.p>

            <motion.h1
              className="text-[2.15rem] sm:text-5xl xl:text-[4.35rem] font-bold leading-[1.04] sm:leading-[1.0] text-white max-w-4xl mx-auto tracking-[-0.03em]"
              {...enter(0.08)}
            >
              {t.hero.h1a}{" "}
              <span className="landing-gradient-text">{t.hero.h1b}</span>
            </motion.h1>

            <motion.p
              className="mt-5 sm:mt-6 text-sm sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed"
              {...enter(0.16)}
            >
              {t.hero.subtitle}
            </motion.p>

            <motion.div
              className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
              {...enter(0.24)}
            >
              <Button asChild size="lg" className="landing-cta-btn landing-btn-primary w-full sm:w-auto px-8">
                <Link
                  to="/signup"
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
                className="landing-cta-btn landing-btn-ghost-dark w-full sm:w-auto px-8"
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

            <motion.div className="mt-4" {...enter(0.3)}>
              <h2 className="sr-only">{t.sitelinks.title}</h2>
              <SitelinkList lang={lang} label={t.sitelinks.title} variant="inline" />
            </motion.div>
          </motion.div>

          <motion.div
            className="landing-hero-composition relative mx-auto mt-2 sm:mt-3"
            style={{ y: heroVisualY }}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 48, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: reduce ? 0 : 0.32, ease: EASE }}
          >
            <div className="landing-hero-photo-wrap mx-auto">
              <img
                src={HERO_PRODUCT_IMG}
                alt={t.hero.imageAlt}
                className="landing-hero-photo relative z-[1] w-full h-auto"
                decoding="async"
              />
            </div>

            <motion.div style={{ y: floatSlow }} className="landing-hero-float">
              <FloatingChip
                className="hidden md:block landing-hero-float-slot landing-hero-float-slot--cases"
                delay={0.2}
                duration={4.6}
                rotate={-4}
              >
                <MiniProductCard label={t.floats.activeCases}>
                  <div className="landing-mini-card__muted text-[10px] font-semibold uppercase tracking-wide">
                    {t.floats.activeCases}
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums leading-none">12</div>
                </MiniProductCard>
              </FloatingChip>
            </motion.div>

            <motion.div style={{ y: floatFast }} className="landing-hero-float">
              <FloatingChip
                className="hidden md:block landing-hero-float-slot landing-hero-float-slot--consult"
                delay={0.7}
                duration={5.1}
                rotate={4}
              >
                <MiniProductCard label={t.floats.consultations}>
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[var(--jure-violet-light)]" />
                    {t.floats.consultations}
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums">3</div>
                </MiniProductCard>
              </FloatingChip>
            </motion.div>

            <motion.div style={{ y: floatSlow }} className="landing-hero-float">
              <FloatingChip
                className="hidden lg:block landing-hero-float-slot landing-hero-float-slot--next"
                delay={1.1}
                duration={4.8}
                rotate={3}
              >
                <MiniProductCard label={t.floats.nextConsult}>
                  <div className="landing-mini-card__muted text-[10px] font-semibold uppercase tracking-wide">
                    {t.floats.nextConsult}
                  </div>
                  <div className="mt-1 text-[13px] font-semibold leading-snug">{t.floats.clientName}</div>
                  <div className="mt-0.5 landing-mini-card__muted text-[11px]">{t.floats.clientMeta}</div>
                </MiniProductCard>
              </FloatingChip>
            </motion.div>

            <motion.div style={{ y: floatFast }} className="landing-hero-float">
              <FloatingChip
                className="hidden lg:block landing-hero-float-slot landing-hero-float-slot--juria"
                delay={0.4}
                duration={5.4}
                rotate={-4}
              >
                <MiniProductCard label={t.floats.juriaReady}>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--jure-blue)] to-[var(--jure-violet)] flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </span>
                    <span className="text-[12px] font-semibold">JURIA</span>
                  </div>
                  <div className="mt-1.5 landing-mini-card__muted text-[12px]">{t.floats.juriaReady}</div>
                </MiniProductCard>
              </FloatingChip>
            </motion.div>

            <FloatingChip
              className="landing-hero-float hidden xl:block landing-hero-float-slot landing-hero-float-slot--docs"
              delay={1.5}
              duration={4.2}
              rotate={-2}
            >
              <MiniProductCard label={t.floats.documents}>
                <div className="flex items-center gap-2 text-[12px] font-semibold">
                  <FileText className="w-3.5 h-3.5 text-[var(--jure-violet-light)]" />
                  {t.floats.documents}
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums">24</div>
              </MiniProductCard>
            </FloatingChip>

            <FloatingChip
              className="landing-hero-float hidden xl:block landing-hero-float-slot landing-hero-float-slot--team"
              delay={0.9}
              duration={4.9}
              rotate={5}
            >
              <MiniProductCard label={t.floats.teamOnline}>
                <div className="flex items-center gap-2 text-[12px] font-semibold">
                  <Users className="w-3.5 h-3.5 text-[var(--jure-violet-light)]" />
                  {t.floats.teamOnline}
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums">8</div>
              </MiniProductCard>
            </FloatingChip>
          </motion.div>
        </div>
      </section>

      {/* ============ EDITORIAL VALUE ============ */}
      <section className="landing-section-white landing-section-after-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <Reveal>
          <h2 className="text-3xl sm:text-5xl xl:text-[3.5rem] font-bold tracking-[-0.03em] leading-[1.08] landing-ink max-w-4xl">
            {t.editorial.titleA}
            <br />
            <span className="bg-gradient-to-r from-[var(--jure-blue)] via-[var(--jure-violet)] to-[var(--jure-violet-light)] bg-clip-text text-transparent">
              {t.editorial.titleB}
            </span>
          </h2>
        </Reveal>

        <div className="mt-10 sm:mt-14 grid md:grid-cols-6 gap-4 sm:gap-5">
          {t.editorial.cards.map((card, i) => (
            <Reveal key={card.index} delay={i * 0.07} className={editorialSpan[i]}>
              <div className={`landing-value-card ${editorialTone[i]} h-full p-6 sm:p-8`}>
                <div className="landing-value-card__index">
                  {card.index}
                </div>
                <h3 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm sm:text-[15px] leading-relaxed">
                  {card.body}
                </p>
              </div>
            </Reveal>
          ))}
          <Reveal delay={0.32} className="md:col-span-6">
            <div className="landing-value-card landing-value-card--black p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="landing-value-card__index">05</div>
                <h3 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight">
                  {t.features.team.category}
                </h3>
                <p className="mt-3 text-sm sm:text-[15px] leading-relaxed max-w-xl">
                  {t.features.team.body}
                </p>
              </div>
              <Link
                to={path("features")}
                className="landing-text-link inline-flex items-center gap-1.5 text-sm text-white hover:text-[var(--jure-violet-light)]"
              >
                {t.features.team.link} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Link>
            </div>
          </Reveal>
        </div>
        </div>
      </section>

      {/* ============ POSITIONING ============ */}
      <section className="landing-position">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <Reveal>
            <h2 className="landing-position__title">{t.metrics.title}</h2>
          </Reveal>
          <div className="landing-position__grid">
            {t.metrics.items.map((item, i) => (
              <Reveal key={item.index} delay={i * 0.08} subtle>
                <article className="landing-position__item">
                  <span className="landing-position__index" aria-hidden>
                    {item.index}
                  </span>
                  <h3 className="landing-position__kicker">{item.kicker}</h3>
                  <p className="landing-position__headline">{item.headline}</p>
                  <p className="landing-position__body">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WORKSPACE WALKTHROUGH ============ */}
      <WorkspaceShowcase />

      {/* ============ JURIA ============ */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-20">
        <div className="landing-juria-panel relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] px-5 sm:px-10 md:px-14 py-12 sm:py-20">
          <div className="landing-juria-panel__glow" aria-hidden />
          <div className="landing-juria-panel__particles" aria-hidden />
          <div className="landing-juria-panel__nodes" aria-hidden />
          <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <Reveal x={rtl ? 30 : -30}>
              <div className="text-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] border border-white/15 text-xs font-semibold text-white mb-5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--jure-violet-light)]" />
                  {t.juria.badge}
                </span>
                <h2 className="text-3xl sm:text-[2.75rem] font-bold text-white tracking-[-0.03em] leading-[1.1]">
                  {t.juria.titleA}
                  <br />
                  <span className="landing-gradient-text">{t.juria.titleB}</span>
                </h2>
                <p className="mt-5 text-sm sm:text-base text-white/70 leading-relaxed max-w-md">
                  {t.juria.body}
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--jure-violet-light)]">
                  {t.juria.disclaimer}
                </p>
                <Button asChild className="mt-7 landing-cta-btn landing-btn-primary">
                  <Link to={path("juria")}>
                    {t.juria.link}
                    <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                  </Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.1} x={rtl ? -40 : 40} scale={0.97}>
              <div className="relative">
                <div className="landing-juria-preview rounded-[1.35rem] overflow-hidden">
                  <JuriaFrame lang={lang} />
                </div>
                <FloatingChip
                  className="hidden sm:block absolute -start-3 bottom-6 z-[2]"
                  delay={1}
                  duration={5}
                  rotate={-4}
                >
                  <MiniProductCard label={t.floats.juriaReady} className="landing-mini-card--on-preview">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#2949e8]">
                      <Sparkles className="w-3.5 h-3.5" />
                      JURIA
                    </div>
                    <div className="mt-1 landing-mini-card__muted text-[11px]">{t.floats.juriaReady}</div>
                  </MiniProductCard>
                </FloatingChip>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ SECURITY ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Reveal scale={0.98}>
          <div className="landing-band rounded-[1.75rem] sm:rounded-[2rem] text-white px-6 sm:px-12 py-10 sm:py-14">
            <div className="relative grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-start">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--jure-violet-light)] mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {t.security.title}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
                  {t.security.body}
                </p>
                <Button asChild className="mt-5 landing-btn-on-dark">
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
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/6 border border-white/10"
                    >
                      <Icon className="w-5 h-5 text-[var(--jure-violet-light)] shrink-0" />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <FaqSection
        variant="panel"
        title={t.faq.title}
        lead={t.faq.lead}
        faqs={t.faq.entries}
        ctaPrompt={t.faq.ctaPrompt}
        cta={t.faq.cta}
        ctaHref={path("contact")}
        onCtaClick={() => track(MarketingEvents.ContactCta, { source: "home_faq", lang })}
      />

    </MarketingShell>
  );
};

const FinalCta: React.FC<{
  t: (typeof HOME_CONTENT)["en"];
  lang: "en" | "fr" | "ar";
  path: (slug?: string) => string;
}> = ({ t, lang, path }) => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className="landing-close__cta"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <p className="landing-close__kicker">{t.finalCta.kicker}</p>
      <h2 className="landing-close__title">{t.finalCta.title}</h2>
      <p className="landing-close__lead">{t.finalCta.body}</p>
      <div className="landing-close__actions">
        <Button asChild size="lg" className="landing-cta-btn landing-btn-primary landing-close__btn">
          <Link
            to="/signup"
            onClick={() => track(MarketingEvents.SignupCta, { source: "home_final", lang })}
          >
            {t.finalCta.primary}
            <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="landing-cta-btn landing-btn-secondary landing-close__btn"
        >
          <Link
            to={path("contact")}
            onClick={() =>
              track(MarketingEvents.ContactCta, { source: "home_final", lang })
            }
          >
            {t.finalCta.secondary}
          </Link>
        </Button>
      </div>
    </motion.div>
  );
};

export default Landing;
