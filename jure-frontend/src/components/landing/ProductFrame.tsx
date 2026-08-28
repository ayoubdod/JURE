import React from "react";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Paperclip,
  Phone,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import type { MarketingLocale } from "@/marketing/site";

/**
 * Static, truthful replicas of the real JURE application UI, used as product
 * evidence on marketing pages. Every element shown here corresponds to a
 * shipped capability: cases with client/documents/tasks/deadlines/team,
 * the document library, team chat with calls, and the Juria assistant
 * (early access). Nothing invented.
 */

type Lang = MarketingLocale;

const FRAME_STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    cases: "Cases",
    clients: "Clients",
    library: "Library",
    messages: "Messages",
    calendar: "Calendar",
    caseTitle: "Commercial lease dispute",
    caseClient: "Client",
    clientName: "Atlas Textile SARL",
    statusActive: "Active",
    litigation: "Litigation",
    tabDocuments: "Documents",
    tabTasks: "Tasks",
    tabTeam: "Team",
    doc1: "Lease agreement — 2019.pdf",
    doc2: "Formal notice — draft.docx",
    doc3: "Hearing notes — 12 May.pdf",
    task1: "File submissions with the court",
    task2: "Prepare witness summary",
    due: "Due",
    deadline: "Hearing — Commercial Court",
    team: "3 members assigned",
    searchDocs: "Search documents…",
    catContracts: "Contracts",
    catPleadings: "Pleadings",
    catCorrespondence: "Correspondence",
    updated: "Updated",
    preview: "Preview",
    convTitle: "Litigation team",
    msg1: "Hearing moved to Thursday — updating the case deadline now.",
    msg2: "Noted. I attached the revised submissions to the case.",
    msgAttachment: "submissions-v2.docx",
    call: "Call",
    typeMessage: "Write a message…",
    juriaTitle: "Juria — Legal AI",
    earlyAccess: "Early access",
    juriaPrompt: "Analyze this supply contract and flag key clauses.",
    juriaAnswerTitle: "Contract analysis",
    juriaPoint1: "Exclusivity clause — 5-year term (art. 4)",
    juriaPoint2: "Unilateral termination right for supplier (art. 11)",
    juriaPoint3: "Penalty ceiling unclear — review recommended (art. 14)",
    humanReview: "Awaiting lawyer review",
    aiDisclaimer: "AI output — verify before use",
  },
  fr: {
    dashboard: "Tableau de bord",
    cases: "Dossiers",
    clients: "Clients",
    library: "Bibliothèque",
    messages: "Messages",
    calendar: "Agenda",
    caseTitle: "Litige de bail commercial",
    caseClient: "Client",
    clientName: "Atlas Textile SARL",
    statusActive: "Actif",
    litigation: "Contentieux",
    tabDocuments: "Documents",
    tabTasks: "Tâches",
    tabTeam: "Équipe",
    doc1: "Contrat de bail — 2019.pdf",
    doc2: "Mise en demeure — brouillon.docx",
    doc3: "Notes d'audience — 12 mai.pdf",
    task1: "Déposer les conclusions au tribunal",
    task2: "Préparer la synthèse des témoignages",
    due: "Échéance",
    deadline: "Audience — Tribunal de commerce",
    team: "3 membres assignés",
    searchDocs: "Rechercher des documents…",
    catContracts: "Contrats",
    catPleadings: "Écritures",
    catCorrespondence: "Correspondance",
    updated: "Mis à jour",
    preview: "Aperçu",
    convTitle: "Équipe contentieux",
    msg1: "Audience reportée à jeudi — je mets à jour l'échéance du dossier.",
    msg2: "Bien noté. J'ai joint les conclusions révisées au dossier.",
    msgAttachment: "conclusions-v2.docx",
    call: "Appel",
    typeMessage: "Écrire un message…",
    juriaTitle: "Juria — IA juridique",
    earlyAccess: "Accès anticipé",
    juriaPrompt: "Analyse ce contrat de fourniture et signale les clauses clés.",
    juriaAnswerTitle: "Analyse du contrat",
    juriaPoint1: "Clause d'exclusivité — durée de 5 ans (art. 4)",
    juriaPoint2: "Résiliation unilatérale au profit du fournisseur (art. 11)",
    juriaPoint3: "Plafond de pénalités imprécis — relecture recommandée (art. 14)",
    humanReview: "En attente de relecture par l'avocat",
    aiDisclaimer: "Résultat d'IA — à vérifier avant usage",
  },
  ar: {
    dashboard: "لوحة التحكم",
    cases: "الملفات",
    clients: "العملاء",
    library: "المكتبة",
    messages: "الرسائل",
    calendar: "المفكرة",
    caseTitle: "نزاع عقد إيجار تجاري",
    caseClient: "العميل",
    clientName: "أطلس للنسيج ش.ذ.م.م",
    statusActive: "نشط",
    litigation: "نزاع قضائي",
    tabDocuments: "المستندات",
    tabTasks: "المهام",
    tabTeam: "الفريق",
    doc1: "عقد الإيجار — 2019.pdf",
    doc2: "إنذار رسمي — مسودة.docx",
    doc3: "ملاحظات الجلسة — 12 مايو.pdf",
    task1: "إيداع المذكرات لدى المحكمة",
    task2: "إعداد ملخص الشهادات",
    due: "الاستحقاق",
    deadline: "جلسة — المحكمة التجارية",
    team: "3 أعضاء معينون",
    searchDocs: "البحث في المستندات…",
    catContracts: "العقود",
    catPleadings: "المذكرات",
    catCorrespondence: "المراسلات",
    updated: "آخر تحديث",
    preview: "معاينة",
    convTitle: "فريق النزاعات",
    msg1: "تأجلت الجلسة إلى الخميس — سأحدّث موعد الملف الآن.",
    msg2: "تمام. أرفقت المذكرات المعدلة بالملف.",
    msgAttachment: "المذكرات-v2.docx",
    call: "مكالمة",
    typeMessage: "اكتب رسالة…",
    juriaTitle: "جوريا — الذكاء الاصطناعي القانوني",
    earlyAccess: "وصول مبكر",
    juriaPrompt: "حلّل عقد التوريد هذا وحدّد البنود الأساسية.",
    juriaAnswerTitle: "تحليل العقد",
    juriaPoint1: "بند الحصرية — مدة 5 سنوات (المادة 4)",
    juriaPoint2: "حق الفسخ الانفرادي لصالح المورد (المادة 11)",
    juriaPoint3: "سقف الغرامات غير واضح — تُنصح المراجعة (المادة 14)",
    humanReview: "في انتظار مراجعة المحامي",
    aiDisclaimer: "مخرجات ذكاء اصطناعي — تحقق قبل الاستخدام",
  },
};

const Chrome: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = "",
}) => (
  <div
    className={`landing-glass landing-panel-glow rounded-2xl overflow-hidden text-start ${className}`}
    role="img"
    aria-label={title}
  >
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#A58CF4]/10 dark:border-[#A58CF4]/15 bg-white/40 dark:bg-slate-950/40">
      <span className="w-2.5 h-2.5 rounded-full bg-[#A58CF4]/30" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#A58CF4]/20" />
      <span className="w-2.5 h-2.5 rounded-full bg-[#A58CF4]/10" />
      <span className="ms-2 text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
        {title}
      </span>
    </div>
    {children}
  </div>
);

const SideNav: React.FC<{ t: Record<string, string>; active: string }> = ({ t, active }) => {
  const items = [
    { key: "dashboard", icon: LayoutDashboard },
    { key: "cases", icon: Briefcase },
    { key: "clients", icon: Users },
    { key: "library", icon: FolderOpen },
    { key: "messages", icon: MessageSquare },
    { key: "calendar", icon: Calendar },
  ];
  return (
    <div className="hidden sm:flex flex-col gap-1 p-3 border-e border-[#A58CF4]/10 dark:border-[#A58CF4]/15 min-w-[130px] bg-white/30 dark:bg-slate-950/30">
      {items.map(({ key, icon: Icon }) => (
        <div
          key={key}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${
            key === active
              ? "bg-[#A58CF4]/10 text-[#A58CF4] dark:bg-[#A58CF4]/25 dark:text-[#A58CF4]"
              : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t[key]}</span>
        </div>
      ))}
    </div>
  );
};

/** Case workspace: matter + client + documents + tasks + deadline + team. */
export const CaseWorkspaceFrame: React.FC<{ lang: Lang; className?: string }> = ({
  lang,
  className,
}) => {
  const t = FRAME_STRINGS[lang];
  return (
    <Chrome title={`JURE — ${t.cases}`} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="cases" />
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{t.caseTitle}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t.caseClient}: {t.clientName}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {t.statusActive}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#A58CF4]/10 text-[#A58CF4] dark:text-[#A58CF4]">
                {t.litigation}
              </span>
            </div>
          </div>

          <div className="flex gap-3 text-[11px] font-medium border-b border-[#A58CF4]/10 dark:border-[#A58CF4]/15 pb-1.5">
            <span className="text-[#A58CF4] dark:text-[#A58CF4] border-b-2 border-[#A58CF4] pb-1 -mb-2">
              {t.tabDocuments}
            </span>
            <span className="text-slate-400">{t.tabTasks}</span>
            <span className="text-slate-400">{t.tabTeam}</span>
          </div>

          <div className="space-y-1.5">
            {[t.doc1, t.doc2, t.doc3].map((doc) => (
              <div
                key={doc}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-[#A58CF4]/8 dark:border-[#A58CF4]/10"
              >
                <FileText className="w-3.5 h-3.5 text-[#A58CF4] dark:text-[#A58CF4] shrink-0" />
                <span className="text-[11px] truncate">{doc}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[t.task1, t.task2].map((task, i) => (
              <div
                key={task}
                className="flex items-start gap-2 px-2.5 py-2 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-[#A58CF4]/8 dark:border-[#A58CF4]/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#A58CF4] dark:text-[#A58CF4] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium truncate">{task}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t.due} {i === 0 ? "18/09" : "25/09"}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#A58CF4]/5 dark:bg-[#A58CF4]/15 border border-[#A58CF4]/15 dark:border-[#A58CF4]/20">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[#A58CF4] dark:text-[#A58CF4]">
              <Calendar className="w-3.5 h-3.5" /> {t.deadline} — 02/10
            </div>
            <div className="flex items-center gap-1">
              {["SA", "MK", "YB"].map((ini) => (
                <span
                  key={ini}
                  className="w-5 h-5 rounded-full bg-[#A58CF4] text-white text-[8px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 -ms-1 first:ms-0"
                >
                  {ini}
                </span>
              ))}
              <span className="ms-1.5 text-[10px] text-slate-500 dark:text-slate-400">{t.team}</span>
            </div>
          </div>
        </div>
      </div>
    </Chrome>
  );
};

/** Document library: categories, search, previewable documents. */
export const LibraryFrame: React.FC<{ lang: Lang; className?: string }> = ({ lang, className }) => {
  const t = FRAME_STRINGS[lang];
  return (
    <Chrome title={`JURE — ${t.library}`} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="library" />
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-[#A58CF4]/10 dark:border-[#A58CF4]/15">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-400">{t.searchDocs}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[t.catContracts, t.catPleadings, t.catCorrespondence].map((cat, i) => (
              <span
                key={cat}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  i === 0
                    ? "bg-[#A58CF4] text-white"
                    : "bg-[#A58CF4]/10 text-[#A58CF4] dark:bg-[#A58CF4]/20 dark:text-[#A58CF4]"
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[t.doc1, t.doc2, t.doc3].map((doc) => (
              <div
                key={doc}
                className="p-2.5 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-[#A58CF4]/8 dark:border-[#A58CF4]/10 space-y-1.5"
              >
                <FileText className="w-4 h-4 text-[#A58CF4] dark:text-[#A58CF4]" />
                <div className="text-[10px] font-medium leading-tight line-clamp-2">{doc}</div>
                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span>{t.updated} 08/09</span>
                  <span className="text-[#A58CF4] dark:text-[#A58CF4]">{t.preview}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Chrome>
  );
};

/** Team collaboration: real-time chat with attachments and calls. */
export const ChatFrame: React.FC<{ lang: Lang; className?: string }> = ({ lang, className }) => {
  const t = FRAME_STRINGS[lang];
  return (
    <Chrome title={`JURE — ${t.messages}`} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="messages" />
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#A58CF4]/10 dark:border-[#A58CF4]/15">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-6 h-6 rounded-full bg-[#A58CF4]/15 text-[#A58CF4] dark:text-[#A58CF4] text-[9px] font-bold flex items-center justify-center shrink-0">
                LT
              </span>
              <span className="text-[12px] font-semibold truncate">{t.convTitle}</span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#A58CF4] dark:text-[#A58CF4]">
              <Phone className="w-3 h-3" /> {t.call}
            </span>
          </div>

          <div className="space-y-2">
            <div className="max-w-[85%] px-3 py-2 rounded-2xl rounded-ss-sm bg-white/60 dark:bg-slate-900/60 border border-[#A58CF4]/8 dark:border-[#A58CF4]/10 text-[11px]">
              {t.msg1}
            </div>
            <div className="max-w-[85%] ms-auto px-3 py-2 rounded-2xl rounded-se-sm bg-[#A58CF4] text-white text-[11px] space-y-1.5">
              <div>{t.msg2}</div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/15 text-[10px]">
                <Paperclip className="w-3 h-3" /> {t.msgAttachment}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/60 dark:bg-slate-900/60 border border-[#A58CF4]/10 dark:border-[#A58CF4]/15">
            <span className="text-[11px] text-slate-400 flex-1 truncate">{t.typeMessage}</span>
            <Send className="w-3.5 h-3.5 text-[#A58CF4] dark:text-[#A58CF4] shrink-0" />
          </div>
        </div>
      </div>
    </Chrome>
  );
};

/** Juria legal AI: contract analysis with explicit human review. Early access. */
export const JuriaFrame: React.FC<{ lang: Lang; className?: string }> = ({ lang, className }) => {
  const t = FRAME_STRINGS[lang];
  return (
    <Chrome title={t.juriaTitle} className={className}>
      <div className="p-4 space-y-3 text-slate-700 dark:text-slate-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#A58CF4] to-[#A58CF4] flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-white" />
            </span>
            <span className="text-[12px] font-semibold">{t.juriaTitle}</span>
          </div>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            {t.earlyAccess}
          </span>
        </div>

        <div className="max-w-[90%] ms-auto px-3 py-2 rounded-2xl rounded-se-sm bg-[#A58CF4] text-white text-[11px]">
          {t.juriaPrompt}
        </div>

        <div className="max-w-[92%] px-3 py-2.5 rounded-2xl rounded-ss-sm bg-white/60 dark:bg-slate-900/60 border border-[#A58CF4]/10 dark:border-[#A58CF4]/15 space-y-1.5">
          <div className="text-[11px] font-semibold text-[#A58CF4] dark:text-[#A58CF4]">
            {t.juriaAnswerTitle}
          </div>
          {[t.juriaPoint1, t.juriaPoint2, t.juriaPoint3].map((point) => (
            <div key={point} className="flex items-start gap-1.5 text-[10.5px] leading-snug">
              <span className="w-1 h-1 rounded-full bg-[#A58CF4] mt-1.5 shrink-0" />
              {point}
            </div>
          ))}
          <div className="text-[9px] text-slate-400 pt-1 border-t border-[#A58CF4]/10 dark:border-[#A58CF4]/15">
            {t.aiDisclaimer}
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-[10px] font-medium text-amber-700 dark:text-amber-400">
          <Users className="w-3.5 h-3.5 shrink-0" /> {t.humanReview}
        </div>
      </div>
    </Chrome>
  );
};
