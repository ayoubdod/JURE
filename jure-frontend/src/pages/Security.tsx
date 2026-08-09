// src/pages/Security.tsx — honest security page: shipped controls vs. roadmap.
import React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
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

type Lang = "fr" | "en" | "ar";

type SecurityItem = { title: string; desc: string };

type SecurityStrings = {
  badge: string;
  hero: { title: string; intro: string };
  available: { title: string; subtitle: string; items: SecurityItem[] };
  roadmap: { title: string; note: string; items: SecurityItem[] };
  principles: { title: string; items: SecurityItem[] };
  cta: { title: string; subtitle: string; primary: string };
};

const STRINGS: Record<Lang, SecurityStrings> = {
  fr: {
    badge: "Sécurité",
    hero: {
      title: "Conçu pour le travail juridique confidentiel.",
      intro:
        "La confidentialité est le fondement de la pratique juridique. Plutôt que d'empiler des promesses, nous décrivons précisément les protections en place aujourd'hui — et celles sur lesquelles nous travaillons.",
    },
    available: {
      title: "Disponible aujourd'hui",
      subtitle: "Les contrôles réellement en place dans la plateforme, dès maintenant.",
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
      title: "Sur notre feuille de route",
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
      title: "Nos principes",
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
    },
  },
  en: {
    badge: "Security",
    hero: {
      title: "Built for confidential legal work.",
      intro:
        "Confidentiality is the foundation of legal practice. Instead of stacking up checkbox claims, we describe exactly which protections are in place today — and which ones we're working on.",
    },
    available: {
      title: "Available today",
      subtitle: "The controls that are actually live in the platform, right now.",
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
      title: "On our roadmap",
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
      title: "Our principles",
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
    },
  },
  ar: {
    badge: "الأمان",
    hero: {
      title: "مصمم للعمل القانوني السري.",
      intro:
        "السرية هي أساس الممارسة القانونية. بدلًا من تكديس الادعاءات، نوضح بدقة ما هي الحمايات المتوفرة اليوم — وما الذي نعمل عليه.",
    },
    available: {
      title: "متاح اليوم",
      subtitle: "الضوابط المفعّلة فعليًا في المنصة الآن.",
      items: [
        {
          title: "عزل بيانات كل مكتب",
          desc: "كل استعلام إلى الواجهة البرمجية محصور في بيانات مكتب المستخدم المسجّل.",
        },
        {
          title: "تحكم في الوصول حسب الأدوار",
          desc: "ستة أدوار — مالك، مدير النظام، مدير، محامٍ، مساعد، مطّلع — مع صلاحيات دقيقة.",
        },
        {
          title: "جلسات موثّقة عبر JWT",
          desc: "تدوير رموز الوصول وإدراج رموز التحديث في قائمة الحظر.",
        },
        {
          title: "تحقق إلزامي من البريد الإلكتروني",
          desc: "يجب على كل حساب جديد تأكيد بريده الإلكتروني عند التسجيل.",
        },
        {
          title: "سياسات التحقق من كلمات المرور",
          desc: "قواعد كلمات مرور مطبّقة على الخادم (Django).",
        },
        {
          title: "قائمة سماح لأصول CORS",
          desc: "لا يمكن استدعاء الواجهة البرمجية إلا من الأصول المسموح بها صراحةً.",
        },
        {
          title: "تشفير TLS أثناء النقل",
          desc: "إعادة توجيه HTTPS وتفعيل HSTS في بيئة الإنتاج.",
        },
        {
          title: "وحدة مالية مقيّدة",
          desc: "مالية المكتب متاحة فقط لدوري المالك ومدير النظام.",
        },
      ],
    },
    roadmap: {
      title: "على خارطة الطريق",
      note:
        "هذه الضوابط مخطط لها لكنها لم تُطلق بعد. ننشر تقدمنا بشفافية بدلًا من تقديمها كأمر منجز.",
      items: [
        { title: "سجلات التدقيق", desc: "سجل لمن اطّلع على ماذا أو عدّله." },
        { title: "التشفير في التخزين", desc: "تشفير البيانات المخزّنة، إضافةً إلى TLS أثناء النقل." },
        { title: "SSO / SAML", desc: "تسجيل الدخول عبر مزوّد الهوية الخاص بكم." },
        { title: "ضوابط الاحتفاظ بالبيانات", desc: "سياسات لمدة الاحتفاظ بالبيانات وتوقيت حذفها." },
      ],
    },
    principles: {
      title: "مبادئنا",
      items: [
        { title: "الحد الأدنى من الصلاحيات", desc: "لا يصل أحد إلا إلى ما يتطلبه دوره." },
        { title: "العزل افتراضيًا", desc: "بيانات كل مكتب مفصولة بحكم التصميم." },
        { title: "مراجعة بشرية لمخرجات الذكاء الاصطناعي", desc: "نتائج الذكاء الاصطناعي مخصصة لمراجعة المحامي." },
        { title: "الشفافية", desc: "نقول ما هو متوفر — وما ليس متوفرًا بعد." },
      ],
    },
    cta: {
      title: "أسئلة حول الأمان؟",
      subtitle: "يمكن لفريقنا شرح الضوابط المعمول بها وخارطة الطريق.",
      primary: "تحدث إلى الفريق",
    },
  },
};

const AVAILABLE_ICONS = [Building2, KeyRound, RefreshCw, MailCheck, Lock, Globe, ShieldCheck, Landmark];
const ROADMAP_ICONS = [FileClock, Database, Fingerprint, Archive];
const PRINCIPLE_ICONS = [KeyRound, Building2, UserCheck, Eye];
const ACCENTS = ["#64499D", "#4D3680", "#3E2D71", "#8B6FD1"];

const Security: React.FC = () => {
  const navigate = useNavigate();
  const { lang, dir, path } = useMarketingLang();
  const t = STRINGS[lang];
  const isRtl = dir === "rtl";

  return (
    <MarketingShell lang={lang} onLangChange={() => {}} dir={dir} activeNav="security">
      <RouteSeo routeKey="security" lang={lang} />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-10 sm:pb-12 md:pt-20 md:pb-16">
        <Reveal className="text-center max-w-3xl mx-auto min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full landing-glass text-xs font-medium text-[#64499D] dark:text-[#CFC2FF] mb-6">
            <Shield className="w-3.5 h-3.5" />
            {t.badge}
          </div>
          <h1 className="font-display text-[2rem] leading-[1.15] sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight break-words">
            <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
              {t.hero.title}
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed break-words">
            {t.hero.intro}
          </p>
        </Reveal>
      </section>

      <div className="landing-divider mb-12" aria-hidden />

      {/* Available today */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold break-words">{t.available.title}</h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 break-words">
            {t.available.subtitle}
          </p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {t.available.items.map((item, i) => {
            const Icon = AVAILABLE_ICONS[i] || Shield;
            const accent = ACCENTS[i % ACCENTS.length];
            return (
              <Reveal key={item.title} delay={i * 0.04}>
                <div className={`landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 h-full min-w-0 ${isRtl ? "text-right" : "text-start"}`}>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white mb-4"
                    style={{ background: accent }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2 break-words">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed break-words">{item.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Roadmap */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16">
        <Reveal>
          <div className={`landing-glass rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 min-w-0 ${isRtl ? "text-right" : "text-start"}`}>
            <div className="flex items-center gap-3 mb-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#64499D] to-[#4D3680] flex items-center justify-center text-white shrink-0">
                <FileClock className="w-6 h-6" />
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold break-words">{t.roadmap.title}</h2>
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-6 break-words">{t.roadmap.note}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {t.roadmap.items.map((item, i) => {
                const Icon = ROADMAP_ICONS[i] || FileClock;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-xl border border-dashed border-[#64499D]/30 dark:border-[#8B6FD1]/30 p-4 min-w-0"
                  >
                    <Icon className="w-5 h-5 text-[#64499D] dark:text-[#8B6FD1] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm sm:text-base break-words">{item.title}</div>
                      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed break-words">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Principles */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14 sm:pb-16">
        <Reveal className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold break-words">{t.principles.title}</h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {t.principles.items.map((item, i) => {
            const Icon = PRINCIPLE_ICONS[i] || Shield;
            return (
              <Reveal key={item.title} delay={i * 0.05}>
                <div className={`landing-glass rounded-2xl p-5 sm:p-6 h-full min-w-0 ${isRtl ? "text-right" : "text-start"}`}>
                  <span className="w-10 h-10 rounded-xl bg-[#64499D]/10 dark:bg-[#64499D]/25 text-[#64499D] dark:text-[#CFC2FF] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-semibold mb-1.5 break-words">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed break-words">{item.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <Reveal>
          <div className="rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 text-white landing-panel-glow bg-gradient-to-br from-slate-900 via-[#2A1F4A] to-[#64499D] text-center min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3 break-words">{t.cta.title}</h2>
            <p className="text-slate-300 text-base sm:text-lg mb-8 break-words">{t.cta.subtitle}</p>
            <Button
              size="lg"
              className="w-full sm:w-auto px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => navigate(path("contact"))}
            >
              {t.cta.primary}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
};

export default Security;
