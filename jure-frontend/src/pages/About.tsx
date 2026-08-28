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
import { RouteSeo } from "@/marketing/Seo";

/**
 * About Page
 * - Shared MarketingShell (nav / lang / theme / footer)
 * - Visual language aligned with Landing (glass, reveal, brand #A58CF4)
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
  <div className="w-14 h-14 rounded-full grid place-items-center text-white font-semibold shrink-0 bg-[#64499D] dark:bg-white dark:text-[#64499D]">
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
  const impactAccents = ["#A58CF4", "#4D3680", "#3E2D71", "#A58CF4"];

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
      <RouteSeo routeKey="about" lang={lang} />
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-12 md:pt-24 md:pb-20">
        <Reveal className="text-center max-w-4xl mx-auto min-w-0">
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight break-words text-[#64499D] dark:text-white">
            {t.hero.titleA}
            <br />
            <span className="landing-hero-shimmer bg-gradient-to-r from-[#A58CF4] via-[#C4B0EF] to-[#A58CF4] bg-clip-text text-transparent">
              {t.hero.titleB}
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg md:text-xl text-neutral-600 dark:text-neutral-300 leading-relaxed break-words">
            {t.hero.subtitle}
          </p>

          <div
            className={`mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto ${
              isRtl ? "sm:flex-row-reverse" : ""
            }`}
          >
            <Button
              onClick={() => go("/contact")}
              size="lg"
              className="landing-cta-btn landing-btn-primary w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium"
            >
              {t.hero.ctaContact}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
            <Button
              onClick={() => go("/demo")}
              variant="outline"
              size="lg"
              className="landing-btn-secondary w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg"
            >
              {t.hero.ctaDemo}
            </Button>
          </div>

          <p className="mt-6 text-sm text-neutral-500">{t.hero.trustLine}</p>
        </Reveal>

        {/* Pillars */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          <Reveal delay={0}>
            <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-7 h-full min-w-0 group">
              <div className="landing-icon w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-2 break-words">
                {t.pillars.mission.title}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed break-words">
                {t.pillars.mission.desc}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-7 h-full min-w-0 group">
              <div className="landing-icon w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-2 break-words">
                {t.pillars.vision.title}
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed break-words">
                {t.pillars.vision.desc}
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-7 h-full min-w-0 group">
              <div className="landing-icon w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-3 break-words">
                {t.pillars.values.title}
              </h3>
              <ul className="space-y-2 text-neutral-700 dark:text-neutral-300">
                {t.pillars.values.items.map((v: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[#A58CF4] dark:text-[#A58CF4] shrink-0 mt-0.5" />
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16 md:pb-20">
        <Reveal className="text-center mb-8 sm:mb-10 md:mb-14 min-w-0">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight break-words">
            {t.impact.title}
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {t.impact.items.map((it: { title: string; desc: string }, idx: number) => {
            const Icon = impactIcons[idx] || Award;
            return (
              <FeatureTile
                key={idx}
                icon={<Icon className="w-6 h-6" />}
                title={it.title}
                description={it.desc}
                accent={impactAccents[idx] || "#A58CF4"}
                delay={idx * 0.04}
              />
            );
          })}
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16 md:pb-20">
        <Reveal>
          <div className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-white overflow-hidden landing-band">
            <h2 className="relative font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-8 sm:mb-10 text-center break-words">
              {t.timeline.title}
            </h2>

            <div className={`relative flex flex-col md:flex-row ${dirClass} gap-8`}>
              {t.timeline.items.map((step: { when: string; what: string }, i: number) => (
                <div key={i} className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-white/10 border border-white/15">
                      <span className="text-lg font-semibold">{i + 1}</span>
                    </div>
                    <div className="font-display text-xl font-semibold">{step.when}</div>
                  </div>
                  <p className="mt-3 text-white/70 leading-relaxed">{step.what}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Team */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16 md:pb-24">
        <Reveal className="text-center max-w-3xl mx-auto min-w-0">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2 break-words">
            {t.team.title}
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300 break-words">{t.team.subtitle}</p>
        </Reveal>

        <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {t.team.members.map(
            (m: { name: string; role: string; initials: string }, i: number) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 h-full min-w-0">
                  <div className={`flex items-center gap-4 mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <AvatarCircle initials={m.initials} />
                    <div className={`min-w-0 ${isRtl ? "text-end" : "text-start"}`}>
                      <h3 className="font-display text-lg font-semibold tracking-tight break-words">{m.name}</h3>
                      <p className="text-sm text-neutral-500 break-words">{m.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <Reveal>
          <div className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-14 text-white overflow-hidden landing-band">
            <div className="relative text-center max-w-3xl mx-auto min-w-0">
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 break-words">
                {t.cta.title}
              </h3>
              <p className="text-white/70 text-base sm:text-lg break-words">{t.cta.subtitle}</p>

              <div
                className={`mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full sm:w-auto ${
                  isRtl ? "sm:flex-row-reverse" : ""
                }`}
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium landing-btn-on-dark"
                  onClick={() => go("/contact")}
                >
                  {t.cta.primary}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg font-medium landing-btn-ghost-dark"
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
