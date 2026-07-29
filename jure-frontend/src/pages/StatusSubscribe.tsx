// src/pages/StatusSubscribe.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Mail, Bell, Server, Database, Network, Webhook } from "lucide-react";
import { devLog } from "@/utils/devLog";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  en: {
    htmlLang: "en",
    dir: "ltr",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
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
      ok: "You’re subscribed! Check your inbox to confirm.",
    },
    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
  },
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
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
      ok: "Inscription prise en compte ! Vérifiez votre boîte mail.",
    },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
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
      ok: "تم الاشتراك! تحقق من بريدك لتأكيده.",
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
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [freq, setFreq] = useState<"instant" | "daily" | "weekly">("instant");
  const [components, setComponents] = useState({ api: true, app: true, db: true, net: true });

  const toggle = (k: keyof typeof components) =>
    setComponents((c) => ({ ...c, [k]: !c[k] }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Hook up to your backend/webhook here
    devLog("status-subscribe", { email, freq, components });
    window.alert(t.form.ok);
    setEmail("");
  };

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      <header className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <img src="/images/Jure logo.png" alt="JURE" className="w-[140px] h-10 object-contain" />
        <Button variant="outline" onClick={() => navigate("/status")}>← {t.footer.status}</Button>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10 pb-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
            {t.hero.title}
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">{t.hero.subtitle}</p>
        </div>

        <form onSubmit={submit} className="max-w-3xl mx-auto mt-10">
          <Card className="bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> {t.hero.title}</CardTitle>
              <CardDescription className="dark:text-slate-400">{t.hero.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm">{t.form.email}</label>
                <div className="mt-1 flex gap-2">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <Button type="submit"><Mail className="w-4 h-4 mr-2" /> {t.form.submit}</Button>
                </div>
              </div>

              <div>
                <label className="text-sm">{t.form.frequency}</label>
                <div className="mt-2 grid sm:grid-cols-3 gap-3">
                  {(["instant","daily","weekly"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFreq(v)}
                      className={`px-4 py-3 rounded-lg border ${freq===v ? "border-[#64499D] bg-[#64499D]/10" : "border-slate-200 dark:border-slate-700"}`}
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
            </CardContent>
          </Card>
        </form>
      </main>

      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[120px] h-8 object-contain" />
          <div className="text-slate-400 text-sm">© {year} JURE</div>
        </div>
      </footer>
    </div>
  );
};

const ToggleTile: React.FC<{ on: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ on, icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-3 rounded-lg border text-sm flex items-center justify-center gap-2 ${on ? "border-[#64499D] bg-[#64499D]/10" : "border-slate-200 dark:border-slate-700"}`}
  >
    {icon} {label}
  </button>
);

export default StatusSubscribe;
