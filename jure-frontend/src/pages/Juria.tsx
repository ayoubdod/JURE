// Public entity page: Juria = AI legal assistant inside JURE.
import React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
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

const JuriaPage: React.FC = () => {
  const navigate = useNavigate();
  const { lang, dir, path } = useMarketingLang();
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

  const rtlText = dir === "rtl" ? "text-right" : "";

  const goDemo = () => {
    track(MarketingEvents.HeroPrimaryCta, { source: "juria", lang });
    navigate(path("demo"));
  };

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="none">
      <RouteSeo routeKey="juria" lang={lang} jsonLd={jsonLd} />

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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full landing-glass text-xs font-semibold text-[#64499D] dark:text-[#CFC2FF] mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              {t.eyebrow}
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold leading-tight text-slate-900 dark:text-white">
              {t.h1}
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.intro}
            </p>
            <p className="mt-4 text-sm font-medium text-[#64499D] dark:text-[#CFC2FF]">{t.disclaimer}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={goDemo}
                className="bg-gradient-to-r from-[#64499D] to-[#4D3680] text-white"
              >
                {t.ctaPrimary}
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate(path("legal-ai"))}>
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
          <h2 className={`text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4 ${rtlText}`}>
            {t.relationTitle}
          </h2>
          <p className={`text-slate-600 dark:text-slate-300 leading-relaxed ${rtlText}`}>{t.relationBody}</p>
        </Reveal>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className={`text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center`}>
          {t.capabilitiesTitle}
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {t.capabilities.map((cap) => (
            <Reveal key={cap.title}>
              <div className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 p-6 h-full ${rtlText}`}>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{cap.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{cap.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <h2 className={`text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-8 text-center`}>
          {t.howTitle}
        </h2>
        <ol className="space-y-4">
          {t.howSteps.map((step, i) => (
            <li key={step} className={`flex items-start gap-3 ${rtlText}`}>
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#64499D]/15 text-[#64499D] text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-slate-700 dark:text-slate-200 pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <FaqSection title={t.faqsTitle} entries={t.faqs} />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <CheckCircle2 className="w-10 h-10 text-[#64499D] mx-auto mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t.ctaTitle}</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{t.ctaBody}</p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Button size="lg" onClick={goDemo} className="bg-gradient-to-r from-[#64499D] to-[#4D3680] text-white">
            {t.ctaPrimary}
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate(path("features"))}>
            {t.relatedPlatform}
          </Button>
          <Button size="lg" variant="ghost" onClick={() => navigate(path("legal-ai"))}>
            {t.relatedLegalAi}
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
};

export default JuriaPage;
