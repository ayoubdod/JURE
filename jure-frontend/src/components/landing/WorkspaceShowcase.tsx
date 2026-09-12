import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import { WorkspaceCanvas, type WorkspaceSceneId } from "@/components/landing/WorkspaceScenes";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { HOME_CONTENT } from "@/marketing/content/home";
import { SHOWCASE_UI } from "@/marketing/content/workspaceShowcase";
import { track, MarketingEvents } from "@/lib/analytics";

const EASE = [0.22, 1, 0.36, 1] as const;

type Beat = {
  id: WorkspaceSceneId;
  index: string;
  category: string;
  title: string;
  body: string;
  link?: string;
  to?: string;
};

export default function WorkspaceShowcase() {
  const { lang, path } = useMarketingLang();
  const reduce = useReducedMotion();
  const t = HOME_CONTENT[lang].features;
  const ui = SHOWCASE_UI[lang];
  const [active, setActive] = useState<WorkspaceSceneId>("cases");
  const itemRefs = useRef<Partial<Record<WorkspaceSceneId, HTMLElement | null>>>({});

  const beats: Beat[] = [
    {
      id: "cases",
      index: "01",
      category: t.cases.category,
      title: t.cases.title,
      body: t.cases.body,
      link: t.cases.link,
      to: path("legal-case-management"),
    },
    {
      id: "client",
      index: "02",
      category: t.clients.category,
      title: t.clients.title,
      body: t.clients.body,
      link: t.clients.link,
      to: path("features"),
    },
    {
      id: "calendar",
      index: "03",
      category: t.calendar.category,
      title: t.calendar.title,
      body: t.calendar.body,
      link: t.calendar.link,
      to: path("legal-practice-management"),
    },
    {
      id: "documents",
      index: "04",
      category: t.documents.category,
      title: t.documents.title,
      body: t.documents.body,
      link: t.documents.link,
      to: path("legal-document-management"),
    },
    {
      id: "team",
      index: "05",
      category: t.team.category,
      title: t.team.title,
      body: t.team.body,
      link: t.team.link,
      to: path("features"),
    },
    { id: "tasks", index: "06", category: t.tasks.category, title: t.tasks.title, body: t.tasks.body },
    { id: "finance", index: "07", category: t.finance.category, title: t.finance.title, body: t.finance.body },
    { id: "juria", index: "08", category: t.juriaAi.category, title: t.juriaAi.title, body: t.juriaAi.body, link: t.closeCta, to: path("juria") },
    { id: "knowledge", index: "09", category: t.knowledge.category, title: t.knowledge.title, body: t.knowledge.body },
    {
      id: "connected",
      index: "",
      category: "",
      title: t.finaleTitle,
      body: t.finaleBody,
    },
  ];

  useEffect(() => {
    const nodes = beats
      .map((beat) => itemRefs.current[beat.id])
      .filter((el): el is HTMLElement => Boolean(el));
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = (visible?.target as HTMLElement | undefined)?.dataset.scene as WorkspaceSceneId | undefined;
        if (id) setActive(id);
      },
      { rootMargin: "-32% 0px -48% 0px", threshold: [0.15, 0.35, 0.55, 0.75] }
    );
    nodes.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [lang]);

  return (
    <section className="landing-section-white landing-walkthrough" aria-labelledby="workspace-showcase-title">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 sm:pt-28">
        <Reveal>
          <div className="landing-walkthrough__intro">
            <p className="landing-walkthrough__eyebrow">{t.eyebrow}</p>
            <h2 id="workspace-showcase-title" className="landing-walkthrough__title">
              {t.headline}
            </h2>
            <p className="landing-walkthrough__lead">{t.body}</p>
          </div>
        </Reveal>
      </div>

      <div className="ws-showcase max-w-7xl mx-auto px-5 sm:px-8">
        <div className="ws-showcase__copy">
          {beats.map((beat) => (
            <article
              key={beat.id}
              ref={(el) => {
                itemRefs.current[beat.id] = el;
              }}
              data-scene={beat.id}
              className={`ws-beat ${active === beat.id ? "is-active" : ""} ${beat.id === "connected" ? "ws-beat--finale" : ""}`}
            >
              {beat.index ? (
                <div className="flex items-baseline gap-3">
                  <span className="landing-walkthrough__index" aria-hidden>
                    {beat.index}
                  </span>
                  <span className="landing-walkthrough__category">{beat.category}</span>
                </div>
              ) : null}
              <h3 className="landing-walkthrough__headline">{beat.title}</h3>
              <p className="landing-walkthrough__body">{beat.body}</p>
              {beat.link && beat.to ? (
                <Link
                  to={beat.to}
                  onClick={() =>
                    track(MarketingEvents.HeroSecondaryCta, { source: `workspace_${beat.id}`, lang })
                  }
                  className="landing-text-link mt-6 inline-flex items-center gap-1.5 text-sm hover:gap-2.5"
                >
                  {beat.link} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </Link>
              ) : null}

              <div className="ws-showcase__mobile-stage">
                <WorkspaceCanvas scene={beat.id} ui={ui} reduced={Boolean(reduce)} />
              </div>
            </article>
          ))}
        </div>

        <div className="ws-showcase__stage">
            <div className="ws-showcase__sticky landing-product-stage">
              <div className="landing-product-stage__glow" aria-hidden />
              <div className="relative z-[1]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.985, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.99 }}
                transition={{ duration: reduce ? 0.2 : 0.55, ease: EASE }}
              >
                <WorkspaceCanvas scene={active} ui={ui} reduced={Boolean(reduce)} />
              </motion.div>
            </AnimatePresence>
              </div>
            </div>
        </div>
      </div>
    </section>
  );
}
