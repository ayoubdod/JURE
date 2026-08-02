// src/pages/Landing.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router"; // keep your existing navigation logic
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
  MessageSquare,
  Heart,
  Award,
  Sun,
  Moon,
  FileText,
  Search,
  Bot,
  Sparkles,
  Play,
  Briefcase,
  Calendar,
  CheckSquare,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


/**
 * Brand
 * - Primary: #64499D (deep purple)
 * - Base: #FFFFFF
 * Tailwind: ensure `darkMode: "class"` in tailwind.config.js
 * RTL: this component sets <html dir="rtl"> when Arabic is active.
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
      h1a: "L’avenir du droit",
      h1b: "est ici",
      subtitle:
        "Révolutionnez votre pratique juridique avec une plateforme intelligente combinant IA avancée, gestion de cas optimisée et collaboration d’équipe fluide.",
      ctaStart: "Commencer maintenant",
      ctaDemo: "Découvrir la démo",
      links: { security: "Sécurité", docs: "Documentation", community: "Communauté" },
    },
    features: {
      ai: { title: "IA Juridique", desc: "Recherche, analyse contractuelle et rédaction assistée avec citations." },
      security: { title: "Sécurité Maximale", desc: "Chiffrement fort, contrôle d’accès granulaire et conformité." },
      collab: { title: "Collaboration", desc: "Travail d’équipe en temps réel, tâches et partage sécurisé." },
      library: { title: "Bibliothèque", desc: "Base documentaire enrichie, recherche sémantique et références." },
    },
    pricing: {
      title: "Choisissez votre plan",
      subtitle: "Des solutions adaptées à chaque taille de cabinet",
      badgePopular: "Populaire",
      plans: {
        starter: {
          name: "Starter",
          perMonth: "/mois",
          btn: "Commencer",
          bullets: ["Jusqu’à 50 dossiers", "IA juridique basique", "Support email", "10 Go de stockage"],
          price: "29€",
        },
        pro: {
          name: "Professionnel",
          perMonth: "/mois",
          btn: "Commencer",
          bullets: ["Dossiers illimités", "IA avancée", "Support prioritaire", "100 Go de stockage", "Collaboration équipe"],
          price: "79€",
        },
        enterprise: {
          name: "Entreprise",
          perMonth: "/mois",
          btn: "Nous contacter",
          bullets: ["Tout illimité", "IA premium", "Support dédié 24/7", "Stockage illimité", "API personnalisée"],
          price: "199€",
        },
      },
    },
    community: {
      title: "Rejoignez notre communauté",
      subtitle: "Connectez-vous avec des milliers d’avocats du monde entier.",
      forums: { title: "Forums de discussion", desc: "Échanges sur cas complexes et bonnes pratiques." },
      help: { title: "Entraide professionnelle", desc: "Mentorat, retours d’expérience et entraide entre pairs." },
      training: { title: "Formations exclusives", desc: "Webinaires et ateliers animés par des experts." },
      cta: "Rejoindre la communauté",
    },
    demo: {
      title: "Découvrez Jure en action",
      subtitle: "Explorez les fonctionnalités principales de notre plateforme",
      contractAnalysis: {
        title: "Analyse de contrats",
        desc: "Téléchargez et analysez vos contrats en quelques secondes",
      },
      legalResearch: {
        title: "Recherche juridique",
        desc: "Recherchez des précédents et des cas pertinents",
      },
      documentDrafting: {
        title: "Rédaction de documents",
        desc: "Rédigez des documents juridiques avec l'aide de l'IA",
      },
      caseManagement: {
        title: "Gestion de dossiers",
        desc: "Organisez et suivez tous vos dossiers en un seul endroit",
      },
      clientManagement: {
        title: "Gestion de clients",
        desc: "Centralisez les informations et communications avec vos clients",
      },
      calendarTasks: {
        title: "Calendrier et tâches",
        desc: "Planifiez vos rendez-vous et gérez vos échéances efficacement",
      },
      library: {
        title: "Bibliothèque documentaire",
        desc: "Accédez à votre base de connaissances et documents",
      },
      teamCollaboration: {
        title: "Collaboration d'équipe",
        desc: "Travaillez en équipe avec des outils de communication intégrés",
      },
      aiAssistant: {
        title: "Assistant IA Juria",
        desc: "Posez des questions et obtenez des réponses intelligentes",
        greeting: "Bonjour ! Je suis Juria, votre assistant juridique intelligent. Je peux vous aider avec :",
        features: [
          "Recherche juridique et analyse de cas",
          "Révision et rédaction de contrats",
          "Préparation de documents",
          "Questions de conformité réglementaire",
        ],
        userMessage: "Pouvez-vous m'aider à réviser un contrat ?",
        aiResponse: "Absolument ! Je peux analyser les termes du contrat, identifier les risques potentiels et fournir des recommandations. Téléchargez votre contrat et je fournirai une analyse complète.",
        suggestions: ["Révision de contrat", "Recherche juridique"],
        placeholder: "Posez-moi une question sur des questions juridiques...",
      },
      cta: "Essayer la démo complète",
    },
    stats: {
      title: "Rejoignez des milliers d'avocats",
      subtitle: "qui font confiance à JURE pour transformer leur pratique",
      lawyers: "Avocats actifs",
      cases: "Dossiers traités",
      csat: "Satisfaction client",
    },
    footer: {
      privacy: "Confidentialité",
      terms: "Conditions",
      status: "Statut",
      rights: "Tous droits réservés.",
    },
  },
  en: {
    htmlLang: "en",
    dir: "ltr",
    nav: { features: "Features", pricing: "Pricing", about: "About", contact: "Contact" },
    auth: { signin: "Sign in" },
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },
    hero: {
      h1a: "The future of law",
      h1b: "is here",
      subtitle:
        "Transform your legal practice with an intelligent platform that blends advanced AI, streamlined case management, and seamless team collaboration.",
      ctaStart: "Get started",
      ctaDemo: "View demo",
      links: { security: "Security", docs: "Documentation", community: "Community" },
    },
    features: {
      ai: { title: "Legal AI", desc: "Research, contract analysis, and assisted drafting with citations." },
      security: { title: "Maximum Security", desc: "Strong encryption, granular access control, and compliance." },
      collab: { title: "Collaboration", desc: "Real-time teamwork, tasks, and secure sharing." },
      library: { title: "Library", desc: "Enriched knowledge base, semantic search, and references." },
    },
    pricing: {
      title: "Choose your plan",
      subtitle: "Solutions for firms of every size",
      badgePopular: "Popular",
      plans: {
        starter: {
          name: "Starter",
          perMonth: "/month",
          btn: "Start",
          bullets: ["Up to 50 matters", "Basic legal AI", "Email support", "10 GB storage"],
          price: "$29",
        },
        pro: {
          name: "Professional",
          perMonth: "/month",
          btn: "Start",
          bullets: ["Unlimited matters", "Advanced AI", "Priority support", "100 GB storage", "Team collaboration"],
          price: "$79",
        },
        enterprise: {
          name: "Enterprise",
          perMonth: "/month",
          btn: "Contact us",
          bullets: ["Everything unlimited", "Premium AI", "Dedicated 24/7 support", "Unlimited storage", "Custom API"],
          price: "$199",
        },
      },
    },
    community: {
      title: "Join our community",
      subtitle: "Connect with thousands of lawyers worldwide.",
      forums: { title: "Discussion forums", desc: "Debate complex cases and best practices." },
      help: { title: "Professional help", desc: "Mentoring, experience sharing, and peer support." },
      training: { title: "Exclusive trainings", desc: "Webinars and workshops led by experts." },
      cta: "Join the community",
    },
    demo: {
      title: "See Jure in action",
      subtitle: "Explore the main features of our platform",
      contractAnalysis: {
        title: "Contract Analysis",
        desc: "Upload and analyze your contracts in seconds",
      },
      legalResearch: {
        title: "Legal Research",
        desc: "Research legal precedents and relevant cases",
      },
      documentDrafting: {
        title: "Document Drafting",
        desc: "Draft legal documents with AI assistance",
      },
      caseManagement: {
        title: "Case Management",
        desc: "Organize and track all your cases in one place",
      },
      clientManagement: {
        title: "Client Management",
        desc: "Centralize client information and communications",
      },
      calendarTasks: {
        title: "Calendar & Tasks",
        desc: "Schedule appointments and manage deadlines efficiently",
      },
      library: {
        title: "Document Library",
        desc: "Access your knowledge base and documents",
      },
      teamCollaboration: {
        title: "Team Collaboration",
        desc: "Work together with integrated communication tools",
      },
      aiAssistant: {
        title: "Juria AI Assistant",
        desc: "Ask questions and get intelligent answers",
        greeting: "Hello! I'm Juria, your intelligent legal assistant. I can help you with:",
        features: [
          "Legal research and case analysis",
          "Contract review and drafting",
          "Document preparation",
          "Regulatory compliance questions",
        ],
        userMessage: "Can you help me review a contract?",
        aiResponse: "Absolutely! I can analyze contract terms, identify potential risks, and provide recommendations. Upload your contract and I'll provide a comprehensive review.",
        suggestions: ["Contract Review", "Legal Research"],
        placeholder: "Ask me anything about legal matters...",
      },
      cta: "Try full demo",
    },
    stats: {
      title: "Join thousands of lawyers",
      subtitle: "who trust JURE to transform their practice",
      lawyers: "Active lawyers",
      cases: "Matters handled",
      csat: "Customer satisfaction",
    },
    footer: {
      privacy: "Privacy",
      terms: "Terms",
      status: "Status",
      rights: "All rights reserved.",
    },
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl",
    nav: { features: "الميزات", pricing: "الأسعار", about: "حول", contact: "اتصل بنا" },
    auth: { signin: "تسجيل الدخول" },
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },
    hero: {
      h1a: "مستقبل القانون",
      h1b: "هنا",
      subtitle:
        "حوّل ممارستك القانونية بمنصة ذكية تجمع بين الذكاء الاصطناعي المتقدم وإدارة القضايا بسلاسة وتعاون الفريق.",
      ctaStart: "ابدأ الآن",
      ctaDemo: "شاهد العرض",
      links: { security: "الأمان", docs: "التوثيق", community: "المجتمع" },
    },
    features: {
      ai: { title: "ذكاء اصطناعي قانوني", desc: "بحث، تحليل العقود، وصياغة مدعومة بالاستشهادات." },
      security: { title: "أمان أقصى", desc: "تشفير قوي، تحكم دقيق في الصلاحيات، والامتثال." },
      collab: { title: "تعاون", desc: "عمل جماعي لحظي، مهام، ومشاركة آمنة." },
      library: { title: "مكتبة", desc: "قاعدة معرفية غنية، بحث دلالي، ومراجع." },
    },
    pricing: {
      title: "اختر خطتك",
      subtitle: "حلول تناسب جميع أحجام المكاتب",
      badgePopular: "الأكثر شيوعًا",
      plans: {
        starter: {
          name: "أساسي",
          perMonth: "/شهريًا",
          btn: "ابدأ",
          bullets: ["حتى 50 ملفًا", "ذكاء اصطناعي أساسي", "دعم عبر البريد", "10 جيجابايت تخزين"],
          price: "29€",
        },
        pro: {
          name: "احترافي",
          perMonth: "/شهريًا",
          btn: "ابدأ",
          bullets: ["ملفات غير محدودة", "ذكاء اصطناعي متقدم", "دعم أولوية", "100 جيجابايت", "تعاون الفريق"],
          price: "79€",
        },
        enterprise: {
          name: "مؤسسات",
          perMonth: "/شهريًا",
          btn: "تواصل معنا",
          bullets: ["كل شيء غير محدود", "ذكاء اصطناعي مميز", "دعم مخصص 24/7", "تخزين غير محدود", "واجهات مخصصة"],
          price: "199€",
        },
      },
    },
    community: {
      title: "انضم إلى مجتمعنا",
      subtitle: "تواصل مع آلاف المحامين حول العالم.",
      forums: { title: "منتديات نقاش", desc: "نقاش القضايا المعقدة وأفضل الممارسات." },
      help: { title: "مساعدة مهنية", desc: "إرشاد، تبادل خبرات، ودعم الأقران." },
      training: { title: "دورات حصرية", desc: "ندوات وورش عمل يقدمها خبراء." },
      cta: "انضم إلى المجتمع",
    },
    demo: {
      title: "شاهد Jure في العمل",
      subtitle: "استكشف الميزات الرئيسية لمنصتنا",
      contractAnalysis: {
        title: "تحليل العقود",
        desc: "قم بتحميل وتحليل عقودك في ثوانٍ",
      },
      legalResearch: {
        title: "البحث القانوني",
        desc: "ابحث عن السوابق القضائية والقضايا ذات الصلة",
      },
      documentDrafting: {
        title: "صياغة المستندات",
        desc: "صمم المستندات القانونية بمساعدة الذكاء الاصطناعي",
      },
      caseManagement: {
        title: "إدارة القضايا",
        desc: "نظم وتتبع جميع قضاياك في مكان واحد",
      },
      clientManagement: {
        title: "إدارة العملاء",
        desc: "ركز معلومات العملاء والتواصل معهم",
      },
      calendarTasks: {
        title: "التقويم والمهام",
        desc: "حدد مواعيدك وأدر المواعيد النهائية بكفاءة",
      },
      library: {
        title: "مكتبة المستندات",
        desc: "الوصول إلى قاعدة المعرفة والمستندات الخاصة بك",
      },
      teamCollaboration: {
        title: "تعاون الفريق",
        desc: "اعمل معاً باستخدام أدوات التواصل المدمجة",
      },
      aiAssistant: {
        title: "مساعد Juria الذكي",
        desc: "اطرح الأسئلة واحصل على إجابات ذكية",
        greeting: "مرحباً! أنا Juria، مساعدك القانوني الذكي. يمكنني مساعدتك في:",
        features: [
          "البحث القانوني وتحليل القضايا",
          "مراجعة وصياغة العقود",
          "إعداد المستندات",
          "أسئلة الامتثال التنظيمي",
        ],
        userMessage: "هل يمكنك مساعدتي في مراجعة عقد؟",
        aiResponse: "بالتأكيد! يمكنني تحليل شروط العقد وتحديد المخاطر المحتملة وتقديم التوصيات. قم بتحميل عقدك وسأقدم مراجعة شاملة.",
        suggestions: ["مراجعة العقد", "البحث القانوني"],
        placeholder: "اسألني أي شيء عن المسائل القانونية...",
      },
      cta: "جرب العرض الكامل",
    },
    stats: {
      title: "انضم إلى آلاف المحامين",
      subtitle: "الذين يثقون بـ JURE لتحويل ممارستهم",
      lawyers: "محامون نشطون",
      cases: "قضايا معالجة",
      csat: "رضا العملاء",
    },
    footer: {
      privacy: "الخصوصية",
      terms: "الشروط",
      status: "الحالة",
      rights: "جميع الحقوق محفوظة.",
    },
  },
};

const useI18n = () => {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("lang") as Lang | null;
    if (stored === "fr" || stored === "en" || stored === "ar") return stored;
    const nav = (navigator.language || "en").toLowerCase();
    if (nav.startsWith("fr")) return "fr";
    if (nav.startsWith("ar")) return "ar";
    return "en";
  });

  useEffect(() => {
    // apply <html lang> and dir
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
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
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
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};

const LangSwitcher: React.FC<{ lang: Lang; onChange: (l: Lang) => void }> = ({ lang, onChange }) => {
  return (
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
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const handleGetStarted = () => navigate("/signin");
  const handleDemo = () => navigate("/demo");
  const handleNav = (to: string) => navigate(to);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Decorative brand blobs */}
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
        <nav
          className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between"
          aria-label="main navigation"
        >
          <div className="flex items-center gap-3">
            {/* ✅ Use your Jure logo */}
            <img
              src="/images/Jure logo.png"
              alt="JURE"
              className="w-[140px] h-10 object-contain"
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleNav("/features")}
              className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors"
            >
              {t.nav.features}
            </button>
            <button
              onClick={() => handleNav("/about")}
              className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors"
            >
              {t.nav.about}
            </button>
            <button
              onClick={() => handleNav("/contact")}
              className="hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors"
            >
              {t.nav.contact}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} onChange={setLang} />
            <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title} />
            <Button
              onClick={handleGetStarted}
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
        <section className="max-w-7xl mx-auto px-6 pt-14 pb-10 md:pt-24 md:pb-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
                {t.hero.h1a}
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#64499D] to-[#4D3680] bg-clip-text text-transparent">
                {t.hero.h1b}
              </span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center ${t.dir === "rtl" ? "sm:flex-row-reverse" : ""}`}>
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="px-7 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
              >
                {t.hero.ctaStart}
                <ArrowRight className={`ml-2 h-5 w-5 ${t.dir === "rtl" ? "rotate-180" : ""}`} />
              </Button>
              <Button
                onClick={handleDemo}
                variant="outline"
                size="lg"
                className="px-7 py-6 text-lg border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t.hero.ctaDemo}
              </Button>
            </div>

            <div className="mt-6 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center gap-6">
              <button
                onClick={() => handleNav("/security")}
                className="underline-offset-4 hover:underline"
              >
                {t.hero.links.security}
              </button>
              <button
                onClick={() => handleNav("/docs")}
                className="underline-offset-4 hover:underline"
              >
                {t.hero.links.docs}
              </button>
              <button
                onClick={() => handleNav("/community")}
                className="underline-offset-4 hover:underline"
              >
                {t.hero.links.community}
              </button>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <div className="group p-7 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm hover:shadow-lg transition-all">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white group-hover:scale-105 transition-transform"
                style={{ background: "#64499D" }}
              >
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t.features.ai.title}</h3>
              <p className="text-slate-600 dark:text-slate-300">{t.features.ai.desc}</p>
            </div>

            <div className="group p-7 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm hover:shadow-lg transition-all">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white group-hover:scale-105 transition-transform"
                style={{ background: "#4D3680" }}
              >
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t.features.security.title}</h3>
              <p className="text-slate-600 dark:text-slate-300">{t.features.security.desc}</p>
            </div>

            <div className="group p-7 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm hover:shadow-lg transition-all">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white group-hover:scale-105 transition-transform"
                style={{ background: "#3E2D71" }}
              >
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t.features.collab.title}</h3>
              <p className="text-slate-600 dark:text-slate-300">{t.features.collab.desc}</p>
            </div>

            <div className="group p-7 rounded-2xl border border-slate-200/70 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm hover:shadow-lg transition-all">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-white group-hover:scale-105 transition-transform"
                style={{ background: "#8B6FD1" }}
              >
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t.features.library.title}</h3>
              <p className="text-slate-600 dark:text-slate-300">{t.features.library.desc}</p>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
          <div className="text-center mb-10 md:mb-14">
            <h2 className="text-3xl md:text-4xl font-bold">{t.demo.title}</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300 text-lg">{t.demo.subtitle}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Left side - Feature Cards Grid */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Contract Analysis */}
                <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#64499D] to-[#4D3680] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{t.demo.contractAnalysis.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{t.demo.contractAnalysis.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Legal Research */}
                <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B6FD1] to-[#64499D] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{t.demo.legalResearch.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{t.demo.legalResearch.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Document Drafting */}
                <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D3680] to-[#3E2D71] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{t.demo.documentDrafting.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{t.demo.documentDrafting.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Case Management */}
                <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#64499D] to-[#8B6FD1] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <Briefcase className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{t.demo.caseManagement.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{t.demo.caseManagement.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Client Management */}
                <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B6FD1] to-[#4D3680] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <UserCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{t.demo.clientManagement.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{t.demo.clientManagement.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Calendar & Tasks */}
                <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4D3680] to-[#64499D] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{t.demo.calendarTasks.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{t.demo.calendarTasks.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Library */}
                <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3E2D71] to-[#8B6FD1] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{t.demo.library.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{t.demo.library.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Collaboration */}
                <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#64499D] to-[#3E2D71] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{t.demo.teamCollaboration.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-xs">{t.demo.teamCollaboration.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Right side - AI Chat Demo */}
            <Card className="bg-white/90 dark:bg-slate-900/70 backdrop-blur border-slate-200 dark:border-slate-700 lg:sticky lg:top-24 h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#64499D] to-[#4D3680] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{t.demo.aiAssistant.title}</CardTitle>
                    <CardDescription className="dark:text-slate-400 text-xs">{t.demo.aiAssistant.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {/* AI Message */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#64499D] to-[#4D3680] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
                        <p className="text-slate-900 dark:text-slate-100">
                          {t.demo.aiAssistant.greeting}
                        </p>
                        <ul className="mt-1.5 space-y-0.5 text-slate-700 dark:text-slate-300">
                          {t.demo.aiAssistant.features.map((feature: string, index: number) => (
                            <li key={index}>• {feature}</li>
                          ))}
                        </ul>
                      </div>
                      {/* Suggestions - Fixed placement inside message bubble */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {t.demo.aiAssistant.suggestions.map((suggestion: string, index: number) => (
                          <button
                            key={index}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* User Message */}
                  <div className={`flex gap-2 ${t.dir === "rtl" ? "flex-row-reverse" : ""}`}>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8B6FD1] to-[#64499D] flex items-center justify-center flex-shrink-0">
                      <Users className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="p-3 bg-gradient-to-r from-[#64499D] to-[#4D3680] rounded-xl text-xs text-white">
                        <p>{t.demo.aiAssistant.userMessage}</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#64499D] to-[#4D3680] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs">
                        <p className="text-slate-900 dark:text-slate-100">
                          {t.demo.aiAssistant.aiResponse}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white/90 dark:bg-slate-900/70 backdrop-blur">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={t.demo.aiAssistant.placeholder}
                        className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-[#64499D] focus:border-transparent"
                        disabled
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] flex-shrink-0"
                        disabled
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-10">
            <Button
              onClick={handleDemo}
              size="lg"
              className="px-8 py-6 text-lg font-medium bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white shadow-lg hover:shadow-xl transition-all"
            >
              {t.demo.cta}
              <ArrowRight className={`ml-2 h-5 w-5 ${t.dir === "rtl" ? "rotate-180" : ""}`} />
            </Button>
          </div>
        </section>

        {/* Community */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-24">
          <div className="rounded-3xl p-10 md:p-12 text-white bg-gradient-to-r from-slate-800 to-slate-900">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.community.title}</h2>
              <p className="text-slate-300 text-lg">{t.community.subtitle}</p>
            </div>

            <div className="mt-10 grid md:grid-cols-3 gap-6 md:gap-8 text-center">
              <div className="space-y-3">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ background: "#64499D" }}
                >
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{t.community.forums.title}</h3>
                <p className="text-slate-300">{t.community.forums.desc}</p>
              </div>

              <div className="space-y-3">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ background: "#4D3680" }}
                >
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{t.community.help.title}</h3>
                <p className="text-slate-300">{t.community.help.desc}</p>
              </div>

              <div className="space-y-3">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                  style={{ background: "#3E2D71" }}
                >
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold">{t.community.training.title}</h3>
                <p className="text-slate-300">{t.community.training.desc}</p>
              </div>
            </div>

            <div className="text-center mt-10">
              <Button
                size="lg"
                className="px-8 py-6 text-lg font-medium bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => handleNav("/community")}
              >
                {t.community.cta}
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-6 pb-24">
          <div className="rounded-3xl p-10 md:p-12 text-white bg-gradient-to-r from-[#64499D] to-[#4D3680]">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.stats.title}</h2>
              <p className="text-purple-100 text-lg">{t.stats.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-1">10 000+</div>
                <div className="text-purple-200">{t.stats.lawyers}</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">50 000+</div>
                <div className="text-purple-200">{t.stats.cases}</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-1">95%</div>
                <div className="text-purple-200">{t.stats.csat}</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-black text-white py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`flex flex-col md:flex-row justify-between items-center gap-6 ${t.dir === "rtl" ? "md:flex-row-reverse" : ""}`}>
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
              <button onClick={() => handleNav("/privacy")} className="hover:text-white">
                {t.footer.privacy}
              </button>
              <button onClick={() => handleNav("/terms")} className="hover:text-white">
                {t.footer.terms}
              </button>
              <button onClick={() => handleNav("/status")} className="hover:text-white">
                {t.footer.status}
              </button>
            </div>
            <div className="text-slate-400 text-sm">
              © {year} JURE. {t.footer.rights}
            </div>
          </div>
        </div>
      </footer>

      {/* Scoped animation styles */}
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

export default Landing;
