// src/pages/Pricing.tsx — honest early-access pricing in the Features / About deck language.
import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import { Input } from "@/components/ui/input";
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
import "@/components/landing/features-deck.css";

const STRINGS: Record<
  MarketingLocale,
  {
    titleA: string;
    titleB: string;
    note: string;
    earlyTitleA: string;
    earlyTitleB: string;
    earlyBody: string;
    includedTitleA: string;
    includedTitleB: string;
    includedNote: string;
    included: string[];
    aiNote: string;
    ctaStart: string;
    ctaTalk: string;
    roi: {
      titleA: string;
      titleB: string;
      note: string;
      rate: string;
      hours: string;
      seats: string;
      period: string;
      perMonth: string;
      result: string;
      priceNote: string;
      disclaimer: string;
      currencyLabel: string;
      perUser: string;
    };
  }
> = {
  en: {
    titleA: "Pricing that grows with",
    titleB: "your practice.",
    note:
      "JURE is in early access. We're finalizing plans together with our founding firms — join now and lock in early-access conditions.",
    earlyTitleA: "Founding-firm",
    earlyTitleB: "access.",
    earlyBody:
      "Get the full JURE workspace while we build the platform with our first legal teams. No invented tiers, no surprises: pricing is agreed transparently with each early firm and announced publicly once plans are finalized.",
    includedTitleA: "Everything in the platform",
    includedTitleB: "today.",
    includedNote: "What you get with founding-firm access — shipping capabilities only.",
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
      titleA: "ROI",
      titleB: "calculator.",
      note: "Estimate what saved time is worth to your practice.",
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
    titleA: "Une tarification qui grandit avec",
    titleB: "votre cabinet.",
    note:
      "JURE est en accès anticipé. Nous finalisons les offres avec nos cabinets fondateurs — rejoignez-nous et bénéficiez des conditions d'accès anticipé.",
    earlyTitleA: "Accès cabinet",
    earlyTitleB: "fondateur.",
    earlyBody:
      "Profitez de l'espace de travail JURE complet pendant que nous construisons la plateforme avec nos premières équipes juridiques. Pas de formules inventées, pas de surprises : la tarification est convenue en toute transparence avec chaque cabinet pionnier et sera annoncée publiquement une fois les offres finalisées.",
    includedTitleA: "Tout ce que la plateforme offre",
    includedTitleB: "aujourd'hui.",
    includedNote: "Ce que vous obtenez avec l'accès cabinet fondateur — capacités déjà livrées uniquement.",
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
      titleA: "Calculateur de",
      titleB: "ROI.",
      note: "Estimez la valeur du temps gagné pour votre cabinet.",
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
    titleA: "تسعير ينمو مع",
    titleB: "ممارستك.",
    note:
      "JURE في مرحلة الوصول المبكر. نضع الخطط النهائية مع مكاتبنا المؤسسة — انضم الآن واحصل على شروط الوصول المبكر.",
    earlyTitleA: "عضوية المكاتب",
    earlyTitleB: "المؤسسة.",
    earlyBody:
      "احصل على مساحة عمل JURE الكاملة بينما نبني المنصة مع أولى الفرق القانونية. لا خطط مختلقة ولا مفاجآت: يتفق على التسعير بشفافية مع كل مكتب رائد وسيعلن عنه علنا فور اكتمال الخطط.",
    includedTitleA: "كل ما تقدمه المنصة",
    includedTitleB: "اليوم.",
    includedNote: "ما تحصلون عليه بعضوية المكاتب المؤسسة — الإمكانات المتاحة فقط.",
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
      titleA: "حاسبة",
      titleB: "العائد.",
      note: "قدر قيمة الوقت الموفر لممارستك.",
      rate: "الأجر بالساعة",
      hours: "ساعات موفرة / أسبوع / مستخدم",
      seats: "المقاعد",
      period: "الفترة",
      perMonth: "شهريا",
      result: "القيمة الشهرية المقدرة",
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
    <div className="pricing-roi__grid">
      <label className="pricing-field">
        <span>
          {t.rate} ({currency})
        </span>
        <Input
          type="number"
          min={10}
          step={5}
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value || "0"))}
          className="contact-input"
        />
      </label>
      <label className="pricing-field">
        <span>{t.hours}</span>
        <Input
          type="number"
          min={0}
          step={0.1}
          value={hours}
          onChange={(e) => setHours(parseFloat(e.target.value || "0"))}
          className="contact-input"
        />
      </label>
      <label className="pricing-field">
        <span>{t.seats}</span>
        <Input
          type="number"
          min={1}
          step={1}
          value={seats}
          onChange={(e) => setSeats(parseInt(e.target.value || "0", 10))}
          className="contact-input"
        />
      </label>
      <label className="pricing-field">
        <span>{t.period}</span>
        <Input disabled value={t.perMonth} className="contact-input" />
      </label>

      <div className="pricing-roi__stat">
        <div className="pricing-roi__label">{t.result}</div>
        <div className="pricing-roi__value">{money(monthlyValue)}</div>
      </div>
      <div className="pricing-roi__stat">
        <div className="pricing-roi__label">{t.priceNote}</div>
        <div className="pricing-roi__value">
          {money(fairPricePerUser)} <span className="pricing-roi__unit">{t.perUser}</span>
        </div>
      </div>

      <p className="pricing-roi__disclaimer">{t.disclaimer}</p>
    </div>
  );
};

const Pricing: React.FC = () => {
  const { lang, dir, path } = useMarketingLang();
  const [cur, setCur] = useCurrency();
  const t = STRINGS[lang];
  const jsonLd = [organizationJsonLd(lang), webSiteJsonLd(lang)];

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="pricing">
      <RouteSeo routeKey="pricing" lang={lang} jsonLd={jsonLd} />
      <div className="features-deck pricing-deck">
        <div className="features-orbs" aria-hidden>
          <span className="features-orb features-orb--a" />
          <span className="features-orb features-orb--b" />
          <span className="features-orb features-orb--c" />
          <span className="features-orb features-orb--d" />
        </div>

        <section className="features-hero">
          <div className="features-deck__inner">
            <h1 className="features-hero__title pricing-hero__title">
              {t.titleA} <em>{t.titleB}</em>
            </h1>
            <p className="features-hero__lead">{t.note}</p>
          </div>
        </section>

        <section className="features-block">
          <div className="features-deck__inner pricing-inner">
            <Reveal>
              <div className="features-block__head">
                <h2 className="features-block__title">
                  {t.earlyTitleA} <em>{t.earlyTitleB}</em>
                </h2>
                <p className="features-block__lead">{t.earlyBody}</p>
              </div>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="features-block__head">
                <h2 className="features-block__title">
                  {t.includedTitleA} <em>{t.includedTitleB}</em>
                </h2>
                <p className="features-block__lead">{t.includedNote}</p>
              </div>
              <article className="about-panel about-panel--mist pricing-included">
                <ul className="pricing-included__list">
                  {t.included.map((item) => (
                    <li key={item}>
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                  <li className="pricing-included__ai">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{t.aiNote}</span>
                  </li>
                </ul>
                <div className="pricing-included__actions">
                  <Link
                    to="/signup"
                    className="features-btn features-btn--dark"
                    onClick={() => track(MarketingEvents.SignupCta, { source: "pricing", lang })}
                  >
                    {t.ctaStart}
                    <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
                  </Link>
                  <Link
                    to={path("contact")}
                    className="features-btn features-btn--ghost"
                    onClick={() => track(MarketingEvents.ContactCta, { source: "pricing", lang })}
                  >
                    {t.ctaTalk}
                  </Link>
                </div>
              </article>
            </Reveal>
          </div>
        </section>

        <section className="features-block pricing-roi-block">
          <div className="features-deck__inner pricing-inner">
            <Reveal>
              <div className="features-block__head">
                <h2 className="features-block__title">
                  {t.roi.titleA} <em>{t.roi.titleB}</em>
                </h2>
                <p className="features-block__lead">{t.roi.note}</p>
              </div>
              <article className="about-panel about-panel--mist pricing-roi">
                <div className="pricing-roi__top">
                  <div className="pricing-roi__heading">
                    <Calculator className="w-5 h-5" />
                    <span>{t.roi.titleA} {t.roi.titleB.replace(/\.$/, "")}</span>
                  </div>
                  <label className="pricing-currency">
                    <span>{t.roi.currencyLabel}</span>
                    <select value={cur} onChange={(e) => setCur(e.target.value as Currency)}>
                      {currencyOptions().map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <RoiCalc t={t.roi} currency={cur} />
              </article>
            </Reveal>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
};

export default Pricing;
