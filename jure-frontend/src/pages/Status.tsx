// src/pages/Status.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Clock, Server, Database, Network, ArrowRight } from "lucide-react";

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

const ThemeToggle: React.FC<{ label?: string; title?: string }> = ({ label, title }) => {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldDark = stored ? stored === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", shouldDark);
    setIsDark(shouldDark);
  }, []);
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };
  return (
    <Button
      onClick={toggle}
      variant="outline"
      className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
      aria-label={label || "Toggle theme"}
      title={title || "Toggle theme"}
    >
      {isDark ? "☀️" : "🌙"}
    </Button>
  );
};

const LangSwitcher: React.FC<{ lang: Lang; onChange: (l: Lang) => void }> = ({ lang, onChange }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
    {(["fr", "en", "ar"] as Lang[]).map((code) => (
      <button
        key={code}
        onClick={() => onChange(code)}
        className={`px-3 py-2 text-sm ${
          lang === code
            ? "bg-[#64499D] text-white"
            : "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        {code === "fr" ? "FR" : code === "en" ? "EN" : "AR"}
      </button>
    ))}
  </div>
);

const Badge: React.FC<{ tone: "ok" | "minor" | "major"; text: string }> = ({ tone, text }) => {
  const cls =
    tone === "ok"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
      : tone === "minor"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200";
  const Icon = tone === "ok" ? CheckCircle2 : tone === "minor" ? Clock : AlertTriangle;
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${cls}`}>
      <Icon className="w-4 h-4" /> {text}
    </span>
  );
};

const Status: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const year = new Date().getFullYear();
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
    <div className="min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[140px] h-10 object-contain" />
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => go("/features")} className="hover:text-[#64499D]"> {t.nav.features} </button>
            <button onClick={() => go("/pricing")} className="hover:text-[#64499D]"> {t.nav.pricing} </button>
            <button onClick={() => go("/about")} className="hover:text-[#64499D]"> {t.nav.about} </button>
            <button onClick={() => go("/contact")} className="hover:text-[#64499D]"> {t.nav.contact} </button>
          </div>
          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} onChange={setLang} />
            <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title} />
            <Button onClick={() => go("/signin")} variant="outline" className="border-[#64499D]/30 text-[#64499D]">
              {t.auth.signin}
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-10 md:pt-24 md:pb-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.titleA}
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">{t.hero.subtitle}</p>
            <div className="mt-4">
              <Badge tone={overallTone} text={overallText} />
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => go("/contact")} className="bg-gradient-to-r from-[#64499D] to-[#4D3680]">
                {t.hero.ctaPrimary} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => go("/docs")}>{t.hero.ctaSecondary}</Button>
            </div>
          </div>

          {/* Components */}
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
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
                <Card key={i} className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl grid place-items-center text-white ${tone === "ok" ? "bg-green-600" : tone === "minor" ? "bg-amber-600" : "bg-red-600"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{c.name}</CardTitle>
                        <CardDescription className={`${cls}`}>{label}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {/* placeholder description */}
                      {lang === "fr" && "Aucun incident en cours signalé."}
                      {lang === "en" && "No ongoing incidents reported."}
                      {lang === "ar" && "لا توجد حوادث جارية."}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Uptime */}
          <div className="mt-12">
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle>{t.uptime.title}</CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400">{t.uptime.foot}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-30 md:grid-cols-30 gap-1">
                  {uptimeBars.map((v, i) => {
                    const tone = v > 99.5 ? "bg-green-500" : v > 98.5 ? "bg-amber-500" : "bg-red-500";
                    return (
                      <div key={i} className="h-8 rounded" title={`${v.toFixed(2)}%`} style={{ width: "100%" }}>
                        <div className={`h-full ${tone} rounded`} style={{ width: `${v}%` }} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Incidents */}
          <div className="mt-12">
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle>{t.incidents.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 dark:text-slate-300">{t.incidents.none}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[120px] h-8 object-contain" />
          <div className="flex items-center gap-6 text-sm text-slate-300">
            <button onClick={() => go("/privacy")} className="hover:text-white">{t.footer.privacy}</button>
            <button onClick={() => go("/terms")} className="hover:text-white">{t.footer.terms}</button>
            <button onClick={() => go("/status")} className="hover:text-white">{t.footer.status}</button>
          </div>
          <div className="text-slate-400 text-sm">© {year} JURE. {t.footer.rights}</div>
        </div>
      </footer>
    </div>
  );
};

export default Status;
