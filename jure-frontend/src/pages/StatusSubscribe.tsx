// src/pages/StatusSubscribe.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Mail, Bell, Database, Network, Webhook } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { RouteSeo } from "@/marketing/Seo";
import { submitLandingInquiry } from "@/services/marketing/api";

type Lang = "fr" | "en" | "ar";

const statusSubscribeEn = {
    htmlLang: "en",
    dir: "ltr" as "ltr" | "rtl",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },
    hero: { title: "Subscribe to status alerts", subtitle: "Get incident and maintenance updates by email." },
    form: {
      email: "Email",
      frequency: "Frequency",
      instant: "Instant (recommended)",
      daily: "Daily digest",
      weekly: "Weekly digest",
      components: "Components",
      api: "API",
      app: "Web App",
      db: "Database",
      net: "Network",
      submit: "Subscribe",
      sending: "Sending…",
      ok: "You’re subscribed! We’ll email you from contact@jure.ma.",
      sendFailed: "We could not send your request. Please email contact@jure.ma.",
    },
    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
};

type StatusSubscribeCopy = typeof statusSubscribeEn;

const STRINGS: Record<Lang, StatusSubscribeCopy> = {
  en: statusSubscribeEn,
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    hero: { title: "S’abonner aux alertes", subtitle: "Recevez par email les incidents et maintenances." },
    form: {
      email: "Email",
      frequency: "Fréquence",
      instant: "Instantané (recommandé)",
      daily: "Résumé quotidien",
      weekly: "Résumé hebdomadaire",
      components: "Composants",
      api: "API",
      app: "Application Web",
      db: "Base de Données",
      net: "Réseau",
      submit: "S’abonner",
      sending: "Envoi…",
      ok: "Inscription prise en compte. Nous vous écrirons depuis contact@jure.ma.",
      sendFailed: "Impossible d’envoyer la demande. Écrivez-nous à contact@jure.ma.",
    },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },
    hero: { title: "الاشتراك في تنبيهات الحالة", subtitle: "استلم تحديثات الأعطال والصيانة عبر البريد." },
    form: {
      email: "البريد الإلكتروني",
      frequency: "التكرار",
      instant: "فوري (موصى به)",
      daily: "ملخص يومي",
      weekly: "ملخص أسبوعي",
      components: "المكوّنات",
      api: "واجهة API",
      app: "التطبيق على الويب",
      db: "قاعدة البيانات",
      net: "الشبكة",
      submit: "اشتراك",
      sending: "جارٍ الإرسال…",
      ok: "تم الاشتراك. سنتواصل معك من contact@jure.ma.",
      sendFailed: "تعذر إرسال الطلب. راسلونا على contact@jure.ma.",
    },
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

const StatusSubscribe: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const [email, setEmail] = useState("");
  const [freq, setFreq] = useState<"instant" | "daily" | "weekly">("instant");
  const [components, setComponents] = useState({ api: true, app: true, db: true, net: true });
  const [sending, setSending] = useState(false);

  const toggle = (k: keyof typeof components) =>
    setComponents((c) => ({ ...c, [k]: !c[k] }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const selected = Object.entries(components)
      .filter(([, on]) => on)
      .map(([key]) => key)
      .join(", ");
    setSending(true);
    try {
      await submitLandingInquiry({
        name: "Status subscriber",
        email,
        subject: "Status alerts",
        source: "status-subscribe",
        locale: lang,
        message: `Please subscribe this address to JURE status alerts.\nFrequency: ${freq}.\nComponents: ${selected || "none"}.`,
      });
      window.alert(t.form.ok);
      setEmail("");
    } catch {
      window.alert(t.form.sendFailed);
    } finally {
      setSending(false);
    }
  };

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{ nav: t.nav, auth: t.auth, themeToggle: t.themeToggle, footer: t.footer }}
      dir={t.dir}
      activeNav="none"
    >
      <RouteSeo routeKey="statusSubscribe" lang={lang} />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-20 md:pt-20">
        <Reveal className="text-center max-w-3xl mx-auto min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl font-bold tracking-tight break-words text-[#64499D] dark:text-white">
            {t.hero.title}
          </h1>
          <p className="mt-3 text-neutral-600 dark:text-neutral-300 break-words">{t.hero.subtitle}</p>
        </Reveal>

        <div className="landing-divider my-8 sm:my-10 max-w-md mx-auto" />

        <Reveal>
          <form onSubmit={submit} className="max-w-3xl mx-auto">
            <div className="landing-glass landing-panel-glow rounded-2xl p-5 sm:p-6 md:p-8 space-y-6 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-5 h-5 text-[#A58CF4] dark:text-[#A58CF4] shrink-0" />
                <h2 className="font-display text-xl font-semibold break-words">{t.hero.title}</h2>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2 break-words">{t.hero.subtitle}</p>

              <div>
                <label className="text-sm">{t.form.email}</label>
                <div className="mt-1 flex gap-2 flex-col sm:flex-row">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="min-w-0" />
                  <Button type="submit" disabled={sending} className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg landing-btn-primary">
                    <Mail className="w-4 h-4 me-2" /> {sending ? t.form.sending : t.form.submit}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm">{t.form.frequency}</label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(["instant","daily","weekly"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFreq(v)}
                      className={`px-4 py-3 rounded-xl border text-sm transition-colors break-words ${
                        freq === v
                          ? "border-[#A58CF4] bg-[#A58CF4]/10 dark:bg-[#A58CF4]/20"
                          : "border-[#A58CF4]/15 dark:border-[#A58CF4]/20 landing-glass"
                      }`}
                    >
                      {v==="instant"?t.form.instant:v==="daily"?t.form.daily:t.form.weekly}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm">{t.form.components}</label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ToggleTile on={components.api} icon={<Webhook className="w-4 h-4" />} label={t.form.api} onClick={() => toggle("api")} />
                  <ToggleTile on={components.app} icon={<CheckCircle2 className="w-4 h-4" />} label={t.form.app} onClick={() => toggle("app")} />
                  <ToggleTile on={components.db} icon={<Database className="w-4 h-4" />} label={t.form.db} onClick={() => toggle("db")} />
                  <ToggleTile on={components.net} icon={<Network className="w-4 h-4" />} label={t.form.net} onClick={() => toggle("net")} />
                </div>
              </div>
            </div>
          </form>
        </Reveal>
      </section>
    </MarketingShell>
  );
};

const ToggleTile: React.FC<{ on: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ on, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-3 rounded-xl border text-sm flex items-center justify-center gap-2 transition-colors ${
      on
        ? "border-[#A58CF4] bg-[#A58CF4]/10 dark:bg-[#A58CF4]/20"
        : "border-[#A58CF4]/15 dark:border-[#A58CF4]/20 landing-glass"
    }`}
  >
    {icon} {label}
  </button>
);

export default StatusSubscribe;
