import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import { FeatureScene, type FeatureSceneId } from "@/components/landing/FeatureScenes";
import { track, MarketingEvents } from "@/lib/analytics";

const EASE = [0.22, 1, 0.36, 1] as const;
const ROTATE_MS = 5600;
const PAGE_SIZE = 4;

const HIGHLIGHT_MEDIA = [
  { scene: "juria" as const, tone: "dark" as const },
  { scene: "matters" as const, tone: "mist" as const },
  { scene: "documents" as const, tone: "photo" as const },
  { scene: "calendar" as const, tone: "accent" as const },
  { scene: "chat" as const, tone: "dark" as const },
  { scene: "finance" as const, tone: "mist" as const },
  { scene: "roles" as const, tone: "photo" as const },
  { scene: "rtl" as const, tone: "accent" as const },
] as const;

const SOON_MEDIA = [
  { scene: "integrations" as const, tone: "accent" as const },
  { scene: "sso" as const, tone: "photo" as const },
  { scene: "portal" as const, tone: "dark" as const },
  { scene: "automations" as const, tone: "mist" as const },
  { scene: "versions" as const, tone: "photo" as const },
  { scene: "semantic" as const, tone: "dark" as const },
  { scene: "audit" as const, tone: "mist" as const },
  { scene: "encryption" as const, tone: "accent" as const },
  { scene: "sharing" as const, tone: "accent" as const },
  { scene: "mentions" as const, tone: "dark" as const },
] as const;

/** Shape rhythm per slot within a page (cycles if fewer cards). */
const SHAPES = ["poster", "slab", "bloom", "cut"] as const;
type Shape = (typeof SHAPES)[number];
type Tone = "dark" | "mist" | "accent" | "photo";
type Mosaic = "mosaic-a" | "mosaic-b" | "mosaic-pair";

type DeckCard = {
  title: string;
  desc: string;
  badge?: string;
  href?: string;
  scene: FeatureSceneId;
  tone: Tone;
  onTrack?: () => void;
};

type DeckStrings = {
  hero: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust: string;
  };
  highlights: { titleA: string; titleB: string; note: string; items: { title: string; desc: string }[] };
  comingSoon: {
    titleA: string;
    titleB: string;
    note: string;
    items: { title: string; desc: string }[];
  };
  cta: { kicker: string; title: string; subtitle: string; primary: string; secondary: string };
};

function pageCount(length: number, size: number) {
  return Math.max(1, Math.ceil(length / size));
}

/** Real pages only — never wrap, so cards never repeat across dots. */
function pageSlice<T>(items: T[], page: number, size: number): T[] {
  const start = page * size;
  return items.slice(start, start + size);
}

function mosaicFor(page: number, count: number): Mosaic {
  if (count <= 2) return "mosaic-pair";
  return page % 2 === 0 ? "mosaic-a" : "mosaic-b";
}

const SLIDE = 52;
const MOTION_DIRS = [
  { x: 0, y: SLIDE },
  { x: 0, y: -SLIDE },
  { x: SLIDE, y: 0 },
  { x: -SLIDE, y: 0 },
  { x: SLIDE * 0.7, y: SLIDE * 0.55 },
  { x: -SLIDE * 0.7, y: -SLIDE * 0.55 },
  { x: SLIDE * 0.7, y: -SLIDE * 0.55 },
  { x: -SLIDE * 0.7, y: SLIDE * 0.55 },
] as const;

type Offset = { x: number; y: number };
type CardMotion = { enter: Offset; exit: Offset };

function pickDir(avoid?: Offset): Offset {
  const pool = avoid
    ? MOTION_DIRS.filter((d) => !(d.x === avoid.x && d.y === avoid.y))
    : MOTION_DIRS;
  return pool[Math.floor(Math.random() * pool.length)] ?? MOTION_DIRS[0];
}

function makeMotionPlan(count: number): CardMotion[] {
  return Array.from({ length: Math.max(count, 1) }, () => {
    const enter = pickDir();
    return { enter, exit: pickDir(enter) };
  });
}

const mosaicVariants = {
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.02 },
  },
  exit: {
    transition: { staggerChildren: 0.055, staggerDirection: -1 as const },
  },
};

function cardMotion(plan: CardMotion) {
  return {
    hidden: {
      opacity: 0,
      x: plan.enter.x,
      y: plan.enter.y,
      filter: "blur(8px)",
    },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.55, ease: EASE },
    },
    exit: {
      opacity: 0,
      x: plan.exit.x,
      y: plan.exit.y,
      filter: "blur(8px)",
      transition: { duration: 0.38, ease: EASE },
    },
  };
}

function FeatureCard({
  card,
  index,
  shape,
}: {
  card: DeckCard;
  index: number;
  shape: Shape;
}) {
  const body = (
    <>
      <div className="features-card__media" aria-hidden>
        <FeatureScene id={card.scene} />
      </div>
      <span className="features-card__index">{String(index).padStart(2, "0")}</span>
      <div className="features-card__body">
        {card.badge ? <span className="features-card__badge">{card.badge}</span> : null}
        <h3 className="features-card__title">{card.title}</h3>
        <p className="features-card__desc">{card.desc}</p>
      </div>
    </>
  );

  const cls = [
    "features-card",
    `features-card--${card.tone}`,
    `features-card--${shape}`,
    card.href ? "features-card--link" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (card.href) {
    return (
      <Link to={card.href} className={cls} onClick={card.onTrack}>
        {body}
      </Link>
    );
  }

  return <article className={cls}>{body}</article>;
}

function Rotator({
  items,
  classNamePrefix,
}: {
  items: DeckCard[];
  classNamePrefix: string;
}) {
  const reduce = useReducedMotion();
  const pages = pageCount(items.length, PAGE_SIZE);
  const [view, setView] = useState(() => ({
    page: 0,
    plan: makeMotionPlan(Math.min(PAGE_SIZE, items.length) || 1),
  }));
  const [paused, setPaused] = useState(false);
  const shouldRotate = pages > 1 && !reduce;
  const { page, plan } = view;

  const goTo = (next: number) => {
    const target = ((next % pages) + pages) % pages;
    if (target === page) return;
    setView({
      page: target,
      plan: makeMotionPlan(pageSlice(items, target, PAGE_SIZE).length || 1),
    });
  };

  useEffect(() => {
    if (!shouldRotate || paused) return;
    const id = window.setInterval(() => {
      setView((v) => {
        const target = (v.page + 1) % pages;
        return {
          page: target,
          plan: makeMotionPlan(pageSlice(items, target, PAGE_SIZE).length || 1),
        };
      });
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [shouldRotate, paused, pages, items]);

  const cards = pageSlice(items, page, PAGE_SIZE);
  const mosaic = mosaicFor(page, cards.length);
  const startIndex = page * PAGE_SIZE;

  return (
    <div
      className="features-rotate"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="features-rotate__stage" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={page}
            className={`${classNamePrefix} features-bento features-bento--${mosaic}`}
            variants={reduce ? undefined : mosaicVariants}
            initial={reduce ? false : "hidden"}
            animate="show"
            exit={reduce ? undefined : "exit"}
          >
            {cards.map((card, i) => {
              const motionPlan = plan[i] ?? {
                enter: MOTION_DIRS[0],
                exit: MOTION_DIRS[1],
              };
              return (
                <motion.div
                  key={card.title}
                  className="features-bento__cell"
                  variants={reduce ? undefined : cardMotion(motionPlan)}
                >
                  <FeatureCard
                    card={card}
                    index={startIndex + i + 1}
                    shape={SHAPES[i % SHAPES.length]}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
      {shouldRotate ? (
        <div className="features-dots" role="tablist" aria-label="Cards">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} / ${pages}`}
              aria-current={i === page ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function FeaturesDeck({
  t,
  lang,
  path,
}: {
  t: DeckStrings;
  lang: "fr" | "en" | "ar";
  path: (slug?: string) => string;
}) {
  const pills = t.hero.trust.split("•").map((s) => s.trim()).filter(Boolean);

  const highlightCards: DeckCard[] = t.highlights.items.map((item, i) => {
    const media = HIGHLIGHT_MEDIA[i] ?? HIGHLIGHT_MEDIA[0];
    return {
      title: item.title,
      desc: item.desc,
      scene: media.scene,
      tone: media.tone,
    };
  });

  const soonCards: DeckCard[] = t.comingSoon.items.map((item, i) => {
    const media = SOON_MEDIA[i] ?? SOON_MEDIA[0];
    return {
      title: item.title,
      desc: item.desc,
      scene: media.scene,
      tone: media.tone,
    };
  });

  return (
    <div className="features-deck">
      <div className="features-orbs" aria-hidden>
        <span className="features-orb features-orb--a" />
        <span className="features-orb features-orb--b" />
        <span className="features-orb features-orb--c" />
        <span className="features-orb features-orb--d" />
      </div>

      <section className="features-hero">
        <div className="features-deck__inner">
          <p className="features-hero__kicker">{t.hero.eyebrow}</p>
          <h1 className="features-hero__title">
            {t.hero.titleA} <em>{t.hero.titleB}</em>
          </h1>
          <p className="features-hero__lead">{t.hero.subtitle}</p>
          <div className="features-hero__actions">
            <Link
              to="/signup"
              className="features-btn features-btn--dark"
              onClick={() => track(MarketingEvents.SignupCta, { source: "features_hero", lang })}
            >
              {t.hero.ctaPrimary}
              <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </Link>
            <Link
              to={path("contact")}
              className="features-btn features-btn--ghost"
              onClick={() => track(MarketingEvents.ContactCta, { source: "features_hero", lang })}
            >
              {t.hero.ctaSecondary}
            </Link>
          </div>
          <div className="features-hero__pills">
            {pills.map((pill) => (
              <span key={pill} className="features-pill">
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="features-block" id="capabilities">
        <div className="features-deck__inner">
          <Reveal>
            <div className="features-block__head">
              <h2 className="features-block__title">
                {t.highlights.titleA} <em>{t.highlights.titleB}</em>
              </h2>
              <p className="features-block__lead">{t.highlights.note}</p>
            </div>
          </Reveal>
          <Rotator items={highlightCards} classNamePrefix="features-bento-live" />
        </div>
      </section>

      <section className="features-block" id="coming-soon">
        <div className="features-deck__inner">
          <Reveal>
            <div className="features-block__head">
              <h2 className="features-block__title">
                {t.comingSoon.titleA} <em>{t.comingSoon.titleB}</em>
              </h2>
              <p className="features-block__lead">{t.comingSoon.note}</p>
            </div>
          </Reveal>
          <Rotator items={soonCards} classNamePrefix="features-bento-soon" />
        </div>
      </section>

      <section className="features-close">
        <div className="features-deck__inner">
          <p className="features-close__kicker">{t.cta.kicker}</p>
          <h2 className="features-close__title">{t.cta.title}</h2>
          <p className="features-close__lead">{t.cta.subtitle}</p>
          <div className="features-close__actions">
            <Link
              to="/signup"
              className="features-btn features-btn--dark"
              onClick={() => track(MarketingEvents.SignupCta, { source: "features_final", lang })}
            >
              {t.cta.primary}
              <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
            </Link>
            <Link
              to={path("contact")}
              className="features-btn features-btn--ghost"
              onClick={() => track(MarketingEvents.ContactCta, { source: "features_final", lang })}
            >
              {t.cta.secondary}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
