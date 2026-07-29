// src/pages/Terms.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, Scale, CreditCard, Ban, ArrowRight } from "lucide-react";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  fr: {
    htmlLang: "fr",
    dir: "ltr",
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
          "questions@jure.example",
      },
    },
    footer: { privacy: "Confidentialité", terms: "Conditions", status: "Statut", rights: "Tous droits réservés." },
  },
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
          "questions@jure.example",
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
          "questions@jure.example",
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

const Terms: React.FC = () => {
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const year = new Date().getFullYear();
  const lastUpdated = "2025-08-15";
  const go = (to: string) => navigate(to);

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
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.hero.lastUpdated}: {lastUpdated}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => go("/contact")} className="bg-gradient-to-r from-[#64499D] to-[#4D3680]">
                {t.hero.ctaPrimary} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => go("/demo")}>{t.hero.ctaSecondary}</Button>
            </div>
          </div>

          {/* Terms sections */}
          <div className="mt-12 grid md:grid-cols-2 gap-6 md:gap-8">
            {[
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
            ].map((row, i) => (
              <Card key={i} className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl grid place-items-center text-white" style={{ background: "#64499D" }}>
                      {row.icon}
                    </div>
                    <CardTitle className="text-xl">{row.sec.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {row.bullets ? (
                    <ul className="list-disc ms-5 space-y-2 text-slate-700 dark:text-slate-300">
                      {row.sec.bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}
                    </ul>
                  ) : (
                    <p className="text-slate-600 dark:text-slate-300">{row.sec.text}</p>
                  )}
                </CardContent>
              </Card>
            ))}
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

export default Terms;
