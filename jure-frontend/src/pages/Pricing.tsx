// src/pages/Pricing.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Calculator, ArrowRight, Shield, Zap, Users, BookOpen, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Currency, useCurrency, formatMoney, convertFromUSD, currencyOptions, USD_BASE, autoDetectCurrency } from "@/lib/currency";

// i18n (same keys as before, trimmed for brevity)
type Lang = "fr" | "en" | "ar";
const STRINGS: Record<Lang, any> = {
  en: { htmlLang:"en", dir:"ltr",
    nav:{features:"Features",pricing:"Pricing",about:"About",contact:"Contact"},
    auth:{signin:"Sign in"},
    themeToggle:{label:"Toggle theme",title:"Toggle theme"},
    hero:{ title:"Choose your plan", subtitle:"Evidence-based pricing with measurable ROI for your practice.", toggleMonthly:"Monthly", toggleYearly:"Yearly (save ~17%)" },
    plans:{
      starter:{ name:"Starter", desc:"Core case management with essential AI.", bullets:["Up to 50 matters","Basic legal AI","Email support","10 GB storage"], cta:"Start" },
      pro:{ name:"Professional", desc:"Advanced AI drafting, semantic search, team collaboration.", bullets:["Unlimited matters","Advanced AI","Priority support","100 GB storage","Team collaboration"], cta:"Start", badge:"Popular" },
      enterprise:{ name:"Enterprise", desc:"Premium AI, SSO & audit, dedicated support.", bullets:["Everything unlimited","Premium AI","24/7 dedicated support","Unlimited storage","Custom API & SSO"], cta:"Contact sales" },
    },
    roi:{ title:"ROI calculator", subtitle:"Quantify your return in minutes.", rate:"Hourly rate", hours:"Hours saved / week / user", seats:"Seats", period:"Period", perMonth:"Per month", result:"Estimated monthly value created", priceNote:"At ~10% value capture, a fair monthly price per user is", disclaimer:"Estimates. Actual results vary by workflow and training." },
    footer:{ privacy:"Privacy", terms:"Terms", status:"Status", rights:"All rights reserved." },
    currency:{ label:"Currency", auto:"Auto" }
  },
  fr: { htmlLang:"fr", dir:"ltr",
    nav:{features:"Fonctionnalités",pricing:"Tarifs",about:"À propos",contact:"Contact"},
    auth:{signin:"Se connecter"},
    themeToggle:{label:"Basculer le thème",title:"Basculer le thème"},
    hero:{ title:"Choisissez votre plan", subtitle:"Tarifs fondés sur des données, avec un ROI mesurable.", toggleMonthly:"Mensuel", toggleYearly:"Annuel (-17% env.)" },
    plans:{
      starter:{ name:"Starter", desc:"Gestion des dossiers + IA essentielle.", bullets:["Jusqu’à 50 dossiers","IA juridique basique","Support email","10 Go de stockage"], cta:"Commencer" },
      pro:{ name:"Professionnel", desc:"IA avancée, recherche sémantique, collaboration.", bullets:["Dossiers illimités","IA avancée","Support prioritaire","100 Go","Collaboration équipe"], cta:"Commencer", badge:"Populaire" },
      enterprise:{ name:"Entreprise", desc:"IA premium, SSO & audit, support dédié.", bullets:["Tout illimité","IA premium","Support 24/7","Stockage illimité","API & SSO"], cta:"Nous contacter" },
    },
    roi:{ title:"Calculateur de ROI", subtitle:"Chiffrez votre retour en quelques minutes.", rate:"Taux horaire", hours:"Heures gagnées / semaine / utilisateur", seats:"Licences", period:"Période", perMonth:"Par mois", result:"Valeur mensuelle estimée créée", priceNote:"À ~10% de captation, un prix équitable / utilisateur est", disclaimer:"Estimations. Résultats variables selon vos usages." },
    footer:{ privacy:"Confidentialité", terms:"Conditions", status:"Statut", rights:"Tous droits réservés." },
    currency:{ label:"Devise", auto:"Auto" }
  },
  ar: { htmlLang:"ar", dir:"rtl",
    nav:{features:"الميزات",pricing:"الأسعار",about:"حول",contact:"اتصل بنا"},
    auth:{signin:"تسجيل الدخول"},
    themeToggle:{label:"تبديل السمة",title:"تبديل السمة"},
    hero:{ title:"اختر خطتك", subtitle:"تسعير قائم على البيانات مع عائد استثمار قابل للقياس.", toggleMonthly:"شهري", toggleYearly:"سنوي (خصم ~17%)" },
    plans:{
      starter:{ name:"أساسي", desc:"إدارة القضايا + ذكاء أساسي.", bullets:["حتى 50 ملفًا","ذكاء اصطناعي أساسي","دعم عبر البريد","10 جيجابايت"], cta:"ابدأ" },
      pro:{ name:"احترافي", desc:"ذكاء متقدم وبحث دلالي وتعاون.", bullets:["ملفات غير محدودة","ذكاء متقدم","دعم أولوية","100 جيجابايت","تعاون الفريق"], cta:"ابدأ", badge:"الأكثر شيوعًا" },
      enterprise:{ name:"مؤسسات", desc:"ذكاء مميز وSSO وتدقيق ودعم مخصص.", bullets:["كل شيء غير محدود","ذكاء مميز","دعم 24/7","تخزين غير محدود","واجهات مخصصة وSSO"], cta:"تواصل معنا" },
    },
    roi:{ title:"حاسبة العائد", subtitle:"احسب العائد خلال دقائق.", rate:"الأجر بالساعة", hours:"ساعات موفّرة / أسبوع / مستخدم", seats:"المقاعد", period:"الفترة", perMonth:"شهريًا", result:"القيمة الشهرية المقدّرة", priceNote:"مع ~10% استحواذ على القيمة، السعر العادل لكل مستخدم هو", disclaimer:"أرقام تقديرية قد تختلف حسب سير العمل." },
    footer:{ privacy:"الخصوصية", terms:"الشروط", status:"الحالة", rights:"جميع الحقوق محفوظة." },
    currency:{ label:"العملة", auto:"تلقائي" }
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
  return (
    <Button
      onClick={() => { const n = !isDark; setIsDark(n); document.documentElement.classList.toggle("dark", n); localStorage.setItem("theme", n ? "dark" : "light"); }}
      variant="outline"
      className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
      aria-label={label}
      title={title}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};

const LangSwitcher: React.FC<{ lang: Lang; onChange: (l: Lang) => void }> = ({ lang, onChange }) => (
  <div className="inline-flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
    {(["fr","en","ar"] as Lang[]).map((code) => (
      <button key={code} onClick={() => onChange(code)}
        className={`px-3 py-2 text-sm ${lang===code?"bg-[#64499D] text-white":"bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
        {code==="fr"?"FR":code==="en"?"EN":"AR"}
      </button>
    ))}
  </div>
);

const CurrencySelector: React.FC<{ cur: Currency; setCur: (c: Currency)=>void; label: string; autoText: string }> = ({ cur, setCur, label, autoText }) => {
  const [auto, setAuto] = useState(!localStorage.getItem("currency"));
  useEffect(() => {
    if (auto) {
      const detected = autoDetectCurrency();
      setCur(detected);
    }
  }, [auto, setCur]);

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}:</span>
      <select
        className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
        value={cur}
        onChange={(e) => { setCur(e.target.value as Currency); localStorage.setItem("currency", e.target.value); setAuto(false); }}
      >
        {currencyOptions().map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="text-xs inline-flex items-center gap-1">
        <input type="checkbox" checked={auto} onChange={(e)=>{ setAuto(e.target.checked); if(e.target.checked){ localStorage.removeItem("currency"); } }} />
        {autoText}
      </label>
    </div>
  );
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const [cur, setCur] = useCurrency();
  const [yearly, setYearly] = useState(false);
  const year = new Date().getFullYear();

  const priceUSD = yearly ? USD_BASE.yearly : USD_BASE.monthly;
  const localized = {
    starter: formatMoney(convertFromUSD(priceUSD.starter, cur), cur),
    pro: formatMoney(convertFromUSD(priceUSD.pro, cur), cur),
    enterprise: formatMoney(convertFromUSD(priceUSD.enterprise, cur), cur),
  };

  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 rounded-full blur-3xl opacity-20 dark:opacity-30 animate-blob" style={{ background: "#64499D" }}/>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-2000" style={{ background: "#3E2D71" }}/>
        <div className="absolute top-48 left-24 w-72 h-72 rounded-full blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-4000" style={{ background: "#8B6FD1" }}/>
      </div>

      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/images/Jure logo.png" alt="JURE" className="w-[140px] h-10 object-contain"/>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate("/features")} className="hover:text-[#64499D]">{t.nav.features}</button>
            <button onClick={() => navigate("/pricing")} className="text-[#64499D] font-semibold">{t.nav.pricing}</button>
            <button onClick={() => navigate("/about")} className="hover:text-[#64499D]">{t.nav.about}</button>
            <button onClick={() => navigate("/contact")} className="hover:text-[#64499D]">{t.nav.contact}</button>
          </div>
          <div className="flex items-center gap-3">
            <CurrencySelector cur={cur} setCur={setCur} label={t.currency.label} autoText={t.currency.auto}/>
            <LangSwitcher lang={lang} onChange={setLang}/>
            <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title}/>
            <Button onClick={() => navigate("/signin")} variant="outline" className="border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20">
              {t.auth.signin}
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-10 md:pt-20 md:pb-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">{t.hero.title}</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">{t.hero.subtitle}</p>

            <div className="mt-6 inline-flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
              <button onClick={() => setYearly(false)} className={`px-4 py-2 text-sm ${!yearly ? "bg-[#64499D] text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>{t.hero.toggleMonthly}</button>
              <button onClick={() => setYearly(true)} className={`px-4 py-2 text-sm ${yearly ? "bg-[#64499D] text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}>{t.hero.toggleYearly}</button>
            </div>
          </div>

          {/* Feature strip */}
          <div className="mt-12 grid md:grid-cols-4 gap-6 md:gap-8">
            <Feature icon={<Zap className="w-6 h-6" />} title={lang==="fr"?"IA Juridique":"Legal AI"} desc={lang==="fr"?"Rédaction & recherche assistées":"Assisted drafting & research"} color="#64499D"/>
            <Feature icon={<Shield className="w-6 h-6" />} title={lang==="fr"?"Sécurité":"Security"} desc={lang==="fr"?"Chiffrement & conformité":"Encryption & compliance"} color="#4D3680"/>
            <Feature icon={<Users className="w-6 h-6" />} title={lang==="fr"?"Collaboration":"Collaboration"} desc={lang==="fr"?"Tâches & équipe":"Tasks & team"} color="#3E2D71"/>
            <Feature icon={<BookOpen className="w-6 h-6" />} title={lang==="fr"?"Bibliothèque":"Library"} desc={lang==="fr"?"Base documentaire":"Knowledge base"} color="#8B6FD1"/>
          </div>
        </section>

        {/* Plans */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
            <PlanCard title={t.plans.starter.name} desc={t.plans.starter.desc} price={localized.starter} period={yearly ? "/mo (billed yearly)" : "/month"} bullets={t.plans.starter.bullets} cta={t.plans.starter.cta} onClick={() => navigate("/signup?plan=starter")} />
            <PlanCard highlight={t.plans.pro.badge} title={t.plans.pro.name} desc={t.plans.pro.desc} price={localized.pro} period={yearly ? "/mo (billed yearly)" : "/month"} bullets={t.plans.pro.bullets} cta={t.plans.pro.cta} primary onClick={() => navigate("/signup?plan=pro")} />
            <PlanCard title={t.plans.enterprise.name} desc={t.plans.enterprise.desc} price={localized.enterprise} period={yearly ? "/mo (billed yearly)" : "/month"} bullets={t.plans.enterprise.bullets} cta={t.plans.enterprise.cta} onClick={() => navigate("/contact")} />
          </div>
        </section>

        {/* ROI Calculator (uses selected currency) */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <Card className="bg-white/90 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5"/> {t.roi.title}</CardTitle>
              <CardDescription className="dark:text-slate-400">{t.roi.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <RoiCalc t={t} currency={cur}/>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-black text-white py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`flex flex-col md:flex-row justify-between items-center gap-6 ${STRINGS[lang].dir === "rtl" ? "md:flex-row-reverse" : ""}`}>
            <img src="/images/Jure logo.png" alt="JURE" className="w-[120px] h-8 object-contain"/>
            <div className="flex items-center gap-6 text-sm text-slate-300">
              <button onClick={() => navigate("/privacy")} className="hover:text-white">{t.footer.privacy}</button>
              <button onClick={() => navigate("/terms")} className="hover:text-white">{t.footer.terms}</button>
              <button onClick={() => navigate("/status")} className="hover:text-white">{t.footer.status}</button>
            </div>
            <div className="text-slate-400 text-sm">© {year} JURE. {t.footer.rights}</div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes blob { 0%{transform:translate(0,0) scale(1)} 33%{transform:translate(20px,-10px) scale(1.05)} 66%{transform:translate(-10px,10px) scale(.98)} 100%{transform:translate(0,0) scale(1)} }
        .animate-blob{animation:blob 12s infinite}
        .animation-delay-2000{animation-delay:2s}
        .animation-delay-4000{animation-delay:4s}
      `}</style>
    </div>
  );
};

const Feature: React.FC<{ icon: React.ReactNode; title: string; desc: string; color: string }> = ({ icon, title, desc, color }) => (
  <div className="group p-7 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm hover:shadow-lg transition-all">
    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white group-hover:scale-105 transition-transform" style={{ background: color }}>{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-slate-600 dark:text-slate-300">{desc}</p>
  </div>
);

const PlanCard: React.FC<{
  title: string; desc: string; price: string; period: string; bullets: string[]; cta: string;
  onClick: () => void; highlight?: string; primary?: boolean;
}> = ({ title, desc, price, period, bullets, cta, onClick, highlight, primary }) => (
  <Card className={`relative bg-white/90 dark:bg-slate-900/70 backdrop-blur border ${primary ? "border-2 border-[#64499D]/40 dark:border-[#64499D]/50 md:scale-105" : "border-slate-200 dark:border-slate-700"}`}>
    {highlight && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="bg-gradient-to-r from-[#64499D] to-[#4D3680] text-white px-4 py-1 rounded-full text-xs font-medium">{highlight}</span>
      </div>
    )}
    <CardHeader className="text-center pb-6">
      <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      <CardDescription className="dark:text-slate-400">{desc}</CardDescription>
      <div className="mt-4">
        <span className="text-4xl font-bold">{price}</span>{" "}
        <span className="text-slate-600 dark:text-slate-400">{period}</span>
      </div>
    </CardHeader>
    <CardContent>
      <ul className="space-y-3 mb-6 text-slate-700 dark:text-slate-300">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-center"><Check className="w-5 h-5 text-green-600 mr-3" /> {b}</li>
        ))}
      </ul>
      <Button className={`w-full ${primary ? "bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71]" : ""}`} variant={primary ? "default" : "outline"} onClick={onClick}>
        {cta}
      </Button>
    </CardContent>
  </Card>
);

const RoiCalc: React.FC<{ t: any; currency: Currency }> = ({ t, currency }) => {
  // seed the hourly rate with an equivalent of ~USD 150 in the selected currency
  const [rate, setRate] = useState<number>(() => Math.round(convertFromUSD(150, currency)));
  const [hours, setHours] = useState(1.0);
  const [seats, setSeats] = useState(5);

  const monthlyValue = useMemo(() => rate * hours * 4.3 * seats, [rate, hours, seats]);
  const fairPricePerUser = useMemo(() => (rate * hours * 4.3 * 0.10), [rate, hours]);
  const money = (n: number) => formatMoney(n, currency);

  return (
    <div className="grid md:grid-cols-4 gap-4 md:gap-6">
      <div>
        <Label className="text-sm">{t.roi.rate} ({currency})</Label>
        <Input type="number" min={10} step={5} value={rate} onChange={(e) => setRate(parseFloat(e.target.value || "0"))}/>
      </div>
      <div>
        <Label className="text-sm">{t.roi.hours}</Label>
        <Input type="number" min={0} step={0.1} value={hours} onChange={(e) => setHours(parseFloat(e.target.value || "0"))}/>
      </div>
      <div>
        <Label className="text-sm">{t.roi.seats}</Label>
        <Input type="number" min={1} step={1} value={seats} onChange={(e) => setSeats(parseInt(e.target.value || "0"))}/>
      </div>
      <div>
        <Label className="text-sm">{t.roi.period}</Label>
        <Input disabled value={t.roi.perMonth}/>
      </div>

      <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">{t.roi.result}</div>
        <div className="text-3xl font-bold mt-1">{money(monthlyValue)}</div>
      </div>
      <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">{t.roi.priceNote}</div>
        <div className="text-3xl font-bold mt-1">{money(fairPricePerUser)} <span className="text-base text-slate-500">/ user / mo</span></div>
      </div>

      <p className="md:col-span-4 text-xs text-slate-500 dark:text-slate-400">{t.roi.disclaimer}</p>
    </div>
  );
};

export default Pricing;
