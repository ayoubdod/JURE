// src/pages/About.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
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
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import FeatureTile from "@/components/landing/FeatureTile";

/**
 * About Page
 * - Shared MarketingShell (nav / lang / theme / footer)
 * - Visual language aligned with Landing (glass, reveal, brand #64499D)
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

const AvatarCircle: React.FC<{ initials: string }> = ({ initials }) => (
  <div
    className="w-14 h-14 rounded-full grid place-items-center text-white font-semibold shrink-0"
    style={{
      background: "linear-gradient(135deg, #64499D 0%, #4D3680 50%, #3E2D71 100%)",
    }}
  >
    {initials}
  </div>
);

const About: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const isRtl = t.dir === "rtl";
  const dirClass = isRtl ? "md:flex-row-reverse" : "";

  const go = (to: string) => navigate(to);

  const impactIcons = [BookOpen, Shield, Users, Award];
  const impactAccents = ["#64499D", "#4D3680", "#3E2D71", "#8B6FD1"];

  return (
    <MarketingShell
      lang={lang}
      onLangChange={setLang}
      labels={{
        nav: { features: t.nav.features, about: t.nav.about, contact: t.nav.contact },
        auth: t.auth,
        themeToggle: t.themeToggle,
        footer: t.footer,
      }}
      dir={t.dir}
      activeNav="about"
    >
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-14 pb-12 md:pt-24 md:pb-20">
        <Reveal className="text-center max-w-4xl mx-auto">
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.titleA}
            </span>
            <br />
            <span className="relative inline-block mt-1">
              <span
                aria-hidden
                className="absolute inset-0 blur-2xl opacity-40 dark:opacity-50 bg-gradient-to-r from-[#64499D] to-[#8B6FD1]"
              />
              <span className="relative bg-gradient-to-r from-[#64499D] via-[#8B6FD1] to-[#4D3680] bg-clip-text text-transparent">
                {t.hero.titleB}
              </span>
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
            {t.hero.subtitle}
          </p>

          <div
            className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center ${
              isRtl ? "sm:flex-row-reverse" : ""
            }`}
          >
            <Button
              onClick={() => go("/contact")}
              size="lg"
              className="px-7 py-6 text-lg font-medium shadow-lg hover:shadow-[0_0_32px_-6px_rgba(100,73,157,0.55)] transition-shadow bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
            >
              {t.hero.ctaContact}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <Button
              onClick={() => go("/demo")}
              variant="outline"
              size="lg"
              className="px-7 py-6 text-lg border-[#64499D]/25 dark:border-[#8B6FD1]/30 text-slate-800 dark:text-slate-100 hover:bg-[#F4F1FF]/80 dark:hover:bg-[#64499D]/15 backdrop-blur-sm"
            >
              {t.hero.ctaDemo}
            </Button>
          </div>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t.hero.trustLine}</p>
        </Reveal>

        {/* Pillars */}
        <div className="mt-16 grid md:grid-cols-3 gap-5 md:gap-6">
          <Reveal delay={0}>
            <div className="landing-glass landing-glass-glow rounded-2xl p-7 h-full">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                style={{ background: "#64499D" }}
              >
                <Target className="w-6 h-6" />
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight mb-2">
                {t.pillars.mission.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.pillars.mission.desc}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="landing-glass landing-glass-glow rounded-2xl p-7 h-full">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                style={{ background: "#4D3680" }}
              >
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight mb-2">
                {t.pillars.vision.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {t.pillars.vision.desc}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="landing-glass landing-glass-glow rounded-2xl p-7 h-full">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                style={{ background: "#3E2D71" }}
              >
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-display text-2xl font-bold tracking-tight mb-3">
                {t.pillars.values.title}
              </h3>
              <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                {t.pillars.values.items.map((v: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1] shrink-0 mt-0.5" />
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="landing-divider mb-16 md:mb-20" aria-hidden />

      {/* Differentiators */}
      <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-20">
        <Reveal className="text-center mb-10 md:mb-14">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            {t.impact.title}
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {t.impact.items.map((it: { title: string; desc: string }, idx: number) => {
            const Icon = impactIcons[idx] || Award;
            return (
              <FeatureTile
                key={idx}
                icon={<Icon className="w-6 h-6" />}
                title={it.title}
                description={it.desc}
                accent={impactAccents[idx] || "#64499D"}
                delay={idx * 0.04}
              />
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-6xl mx-auto px-6 pb-16 md:pb-20">
        <Reveal>
          <div className="relative rounded-3xl p-8 md:p-12 text-white overflow-hidden landing-panel-glow bg-gradient-to-br from-slate-900 via-slate-900 to-[#2A1F4A]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(100,73,157,0.55), transparent), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(139,111,209,0.35), transparent)",
              }}
            />
            <h2 className="relative font-display text-3xl md:text-4xl font-bold tracking-tight mb-10 text-center">
              {t.timeline.title}
            </h2>

            <div className={`relative flex flex-col md:flex-row ${dirClass} gap-8`}>
              {t.timeline.items.map((step: { when: string; what: string }, i: number) => (
                <div key={i} className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-white/10 landing-glass border-0">
                      <span className="text-lg font-semibold">{i + 1}</span>
                    </div>
                    <div className="font-display text-xl font-semibold">{step.when}</div>
                  </div>
                  <p className="mt-3 text-slate-200 leading-relaxed">{step.what}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Team */}
      <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
        <Reveal className="text-center max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
            {t.team.title}
          </h2>
          <p className="text-slate-600 dark:text-slate-300">{t.team.subtitle}</p>
        </Reveal>

        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {t.team.members.map(
            (m: { name: string; role: string; initials: string }, i: number) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="landing-glass landing-glass-glow rounded-2xl p-6 h-full">
                  <div className={`flex items-center gap-4 mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <AvatarCircle initials={m.initials} />
                    <div className={isRtl ? "text-end" : "text-start"}>
                      <h3 className="font-display text-lg font-semibold tracking-tight">{m.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{m.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {lang === "fr" &&
                      "Focalisé sur des solutions concrètes, du discovery au déploiement sécurisé."}
                    {lang === "en" &&
                      "Focused on real outcomes, from discovery to secure deployment."}
                    {lang === "ar" && "يركز على النتائج الواقعية من الاستكشاف إلى النشر الآمن."}
                  </p>
                </div>
              </Reveal>
            )
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="relative rounded-3xl p-10 md:p-14 text-white overflow-hidden landing-panel-glow bg-gradient-to-br from-[#64499D] via-[#4D3680] to-[#3E2D71]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                maskImage: "radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)",
              }}
            />
            <div className="relative text-center max-w-3xl mx-auto">
              <h3 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
                {t.cta.title}
              </h3>
              <p className="text-purple-100 text-lg">{t.cta.subtitle}</p>

              <div
                className={`mt-8 flex flex-col sm:flex-row gap-4 justify-center ${
                  isRtl ? "sm:flex-row-reverse" : ""
                }`}
              >
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg font-medium bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
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
        </Reveal>
      </section>
    </MarketingShell>
  );
};

export default About;
