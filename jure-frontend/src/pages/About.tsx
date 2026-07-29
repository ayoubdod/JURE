// src/pages/About.tsx
import React, { useEffect, useState } from "react"; // removed useMemo
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  BookOpen,
  Heart,
  Award,
  Target,
  Check,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle"; // ✅ use the shared minimalist toggle

/**
 * About Page
 * - Independent, but visually aligned with Landing.tsx
 * - Brand Primary: #64499D (deep purple)
 * - Auto RTL for Arabic, dark mode aware
 */

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    nav: { features: "Fonctionnalités", pricing: "Tarifs", about: "À propos", contact: "Contact" },
    auth: { signin: "Se connecter" },
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    hero: {
      titleA: "Nous construisons l’avenir du droit,",
      titleB: "avec et pour les juristes.",
      subtitle:
        "JURE est une plateforme legaltech centrée sur l’exigence métier : IA responsable, gestion de dossiers fluide et collaboration sécurisée pour des cabinets modernes.",
      ctaContact: "Parler à l’équipe",
      ctaDemo: "Voir la démo",
      trustLine: "Conçu pour la conformité (privacy-first, contrôle d’accès, traçabilité).",
    },
    pillars: {
      mission: {
        title: "Notre mission",
        desc: "Accélérer la pratique juridique sans compromis sur la qualité, l’éthique et la confidentialité.",
      },
      vision: {
        title: "Notre vision",
        desc: "Une pratique augmentée par l’IA, centrée sur l’humain, accessible à tous les cabinets.",
      },
      values: {
        title: "Nos valeurs",
        items: ["Intégrité & exigence", "Innovation responsable", "Impact métier mesurable", "Privacy-by-design", "Humain-dans-la-boucle"],
      },
    },
    impact: {
      title: "Ce qui nous distingue",
      items: [
        { title: "IA juridique pragmatique", desc: "Recherche, analyse et rédaction assistée, adaptées au terrain." },
        { title: "Sécurité & conformité", desc: "Chiffrement, rôles, journaux, bonnes pratiques conformes." },
        { title: "Collaboration efficace", desc: "Espaces d’équipe, checklists, tâches et partages maîtrisés." },
        { title: "Connaissance vivante", desc: "Bibliothèque enrichie, recherche sémantique et références." },
      ],
    },
    timeline: {
      title: "Notre trajectoire",
      items: [
        { when: "2023", what: "Idéation & cadrage : premiers prototypes et entretiens utilisateurs." },
        { when: "2024", what: "MVP orienté dossiers & IA responsable, pilotes avec des cabinets." },
        { when: "2025", what: "Beta améliorée, multilingue (FR/EN/AR), montée en robustesse & sécurité." },
      ],
    },
    team: {
      title: "Équipe & leadership",
      subtitle: "Une équipe pluridisciplinaire au croisement droit, produit et ingénierie.",
      members: [
        { name: "Ayoub Hammady", role: "Fondateur & Legal-Tech Lead", initials: "AH" },
        { name: "Product & Eng Team", role: "Produit • Front/Back • IA", initials: "PE" },
        { name: "Advisory Circle", role: "Conformité • Méthodo • Marché", initials: "AC" },
      ],
    },
    cta: {
      title: "Prêt à transformer votre pratique ?",
      subtitle: "Discutons de vos cas d’usage et de vos priorités.",
      primary: "Nous contacter",
      secondary: "Essayer la démo",
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
      titleA: "We’re building the future of law,",
      titleB: "with and for legal teams.",
      subtitle:
        "JURE is a legaltech platform obsessed with real-world outcomes: responsible AI, streamlined matter management, and secure collaboration for modern firms.",
      ctaContact: "Talk to the team",
      ctaDemo: "View demo",
      trustLine: "Designed for compliance (privacy-first, access control, auditability).",
    },
    pillars: {
      mission: {
        title: "Our mission",
        desc: "Speed up legal work without sacrificing quality, ethics, or confidentiality.",
      },
      vision: {
        title: "Our vision",
        desc: "Human-centered, AI-augmented practice accessible to firms of any size.",
      },
      values: {
        title: "Our values",
        items: ["Integrity & rigor", "Responsible innovation", "Measurable impact", "Privacy-by-design", "Human-in-the-loop"],
      },
    },
    impact: {
      title: "What sets us apart",
      items: [
        { title: "Pragmatic legal AI", desc: "Research, analysis, and assisted drafting built for the field." },
        { title: "Security & compliance", desc: "Encryption, roles, logs, and sound compliance practices." },
        { title: "Effective collaboration", desc: "Team spaces, checklists, tasks, and controlled sharing." },
        { title: "Living knowledge", desc: "Enriched library, semantic search, and references." },
      ],
    },
    timeline: {
      title: "Our journey",
      items: [
        { when: "2023", what: "Ideation & scoping: early prototypes and user interviews." },
        { when: "2024", what: "MVP with responsible AI & matters, piloted with firms." },
        { when: "2025", what: "Improved beta, multilingual (FR/EN/AR), stronger security & robustness." },
      ],
    },
    team: {
      title: "Team & leadership",
      subtitle: "A cross-disciplinary crew at the intersection of law, product, and engineering.",
      members: [
        { name: "Ayoub Hammady", role: "Founder & Legal-Tech Lead", initials: "AH" },
        { name: "Product & Eng Team", role: "Product • Front/Back • AI", initials: "PE" },
        { name: "Advisory Circle", role: "Compliance • Method • Market", initials: "AC" },
      ],
    },
    cta: {
      title: "Ready to transform your practice?",
      subtitle: "Let’s discuss your use cases and priorities.",
      primary: "Contact us",
      secondary: "Try the demo",
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
      titleA: "نبني مستقبل القانون",
      titleB: "مع الفرق القانونية ومن أجلها.",
      subtitle:
        "JURE منصة قانونية تركّز على النتائج الواقعية: ذكاء اصطناعي مسؤول، إدارة قضايا مبسطة، وتعاون آمن للمكاتب الحديثة.",
      ctaContact: "تحدث مع الفريق",
      ctaDemo: "شاهد العرض",
      trustLine: "مصممة للتوافق (خصوصية أولاً، تحكم بالصلاحيات، قابلية التدقيق).",
    },
    pillars: {
      mission: {
        title: "مهمتنا",
        desc: "تسريع العمل القانوني دون المساس بالجودة أو الأخلاقيات أو السرية.",
      },
      vision: {
        title: "رؤيتنا",
        desc: "ممارسة قانونية معززة بالذكاء الاصطناعي، محورها الإنسان، ومناسبة لجميع المكاتب.",
      },
      values: {
        title: "قيمنا",
        items: ["النزاهة والانضباط", "ابتكار مسؤول", "أثر مهني ملموس", "خصوصية بالتصميم", "إنسان في الحلقة"],
      },
    },
    impact: {
      title: "ما يميزنا",
      items: [
        { title: "ذكاء قانوني عملي", desc: "بحث وتحليل وصياغة مدعومة مصممة للواقع العملي." },
        { title: "الأمن والامتثال", desc: "تشفير، أدوار، سجلات، وممارسات امتثال راسخة." },
        { title: "تعاون فعّال", desc: "مساحات فرق وقوائم مهام ومشاركة مضبوطة." },
        { title: "معرفة حيّة", desc: "مكتبة غنية وبحث دلالي ومراجع." },
      ],
    },
    timeline: {
      title: "رحلتنا",
      items: [
        { when: "2023", what: "فكرة وتحديد النطاق: نماذج أولية ومقابلات مستخدمين." },
        { when: "2024", what: "نسخة أولية مع ذكاء مسؤول وإدارة قضايا، تجارب مع مكاتب." },
        { when: "2025", what: "نسخة تجريبية مطوّرة، متعددة اللغات (FR/EN/AR)، أمان ومتانة أعلى." },
      ],
    },
    team: {
      title: "الفريق والقيادة",
      subtitle: "فريق متعدد التخصصات يجمع القانون والمنتج والهندسة.",
      members: [
        { name: "أيوب حمادي", role: "المؤسس وقائد الحلول القانونية التقنية", initials: "أح" },
        { name: "فريق المنتج والهندسة", role: "منتج • واجهات/خلفية • ذكاء اصطناعي", initials: "فه" },
        { name: "دائرة استشارية", role: "امتثال • منهجيات • سوق", initials: "دس" },
      ],
    },
    cta: {
      title: "جاهز لتحويل ممارستك؟",
      subtitle: "دعنا نناقش حالات الاستخدام والأولويات لديك.",
      primary: "تواصل معنا",
      secondary: "جرّب العرض",
    },
    footer: { privacy: "الخصوصية", terms: "الشروط", status: "الحالة", rights: "جميع الحقوق محفوظة." },
  },
};

const useI18n = () => {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored) return stored;
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

const AvatarCircle: React.FC<{ initials: string }> = ({ initials }) => (
  <div
    className="w-14 h-14 rounded-full grid place-items-center text-white font-semibold"
    style={{
      background:
        "linear-gradient(135deg, #64499D 0%, #4D3680 50%, #3E2D71 100%)",
    }}
  >
    {initials}
  </div>
);

const About: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const year = new Date().getFullYear();

  const go = (to: string) => navigate(to);

  const dirClass = t.dir === "rtl" ? "md:flex-row-reverse" : "";

  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-32 w-80 h-80 rounded-full blur-3xl opacity-20 dark:opacity-30 animate-blob"
          style={{ background: "#64499D" }}
        />
        <div
          className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-2000"
          style={{ background: "#3E2D71" }}
        />
        <div
          className="absolute top-48 left-24 w-72 h-72 rounded-full blur-3xl opacity-10 dark:opacity-20 animate-blob animation-delay-4000"
          style={{ background: "#8B6FD1" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between" aria-label="main navigation">
          <div className="flex items-center gap-3">
            <img
              src="/images/Jure logo.png"
              alt="JURE"
              className="w-[140px] h-10 object-contain"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => go("/features")} className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors">
              {t.nav.features}
            </button>
            <button onClick={() => go("/pricing")} className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors">
              {t.nav.pricing}
            </button>
            <button onClick={() => go("/about")} className="text-[#64499D] dark:text-[#CFC2FF] font-semibold">
              {t.nav.about}
            </button>
            <button onClick={() => go("/contact")} className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors">
              {t.nav.contact}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} onChange={setLang} />
            {/* ✅ shared minimalist toggle */}
            <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title} />
            <Button
              onClick={() => go("/signin")}
              variant="outline"
              className="border-[#64499D]/30 text-[#64499D] hover:bg-[#64499D]/10 dark:text-[#CFC2FF] dark:hover:bg-[#64499D]/20"
            >
              {t.auth.signin}
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-12 md:pt-24 md:pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
                {t.hero.titleA}
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#64499D] to-[#4D3680] bg-clip-text text-transparent">
                {t.hero.titleB}
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center ${t.dir === "rtl" ? "sm:flex-row-reverse" : ""}`}>
              <Button
                onClick={() => go("/contact")}
                size="lg"
                className="px-7 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
              >
                {t.hero.ctaContact}
                <ArrowRight className={`ml-2 h-5 w-5 ${t.dir === "rtl" ? "rotate-180" : ""}`} />
              </Button>
              <Button
                onClick={() => go("/demo")}
                variant="outline"
                size="lg"
                className="px-7 py-6 text-lg border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t.hero.ctaDemo}
              </Button>
            </div>

            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t.hero.trustLine}</p>
          </div>

          {/* Pillars */}
          <div className="mt-16 grid md:grid-cols-3 gap-6 md:gap-8">
            {/* Mission */}
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: "#64499D" }}>
                  <Target className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">{t.pillars.mission.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{t.pillars.mission.desc}</CardDescription>
              </CardHeader>
            </Card>

            {/* Vision */}
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: "#4D3680" }}>
                  <Zap className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">{t.pillars.vision.title}</CardTitle>
                <CardDescription className="dark:text-slate-400">{t.pillars.vision.desc}</CardDescription>
              </CardHeader>
            </Card>

            {/* Values */}
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 text-white" style={{ background: "#3E2D71" }}>
                  <Heart className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-bold">{t.pillars.values.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {t.pillars.values.items.map((v: string, i: number) => (
                    <li key={i} className="flex items-center">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      {v}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Differentiators */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-20">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">{t.impact.title}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {t.impact.items.map((it: any, idx: number) => {
              const color =
                idx === 0 ? "#64499D" : idx === 1 ? "#4D3680" : idx === 2 ? "#3E2D71" : "#8B6FD1";
              const Icon = idx === 0 ? BookOpen : idx === 1 ? Shield : idx === 2 ? Users : Award;
              return (
                <div
                  key={idx}
                  className="group p-7 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm hover:shadow-lg transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white group-hover:scale-105 transition-transform"
                    style={{ background: color }}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{it.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300">{it.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Timeline */}
        <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
          <div className="rounded-3xl p-8 md:p-10 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
            <h2 className="text-3xl md:4xl font-bold mb-8 text-center">{t.timeline.title}</h2>

            <div className={`flex flex-col md:flex-row ${dirClass} gap-8`}>
              {t.timeline.items.map((step: any, i: number) => (
                <div key={i} className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-white/10">
                      <span className="text-lg font-semibold">{i + 1}</span>
                    </div>
                    <div className="text-xl font-semibold">{step.when}</div>
                  </div>
                  <p className="mt-3 text-slate-200 leading-relaxed">{step.what}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-2">{t.team.title}</h2>
            <p className="text-slate-600 dark:text-slate-300">{t.team.subtitle}</p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {t.team.members.map((m: any, i: number) => (
              <Card key={i} className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-4">
                    <AvatarCircle initials={m.initials} />
                    <div>
                      <CardTitle className="text-lg">{m.name}</CardTitle>
                      <CardDescription className="dark:text-slate-400">{m.role}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {lang === "fr" && "Focalisé sur des solutions concrètes, du discovery au déploiement sécurisé."}
                    {lang === "en" && "Focused on real outcomes, from discovery to secure deployment."}
                    {lang === "ar" && "يركز على النتائج الواقعية من الاستكشاف إلى النشر الآمن."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="rounded-3xl p-10 md:p-12 text-white bg-gradient-to-r from-[#64499D] to-[#4D3680]">
            <div className="text-center max-w-3xl mx-auto">
              <h3 className="text-3xl md:text-4xl font-bold mb-3">{t.cta.title}</h3>
              <p className="text-purple-100 text-lg">{t.cta.subtitle}</p>

              <div className={`mt-8 flex flex-col sm:flex-row gap-4 justify-center ${t.dir === "rtl" ? "sm:flex-row-reverse" : ""}`}>
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg font-medium bg-white text-slate-900 hover:bg-slate-100"
                  onClick={() => go("/contact")}
                >
                  {t.cta.primary}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-lg font-medium border-white/70 text-white hover:bg-white/10"
                  onClick={() => go("/demo")}
                >
                  {t.cta.secondary}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-black text-white py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`flex flex-col md:flex-row justify-between items-center gap-6 ${dirClass}`}>
            <div className="flex items-center gap-3">
              <img
                src="/images/Jure logo.png"
                alt="JURE"
                className="w-[120px] h-8 object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-300">
              <button onClick={() => go("/privacy")} className="hover:text-white">
                {t.footer.privacy}
              </button>
              <button onClick={() => go("/terms")} className="hover:text-white">
                {t.footer.terms}
              </button>
              <button onClick={() => go("/status")} className="hover:text-white">
                {t.footer.status}
              </button>
            </div>
            <div className="text-slate-400 text-sm">© {year} JURE. {t.footer.rights}</div>
          </div>
        </div>
      </footer>

      {/* Scoped animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(20px, -10px) scale(1.05); }
          66% { transform: translate(-10px, 10px) scale(0.98); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 12s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default About;
