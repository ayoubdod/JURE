// src/pages/Pricing.tsx — honest early-access pricing (no invented tiers).
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calculator, Check, Sparkles } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";
import { organizationJsonLd, webSiteJsonLd } from "@/marketing/structuredData";
import {
  Currency,
  useCurrency,
  formatMoney,
  convertFromUSD,
  currencyOptions,
} from "@/lib/currency";
import { track, MarketingEvents } from "@/lib/analytics";
import type { MarketingLocale } from "@/marketing/site";
import "@/components/landing/landing.css";

const STRINGS: Record<MarketingLocale, {
  h1: string;
  subtitle: string;
  earlyBadge: string;
  earlyTitle: string;
  earlyBody: string;
  includedTitle: string;
  included: string[];
  aiNote: string;
  ctaStart: string;
  ctaTalk: string;
  roi: {
    title: string; subtitle: string; rate: string; hours: string; seats: string;
    period: string; perMonth: string; result: string; priceNote: string;
    disclaimer: string; currencyLabel: string; perUser: string;
  };
}> = {
  en: {
    h1: "Pricing that grows with your practice",
    subtitle:
      "JURE is in early access. We're finalizing plans together with our founding firms — join now and lock in early-access conditions.",
    earlyBadge: "Early access",
    earlyTitle: "Founding-firm access",
    earlyBody:
      "Get the full JURE workspace while we build the platform with our first legal teams. No invented tiers, no surprises: pricing is agreed transparently with each early firm and announced publicly once plans are finalized.",
    includedTitle: "Everything in the platform today",
    included: [
      "Matter & case management with clients, documents, tasks and deadlines",
      "Secure document library with PDF and Word preview",
      "Shared team calendar and deadline reminders",
      "Real-time team messaging and voice/video calls",
      "Roles and permissions, from owner to viewer",
      "Practice finance for owners and admins",
      "French, English and Arabic interface (RTL supported)",
    ],
    aiNote: "Juria legal AI (contract analysis, research-style Q&A, drafting help) — early access",
    ctaStart: "Start with JURE",
    ctaTalk: "Talk to the team",
    roi: {
      title: "ROI calculator",
      subtitle: "Estimate what saved time is worth to your practice.",
      rate: "Hourly rate",
      hours: "Hours saved / week / user",
      seats: "Seats",
      period: "Period",
      perMonth: "Per month",
      result: "Estimated monthly value created",
      priceNote: "At ~10% value capture, a fair monthly price per user would be",
      disclaimer: "Estimates only. Actual results vary by workflow and training.",
      currencyLabel: "Currency",
      perUser: "/ user / mo",
    },
  },
  fr: {
    h1: "Une tarification qui grandit avec votre cabinet",
    subtitle:
      "JURE est en accès anticipé. Nous finalisons les offres avec nos cabinets fondateurs — rejoignez-nous et bénéficiez des conditions d'accès anticipé.",
    earlyBadge: "Accès anticipé",
    earlyTitle: "Accès cabinet fondateur",
    earlyBody:
      "Profitez de l'espace de travail JURE complet pendant que nous construisons la plateforme avec nos premières équipes juridiques. Pas de formules inventées, pas de surprises : la tarification est convenue en toute transparence avec chaque cabinet pionnier et sera annoncée publiquement une fois les offres finalisées.",
    includedTitle: "Tout ce que la plateforme offre aujourd'hui",
    included: [
      "Gestion des dossiers avec clients, documents, tâches et échéances",
      "Bibliothèque documentaire sécurisée avec aperçu PDF et Word",
      "Agenda d'équipe partagé et rappels d'échéances",
      "Messagerie d'équipe en temps réel et appels audio/vidéo",
      "Rôles et permissions, du propriétaire au lecteur",
      "Finance du cabinet pour propriétaires et administrateurs",
      "Interface en français, anglais et arabe (RTL pris en charge)",
    ],
    aiNote: "IA juridique Juria (analyse de contrats, recherche, aide à la rédaction) — accès anticipé",
    ctaStart: "Commencer avec JURE",
    ctaTalk: "Parler à l'équipe",
    roi: {
      title: "Calculateur de ROI",
      subtitle: "Estimez la valeur du temps gagné pour votre cabinet.",
      rate: "Taux horaire",
      hours: "Heures gagnées / semaine / utilisateur",
      seats: "Licences",
      period: "Période",
      perMonth: "Par mois",
      result: "Valeur mensuelle estimée créée",
      priceNote: "À ~10% de captation de valeur, un prix mensuel équitable par utilisateur serait",
      disclaimer: "Estimations uniquement. Les résultats varient selon vos usages.",
      currencyLabel: "Devise",
      perUser: "/ utilisateur / mois",
    },
  },
  ar: {
    h1: "تسعير ينمو مع ممارستك",
    subtitle:
      "JURE في مرحلة الوصول المبكر. نضع الخطط النهائية مع مكاتبنا المؤسِّسة — انضم الآن واحصل على شروط الوصول المبكر.",
    earlyBadge: "وصول مبكر",
    earlyTitle: "عضوية المكاتب المؤسِّسة",
    earlyBody:
      "احصل على مساحة عمل JURE الكاملة بينما نبني المنصة مع أولى الفرق القانونية. لا خطط مُختلقة ولا مفاجآت: يُتفق على التسعير بشفافية مع كل مكتب رائد وسيُعلن عنه علنًا فور اكتمال الخطط.",
    includedTitle: "كل ما تقدمه المنصة اليوم",
    included: [
      "إدارة الملفات مع العملاء والمستندات والمهام والمواعيد النهائية",
      "مكتبة مستندات آمنة مع معاينة PDF وWord",
      "مفكرة فريق مشتركة وتذكيرات بالمواعيد",
      "مراسلة فورية للفريق ومكالمات صوتية ومرئية",
      "أدوار وصلاحيات، من المالك إلى القارئ",
      "مالية المكتب للمالكين والمديرين",
      "واجهة بالفرنسية والإنجليزية والعربية (مع دعم RTL)",
    ],
    aiNote: "الذكاء الاصطناعي القانوني جوريا (تحليل العقود، البحث، المساعدة في الصياغة) — وصول مبكر",
    ctaStart: "ابدأ مع JURE",
    ctaTalk: "تحدث إلى الفريق",
    roi: {
      title: "حاسبة العائد على الاستثمار",
      subtitle: "قدّر قيمة الوقت الموفر لممارستك.",
      rate: "الأجر بالساعة",
      hours: "ساعات موفّرة / أسبوع / مستخدم",
      seats: "المقاعد",
      period: "الفترة",
      perMonth: "شهريًا",
      result: "القيمة الشهرية المقدّرة",
      priceNote: "مع نحو 10% من القيمة، سيكون السعر الشهري العادل لكل مستخدم",
      disclaimer: "أرقام تقديرية فقط. النتائج تختلف حسب سير العمل والتدريب.",
      currencyLabel: "العملة",
      perUser: "/ مستخدم / شهر",
    },
  },
};

const RoiCalc: React.FC<{
  t: (typeof STRINGS)["en"]["roi"];
  currency: Currency;
}> = ({ t, currency }) => {
  const [rate, setRate] = useState<number>(() => Math.round(convertFromUSD(150, currency)));
  const [hours, setHours] = useState(1.0);
  const [seats, setSeats] = useState(5);

  const monthlyValue = useMemo(() => rate * hours * 4.3 * seats, [rate, hours, seats]);
  const fairPricePerUser = useMemo(() => rate * hours * 4.3 * 0.1, [rate, hours]);
  const money = (n: number) => formatMoney(n, currency);

  return (
    <div className="grid md:grid-cols-4 gap-4 md:gap-6">
      <div>
        <Label className="text-sm">{t.rate} ({currency})</Label>
        <Input type="number" min={10} step={5} value={rate} onChange={(e) => setRate(parseFloat(e.target.value || "0"))} />
      </div>
      <div>
        <Label className="text-sm">{t.hours}</Label>
        <Input type="number" min={0} step={0.1} value={hours} onChange={(e) => setHours(parseFloat(e.target.value || "0"))} />
      </div>
      <div>
        <Label className="text-sm">{t.seats}</Label>
        <Input type="number" min={1} step={1} value={seats} onChange={(e) => setSeats(parseInt(e.target.value || "0"))} />
      </div>
      <div>
        <Label className="text-sm">{t.period}</Label>
        <Input disabled value={t.perMonth} />
      </div>

      <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">{t.result}</div>
        <div className="text-3xl font-bold mt-1">{money(monthlyValue)}</div>
      </div>
      <div className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">{t.priceNote}</div>
        <div className="text-3xl font-bold mt-1">
          {money(fairPricePerUser)} <span className="text-base text-slate-500">{t.perUser}</span>
        </div>
      </div>

      <p className="md:col-span-4 text-xs text-slate-500 dark:text-slate-400">{t.disclaimer}</p>
    </div>
  );
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { lang, dir, path } = useMarketingLang();
  const [cur, setCur] = useCurrency();
  const t = STRINGS[lang];

  const jsonLd = [organizationJsonLd(lang), webSiteJsonLd(lang)];

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="pricing">
      <RouteSeo routeKey="pricing" lang={lang} jsonLd={jsonLd} />

      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#64499D] dark:text-white">
          {t.h1}
        </h1>
        <p className="mt-5 max-w-2xl mx-auto text-sm sm:text-lg text-neutral-600 dark:text-neutral-300">
          {t.subtitle}
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Reveal>
          <div className="landing-glass landing-panel-glow rounded-3xl p-6 sm:p-10">
            <div className={`flex items-center gap-2 mb-4 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                {t.earlyBadge}
              </span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-bold text-slate-900 dark:text-white ${dir === "rtl" ? "text-right" : ""}`}>
              {t.earlyTitle}
            </h2>
            <p className={`mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed ${dir === "rtl" ? "text-right" : ""}`}>
              {t.earlyBody}
            </p>

            <div className={`mt-6 ${dir === "rtl" ? "text-right" : ""}`}>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
                {t.includedTitle}
              </div>
              <ul className="space-y-2.5">
                {t.included.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
                <li className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                  <Sparkles className="w-4 h-4 text-[#A58CF4] dark:text-[#A58CF4] mt-0.5 shrink-0" />
                  {t.aiNote}
                </li>
              </ul>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <Button
                size="lg"
                onClick={() => {
                  track(MarketingEvents.SignupCta, { source: "pricing", lang });
                  navigate("/signup");
                }}
                className="w-full sm:w-auto landing-btn-primary px-8"
              >
                {t.ctaStart}
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  track(MarketingEvents.ContactCta, { source: "pricing", lang });
                  navigate(path("contact"));
                }}
                className="w-full sm:w-auto landing-btn-secondary px-8"
              >
                {t.ctaTalk}
              </Button>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 pb-16">
        <Reveal>
          <Card className="bg-white dark:bg-[#111] border-[#64499D]/10 dark:border-white/10">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" /> {t.roi.title}
                  </CardTitle>
                  <CardDescription className="dark:text-slate-400 mt-1">
                    {t.roi.subtitle}
                  </CardDescription>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {t.roi.currencyLabel}:
                  </span>
                  <select
                    className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent"
                    value={cur}
                    onChange={(e) => setCur(e.target.value as Currency)}
                  >
                    {currencyOptions().map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <RoiCalc t={t.roi} currency={cur} />
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </MarketingShell>
  );
};

export default Pricing;
