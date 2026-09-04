// src/pages/Terms.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Scale, CreditCard, Ban, ArrowRight } from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { RouteSeo } from "@/marketing/Seo";

type Lang = "fr" | "en" | "ar";

const termsFr = {
    htmlLang: "fr",
    dir: "ltr" as "ltr" | "rtl",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    hero: {
      titleA: "Conditions d’utilisation",
      subtitle:
        "Ces conditions régissent votre accès et votre utilisation de JURE. En utilisant le service, vous les acceptez.",
      ctaPrimary: "Nous contacter",
      ctaSecondary: "Voir la démo",
      lastUpdated: "Dernière mise à jour",
    },
    sections: {
      accept: { title: "Acceptation", text: "En accédant au service, vous acceptez ces Conditions et la Politique de confidentialité." },
      eligibility: { title: "Éligibilité", text: "Vous déclarez avoir l’âge légal et l’autorité pour engager votre organisation." },
      account: {
        title: "Compte & sécurité",
        bullets: [
          "Maintenez la confidentialité de vos identifiants.",
          "Signalez tout accès non autorisé.",
          "Respectez la configuration et la sécurité recommandées.",
        ],
      },
      subs: {
        title: "Abonnements & facturation",
        bullets: [
          "Plans, prix et taxes applicables selon la grille tarifaire.",
          "Renouvellement et résiliation selon les modalités du plan.",
          "Aucun remboursement sauf mention contraire légale.",
        ],
      },
      license: {
        title: "Licence d’utilisation",
        text:
          "Licence limitée, non exclusive et non transférable pour l’utilisation du service selon ces Conditions.",
      },
      restrictions: {
        title: "Restrictions",
        bullets: [
          "Pas d’ingénierie inverse, scraping non autorisé ou accès automatisé abusif.",
          "Pas d’utilisation illégale ou pour créer un modèle concurrent direct avec nos données.",
          "Respect de la propriété intellectuelle et des droits des tiers.",
        ],
      },
      data: {
        title: "Données & confidentialité",
        text:
          "Nous traitons les données conformément à la Politique de confidentialité et aux lois applicables.",
      },
      ai: {
        title: "Fonctionnalités IA",
        text:
          "Les sorties IA doivent être vérifiées par un professionnel. Vous demeurez responsable des décisions prises.",
      },
      ip: {
        title: "Propriété intellectuelle",
        text:
          "Nous conservons tous les droits sur le service. Vous conservez vos droits sur vos contenus.",
      },
      warranty: {
        title: "Garanties",
        text:
          "Le service est fourni « en l’état ». Nous déclinons les garanties non prévues par la loi.",
      },
      liability: {
        title: "Limitation de responsabilité",
        text:
          "Dans la mesure permise, notre responsabilité globale est limitée aux montants payés pour le service sur les 12 derniers mois.",
      },
      indemnity: {
        title: "Indemnisation",
        text:
          "Vous acceptez d’indemniser JURE contre les réclamations résultant d’un usage contraire aux Conditions.",
      },
      term: {
        title: "Durée & résiliation",
        text:
          "Nous pouvons suspendre/résilier en cas de violation. Vous pouvez résilier selon votre plan.",
      },
      law: {
        title: "Droit applicable",
        text:
          "À personnaliser (ex. droit marocain, tribunaux de Casablanca).",
      },
      changes: {
        title: "Modifications",
        text:
          "Nous pouvons modifier les Conditions. Les changements s’appliquent à compter de leur publication.",
      },
      contact: {
        title: "Contact",
        text:
          "contact@jure.ma",
      },
    },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
};

type TermsCopy = typeof termsFr;

const STRINGS: Record<Lang, TermsCopy> = {
  fr: termsFr,
  en: {
    htmlLang: "en",
    dir: "ltr",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },
    hero: {
      titleA: "Terms of Service",
      subtitle:
        "These Terms govern your access to and use of JURE. By using the service, you agree to them.",
      ctaPrimary: "Contact us",
      ctaSecondary: "View demo",
      lastUpdated: "Last updated",
    },
    sections: {
      accept: { title: "Acceptance", text: "By accessing the service, you accept these Terms and the Privacy Policy." },
      eligibility: { title: "Eligibility", text: "You represent you have legal age and authority to bind your organization." },
      account: {
        title: "Account & Security",
        bullets: [
          "Keep your credentials confidential.",
          "Report any unauthorized access.",
          "Follow recommended configuration and security practices.",
        ],
      },
      subs: {
        title: "Subscriptions & Billing",
        bullets: [
          "Plans, pricing, and applicable taxes per the pricing page.",
          "Renewal and cancellation per your plan terms.",
          "No refunds unless required by law.",
        ],
      },
      license: {
        title: "License",
        text:
          "A limited, non-exclusive, non-transferable license to use the service under these Terms.",
      },
      restrictions: {
        title: "Restrictions",
        bullets: [
          "No reverse engineering, unauthorized scraping, or abusive automation.",
          "No unlawful use or building a directly competing model using our data.",
          "Respect IP and third-party rights.",
        ],
      },
      data: {
        title: "Data & Privacy",
        text:
          "We process data under the Privacy Policy and applicable laws.",
      },
      ai: {
        title: "AI Features",
        text:
          "AI outputs must be reviewed by a professional. You remain responsible for decisions.",
      },
      ip: {
        title: "Intellectual Property",
        text:
          "We retain all rights to the service. You retain rights to your content.",
      },
      warranty: {
        title: "Warranties",
        text:
          "The service is provided “as is.” We disclaim warranties except where required by law.",
      },
      liability: {
        title: "Limitation of Liability",
        text:
          "To the extent permitted, our aggregate liability is limited to amounts paid in the prior 12 months.",
      },
      indemnity: {
        title: "Indemnification",
        text:
          "You will indemnify JURE for claims arising from use that violates the Terms.",
      },
      term: {
        title: "Term & Termination",
        text:
          "We may suspend/terminate for breach. You may terminate per your plan.",
      },
      law: {
        title: "Governing Law",
        text:
          "Customize (e.g., Moroccan law, courts of Casablanca).",
      },
      changes: {
        title: "Changes",
        text:
          "We may modify the Terms. Changes apply from publication.",
      },
      contact: {
        title: "Contact",
        text:
          "contact@jure.ma",
      },
    },
    footer: { privacy: "Privacy", terms: "Terms", status: "Status", rights: "All rights reserved." },
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },
    hero: {
      titleA: "شروط الاستخدام",
      subtitle:
        "تحكم هذه الشروط وصولك إلى JURE واستخدامك له. باستخدامك للخدمة فأنت توافق عليها.",
      ctaPrimary: "تواصل معنا",
      ctaSecondary: "شاهد العرض",
      lastUpdated: "آخر تحديث",
    },
    sections: {
      accept: { title: "القبول", text: "بدخولك للخدمة تقبل هذه الشروط وسياسة الخصوصية." },
      eligibility: { title: "الأهلية", text: "تقر بأنك تبلغ السن القانوني ولديك صلاحية إلزام مؤسستك." },
      account: {
        title: "الحساب والأمان",
        bullets: [
          "حافظ على سرية بيانات الدخول.",
          "أبلغ عن أي وصول غير مصرح به.",
          "اتبع إعدادات وممارسات الأمان الموصى بها.",
        ],
      },
      subs: {
        title: "الاشتراكات والفوترة",
        bullets: [
          "الخطط والأسعار والضرائب وفق صفحة التسعير.",
          "التجديد والإلغاء حسب شروط خطتك.",
          "لا توجد مبالغ مستردة ما لم يتطلب القانون ذلك.",
        ],
      },
      license: {
        title: "الترخيص",
        text:
          "ترخيص محدود وغير حصري وغير قابل للتحويل لاستخدام الخدمة وفق هذه الشروط.",
      },
      restrictions: {
        title: "القيود",
        bullets: [
          "لا للهندسة العكسية أو الكشط غير المصرح أو الأتمتة المسيئة.",
          "لا لاستخدام غير قانوني أو إنشاء نموذج منافس مباشرة باستخدام بياناتنا.",
          "احترام الملكية الفكرية وحقوق الغير.",
        ],
      },
      data: {
        title: "البيانات والخصوصية",
        text:
          "نُعالج البيانات طبقًا لسياسة الخصوصية والقوانين المعمول بها.",
      },
      ai: {
        title: "ميزات الذكاء الاصطناعي",
        text:
          "يجب مراجعة مخرجات الذكاء الاصطناعي من متخصص. تظل مسؤولًا عن القرارات.",
      },
      ip: {
        title: "الملكية الفكرية",
        text:
          "نحتفظ بكافة الحقوق في الخدمة. تحتفظ بحقوقك في محتواك.",
      },
      warranty: {
        title: "الضمانات",
        text:
          "تُقدَّم الخدمة «كما هي». نخلي المسؤولية عن الضمانات إلا حيث يقتضي القانون.",
      },
      liability: {
        title: "تحديد المسؤولية",
        text:
          "في الحدود المسموح بها، تُحدَّد مسؤوليتنا الإجمالية بالمبالغ المدفوعة خلال 12 شهرًا السابقة.",
      },
      indemnity: {
        title: "التعويض",
        text:
          "تُعوض JURE عن المطالبات الناتجة عن استخدام مخالف للشروط.",
      },
      term: {
        title: "المدة والإنهاء",
        text:
          "قد نوقف/ننهي عند المخالفة. يمكنك الإنهاء وفق خطتك.",
      },
      law: {
        title: "القانون المُنظّم",
        text:
          "يُخصّص (مثلاً القانون المغربي ومحاكم الدار البيضاء).",
      },
      changes: {
        title: "التغييرات",
        text:
          "قد نُعدّل الشروط. تسري التعديلات اعتبارًا من نشرها.",
      },
      contact: {
        title: "التواصل",
        text:
          "contact@jure.ma",
      },
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

const Terms: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const lastUpdated = "2025-08-15";
  const go = (to: string) => navigate(to);

  const rows = [
    { icon: <FileText className="w-5 h-5" />, sec: t.sections.accept },
    { icon: <Shield className="w-5 h-5" />, sec: t.sections.eligibility },
    { icon: <Shield className="w-5 h-5" />, sec: t.sections.account, bullets: true },
    { icon: <CreditCard className="w-5 h-5" />, sec: t.sections.subs, bullets: true },
    { icon: <FileText className="w-5 h-5" />, sec: t.sections.license },
    { icon: <Ban className="w-5 h-5" />, sec: t.sections.restrictions, bullets: true },
    { icon: <Shield className="w-5 h-5" />, sec: t.sections.data },
    { icon: <Scale className="w-5 h-5" />, sec: t.sections.ai },
    { icon: <FileText className="w-5 h-5" />, sec: t.sections.ip },
    { icon: <Shield className="w-5 h-5" />, sec: t.sections.warranty },
    { icon: <Scale className="w-5 h-5" />, sec: t.sections.liability },
    { icon: <Shield className="w-5 h-5" />, sec: t.sections.indemnity },
    { icon: <FileText className="w-5 h-5" />, sec: t.sections.term },
    { icon: <Scale className="w-5 h-5" />, sec: t.sections.law },
    { icon: <FileText className="w-5 h-5" />, sec: t.sections.changes },
    { icon: <FileText className="w-5 h-5" />, sec: t.sections.contact },
  ];

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{ nav: t.nav, auth: t.auth, themeToggle: t.themeToggle, footer: t.footer }}
      dir={t.dir}
      activeNav="none"
    >
      <RouteSeo routeKey="terms" lang={lang} />
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 md:pt-24 md:pb-12">
        <Reveal className="max-w-4xl mx-auto text-center min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl font-bold tracking-tight break-words text-[#64499D] dark:text-white">
            {t.hero.titleA}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-neutral-600 dark:text-neutral-300 break-words">{t.hero.subtitle}</p>
          <p className="mt-2 text-sm text-neutral-500">{t.hero.lastUpdated}: {lastUpdated}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto">
            <Button onClick={() => go("/contact")} className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg landing-btn-primary">
              {t.hero.ctaPrimary} <ArrowRight className="ms-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => go("/demo")} className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg border-[#A58CF4]/30">
              {t.hero.ctaSecondary}
            </Button>
          </div>
        </Reveal>

        <div className="landing-divider my-10 sm:my-12 max-w-md mx-auto" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 md:gap-8">
          {rows.map((row, i) => (
            <Reveal key={i} delay={Math.min(i * 0.04, 0.24)} subtle>
              <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 h-full min-w-0">
                <div className="flex items-center gap-3 mb-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl grid place-items-center text-white shrink-0" style={{ background: "#A58CF4" }}>
                    {row.icon}
                  </div>
                  <h3 className="font-display text-xl font-semibold break-words">{row.sec.title}</h3>
                </div>
                {row.bullets ? (
                  <ul className="list-disc ms-5 space-y-2 text-slate-700 dark:text-slate-300">
                    {row.sec.bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}
                  </ul>
                ) : (
                  <p className="text-slate-600 dark:text-slate-300">{row.sec.text}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
};

export default Terms;
