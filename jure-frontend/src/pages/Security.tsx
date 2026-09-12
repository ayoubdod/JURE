// src/pages/Security.tsx — honest security page in the Features / About deck language.
import React from "react";
import { Link } from "react-router";
import {
  Shield,
  ShieldCheck,
  Building2,
  KeyRound,
  RefreshCw,
  MailCheck,
  Lock,
  Globe,
  Landmark,
  FileClock,
  Database,
  Fingerprint,
  Archive,
  UserCheck,
  Eye,
  ArrowRight,
} from "lucide-react";
import MarketingShell from "@/components/landing/MarketingShell";
import Reveal from "@/components/landing/Reveal";
import { useMarketingLang } from "@/marketing/MarketingLocale";
import { RouteSeo } from "@/marketing/Seo";
import { track, MarketingEvents } from "@/lib/analytics";
import "@/components/landing/features-deck.css";

type Lang = "fr" | "en" | "ar";

type SecurityItem = { title: string; desc: string };

type SecurityStrings = {
  hero: { titleA: string; titleB: string; note: string };
  available: { titleA: string; titleB: string; note: string; items: SecurityItem[] };
  roadmap: { titleA: string; titleB: string; note: string; items: SecurityItem[] };
  principles: { titleA: string; titleB: string; note: string; items: SecurityItem[] };
  cta: { title: string; subtitle: string; primary: string; secondary: string };
};

const STRINGS: Record<Lang, SecurityStrings> = {
  fr: {
    hero: {
      titleA: "Conçu pour le travail juridique",
      titleB: "confidentiel.",
      note:
        "La confidentialité est le fondement de la pratique juridique. Plutôt que d'empiler des promesses, nous décrivons précisément les protections en place aujourd'hui — et celles sur lesquelles nous travaillons.",
    },
    available: {
      titleA: "Disponible",
      titleB: "aujourd'hui.",
      note: "Les contrôles réellement en place dans la plateforme, dès maintenant.",
      items: [
        {
          title: "Isolation des données par cabinet",
          desc: "Chaque requête à l'API est limitée aux données du cabinet de l'utilisateur connecté.",
        },
        {
          title: "Contrôle d'accès par rôles",
          desc: "Six rôles — Propriétaire, Admin, Manager, Avocat, Assistant, Lecteur — avec des codes de permission granulaires.",
        },
        {
          title: "Sessions authentifiées par JWT",
          desc: "Rotation des jetons d'accès et mise en liste noire des jetons de rafraîchissement.",
        },
        {
          title: "Vérification d'e-mail obligatoire",
          desc: "Chaque nouveau compte doit confirmer son adresse e-mail à l'inscription.",
        },
        {
          title: "Politiques de mots de passe",
          desc: "Règles de validation des mots de passe appliquées côté serveur (Django).",
        },
        {
          title: "Liste blanche des origines CORS",
          desc: "Seules les origines explicitement autorisées peuvent appeler l'API.",
        },
        {
          title: "TLS en transit",
          desc: "Redirection HTTPS et HSTS activés en production.",
        },
        {
          title: "Module finance restreint",
          desc: "La finance du cabinet n'est accessible qu'aux rôles Propriétaire et Admin.",
        },
      ],
    },
    roadmap: {
      titleA: "Sur notre",
      titleB: "feuille de route.",
      note:
        "Ces contrôles sont planifiés mais pas encore livrés. Nous publions nos avancées en toute transparence, sans les présenter comme acquises.",
      items: [
        { title: "Journaux d'audit", desc: "Traçabilité de qui a consulté ou modifié quoi." },
        { title: "Chiffrement au repos", desc: "Chiffrement des données stockées, au-delà du TLS en transit." },
        { title: "SSO / SAML", desc: "Connexion via votre fournisseur d'identité." },
        { title: "Contrôles de rétention", desc: "Politiques de conservation et de suppression des données." },
      ],
    },
    principles: {
      titleA: "Nos",
      titleB: "principes.",
      note: "Les règles qui guident chaque décision de sécurité produit.",
      items: [
        { title: "Moindre privilège", desc: "Chacun n'accède qu'à ce dont son rôle a besoin." },
        { title: "Isolation par défaut", desc: "Les données de chaque cabinet sont cloisonnées dès la conception." },
        { title: "Relecture humaine de l'IA", desc: "Les résultats de l'IA sont destinés à être validés par un avocat." },
        { title: "Transparence", desc: "Nous disons ce qui est en place — et ce qui ne l'est pas encore." },
      ],
    },
    cta: {
      title: "Des questions sur la sécurité ?",
      subtitle: "Notre équipe peut vous présenter les contrôles en place et la feuille de route.",
      primary: "Parler à l'équipe",
      secondary: "Voir les fonctionnalités",
    },
  },
  en: {
    hero: {
      titleA: "Built for confidential",
      titleB: "legal work.",
      note:
        "Confidentiality is the foundation of legal practice. Instead of stacking up checkbox claims, we describe exactly which protections are in place today — and which ones we're working on.",
    },
    available: {
      titleA: "Available",
      titleB: "today.",
      note: "The controls that are actually live in the platform, right now.",
      items: [
        {
          title: "Per-firm data isolation",
          desc: "Every API query is scoped to the signed-in user's firm.",
        },
        {
          title: "Role-based access control",
          desc: "Six roles — Owner, Admin, Manager, Lawyer, Assistant, Viewer — with granular permission codes.",
        },
        {
          title: "JWT-authenticated sessions",
          desc: "Access-token rotation and refresh-token blacklisting.",
        },
        {
          title: "Mandatory email verification",
          desc: "Every new account must confirm its email address on signup.",
        },
        {
          title: "Password validation policies",
          desc: "Server-side password rules enforced by Django.",
        },
        {
          title: "CORS origin allowlisting",
          desc: "Only explicitly allowed origins can call the API.",
        },
        {
          title: "TLS in transit",
          desc: "HTTPS redirect and HSTS enabled in production.",
        },
        {
          title: "Restricted finance module",
          desc: "Practice finance is only accessible to Owner and Admin roles.",
        },
      ],
    },
    roadmap: {
      titleA: "On our",
      titleB: "roadmap.",
      note:
        "These controls are planned but not shipped yet. We publish our progress transparently instead of presenting them as done.",
      items: [
        { title: "Audit trails", desc: "A record of who viewed or changed what." },
        { title: "Encryption at rest", desc: "Encrypting stored data, beyond TLS in transit." },
        { title: "SSO / SAML", desc: "Sign-in through your identity provider." },
        { title: "Data retention controls", desc: "Policies for how long data is kept and when it's deleted." },
      ],
    },
    principles: {
      titleA: "Our",
      titleB: "principles.",
      note: "The rules that guide every product security decision.",
      items: [
        { title: "Least privilege", desc: "People only access what their role requires." },
        { title: "Isolation by default", desc: "Each firm's data is separated by design." },
        { title: "Human review of AI output", desc: "AI results are meant to be reviewed by a lawyer." },
        { title: "Transparency", desc: "We say what's in place — and what isn't yet." },
      ],
    },
    cta: {
      title: "Questions about security?",
      subtitle: "Our team can walk you through the controls in place and the roadmap.",
      primary: "Talk to the team",
      secondary: "Explore features",
    },
  },
  ar: {
    hero: {
      titleA: "مصمم للعمل القانوني",
      titleB: "السري.",
      note:
        "السرية هي أساس الممارسة القانونية. بدلا من تكديس الادعاءات، نوضح بدقة ما هي الحمايات المتوفرة اليوم — وما الذي نعمل عليه.",
    },
    available: {
      titleA: "متاح",
      titleB: "اليوم.",
      note: "الضوابط المفعلة فعليا في المنصة الآن.",
      items: [
        {
          title: "عزل بيانات كل مكتب",
          desc: "كل استعلام إلى الواجهة البرمجية محصور في بيانات مكتب المستخدم المسجل.",
        },
        {
          title: "تحكم في الوصول حسب الأدوار",
          desc: "ستة أدوار — مالك، مدير النظام، مدير، محام، مساعد، مطلع — مع صلاحيات دقيقة.",
        },
        {
          title: "جلسات موثقة عبر JWT",
          desc: "تدوير رموز الوصول وإدراج رموز التحديث في قائمة الحظر.",
        },
        {
          title: "تحقق إلزامي من البريد الإلكتروني",
          desc: "يجب على كل حساب جديد تأكيد بريده الإلكتروني عند التسجيل.",
        },
        {
          title: "سياسات التحقق من كلمات المرور",
          desc: "قواعد كلمات مرور مطبقة على الخادم (Django).",
        },
        {
          title: "قائمة سماح لأصول CORS",
          desc: "لا يمكن استدعاء الواجهة البرمجية إلا من الأصول المسموح بها صراحة.",
        },
        {
          title: "تشفير TLS أثناء النقل",
          desc: "إعادة توجيه HTTPS وتفعيل HSTS في بيئة الإنتاج.",
        },
        {
          title: "وحدة مالية مقيدة",
          desc: "مالية المكتب متاحة فقط لدوري المالك ومدير النظام.",
        },
      ],
    },
    roadmap: {
      titleA: "على",
      titleB: "خارطة الطريق.",
      note:
        "هذه الضوابط مخطط لها لكنها لم تطلق بعد. ننشر تقدمنا بشفافية بدلا من تقديمها كأمر منجز.",
      items: [
        { title: "سجلات التدقيق", desc: "سجل لمن اطلع على ماذا أو عدله." },
        { title: "التشفير في التخزين", desc: "تشفير البيانات المخزنة، إضافة إلى TLS أثناء النقل." },
        { title: "SSO / SAML", desc: "تسجيل الدخول عبر مزود الهوية الخاص بكم." },
        { title: "ضوابط الاحتفاظ بالبيانات", desc: "سياسات لمدة الاحتفاظ بالبيانات وتوقيت حذفها." },
      ],
    },
    principles: {
      titleA: "مبادئنا",
      titleB: "الأساسية.",
      note: "القواعد التي توجه كل قرار أمني في المنتج.",
      items: [
        { title: "الحد الأدنى من الصلاحيات", desc: "لا يصل أحد إلا إلى ما يتطلبه دوره." },
        { title: "العزل افتراضيا", desc: "بيانات كل مكتب مفصولة بحكم التصميم." },
        { title: "مراجعة بشرية لمخرجات الذكاء الاصطناعي", desc: "نتائج الذكاء الاصطناعي مخصصة لمراجعة المحامي." },
        { title: "الشفافية", desc: "نقول ما هو متوفر — وما ليس متوفرا بعد." },
      ],
    },
    cta: {
      title: "أسئلة حول الأمان؟",
      subtitle: "يمكن لفريقنا شرح الضوابط المعمول بها وخارطة الطريق.",
      primary: "تحدث إلى الفريق",
      secondary: "استكشف الميزات",
    },
  },
};

const AVAILABLE_ICONS = [Building2, KeyRound, RefreshCw, MailCheck, Lock, Globe, ShieldCheck, Landmark];
const ROADMAP_ICONS = [FileClock, Database, Fingerprint, Archive];
const PRINCIPLE_ICONS = [KeyRound, Building2, UserCheck, Eye];
const PANEL_TONES = ["dark", "mist", "photo", "accent"] as const;

const Security: React.FC = () => {
  const { lang, dir, path } = useMarketingLang();
  const t = STRINGS[lang];

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="security">
      <RouteSeo routeKey="security" lang={lang} />
      <div className="features-deck security-deck">
        <div className="features-orbs" aria-hidden>
          <span className="features-orb features-orb--a" />
          <span className="features-orb features-orb--b" />
          <span className="features-orb features-orb--c" />
          <span className="features-orb features-orb--d" />
        </div>

        <section className="features-hero">
          <div className="features-deck__inner">
            <h1 className="features-hero__title security-hero__title">
              {t.hero.titleA} <em>{t.hero.titleB}</em>
            </h1>
            <p className="features-hero__lead">{t.hero.note}</p>
          </div>
        </section>

        <section className="features-block">
          <div className="features-deck__inner">
            <Reveal>
              <div className="features-block__head">
                <h2 className="features-block__title">
                  {t.available.titleA} <em>{t.available.titleB}</em>
                </h2>
                <p className="features-block__lead">{t.available.note}</p>
              </div>
            </Reveal>
            <div className="security-grid security-grid--8">
              {t.available.items.map((item, i) => {
                const Icon = AVAILABLE_ICONS[i] ?? Shield;
                const tone = PANEL_TONES[i % PANEL_TONES.length];
                return (
                  <Reveal key={item.title} delay={i * 0.03}>
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
                  {t.roadmap.titleA} <em>{t.roadmap.titleB}</em>
                </h2>
                <p className="features-block__lead">{t.roadmap.note}</p>
              </div>
            </Reveal>
            <div className="security-grid security-grid--4">
              {t.roadmap.items.map((item, i) => {
                const Icon = ROADMAP_ICONS[i] ?? FileClock;
                return (
                  <Reveal key={item.title} delay={i * 0.04}>
                    <article className="about-panel about-panel--mist security-roadmap-card">
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
                  {t.principles.titleA} <em>{t.principles.titleB}</em>
                </h2>
                <p className="features-block__lead">{t.principles.note}</p>
              </div>
            </Reveal>
            <div className="security-grid security-grid--4">
              {t.principles.items.map((item, i) => {
                const Icon = PRINCIPLE_ICONS[i] ?? Shield;
                const tone = PANEL_TONES[i % PANEL_TONES.length];
                return (
                  <Reveal key={item.title} delay={i * 0.04}>
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

        <section className="features-close">
          <div className="features-deck__inner">
            <h2 className="features-close__title">{t.cta.title}</h2>
            <p className="features-close__lead">{t.cta.subtitle}</p>
            <div className="features-close__actions">
              <Link
                to={path("contact")}
                className="features-btn features-btn--dark"
                onClick={() => track(MarketingEvents.SecurityCta, { source: "security_final", lang })}
              >
                {t.cta.primary}
                <ArrowRight className="w-4 h-4 ms-2 rtl:rotate-180" />
              </Link>
              <Link
                to={path("features")}
                className="features-btn features-btn--ghost"
                onClick={() =>
                  track(MarketingEvents.SitelinkClick, { source: "security_final", lang, target: "features" })
                }
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

export default Security;
