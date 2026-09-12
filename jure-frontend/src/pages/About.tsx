// src/pages/About.tsx — company story in the same presentation language as Features.
import React from "react";
import { Link } from "react-router";
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
import { RouteSeo } from "@/marketing/Seo";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/features-deck.css";

type Lang = "fr" | "en" | "ar";

type AboutStrings = {
  hero: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust: string;
  };
  pillars: {
    titleA: string;
    titleB: string;
    note: string;
    mission: { title: string; desc: string };
    vision: { title: string; desc: string };
    values: { title: string; items: string[] };
  };
  impact: {
    titleA: string;
    titleB: string;
    note: string;
    items: { title: string; desc: string }[];
  };
  timeline: {
    titleA: string;
    titleB: string;
    note: string;
    items: { when: string; what: string }[];
  };
  team: {
    titleA: string;
    titleB: string;
    note: string;
    members: { name: string; role: string; initials: string; blurb: string }[];
  };
  cta: {
    title: string;
    subtitle: string;
    primary: string;
    secondary: string;
  };
};

const STRINGS: Record<Lang, AboutStrings> = {
  fr: {
    hero: {
      eyebrow: "À propos de JURE",
      titleA: "Nous construisons l'avenir du droit,",
      titleB: "avec et pour les juristes.",
      subtitle:
        "JURE est une plateforme legaltech centrée sur l'exigence métier : IA responsable, gestion de dossiers fluide et collaboration sécurisée pour des cabinets modernes.",
      ctaPrimary: "Parler à l'équipe",
      ctaSecondary: "Explorer les fonctionnalités",
      trust: "Privacy-first • Contrôle d'accès • Traçabilité",
    },
    pillars: {
      titleA: "Ce qui nous",
      titleB: "guide.",
      note: "Mission, vision et valeurs — le cadre qui oriente chaque décision produit.",
      mission: {
        title: "Notre mission",
        desc: "Accélérer la pratique juridique sans compromis sur la qualité, l'éthique et la confidentialité.",
      },
      vision: {
        title: "Notre vision",
        desc: "Une pratique augmentée par l'IA, centrée sur l'humain, accessible à tous les cabinets.",
      },
      values: {
        title: "Nos valeurs",
        items: [
          "Intégrité & exigence",
          "Innovation responsable",
          "Impact métier mesurable",
          "Privacy-by-design",
          "Humain-dans-la-boucle",
        ],
      },
    },
    impact: {
      titleA: "Ce qui nous",
      titleB: "distingue.",
      note: "Des choix concrets pour accélérer le travail juridique sans sacrifier la confiance.",
      items: [
        {
          title: "IA juridique pragmatique",
          desc: "Recherche, analyse et rédaction assistée, adaptées au terrain.",
        },
        {
          title: "Sécurité & conformité",
          desc: "Chiffrement, rôles, journaux, bonnes pratiques conformes.",
        },
        {
          title: "Collaboration efficace",
          desc: "Espaces d'équipe, checklists, tâches et partages maîtrisés.",
        },
        {
          title: "Connaissance vivante",
          desc: "Bibliothèque enrichie, recherche sémantique et références.",
        },
      ],
    },
    timeline: {
      titleA: "Notre",
      titleB: "trajectoire.",
      note: "De l'idéation aux pilotes — les étapes qui ont façonné la plateforme.",
      items: [
        { when: "2023", what: "Idéation & cadrage : premiers prototypes et entretiens utilisateurs." },
        { when: "2024", what: "MVP orienté dossiers & IA responsable, pilotes avec des cabinets." },
        { when: "2025", what: "Beta améliorée, multilingue (FR/EN/AR), montée en robustesse & sécurité." },
      ],
    },
    team: {
      titleA: "Équipe",
      titleB: "& leadership.",
      note: "Une équipe pluridisciplinaire au croisement droit, produit et ingénierie.",
      members: [
        {
          name: "Ayoub Hammady",
          role: "Fondateur & Legal-Tech Lead",
          initials: "AH",
          blurb: "Focalisé sur des solutions concrètes, du discovery au déploiement sécurisé.",
        },
        {
          name: "Product & Eng Team",
          role: "Produit • Front/Back • IA",
          initials: "PE",
          blurb: "Focalisé sur des solutions concrètes, du discovery au déploiement sécurisé.",
        },
        {
          name: "Advisory Circle",
          role: "Conformité • Méthodo • Marché",
          initials: "AC",
          blurb: "Focalisé sur des solutions concrètes, du discovery au déploiement sécurisé.",
        },
      ],
    },
    cta: {
      title: "Prêt à transformer votre pratique ?",
      subtitle: "Discutons de vos cas d'usage et de vos priorités.",
      primary: "Nous contacter",
      secondary: "Explorer les fonctionnalités",
    },
  },

  en: {
    hero: {
      eyebrow: "About JURE",
      titleA: "We're building the future of law,",
      titleB: "with and for legal teams.",
      subtitle:
        "JURE is a legaltech platform obsessed with real-world outcomes: responsible AI, streamlined matter management, and secure collaboration for modern firms.",
      ctaPrimary: "Talk to the team",
      ctaSecondary: "Explore features",
      trust: "Privacy-first • Access control • Auditability",
    },
    pillars: {
      titleA: "What",
      titleB: "guides us.",
      note: "Mission, vision, and values — the frame behind every product decision.",
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
        items: [
          "Integrity & rigor",
          "Responsible innovation",
          "Measurable impact",
          "Privacy-by-design",
          "Human-in-the-loop",
        ],
      },
    },
    impact: {
      titleA: "What sets",
      titleB: "us apart.",
      note: "Concrete choices that accelerate legal work without trading away trust.",
      items: [
        {
          title: "Pragmatic legal AI",
          desc: "Research, analysis, and assisted drafting built for the field.",
        },
        {
          title: "Security & compliance",
          desc: "Encryption, roles, logs, and sound compliance practices.",
        },
        {
          title: "Effective collaboration",
          desc: "Team spaces, checklists, tasks, and controlled sharing.",
        },
        {
          title: "Living knowledge",
          desc: "Enriched library, semantic search, and references.",
        },
      ],
    },
    timeline: {
      titleA: "Our",
      titleB: "journey.",
      note: "From ideation to pilots — the milestones that shaped the platform.",
      items: [
        { when: "2023", what: "Ideation & scoping: early prototypes and user interviews." },
        { when: "2024", what: "MVP with responsible AI & matters, piloted with firms." },
        { when: "2025", what: "Improved beta, multilingual (FR/EN/AR), stronger security & robustness." },
      ],
    },
    team: {
      titleA: "Team",
      titleB: "& leadership.",
      note: "A cross-disciplinary crew at the intersection of law, product, and engineering.",
      members: [
        {
          name: "Ayoub Hammady",
          role: "Founder & Legal-Tech Lead",
          initials: "AH",
          blurb: "Focused on real outcomes, from discovery to secure deployment.",
        },
        {
          name: "Product & Eng Team",
          role: "Product • Front/Back • AI",
          initials: "PE",
          blurb: "Focused on real outcomes, from discovery to secure deployment.",
        },
        {
          name: "Advisory Circle",
          role: "Compliance • Method • Market",
          initials: "AC",
          blurb: "Focused on real outcomes, from discovery to secure deployment.",
        },
      ],
    },
    cta: {
      title: "Ready to transform your practice?",
      subtitle: "Let's discuss your use cases and priorities.",
      primary: "Contact us",
      secondary: "Explore features",
    },
  },

  ar: {
    hero: {
      eyebrow: "حول JURE",
      titleA: "نبني مستقبل القانون،",
      titleB: "مع الفرق القانونية ومن أجلها.",
      subtitle:
        "JURE منصة قانونية تركز على النتائج الواقعية: ذكاء اصطناعي مسؤول، إدارة قضايا مبسطة، وتعاون آمن للمكاتب الحديثة.",
      ctaPrimary: "تحدث مع الفريق",
      ctaSecondary: "استكشف الميزات",
      trust: "خصوصية أولاً • تحكم بالصلاحيات • قابلية التدقيق",
    },
    pillars: {
      titleA: "ما",
      titleB: "يوجّهنا.",
      note: "المهمة والرؤية والقيم — الإطار الذي يقود كل قرار في المنتج.",
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
      titleA: "ما",
      titleB: "يميزنا.",
      note: "خيارات عملية لتسريع العمل القانوني دون التفريط في الثقة.",
      items: [
        { title: "ذكاء قانوني عملي", desc: "بحث وتحليل وصياغة مدعومة مصممة للواقع العملي." },
        { title: "الأمن والامتثال", desc: "تشفير، أدوار، سجلات، وممارسات امتثال راسخة." },
        { title: "تعاون فعال", desc: "مساحات فرق وقوائم مهام ومشاركة مضبوطة." },
        { title: "معرفة حية", desc: "مكتبة غنية وبحث دلالي ومراجع." },
      ],
    },
    timeline: {
      titleA: "رحلتنا",
      titleB: "حتى الآن.",
      note: "من الفكرة إلى التجارب — المحطات التي شكّلت المنصة.",
      items: [
        { when: "2023", what: "فكرة وتحديد النطاق: نماذج أولية ومقابلات مستخدمين." },
        { when: "2024", what: "نسخة أولية مع ذكاء مسؤول وإدارة قضايا، تجارب مع مكاتب." },
        { when: "2025", what: "نسخة تجريبية مطورة، متعددة اللغات (FR/EN/AR)، أمان ومتانة أعلى." },
      ],
    },
    team: {
      titleA: "الفريق",
      titleB: "والقيادة.",
      note: "فريق متعدد التخصصات يجمع القانون والمنتج والهندسة.",
      members: [
        {
          name: "أيوب حمادي",
          role: "المؤسس وقائد الحلول القانونية التقنية",
          initials: "أح",
          blurb: "يركز على النتائج الواقعية من الاستكشاف إلى النشر الآمن.",
        },
        {
          name: "فريق المنتج والهندسة",
          role: "منتج • واجهات/خلفية • ذكاء اصطناعي",
          initials: "فه",
          blurb: "يركز على النتائج الواقعية من الاستكشاف إلى النشر الآمن.",
        },
        {
          name: "دائرة استشارية",
          role: "امتثال • منهجيات • سوق",
          initials: "دس",
          blurb: "يركز على النتائج الواقعية من الاستكشاف إلى النشر الآمن.",
        },
      ],
    },
    cta: {
      title: "جاهز لتحويل ممارستك؟",
      subtitle: "دعنا نناقش حالات الاستخدام والأولويات لديك.",
      primary: "تواصل معنا",
      secondary: "استكشف الميزات",
    },
  },
};

const IMPACT_ICONS = [BookOpen, Shield, Users, Award];
const IMPACT_TONES = ["dark", "mist", "photo", "accent"] as const;

const About: React.FC = () => {
  const { lang, dir, path } = useMarketingLang();
  const t = STRINGS[lang];
  const pills = t.hero.trust.split("•").map((s) => s.trim()).filter(Boolean);

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="about">
      <RouteSeo routeKey="about" lang={lang} />
      <div className="features-deck about-deck">
        <div className="features-orbs" aria-hidden>
          <span className="features-orb features-orb--a" />
          <span className="features-orb features-orb--b" />
          <span className="features-orb features-orb--c" />
          <span className="features-orb features-orb--d" />
        </div>

        <section className="features-hero">
          <div className="features-deck__inner">
            <p className="features-hero__kicker">{t.hero.eyebrow}</p>
            <h1 className="features-hero__title about-hero__title">
              {t.hero.titleA} <em>{t.hero.titleB}</em>
            </h1>
            <p className="features-hero__lead">{t.hero.subtitle}</p>
            <div className="features-hero__actions">
              <Link
                to={path("contact")}
                className="features-btn features-btn--dark"
                onClick={() => track(MarketingEvents.ContactCta, { source: "about_hero", lang })}
              >
                {t.hero.ctaPrimary}
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Link>
              <Link
                to={path("features")}
                className="features-btn features-btn--ghost"
                onClick={() => track(MarketingEvents.SitelinkClick, { source: "about_hero", lang, target: "features" })}
              >
                {t.hero.ctaSecondary}
              </Link>
            </div>
            <div className="features-hero__pills">
              {pills.map((pill) => (
                <span key={pill} className="features-pill">
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="features-block">
          <div className="features-deck__inner">
            <Reveal>
              <div className="features-block__head">
                <h2 className="features-block__title">
                  {t.pillars.titleA} <em>{t.pillars.titleB}</em>
                </h2>
                <p className="features-block__lead">{t.pillars.note}</p>
              </div>
            </Reveal>
            <div className="about-pillars">
              <Reveal delay={0}>
                <article className="about-panel about-panel--dark">
                  <div className="about-panel__icon">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="about-panel__title">{t.pillars.mission.title}</h3>
                  <p className="about-panel__desc">{t.pillars.mission.desc}</p>
                </article>
              </Reveal>
              <Reveal delay={0.06}>
                <article className="about-panel about-panel--mist">
                  <div className="about-panel__icon">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="about-panel__title">{t.pillars.vision.title}</h3>
                  <p className="about-panel__desc">{t.pillars.vision.desc}</p>
                </article>
              </Reveal>
              <Reveal delay={0.12}>
                <article className="about-panel about-panel--accent">
                  <div className="about-panel__icon">
                    <Heart className="w-5 h-5" />
                  </div>
                  <h3 className="about-panel__title">{t.pillars.values.title}</h3>
                  <ul className="about-panel__list">
                    {t.pillars.values.items.map((v) => (
                      <li key={v}>
                        <Check className="w-4 h-4 shrink-0" />
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="features-block">
          <div className="features-deck__inner">
            <Reveal>
              <div className="features-block__head">
                <h2 className="features-block__title">
                  {t.impact.titleA} <em>{t.impact.titleB}</em>
                </h2>
                <p className="features-block__lead">{t.impact.note}</p>
              </div>
            </Reveal>
            <div className="about-impact">
              {t.impact.items.map((item, idx) => {
                const Icon = IMPACT_ICONS[idx] ?? Award;
                const tone = IMPACT_TONES[idx] ?? "dark";
                return (
                  <Reveal key={item.title} delay={idx * 0.04}>
                    <article className={`about-panel about-panel--${tone}`}>
                      <div className="about-panel__icon">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="about-panel__title">{item.title}</h3>
                      <p className="about-panel__desc">{item.desc}</p>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="features-block">
          <div className="features-deck__inner">
            <Reveal>
              <div className="features-block__head">
                <h2 className="features-block__title">
                  {t.timeline.titleA} <em>{t.timeline.titleB}</em>
                </h2>
                <p className="features-block__lead">{t.timeline.note}</p>
              </div>
            </Reveal>
            <div className="about-timeline">
              {t.timeline.items.map((step, i) => (
                <Reveal key={step.when} delay={i * 0.05}>
                  <article className="about-timeline__item">
                    <span className="about-timeline__index">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="about-timeline__when">{step.when}</h3>
                      <p className="about-timeline__what">{step.what}</p>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="features-block">
          <div className="features-deck__inner">
            <Reveal>
              <div className="features-block__head">
                <h2 className="features-block__title">
                  {t.team.titleA} <em>{t.team.titleB}</em>
                </h2>
                <p className="features-block__lead">{t.team.note}</p>
              </div>
            </Reveal>
            <div className="about-team">
              {t.team.members.map((m, i) => (
                <Reveal key={m.name} delay={i * 0.05}>
                  <article className="about-panel about-panel--mist">
                    <div className="about-team__head">
                      <span className="about-team__avatar" aria-hidden>
                        {m.initials}
                      </span>
                      <div>
                        <h3 className="about-panel__title">{m.name}</h3>
                        <p className="about-team__role">{m.role}</p>
                      </div>
                    </div>
                    <p className="about-panel__desc">{m.blurb}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="features-close">
          <div className="features-deck__inner">
            <h2 className="features-close__title">{t.cta.title}</h2>
            <p className="features-close__lead">{t.cta.subtitle}</p>
            <div className="features-close__actions">
              <Link
                to={path("contact")}
                className="features-btn features-btn--dark"
                onClick={() => track(MarketingEvents.ContactCta, { source: "about_final", lang })}
              >
                {t.cta.primary}
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Link>
              <Link
                to={path("features")}
                className="features-btn features-btn--ghost"
                onClick={() => track(MarketingEvents.SitelinkClick, { source: "about_final", lang, target: "features" })}
              >
                {t.cta.secondary}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
};

export default About;
