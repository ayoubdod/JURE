// Public entity page: Juria = AI legal assistant inside JURE.
import React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import FaqSection from "@/components/landing/FaqSection";
import { JuriaFrame } from "@/components/landing/ProductFrame";
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
import { JURIA_CONTENT } from "@/marketing/content/juria";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/landing.css";
import "@/components/landing/juria-stage.css";

const JuriaPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang, dir, dict, path } = useMarketingLang();
  const t = JURIA_CONTENT[lang];
  const route = getRoute("juria");
  const homeRoute = getRoute("home");

  const jsonLd = [
    organizationJsonLd(lang),
    webSiteJsonLd(lang),
    breadcrumbJsonLd([
      { name: homeRoute.label[lang], path: localePath(lang) },
      { name: route.label[lang], path: localePath(lang, route.slug) },
    ]),
    faqPageJsonLd(t.faqs),
  ];

  const rtlText = "text-start";

  const goProduct = () => {
    track(MarketingEvents.HeroPrimaryCta, { source: "juria", lang });
    navigate(path("features"));
  };

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="none">
      <RouteSeo routeKey="juria" lang={lang} jsonLd={jsonLd} />

      <div className="juria-stage">
        <div className="juria-stage__bg" aria-hidden>
          <div className="juria-stage__wash" />
          <div className="juria-stage__ribbons" />
          <div className="juria-stage__grid" />
          <div className="juria-stage__stars" />
        </div>

        <div className="juria-stage__content">
          <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-10">
            <nav
              className={`flex items-center gap-1.5 text-xs text-[var(--juria-muted)] mb-8 ${rtlText}`}
              aria-label={dict.a11y.breadcrumb}
            >
              <button type="button" onClick={() => navigate(path(""))} className="hover:text-[#A58CF4]">
                {homeRoute.label[lang]}
              </button>
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              <span className="text-[var(--juria-ink)]">{route.label[lang]}</span>
            </nav>

            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <div className={`juria-stage__hero-copy ${rtlText}`}>
                <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-[var(--juria-ink)]">
                  {t.h1}
                </h1>
                <p className="mt-5 text-base sm:text-lg text-[var(--juria-muted)] leading-relaxed">
                  {t.intro}
                </p>
                <p className="mt-4 text-sm font-medium text-[#2949e8] dark:text-[#A58CF4]">{t.disclaimer}</p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Button size="lg" onClick={goProduct} className="landing-btn-primary">
                    {t.ctaPrimary}
                    <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="landing-btn-secondary"
                    onClick={() => navigate(path("legal-ai"))}
                  >
                    {t.ctaSecondary}
                  </Button>
                </div>
              </div>
              <Reveal>
                <JuriaFrame lang={lang} />
              </Reveal>
            </div>
          </section>

          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <Reveal>
              <div className={`juria-stage__panel rounded-[1.35rem] p-6 sm:p-8 ${rtlText}`}>
                <h2 className="text-2xl sm:text-3xl font-bold text-[var(--juria-ink)] mb-4">
                  {t.relationTitle}
                </h2>
                <p className="text-[var(--juria-muted)] leading-relaxed">{t.relationBody}</p>
              </div>
            </Reveal>
          </section>

          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--juria-ink)] mb-8 text-center">
              {t.capabilitiesTitle}
            </h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {t.capabilities.map((cap) => (
                <Reveal key={cap.title}>
                  <div
                    className={`juria-stage__panel rounded-[1.35rem] p-6 h-full ${rtlText}`}
                  >
                    <h3 className="text-lg font-semibold text-[var(--juria-ink)] mb-2">{cap.title}</h3>
                    <p className="text-sm text-[var(--juria-muted)] leading-relaxed">{cap.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--juria-ink)] mb-8 text-center">
              {t.howTitle}
            </h2>
            <ol className="space-y-4">
              {t.howSteps.map((step, i) => (
                <li
                  key={step}
                  className={`juria-stage__panel flex items-start gap-3 rounded-2xl px-4 py-3.5 ${rtlText}`}
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#2949e8]/12 text-[#2949e8] dark:bg-[#A58CF4]/20 dark:text-[#A58CF4] text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-[var(--juria-ink)] pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <FaqSection title={t.faqsTitle} faqs={t.faqs} />

          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
            <div className="juria-stage__panel rounded-[1.5rem] px-6 sm:px-10 py-10 sm:py-12">
              <CheckCircle2 className="w-10 h-10 text-[#2949e8] dark:text-[#A58CF4] mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--juria-ink)]">{t.ctaTitle}</h2>
              <p className="mt-3 text-[var(--juria-muted)] max-w-2xl mx-auto">{t.ctaBody}</p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                <Button size="lg" onClick={goProduct} className="landing-btn-primary">
                  {t.ctaPrimary}
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate(path("features"))}>
                  {t.relatedPlatform}
                </Button>
                <Button size="lg" variant="ghost" onClick={() => navigate(path("legal-ai"))}>
                  {t.relatedLegalAi}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
};

export default JuriaPage;
