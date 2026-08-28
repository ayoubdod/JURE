// src/pages/Demo.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Shield,
  Users,
  BookOpen,
  FileText,
  Calendar,
  MessageSquare,
  Search,
  Bot,
  Briefcase,
  UserCheck,
  Wallet,
  Sun,
  Moon,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import Reveal from "@/components/landing/Reveal";
import { RouteSeo } from "@/marketing/Seo";
import "@/components/landing/landing.css";

type Lang = "fr" | "en" | "ar";

const STRINGS: Record<Lang, any> = {
  fr: {
    htmlLang: "fr",
    dir: "ltr",
    back: "Retour",
    title: "Démonstration JURE",
    subtitle: "Parcourez les modules réels de la plateforme — tels qu’ils existent dans votre espace de travail.",
    cta: "Commencer maintenant",
    prev: "Précédent",
    next: "Suivant",
    themeToggle: { label: "Basculer le thème", title: "Basculer le thème" },
    steps: [
      {
        id: "dashboard",
        title: "Tableau de bord",
        description:
          "Vue d’ensemble de vos dossiers, rendez-vous, messages et accès rapide à Juria.",
      },
      {
        id: "juria",
        title: "Juria — IA juridique",
        description:
          "Chat juridique, analyse de contrats, recherche et rédaction assistée — directement dans JURE.",
      },
      {
        id: "cases",
        title: "Gestion des dossiers",
        description:
          "Suivez vos affaires : statut, client, échéances, documents et équipe assignée.",
      },
      {
        id: "clients",
        title: "Gestion des clients",
        description:
          "Centralisez fiches clients, contacts et historique liés à vos dossiers.",
      },
      {
        id: "library",
        title: "Bibliothèque documentaire",
        description:
          "Organisez dossiers, recherchez et téléchargez vos documents professionnels.",
      },
      {
        id: "calendar",
        title: "Calendrier & tâches",
        description:
          "Planifiez audiences, rendez-vous et tâches avec un calendrier intégré.",
      },
      {
        id: "collab",
        title: "Conversations & équipe",
        description:
          "Messagerie interne, activité d’équipe et collaboration sur vos dossiers.",
      },
      {
        id: "finance",
        title: "Finance",
        description:
          "Factures, paiements et suivi TVA pour piloter l’activité du cabinet.",
      },
    ],
    mock: {
      urgent: "Urgent",
      inProgress: "En cours",
      caseSale: "Vente immobilière",
      caseDivorce: "Divorce amiable",
      rdvToday: "3 RDV aujourd’hui",
      nextAt: "Prochain : 14h30",
      newMessages: "7 nouveaux messages",
      juriaReady: "Juria est prête pour vos recherches",
      start: "Ouvrir Juria",
      modes: ["Chat juridique", "Analyse de contrat", "Recherche", "Rédaction"],
      userAsk: "Analyse ce bail et signale les clauses à risque.",
      aiReply:
        "3 points à surveiller : résiliation (art. 12), dépôt de garantie (art. 8), charges non détaillées (art. 15).",
      caseTitle: "Dupont c/ Martin",
      client: "Client",
      type: "Type",
      deadline: "Échéance",
      commercial: "Commercial",
      daysLeft: "3 jours",
      docs: "Documents",
      tasks: "Tâches",
      notes: "Notes",
      team: "Équipe",
      hearing: "Prochaine audience",
      clientCard: "Marie Dupont",
      clientMeta: "12 dossiers · Actif",
      lastContact: "Dernier contact : hier",
      searchPlaceholder: "Rechercher un document…",
      folderContracts: "Contrats",
      folderPleadings: "Conclusions",
      folderEvidence: "Pièces",
      files: "fichiers",
      agenda: "Agenda",
      taskDue: "Échéance dossier",
      appointment: "RDV client",
      hearingShort: "Audience",
      inbox: "Conversations",
      unread: "non lus",
      online: "En ligne",
      away: "Absent",
      roleLead: "Avocat principal",
      roleCollab: "Collaboratrice",
      invoice: "Facture",
      paid: "Payée",
      pending: "En attente",
      tva: "TVA ce mois",
      revenue: "Encaissements",
    },
    highlights: [
      {
        title: "Sécurité",
        desc: "Contrôles d’accès et chiffrement pour protéger les données du cabinet.",
      },
      {
        title: "IA intégrée",
        desc: "Juria accélère recherche, analyse et rédaction sans quitter JURE.",
      },
      {
        title: "Cabinet unifié",
        desc: "Dossiers, clients, calendrier, finance et équipe dans une seule plateforme.",
      },
    ],
  },
  en: {
    htmlLang: "en",
    dir: "ltr",
    back: "Back",
    title: "JURE Demo",
    subtitle: "Walk through the real product modules — the same ones you’ll use in your workspace.",
    cta: "Get started",
    prev: "Previous",
    next: "Next",
    themeToggle: { label: "Toggle theme", title: "Toggle theme" },
    steps: [
      {
        id: "dashboard",
        title: "Dashboard",
        description: "Overview of matters, appointments, messages, and quick access to Juria.",
      },
      {
        id: "juria",
        title: "Juria — Legal AI",
        description:
          "Legal chat, contract analysis, research, and assisted drafting — built into JURE.",
      },
      {
        id: "cases",
        title: "Case management",
        description: "Track matters by status, client, deadlines, documents, and assigned team.",
      },
      {
        id: "clients",
        title: "Client management",
        description: "Centralize client records, contacts, and history linked to your matters.",
      },
      {
        id: "library",
        title: "Document library",
        description: "Organize folders, search, and download your professional documents.",
      },
      {
        id: "calendar",
        title: "Calendar & tasks",
        description: "Schedule hearings, appointments, and tasks with an integrated calendar.",
      },
      {
        id: "collab",
        title: "Conversations & team",
        description: "Internal messaging, team activity, and collaboration on matters.",
      },
      {
        id: "finance",
        title: "Finance",
        description: "Invoices, payments, and VAT tracking to run your firm’s finances.",
      },
    ],
    mock: {
      urgent: "Urgent",
      inProgress: "In progress",
      caseSale: "Real-estate sale",
      caseDivorce: "Amicable divorce",
      rdvToday: "3 appointments today",
      nextAt: "Next: 2:30 PM",
      newMessages: "7 new messages",
      juriaReady: "Juria is ready for your research",
      start: "Open Juria",
      modes: ["Legal chat", "Contract analysis", "Research", "Drafting"],
      userAsk: "Review this lease and flag risky clauses.",
      aiReply:
        "3 watch-outs: termination (cl. 12), security deposit (cl. 8), unspecified charges (cl. 15).",
      caseTitle: "Dupont v. Martin",
      client: "Client",
      type: "Type",
      deadline: "Deadline",
      commercial: "Commercial",
      daysLeft: "3 days",
      docs: "Documents",
      tasks: "Tasks",
      notes: "Notes",
      team: "Team",
      hearing: "Next hearing",
      clientCard: "Marie Dupont",
      clientMeta: "12 matters · Active",
      lastContact: "Last contact: yesterday",
      searchPlaceholder: "Search documents…",
      folderContracts: "Contracts",
      folderPleadings: "Pleadings",
      folderEvidence: "Evidence",
      files: "files",
      agenda: "Agenda",
      taskDue: "Matter deadline",
      appointment: "Client meeting",
      hearingShort: "Hearing",
      inbox: "Conversations",
      unread: "unread",
      online: "Online",
      away: "Away",
      roleLead: "Lead counsel",
      roleCollab: "Associate",
      invoice: "Invoice",
      paid: "Paid",
      pending: "Pending",
      tva: "VAT this month",
      revenue: "Collections",
    },
    highlights: [
      {
        title: "Security",
        desc: "Access controls and encryption to protect firm data.",
      },
      {
        title: "Built-in AI",
        desc: "Juria speeds research, analysis, and drafting without leaving JURE.",
      },
      {
        title: "One workspace",
        desc: "Matters, clients, calendar, finance, and team in a single platform.",
      },
    ],
  },
  ar: {
    htmlLang: "ar",
    dir: "rtl",
    back: "رجوع",
    title: "عرض JURE",
    subtitle: "استكشف وحدات المنتج الحقيقية — نفس الأدوات التي ستستخدمها في مساحة عملك.",
    cta: "ابدأ الآن",
    prev: "السابق",
    next: "التالي",
    themeToggle: { label: "تبديل السمة", title: "تبديل السمة" },
    steps: [
      {
        id: "dashboard",
        title: "لوحة التحكم",
        description: "نظرة عامة على القضايا والمواعيد والرسائل مع وصول سريع إلى Juria.",
      },
      {
        id: "juria",
        title: "Juria — الذكاء القانوني",
        description: "دردشة قانونية، تحليل عقود، بحث وصياغة بمساعدة الذكاء الاصطناعي داخل JURE.",
      },
      {
        id: "cases",
        title: "إدارة القضايا",
        description: "تتبع القضايا حسب الحالة والعميل والمواعيد والمستندات والفريق.",
      },
      {
        id: "clients",
        title: "إدارة العملاء",
        description: "ركّز ملفات العملاء وجهات الاتصال والتاريخ المرتبط بقضاياك.",
      },
      {
        id: "library",
        title: "مكتبة المستندات",
        description: "نظّم المجلدات وابحث وحمّل مستنداتك المهنية.",
      },
      {
        id: "calendar",
        title: "التقويم والمهام",
        description: "جدول الجلسات والمواعيد والمهام عبر تقويم مدمج.",
      },
      {
        id: "collab",
        title: "المحادثات والفريق",
        description: "مراسلة داخلية ونشاط الفريق والتعاون على القضايا.",
      },
      {
        id: "finance",
        title: "المالية",
        description: "فواتير ومدفوعات ومتابعة الضريبة لإدارة نشاط المكتب.",
      },
    ],
    mock: {
      urgent: "عاجل",
      inProgress: "قيد التنفيذ",
      caseSale: "بيع عقاري",
      caseDivorce: "طلاق بالتراضي",
      rdvToday: "3 مواعيد اليوم",
      nextAt: "التالي: 14:30",
      newMessages: "7 رسائل جديدة",
      juriaReady: "Juria جاهزة لمساعدتك",
      start: "افتح Juria",
      modes: ["دردشة قانونية", "تحليل عقد", "بحث", "صياغة"],
      userAsk: "حلّل عقد الإيجار وحدّد البنود الخطرة.",
      aiReply: "3 نقاط: الإنهاء (12)، الضمان (8)، الأعباء غير المفصّلة (15).",
      caseTitle: "Dupont ضد Martin",
      client: "العميل",
      type: "النوع",
      deadline: "الموعد",
      commercial: "تجاري",
      daysLeft: "3 أيام",
      docs: "مستندات",
      tasks: "مهام",
      notes: "ملاحظات",
      team: "الفريق",
      hearing: "الجلسة القادمة",
      clientCard: "ماري دوبون",
      clientMeta: "12 قضية · نشط",
      lastContact: "آخر تواصل: أمس",
      searchPlaceholder: "ابحث في المستندات…",
      folderContracts: "عقود",
      folderPleadings: "مذكرات",
      folderEvidence: "أدلة",
      files: "ملفات",
      agenda: "الأجندة",
      taskDue: "موعد قضية",
      appointment: "لقاء عميل",
      hearingShort: "جلسة",
      inbox: "المحادثات",
      unread: "غير مقروء",
      online: "متصل",
      away: "غائب",
      roleLead: "محامٍ رئيسي",
      roleCollab: "مساعدة",
      invoice: "فاتورة",
      paid: "مدفوعة",
      pending: "معلّقة",
      tva: "الضريبة هذا الشهر",
      revenue: "التحصيلات",
    },
    highlights: [
      {
        title: "الأمان",
        desc: "ضوابط وصول وتشفير لحماية بيانات المكتب.",
      },
      {
        title: "ذكاء مدمج",
        desc: "Juria تسرّع البحث والتحليل والصياغة دون مغادرة JURE.",
      },
      {
        title: "مساحة موحّدة",
        desc: "قضايا وعملاء وتقويم ومالية وفريق في منصة واحدة.",
      },
    ],
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
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
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
      size="icon"
      className="border-[#A58CF4]/20 dark:border-[#A58CF4]/30"
      aria-label={label || "Toggle theme"}
      title={title || "Toggle theme"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
};

const LangSwitcher: React.FC<{ lang: Lang; onChange: (l: Lang) => void }> = ({
  lang,
  onChange,
}) => (
  <div className="inline-flex overflow-hidden rounded-lg border border-[#A58CF4]/20 bg-white/50 backdrop-blur-sm dark:border-[#A58CF4]/30 dark:bg-slate-900/40" dir="ltr">
    {(["fr", "en", "ar"] as Lang[]).map((code) => (
      <button
        key={code}
        onClick={() => onChange(code)}
        className={`px-2.5 py-1.5 text-xs sm:text-sm transition-colors ${
          lang === code
            ? "bg-[#A58CF4] text-white"
            : "text-slate-700 dark:text-slate-200 hover:bg-[#F4F1FF] dark:hover:bg-[#A58CF4]/20"
        }`}
      >
        {code.toUpperCase()}
      </button>
    ))}
  </div>
);

const MockPane: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div
    className={`rounded-xl p-4 sm:p-5 min-h-[280px] sm:min-h-[320px] bg-gradient-to-br from-white/80 to-[#F4F1FF]/60 dark:from-slate-900/70 dark:to-[#2A1F4A]/40 border border-[#A58CF4]/10 dark:border-[#A58CF4]/20 ${className}`}
  >
    {children}
  </div>
);

const SoftCard: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = "",
  delay = 0,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`rounded-xl bg-white/90 dark:bg-slate-900/70 border border-[#A58CF4]/10 dark:border-[#A58CF4]/15 p-3 sm:p-4 shadow-sm ${className}`}
    >
      {children}
    </motion.div>
  );
};

const ScaleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18M5 7h14M7 7l-3 7h6L7 7zm10 0l-3 7h6l-3-7z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function StepMock({ stepId, m, isRtl }: { stepId: string; m: any; isRtl: boolean }) {
  switch (stepId) {
    case "dashboard":
      return (
        <MockPane>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 h-full">
            <div className="space-y-3">
              <SoftCard>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-xs font-medium">{m.urgent}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{m.caseSale}</p>
              </SoftCard>
              <SoftCard delay={0.08}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-medium">{m.inProgress}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{m.caseDivorce}</p>
              </SoftCard>
            </div>
            <div className="space-y-3">
              <SoftCard delay={0.1}>
                <Calendar className="w-5 h-5 text-[#A58CF4] dark:text-[#A58CF4] mb-2" />
                <p className="text-sm font-medium">{m.rdvToday}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{m.nextAt}</p>
              </SoftCard>
              <SoftCard delay={0.16}>
                <MessageSquare className="w-5 h-5 text-[#A58CF4] dark:text-[#A58CF4] mb-2" />
                <p className="text-sm font-medium">{m.newMessages}</p>
              </SoftCard>
            </div>
            <SoftCard
              delay={0.12}
              className="!bg-gradient-to-br from-[#A58CF4] to-[#4D3680] text-white !border-transparent"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center landing-bot-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <span className="font-display font-semibold">Juria</span>
              </div>
              <p className="text-xs text-white/90 mb-3">{m.juriaReady}</p>
              <span className="inline-flex text-[11px] font-medium bg-white text-[#A58CF4] px-3 py-1.5 rounded-lg">
                {m.start}
              </span>
            </SoftCard>
          </div>
        </MockPane>
      );

    case "juria":
      return (
        <MockPane>
          <div className="flex flex-wrap gap-2 mb-4">
            {m.modes.map((mode: string, i: number) => (
              <span
                key={mode}
                className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full border ${
                  i === 1
                    ? "bg-[#A58CF4] text-white border-transparent"
                    : "border-[#A58CF4]/25 dark:border-[#A58CF4]/30 text-slate-600 dark:text-slate-300"
                }`}
              >
                {mode}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            <SoftCard className={isRtl ? "" : ""}>
              <div className={`flex gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#A58CF4] to-[#A58CF4] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  U
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-200">{m.userAsk}</p>
              </div>
            </SoftCard>
            <SoftCard
              delay={0.15}
              className="bg-gradient-to-r from-[#A58CF4] to-[#4D3680] text-white border-0"
            >
              <div className={`flex gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0 landing-bot-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs text-white/95 leading-relaxed">{m.aiReply}</p>
              </div>
            </SoftCard>
            <SoftCard delay={0.25} className="flex items-center gap-3 max-w-xs">
              <FileText className="w-8 h-8 text-[#A58CF4] dark:text-[#A58CF4]" />
              <div>
                <p className="text-xs font-medium">bail_commercial.pdf</p>
                <p className="text-[10px] text-slate-500">PDF · 240 KB</p>
              </div>
            </SoftCard>
          </div>
        </MockPane>
      );

    case "cases":
      return (
        <MockPane>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <SoftCard className="sm:col-span-3">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h4 className="font-display font-semibold text-sm">{m.caseTitle}</h4>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full">
                  {m.inProgress}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div>
                  <p className="text-slate-500">{m.client}</p>
                  <p className="font-medium">M. Dupont</p>
                </div>
                <div>
                  <p className="text-slate-500">{m.type}</p>
                  <p className="font-medium">{m.commercial}</p>
                </div>
                <div>
                  <p className="text-slate-500">{m.deadline}</p>
                  <p className="font-medium text-amber-600 dark:text-amber-400">{m.daysLeft}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  [m.docs, "12", "bg-sky-500"],
                  [m.tasks, "5", "bg-[#A58CF4]"],
                  [m.notes, "8", "bg-emerald-500"],
                ].map(([label, n, dot]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg bg-slate-50 dark:bg-slate-800/60 px-2 py-2 text-[11px] flex items-center gap-2"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    {label}: {n}
                  </div>
                ))}
              </div>
            </SoftCard>
            <div className="space-y-3">
              <SoftCard delay={0.1}>
                <Users className="w-5 h-5 text-slate-400 mb-2" />
                <p className="text-xs font-medium mb-2">{m.team}</p>
                <div className="flex -space-x-1 rtl:space-x-reverse">
                  <div className="w-6 h-6 rounded-full bg-[#A58CF4] border-2 border-white dark:border-slate-900" />
                  <div className="w-6 h-6 rounded-full bg-[#A58CF4] border-2 border-white dark:border-slate-900" />
                  <div className="w-6 h-6 rounded-full bg-[#4D3680] border-2 border-white dark:border-slate-900" />
                </div>
              </SoftCard>
              <SoftCard delay={0.18}>
                <Calendar className="w-5 h-5 text-slate-400 mb-2" />
                <p className="text-xs font-medium">{m.hearing}</p>
                <p className="text-[11px] text-slate-500">15 Nov</p>
              </SoftCard>
            </div>
          </div>
        </MockPane>
      );

    case "clients":
      return (
        <MockPane>
          <div className="grid sm:grid-cols-2 gap-3">
            <SoftCard>
              <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#A58CF4] to-[#A58CF4] flex items-center justify-center text-white">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-display font-semibold text-sm">{m.clientCard}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.clientMeta}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-3">{m.lastContact}</p>
            </SoftCard>
            <SoftCard delay={0.1}>
              <Briefcase className="w-5 h-5 text-[#A58CF4] dark:text-[#A58CF4] mb-2" />
              <p className="text-xs font-medium mb-2">{m.caseTitle}</p>
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full w-2/3 bg-gradient-to-r from-[#A58CF4] to-[#A58CF4]" />
                </div>
                <p className="text-[10px] text-slate-500">{m.inProgress}</p>
              </div>
            </SoftCard>
            <SoftCard delay={0.15} className="sm:col-span-2">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <p className="font-display text-lg font-bold text-[#A58CF4] dark:text-[#A58CF4]">12</p>
                  <p className="text-slate-500">{m.docs}</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-[#A58CF4] dark:text-[#A58CF4]">5</p>
                  <p className="text-slate-500">{m.tasks}</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-[#A58CF4] dark:text-[#A58CF4]">3</p>
                  <p className="text-slate-500">{m.hearingShort}</p>
                </div>
              </div>
            </SoftCard>
          </div>
        </MockPane>
      );

    case "library":
      return (
        <MockPane>
          <div className="grid sm:grid-cols-3 gap-3">
            <SoftCard className="sm:col-span-1">
              <Search className="w-5 h-5 text-slate-400 mb-2" />
              <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs text-slate-500 mb-2">
                {m.searchPlaceholder}
              </div>
              <Button size="sm" className="w-full bg-[#A58CF4] hover:bg-[#4D3680] text-xs h-8">
                <Search className="w-3.5 h-3.5" />
              </Button>
            </SoftCard>
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                [m.folderContracts, "24", BookOpen],
                [m.folderPleadings, "11", FileText],
                [m.folderEvidence, "38", Briefcase],
              ].map(([label, count, Icon], i) => {
                const I = Icon as React.FC<{ className?: string }>;
                return (
                  <SoftCard key={String(label)} delay={0.08 * i}>
                    <I className="w-5 h-5 text-[#A58CF4] dark:text-[#A58CF4] mb-2" />
                    <p className="text-xs font-medium">{label as string}</p>
                    <p className="text-[10px] text-slate-500">
                      {count as string} {m.files}
                    </p>
                  </SoftCard>
                );
              })}
            </div>
          </div>
        </MockPane>
      );

    case "calendar":
      return (
        <MockPane>
          <p className="font-display text-sm font-semibold mb-3">{m.agenda}</p>
          <div className="space-y-2">
            {[
              { time: "09:30", label: m.taskDue, icon: CheckSquare, color: "text-amber-500" },
              { time: "14:30", label: m.appointment, icon: UserCheck, color: "text-[#A58CF4]" },
              { time: "16:00", label: m.hearingShort, icon: ScaleIcon, color: "text-emerald-500" },
            ].map((row, i) => (
              <SoftCard key={row.time} delay={0.08 * i} className="flex items-center gap-3">
                <span className="text-xs font-mono tabular-nums text-slate-500 w-12">{row.time}</span>
                <row.icon className={`w-4 h-4 ${row.color}`} />
                <span className="text-xs font-medium">{row.label}</span>
              </SoftCard>
            ))}
          </div>
        </MockPane>
      );

    case "collab":
      return (
        <MockPane>
          <div className="grid sm:grid-cols-2 gap-3">
            <SoftCard>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold">{m.inbox}</p>
                <span className="text-[10px] bg-[#A58CF4]/15 text-[#A58CF4] dark:text-[#A58CF4] px-2 py-0.5 rounded-full">
                  7 {m.unread}
                </span>
              </div>
              <div className="space-y-2">
                {["Ahmed H.", "Sarah B."].map((name, i) => (
                  <div
                    key={name}
                    className={`flex items-center gap-2 text-xs ${isRtl ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                        i === 0 ? "bg-[#A58CF4]" : "bg-[#A58CF4]"
                      }`}
                    >
                      {name.slice(0, 1)}
                    </div>
                    <span className="font-medium">{name}</span>
                    <span className="ms-auto text-[10px] text-slate-400">2m</span>
                  </div>
                ))}
              </div>
            </SoftCard>
            <SoftCard delay={0.1}>
              <p className="text-xs font-semibold mb-3">{m.team}</p>
              <div className="space-y-3">
                <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-[#A58CF4] text-white text-[10px] font-bold flex items-center justify-center">
                    AH
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Ahmed Hassan</p>
                    <p className="text-[10px] text-slate-500">{m.roleLead}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title={m.online} />
                </div>
                <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="w-8 h-8 rounded-full bg-[#A58CF4] text-white text-[10px] font-bold flex items-center justify-center">
                    SB
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Sarah Benali</p>
                    <p className="text-[10px] text-slate-500">{m.roleCollab}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-amber-400" title={m.away} />
                </div>
              </div>
            </SoftCard>
          </div>
        </MockPane>
      );

    case "finance":
      return (
        <MockPane>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <SoftCard>
              <Wallet className="w-5 h-5 text-[#A58CF4] dark:text-[#A58CF4] mb-2" />
              <p className="text-[10px] text-slate-500">{m.revenue}</p>
              <p className="font-display text-xl font-bold">48 200 €</p>
            </SoftCard>
            <SoftCard delay={0.08}>
              <p className="text-[10px] text-slate-500 mb-1">{m.tva}</p>
              <p className="font-display text-xl font-bold">9 640 €</p>
            </SoftCard>
            <SoftCard delay={0.12}>
              <p className="text-[10px] text-slate-500 mb-1">{m.invoice}</p>
              <p className="font-display text-xl font-bold">14</p>
            </SoftCard>
          </div>
          <div className="space-y-2">
            {[
              ["INV-2401", m.paid, "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"],
              ["INV-2402", m.pending, "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"],
            ].map(([id, status, cls], i) => (
              <SoftCard key={id as string} delay={0.14 + i * 0.06} className="flex items-center justify-between text-xs">
                <span className="font-medium">{id as string}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${cls}`}>{status as string}</span>
              </SoftCard>
            ))}
          </div>
        </MockPane>
      );

    default:
      return null;
  }
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  dashboard: <Zap className="w-6 h-6" />,
  juria: <Bot className="w-6 h-6" />,
  cases: <Briefcase className="w-6 h-6" />,
  clients: <UserCheck className="w-6 h-6" />,
  library: <BookOpen className="w-6 h-6" />,
  calendar: <Calendar className="w-6 h-6" />,
  collab: <MessageSquare className="w-6 h-6" />,
  finance: <Wallet className="w-6 h-6" />,
};

const HIGHLIGHT_ICONS = [Shield, Sparkles, Users];

const Demo: React.FC = () => {
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const reduce = useReducedMotion();
  const isRtl = t.dir === "rtl";
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const steps = t.steps as { id: string; title: string; description: string }[];
  const stepCount = steps.length;

  useEffect(() => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(false);
  }, [lang]);

  useEffect(() => {
    if (!isPlaying || reduce) return;
    const interval = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentStep((s) => {
            if (s < stepCount - 1) return s + 1;
            setIsPlaying(false);
            return s;
          });
          return 0;
        }
        return prev + 2;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [isPlaying, stepCount, reduce]);

  const goStep = (index: number) => {
    setCurrentStep(index);
    setProgress(0);
    setIsPlaying(false);
  };

  const active = steps[currentStep];
  const highlightIcons = useMemo(() => HIGHLIGHT_ICONS, []);

  return (
    <div className="landing-root min-h-screen relative overflow-x-hidden text-[#64499D] dark:text-white bg-white dark:bg-[#64499D]">
      <RouteSeo routeKey="demo" lang={lang} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 overflow-x-hidden">
        {/* Header */}
        <header className="landing-glass rounded-2xl px-3 sm:px-5 py-2.5 sm:py-3 mb-6 sm:mb-8 flex flex-col min-[480px]:flex-row flex-wrap items-stretch min-[480px]:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <Button
              onClick={() => navigate(`/${lang}`)}
              variant="outline"
              size="sm"
              className="landing-btn-secondary shrink-0 px-2.5 sm:px-3"
            >
              <ArrowLeft className={`w-4 h-4 me-1.5 sm:me-2 ${isRtl ? "rotate-180" : ""}`} />
              <span className="truncate max-w-[8rem] sm:max-w-none">{t.back}</span>
            </Button>

            <div className="flex items-center gap-1.5 sm:gap-2 min-[480px]:hidden shrink-0">
              <LangSwitcher lang={lang} onChange={setLang} />
              <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title} />
            </div>
          </div>

          <div className="w-full min-[480px]:w-auto min-[480px]:flex-1 text-center min-w-0 px-1">
            <h1 className="font-display text-lg sm:text-2xl md:text-3xl font-bold tracking-tight break-words text-[#64499D] dark:text-white">
              {t.title}
            </h1>
            <p className="text-neutral-600 dark:text-neutral-300 text-xs sm:text-sm mt-1 max-w-md mx-auto break-words">
              {t.subtitle}
            </p>
          </div>

          <div className="hidden min-[480px]:flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LangSwitcher lang={lang} onChange={setLang} />
            <ThemeToggle label={t.themeToggle.label} title={t.themeToggle.title} />
            <Button
              onClick={() => navigate("/signin")}
              size="sm"
              className="landing-btn-primary hidden sm:inline-flex"
            >
              {t.cta}
            </Button>
          </div>
        </header>

        {/* Step pills */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => goStep(index)}
              aria-label={step.title}
              aria-current={index === currentStep ? "step" : undefined}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "w-8 bg-[#A58CF4] shadow-[0_0_12px_rgba(100,73,157,0.55)]"
                  : index < currentStep
                    ? "w-2.5 bg-[#A58CF4]"
                    : "w-2.5 bg-slate-300 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>

        {/* Main stage */}
        <Card className="landing-glass border-0 shadow-none overflow-hidden ring-1 ring-[#A58CF4]/12 dark:ring-[#A58CF4]/20">
          <CardHeader className="border-b border-[#A58CF4]/10 dark:border-[#A58CF4]/15 bg-gradient-to-r from-[#F4F1FF]/80 to-transparent dark:from-[#A58CF4]/15 dark:to-transparent pb-4">
            <div
              className={`flex flex-col sm:flex-row items-center gap-4 text-center sm:text-start ${
                isRtl ? "sm:flex-row-reverse sm:text-end" : ""
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#A58CF4] to-[#4D3680] flex items-center justify-center text-white shrink-0 shadow-[0_0_24px_-4px_rgba(100,73,157,0.6)]">
                {STEP_ICONS[active.id]}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="font-display text-xl sm:text-2xl tracking-tight">
                  {active.title}
                </CardTitle>
                <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">{active.description}</p>
              </div>
              <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400 font-medium">
                {currentStep + 1} / {stepCount}
              </span>
            </div>
            <div className="w-full bg-slate-200/80 dark:bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#A58CF4] to-[#A58CF4] transition-[width] duration-200 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${lang}-${active.id}`}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <StepMock stepId={active.id} m={t.mock} isRtl={isRtl} />
              </motion.div>
            </AnimatePresence>

            <div
              className={`flex items-center justify-between mt-6 sm:mt-8 gap-2 ${
                isRtl ? "flex-row-reverse" : ""
              }`}
            >
              <Button
                onClick={() => goStep(Math.max(0, currentStep - 1))}
                variant="outline"
                disabled={currentStep === 0}
                className="border-[#A58CF4]/20"
              >
                <ArrowLeft className={`w-4 h-4 me-2 ${isRtl ? "rotate-180" : ""}`} />
                {t.prev}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setCurrentStep(0);
                    setProgress(0);
                    setIsPlaying(false);
                  }}
                  variant="outline"
                  size="icon"
                  className="border-[#A58CF4]/20"
                  aria-label="restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setIsPlaying((p) => !p)}
                  size="icon"
                  className="landing-btn-primary"
                  aria-label={isPlaying ? "pause" : "play"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
              </div>

              <Button
                onClick={() => goStep(Math.min(stepCount - 1, currentStep + 1))}
                variant="outline"
                disabled={currentStep === stepCount - 1}
                className="border-[#A58CF4]/20"
              >
                {t.next}
                <ArrowRight className={`w-4 h-4 ms-2 ${isRtl ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-8 sm:mt-10 mb-8">
          {t.highlights.map((h: { title: string; desc: string }, i: number) => {
            const Icon = highlightIcons[i] || Shield;
            return (
              <Reveal key={h.title} delay={i * 0.06}>
                <div className="landing-glass landing-glass-glow rounded-2xl p-5 sm:p-6 text-center h-full min-w-0">
                  <Icon className="w-10 h-10 text-[#A58CF4] dark:text-[#A58CF4] mx-auto mb-3" />
                  <h3 className="font-display font-semibold mb-2 break-words">{h.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed break-words">{h.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="text-center sm:hidden">
          <Button
            onClick={() => navigate("/signin")}
            className="landing-btn-primary w-full"
          >
            {t.cta}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Demo;
