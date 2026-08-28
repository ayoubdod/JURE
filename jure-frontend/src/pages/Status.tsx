// src/pages/Status.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Clock, Server, Database, Network, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { RouteSeo } from "@/marketing/Seo";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    hero: {
      titleA: "Statut du service",
      subtitle: "Transparence en temps réel sur la disponibilité et les incidents.",
      ctaPrimary: "S’abonner aux alertes",
      ctaSecondary: "Documentation",
      overall: { ok: "Tous les systèmes opérationnels", minor: "Incidents mineurs", major: "Incident majeur" },
    },
    components: {
      api: "API",
      app: "Application Web",
      db: "Base de Données",
      network: "Réseau",
      status: { operational: "Opérationnel", degraded: "Dégradé", outage: "Panne" },
    },
    incidents: { title: "Incidents récents", none: "Aucun incident au cours des 7 derniers jours." },
    uptime: { title: "Uptime (30 jours)", foot: "Chiffres à titre indicatif. Intégrez vos métriques réelles plus tard." },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },
  en: {
    htmlLang: "en",
    dir: "ltr",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },
    hero: {
      titleA: "Service Status",
      subtitle: "Real-time transparency on availability and incidents.",
      ctaPrimary: "Subscribe to alerts",
      ctaSecondary: "Docs",
      overall: { ok: "All systems operational", minor: "Minor incidents", major: "Major incident" },
    },
    components: {
      api: "API",
      app: "Web App",
      db: "Database",
      network: "Network",
      status: { operational: "Operational", degraded: "Degraded", outage: "Outage" },
    },
    incidents: { title: "Recent incidents", none: "No incidents in the last 7 days." },
    uptime: { title: "Uptime (30 days)", foot: "Illustrative figures. Wire up your real metrics later." },
    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },
    hero: {
      titleA: "حالة الخدمة",
      subtitle: "شفافية آنية حول التوافر والحوادث.",
      ctaPrimary: "الاشتراك في التنبيهات",
      ctaSecondary: "الوثائق",
      overall: { ok: "كل الأنظمة تعمل", minor: "حوادث طفيفة", major: "حادث كبير" },
    },
    components: {
      api: "واجهة برمجة التطبيقات",
      app: "التطبيق على الويب",
      db: "قاعدة البيانات",
      network: "الشبكة",
      status: { operational: "يعمل", degraded: "متدهور", outage: "انقطاع" },
    },
    incidents: { title: "الحوادث الأخيرة", none: "لا توجد حوادث خلال 7 أيام الماضية." },
    uptime: { title: "الجاهزية (30 يومًا)", foot: "أرقام توضيحية. يمكن ربطها ببيانات حقيقية لاحقًا." },
    footer: { privacy: "الخصوصية", terms: "الشروط", status: "الحالة", rights: "جميع الحقوق محفوظة." },
  },
};

const useI18n = () => {
  const [lang, setLang] = useState<Lang>(() => {
    const s = localStorage.getItem("lang") as Lang | null;
    if (s === "fr" || s === "en" || s === "ar") return s;
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("ar")) return "ar";
    return "en";
  });
  useEffect(() => {
    const pack = STRINGS[lang];
    document.documentElement.setAttribute("lang", pack.htmlLang);
    document.documentElement.setAttribute("dir", pack.dir);
    localStorage.setItem("lang", lang);
  }, [lang]);
  return { lang, setLang, t: STRINGS[lang] };
};

const Badge: React.FC<{ tone: "ok" | "minor" | "major"; text: string }> = ({ tone, text }) => {
  const cls =
    tone === "ok"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
      : tone === "minor"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
  const Icon = tone === "ok" ? CheckCircle2 : tone === "minor" ? Clock : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm landing-glass ${cls}`}>
      <Icon className="w-4 h-4" /> {text}
    </span>
  );
};

const Status: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const go = (to: string) => navigate(to);

  // Demo component states (replace with live data later)
  const components = [
    { name: t.components.api, status: "operational" },
    { name: t.components.app, status: "operational" },
    { name: t.components.db, status: "operational" },
    { name: t.components.network, status: "operational" },
  ] as const;

  const overallTone: "ok" | "minor" | "major" = "ok";
  const overallText =
    overallTone === "ok" ? t.hero.overall.ok : overallTone === "minor" ? t.hero.overall.minor : t.hero.overall.major;

  const uptimeBars = useMemo(() => {
    // Mock 30 days uptime percentages
    return Array.from({ length: 30 }, (_, i) => 99 + Math.random() * 1).map((v) => Math.min(100, Math.max(96.5, v)));
  }, []);

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{ nav: t.nav, auth: t.auth, themeToggle: t.themeToggle, footer: t.footer }}
      dir={t.dir}
      activeNav="none"
    >
      <RouteSeo routeKey="status" lang={lang} />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 md:pt-24 md:pb-12">
        <Reveal className="max-w-4xl mx-auto text-center min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl font-bold tracking-tight break-words text-[#64499D] dark:text-white">
            {t.hero.titleA}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 break-words">{t.hero.subtitle}</p>
          <div className="mt-4">
            <Badge tone={overallTone} text={overallText} />
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto">
            <Button onClick={() => go("/contact")} className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg landing-btn-primary">
              {t.hero.ctaPrimary} <ArrowRight className="ms-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => go("/docs")} className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg landing-btn-secondary">
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </Reveal>

        <div className="landing-divider my-10 sm:my-12 max-w-md mx-auto" />

        {/* Components */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 md:gap-8">
          {components.map((c, i) => {
            const tone =
              c.status === "operational" ? "ok" : c.status === "degraded" ? "minor" : "major";
            const Icon = i === 0 ? Server : i === 1 ? CheckCircle2 : i === 2 ? Database : Network;
            const label =
              c.status === "operational"
                ? t.components.status.operational
                : c.status === "degraded"
                ? t.components.status.degraded
                : t.components.status.outage;
            const cls =
              tone === "ok"
                ? "text-green-600"
                : tone === "minor"
                ? "text-amber-600"
                : "text-red-600";
            return (
              <Reveal key={i} delay={i * 0.05} subtle>
                <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 h-full min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl grid place-items-center text-white shrink-0 ${tone === "ok" ? "bg-green-600" : tone === "minor" ? "bg-amber-600" : "bg-red-600"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-xl font-semibold break-words">{c.name}</h3>
                      <p className={`text-sm ${cls}`}>{label}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {/* placeholder description */}
                    {lang === "fr" && "Aucun incident en cours signalé."}
                    {lang === "en" && "No ongoing incidents reported."}
                    {lang === "ar" && "لا توجد حوادث جارية."}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Uptime */}
        <Reveal className="mt-10 sm:mt-12">
          <div className="landing-glass landing-panel-glow rounded-2xl p-5 sm:p-6 md:p-8 min-w-0 overflow-x-auto">
            <h2 className="font-display text-xl font-semibold break-words">{t.uptime.title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 break-words">{t.uptime.foot}</p>
            <div className="mt-4 grid grid-cols-30 md:grid-cols-30 gap-1 min-w-0">
              {uptimeBars.map((v, i) => {
                const tone = v > 99.5 ? "bg-green-500" : v > 98.5 ? "bg-amber-500" : "bg-red-500";
                return (
                  <div key={i} className="h-8 rounded min-w-0" title={`${v.toFixed(2)}%`} style={{ width: "100%" }}>
                    <div className={`h-full ${tone} rounded`} style={{ width: `${v}%` }} />
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Incidents */}
        <Reveal className="mt-10 sm:mt-12">
          <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 md:p-8 min-w-0">
            <h2 className="font-display text-xl font-semibold break-words">{t.incidents.title}</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 break-words">{t.incidents.none}</p>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
};

export default Status;
