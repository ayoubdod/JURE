// src/pages/Landing.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router"; // keep your existing navigation logic
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
  Briefcase,
  Calendar,
  UserCheck,
  Sparkles,
} from "lucide-react";
import MeshBackdrop from "@/components/landing/MeshBackdrop";
import Reveal from "@/components/landing/Reveal";
import FeatureTile from "@/components/landing/FeatureTile";
import DemoFeatureCard from "@/components/landing/DemoFeatureCard";
import AiAssistantDemo from "@/components/landing/AiAssistantDemo";
import { JURIA_ENABLED } from "@/config/features";
import "@/components/landing/landing.css";

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
      title: "Nous construisons JURE avec les premiers cabinets",
      subtitle:
        "Produit en phase de lancement — des modules réels déjà disponibles, affinés avec les cabinets qui nous rejoignent dès maintenant.",
      chipEarly: "Accès anticipé",
      chipProduct: "Cabinet OS",
      items: [
        {
          title: "Accès fondateur",
          desc: "Rejoignez la première vague de cabinets et aidez à orienter la feuille de route.",
        },
        {
          title: "Déjà opérationnel",
          desc: "Dossiers, clients, bibliothèque, calendrier, équipe et finance — dans une seule plateforme.",
        },
        {
          title: "Équipe à l’écoute",
          desc: "Feedback direct : vos besoins juridiques réels façonnent chaque itération.",
        },
      ],
      ctaPrimary: "Créer un compte",
      ctaSecondary: "Voir la démo",
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
      title: "We're building JURE with the first firms",
      subtitle:
        "Early-stage product — real modules shipping today, refined with the practices that join us now.",
      chipEarly: "Early access",
      chipProduct: "Practice OS",
      items: [
        {
          title: "Founding access",
          desc: "Join the first wave of firms and help steer what we build next.",
        },
        {
          title: "Already operational",
          desc: "Cases, clients, library, calendar, team, and finance — in one workspace.",
        },
        {
          title: "Close to the team",
          desc: "Direct feedback loop: real legal needs shape every iteration.",
        },
      ],
      ctaPrimary: "Create an account",
      ctaSecondary: "View demo",
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
      title: "نبني JURE مع أوائل المكاتب",
      subtitle:
        "منتج في مرحلة مبكرة — وحدات حقيقية متاحة اليوم، وتُطوَّر مع المكاتب التي تنضم إلينا الآن.",
      chipEarly: "وصول مبكر",
      chipProduct: "نظام المكتب",
      items: [
        {
          title: "وصول تأسيسي",
          desc: "انضم إلى الموجة الأولى من المكاتب وساعد في توجيه خارطة الطريق.",
        },
        {
          title: "جاهز للعمل",
          desc: "قضايا وعملاء ومكتبة وتقويم وفريق ومالية — في مساحة واحدة.",
        },
        {
          title: "قريبون من الفريق",
          desc: "ملاحظات مباشرة: احتياجات قانونية حقيقية تشكّل كل إصدار.",
        },
      ],
      ctaPrimary: "إنشاء حساب",
      ctaSecondary: "شاهد العرض",
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
      className="border-[#64499D]/20 dark:border-[#8B6FD1]/30 text-slate-700 dark:text-slate-200 hover:bg-[#F4F1FF]/80 dark:hover:bg-[#64499D]/20 backdrop-blur-sm"
      aria-label={label || "Toggle theme"}
      title={title || "Toggle theme"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};

const LangSwitcher: React.FC<{ lang: Lang; onChange: (l: Lang) => void }> = ({ lang, onChange }) => {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-[#64499D]/20 dark:border-[#8B6FD1]/30 backdrop-blur-sm bg-white/50 dark:bg-slate-900/40">
      {(["fr", "en", "ar"] as Lang[]).map((code) => (
        <button
          key={code}
          onClick={() => onChange(code)}
          className={`px-3 py-2 text-sm transition-colors ${
            lang === code
              ? "bg-[#64499D] text-white"
              : "bg-transparent text-slate-700 dark:text-slate-200 hover:bg-[#F4F1FF] dark:hover:bg-[#64499D]/20"
          }`}
        >
          {code === "fr" ? "FR" : code === "en" ? "EN" : "AR"}
        </button>
      ))}
    </div>
  );
};

const HeroStatChip: React.FC<{ label: string; value: string; delay?: number }> = ({
  label,
  value,
  delay = 0,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
      className="landing-glass px-4 py-2.5 rounded-full flex items-center gap-2 text-sm landing-float"
      style={reduce ? undefined : { animationDelay: `${delay}s` }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#64499D] dark:bg-[#8B6FD1] motion-safe:animate-pulse" />
      <span className="font-display font-semibold text-[#64499D] dark:text-[#CFC2FF] tabular-nums">
        {value}
      </span>
      <span className="text-slate-600 dark:text-slate-300 text-xs">{label}</span>
    </motion.div>
  );
};

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const handleGetStarted = () => navigate("/signin");
  const handleDemo = () => navigate("/demo");
  const handleNav = (to: string) => navigate(to);
  const year = new Date().getFullYear();
  const reduce = useReducedMotion();
  const isRtl = t.dir === "rtl";

  const demoFeatures = [
    {
      key: "contract",
      icon: <FileText className="w-5 h-5 text-white" />,
      title: t.demo.contractAnalysis.title,
      desc: t.demo.contractAnalysis.desc,
      gradient: "bg-gradient-to-br from-[#64499D] to-[#4D3680]",
    },
    {
      key: "research",
      icon: <Search className="w-5 h-5 text-white" />,
      title: t.demo.legalResearch.title,
      desc: t.demo.legalResearch.desc,
      gradient: "bg-gradient-to-br from-[#8B6FD1] to-[#64499D]",
    },
    {
      key: "drafting",
      icon: <FileText className="w-5 h-5 text-white" />,
      title: t.demo.documentDrafting.title,
      desc: t.demo.documentDrafting.desc,
      gradient: "bg-gradient-to-br from-[#4D3680] to-[#3E2D71]",
    },
    {
      key: "cases",
      icon: <Briefcase className="w-5 h-5 text-white" />,
      title: t.demo.caseManagement.title,
      desc: t.demo.caseManagement.desc,
      gradient: "bg-gradient-to-br from-[#64499D] to-[#8B6FD1]",
    },
    {
      key: "clients",
      icon: <UserCheck className="w-5 h-5 text-white" />,
      title: t.demo.clientManagement.title,
      desc: t.demo.clientManagement.desc,
      gradient: "bg-gradient-to-br from-[#8B6FD1] to-[#4D3680]",
    },
    {
      key: "calendar",
      icon: <Calendar className="w-5 h-5 text-white" />,
      title: t.demo.calendarTasks.title,
      desc: t.demo.calendarTasks.desc,
      gradient: "bg-gradient-to-br from-[#4D3680] to-[#64499D]",
    },
    {
      key: "library",
      icon: <BookOpen className="w-5 h-5 text-white" />,
      title: t.demo.library.title,
      desc: t.demo.library.desc,
      gradient: "bg-gradient-to-br from-[#3E2D71] to-[#8B6FD1]",
    },
    {
      key: "team",
      icon: <Users className="w-5 h-5 text-white" />,
      title: t.demo.teamCollaboration.title,
      desc: t.demo.teamCollaboration.desc,
      gradient: "bg-gradient-to-br from-[#64499D] to-[#3E2D71]",
    },
  ];

  return (
    <div className="landing-root min-h-screen relative overflow-hidden text-slate-900 dark:text-slate-100 bg-gradient-to-br from-white via-[#FBF9FF] to-slate-50 dark:from-slate-950 dark:via-[#0c0a14] dark:to-slate-900">
      <MeshBackdrop />

      {/* Header — frosted HUD nav */}
      <header className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
          <nav
            className="landing-glass rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
            aria-label="main navigation"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/images/Jure logo.png"
                alt="JURE"
                className="w-[120px] sm:w-[140px] h-9 sm:h-10 object-contain"
                loading="eager"
                decoding="async"
              />
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
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

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-12 md:pt-20 md:pb-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 text-center lg:text-start">
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full landing-glass text-xs font-medium text-[#64499D] dark:text-[#CFC2FF] mb-6"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>JURE · Legal OS</span>
              </motion.div>

              <motion.h1
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="font-display text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]"
              >
                <span className="landing-hero-shimmer bg-gradient-to-r from-slate-900 via-[#64499D] to-slate-900 dark:from-white dark:via-[#8B6FD1] dark:to-white bg-clip-text text-transparent">
                  {t.hero.h1a}
                </span>
                <br />
                <span className="relative inline-block mt-1">
                  <span
                    aria-hidden
                    className="absolute inset-0 blur-2xl opacity-40 dark:opacity-50 bg-gradient-to-r from-[#64499D] to-[#8B6FD1]"
                  />
                  <span className="relative bg-gradient-to-r from-[#64499D] via-[#8B6FD1] to-[#4D3680] bg-clip-text text-transparent">
                    {t.hero.h1b}
                  </span>
                </span>
              </motion.h1>

              <motion.p
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0"
              >
                {t.hero.subtitle}
              </motion.p>

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className={`mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start ${
                  isRtl ? "sm:flex-row-reverse" : ""
                }`}
              >
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="px-7 py-6 text-lg font-medium shadow-lg hover:shadow-[0_0_32px_-6px_rgba(100,73,157,0.55)] transition-shadow bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white"
                >
                  {t.hero.ctaStart}
                  <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
                </Button>
                <Button
                  onClick={handleDemo}
                  variant="outline"
                  size="lg"
                  className="px-7 py-6 text-lg border-[#64499D]/25 dark:border-[#8B6FD1]/30 text-slate-800 dark:text-slate-100 hover:bg-[#F4F1FF]/80 dark:hover:bg-[#64499D]/15 backdrop-blur-sm"
                >
                  {t.hero.ctaDemo}
                </Button>
              </motion.div>

              <div className="mt-6 text-sm text-slate-500 dark:text-slate-400 flex items-center justify-center lg:justify-start gap-6 flex-wrap">
                <button
                  onClick={() => handleNav("/security")}
                  className="underline-offset-4 hover:underline hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors"
                >
                  {t.hero.links.security}
                </button>
                <button
                  onClick={() => handleNav("/docs")}
                  className="underline-offset-4 hover:underline hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors"
                >
                  {t.hero.links.docs}
                </button>
                <button
                  onClick={() => handleNav("/community")}
                  className="underline-offset-4 hover:underline hover:text-[#64499D] dark:hover:text-[#8B6FD1] transition-colors"
                >
                  {t.hero.links.community}
                </button>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 justify-center lg:justify-start">
                <HeroStatChip label={t.stats.chipEarly} value="β" delay={0.25} />
                <HeroStatChip label={t.stats.chipProduct} value="OS" delay={0.35} />
              </div>
            </div>

            {/* Floating workspace preview — desktop-first visual anchor */}
            <div className="lg:col-span-5 relative hidden md:block">
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.15 }}
                className="relative"
              >
                <div
                  aria-hidden
                  className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[#64499D]/25 via-transparent to-[#8B6FD1]/20 blur-2xl"
                />
                <div className="landing-glass landing-float rounded-3xl p-5 relative">
                  <div className={`flex items-center gap-3 mb-4 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#64499D] to-[#4D3680] flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div className={isRtl ? "text-end" : "text-start"}>
                      <div className="font-display font-semibold text-sm">
                        {t.demo.caseManagement.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {t.demo.caseManagement.desc}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      t.demo.clientManagement.title,
                      t.demo.calendarTasks.title,
                      t.demo.library.title,
                    ].map((label) => (
                      <div
                        key={label}
                        className="p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-200 border border-[#64499D]/10 dark:border-[#8B6FD1]/15 flex items-center justify-between gap-3"
                      >
                        <span className="font-medium">{label}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute -bottom-4 -end-2 landing-glass landing-float-delay rounded-2xl px-4 py-3 text-xs shadow-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#64499D] dark:text-[#8B6FD1]" />
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {t.features.security.title}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Feature tiles */}
          <div className="mt-20 md:mt-28 grid md:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            <FeatureTile
              icon={<Zap className="w-6 h-6" />}
              title={t.features.ai.title}
              description={t.features.ai.desc}
              accent="#64499D"
              delay={0}
            />
            <FeatureTile
              icon={<Shield className="w-6 h-6" />}
              title={t.features.security.title}
              description={t.features.security.desc}
              accent="#4D3680"
              delay={0.06}
            />
            <FeatureTile
              icon={<Users className="w-6 h-6" />}
              title={t.features.collab.title}
              description={t.features.collab.desc}
              accent="#3E2D71"
              delay={0.12}
            />
            <FeatureTile
              icon={<BookOpen className="w-6 h-6" />}
              title={t.features.library.title}
              description={t.features.library.desc}
              accent="#8B6FD1"
              delay={0.18}
            />
          </div>
        </section>

        <div className="landing-divider mb-16 md:mb-20" aria-hidden />

        {/* Demo Section */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-28">
          <Reveal className="text-center mb-12 md:mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
              {t.demo.title}
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-lg max-w-2xl mx-auto">
              {t.demo.subtitle}
            </p>
          </Reveal>

          <div
            className={
              JURIA_ENABLED
                ? "grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
                : "max-w-7xl mx-auto"
            }
          >
            <div className={JURIA_ENABLED ? "lg:col-span-2 space-y-4" : "space-y-4"}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoFeatures.map((f, i) => (
                  <DemoFeatureCard
                    key={f.key}
                    icon={f.icon}
                    title={f.title}
                    description={f.desc}
                    gradient={f.gradient}
                    delay={i * 0.04}
                  />
                ))}
              </div>
            </div>

            {JURIA_ENABLED ? (
              <AiAssistantDemo
                key={lang}
                copy={t.demo.aiAssistant}
                dir={t.dir as "ltr" | "rtl"}
              />
            ) : null}
          </div>

          <Reveal className="text-center mt-12">
            <Button
              onClick={handleDemo}
              size="lg"
              className="px-8 py-6 text-lg font-medium bg-gradient-to-r from-[#64499D] to-[#4D3680] hover:from-[#4D3680] hover:to-[#3E2D71] text-white shadow-lg hover:shadow-[0_0_36px_-6px_rgba(100,73,157,0.55)] transition-all"
            >
              {t.demo.cta}
              <ArrowRight className={`ms-2 h-5 w-5 ${isRtl ? "rotate-180" : ""}`} />
            </Button>
          </Reveal>
        </section>

        <div className="landing-divider mb-16 md:mb-20" aria-hidden />

        {/* Community */}
        <section className="max-w-7xl mx-auto px-6 pb-16 md:pb-28">
          <Reveal>
            <div className="relative rounded-3xl p-10 md:p-14 text-white overflow-hidden landing-panel-glow bg-gradient-to-br from-slate-900 via-slate-900 to-[#2A1F4A]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background:
                    "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(100,73,157,0.55), transparent), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(139,111,209,0.35), transparent)",
                }}
              />
              <div className="relative text-center max-w-3xl mx-auto">
                <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
                  {t.community.title}
                </h2>
                <p className="text-slate-300 text-lg">{t.community.subtitle}</p>
              </div>

              <div className="relative mt-12 grid md:grid-cols-3 gap-8 text-center">
                {[
                  {
                    icon: <MessageSquare className="w-8 h-8 text-white" />,
                    bg: "#64499D",
                    title: t.community.forums.title,
                    desc: t.community.forums.desc,
                  },
                  {
                    icon: <Heart className="w-8 h-8 text-white" />,
                    bg: "#4D3680",
                    title: t.community.help.title,
                    desc: t.community.help.desc,
                  },
                  {
                    icon: <Award className="w-8 h-8 text-white" />,
                    bg: "#3E2D71",
                    title: t.community.training.title,
                    desc: t.community.training.desc,
                  },
                ].map((item) => (
                  <div key={item.title} className="space-y-3 group">
                    <div
                      className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_28px_-4px_rgba(139,111,209,0.7)]"
                      style={{ background: item.bg }}
                    >
                      {item.icon}
                    </div>
                    <h3 className="font-display text-xl font-semibold">{item.title}</h3>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="relative text-center mt-12">
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg font-medium bg-white text-slate-900 hover:bg-slate-100 shadow-lg"
                  onClick={() => handleNav("/community")}
                >
                  {t.community.cta}
                </Button>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Early stage — honest positioning */}
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
              <div className="relative text-center mb-10 md:mb-12 max-w-3xl mx-auto">
                <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-3">
                  {t.stats.title}
                </h2>
                <p className="text-purple-100 text-lg leading-relaxed">{t.stats.subtitle}</p>
              </div>
              <div className="relative grid md:grid-cols-3 gap-6 md:gap-8 mb-10">
                {t.stats.items.map(
                  (item: { title: string; desc: string }, i: number) => {
                    const Icon = [Sparkles, Briefcase, Users][i] || Sparkles;
                    return (
                      <div
                        key={item.title}
                        className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-6 text-center md:text-start"
                      >
                        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center mx-auto md:mx-0 mb-4">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-display text-lg font-semibold mb-2">{item.title}</h3>
                        <p className="text-purple-100/90 text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    );
                  }
                )}
              </div>
              <div
                className={`relative flex flex-col sm:flex-row gap-4 justify-center ${
                  isRtl ? "sm:flex-row-reverse" : ""
                }`}
              >
                <Button
                  size="lg"
                  className="px-8 py-6 text-lg font-medium bg-white text-slate-900 hover:bg-slate-100"
                  onClick={handleGetStarted}
                >
                  {t.stats.ctaPrimary}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="px-8 py-6 text-lg font-medium border-white/70 text-white hover:bg-white/10"
                  onClick={handleDemo}
                >
                  {t.stats.ctaSecondary}
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#64499D]/15 dark:border-[#8B6FD1]/20 bg-slate-950/95 dark:bg-black text-white py-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6">
          <div
            className={`flex flex-col md:flex-row justify-between items-center gap-6 ${
              isRtl ? "md:flex-row-reverse" : ""
            }`}
          >
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
              <button
                onClick={() => handleNav("/privacy")}
                className="hover:text-white transition-colors"
              >
                {t.footer.privacy}
              </button>
              <button
                onClick={() => handleNav("/terms")}
                className="hover:text-white transition-colors"
              >
                {t.footer.terms}
              </button>
              <button
                onClick={() => handleNav("/status")}
                className="hover:text-white transition-colors"
              >
                {t.footer.status}
              </button>
            </div>
            <div className="text-slate-400 text-sm">
              © {year} JURE. {t.footer.rights}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
