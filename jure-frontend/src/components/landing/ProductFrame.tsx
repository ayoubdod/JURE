import React from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Mail,
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
 * the document library, team chat with calls, calendar, team roster, and the
 * Juria assistant (early access). Nothing invented.
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
    kpiCases: "Active cases",
    kpiConsult: "Consultations today",
    kpiDocs: "Pending review",
    upcoming: "Upcoming",
    recentMatters: "Recent matters",
    consultTitle: "Intake — Atlas Textile",
    consultTime: "Today · 10:30",
    eventHearing: "Hearing — Commercial Court",
    eventHearingTime: "Thu · 14:00",
    eventReview: "Team case review",
    eventReviewTime: "Fri · 09:30",
    thisWeek: "This week",
    company: "Company",
    clientEmail: "legal@atlas-textile.ma",
    clientPhone: "+212 522 00 00 00",
    openMatters: "2 open matters",
    teamPage: "Team",
    member1: "Sara Amrani",
    member2: "Mehdi Kabbaj",
    member3: "Yasmine Benali",
    rolePartner: "Partner",
    roleAssociate: "Associate",
    roleAssistant: "Legal assistant",
    online: "Online",
    analysisReady: "Legal analysis ready",
    juriaAnalysis: "Legal Analysis",
    matterType: "Matter type",
    statusLabel: "Status",
    typeHearing: "Hearing",
    typeConsult: "Consultation",
    typeInternal: "Internal",
    assignedTo: "Assigned",
    brand: "JURE",
    juriaMatter: "Matter",
    juriaMatterName: "Property ownership dispute",
    juriaStatus: "Status",
    juriaStatusDone: "Analysis completed",
    juriaIssues: "Key issues",
    juriaIssue1: "Ownership",
    juriaIssue2: "Registration",
    juriaIssue3: "Mortgage",
    juriaIssue4: "Co-ownership",
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
    kpiCases: "Dossiers actifs",
    kpiConsult: "Consultations aujourd'hui",
    kpiDocs: "En relecture",
    upcoming: "À venir",
    recentMatters: "Dossiers récents",
    consultTitle: "Entretien — Atlas Textile",
    consultTime: "Aujourd'hui · 10:30",
    eventHearing: "Audience — Tribunal de commerce",
    eventHearingTime: "Jeu · 14:00",
    eventReview: "Revue d'équipe",
    eventReviewTime: "Ven · 09:30",
    thisWeek: "Cette semaine",
    company: "Société",
    clientEmail: "legal@atlas-textile.ma",
    clientPhone: "+212 522 00 00 00",
    openMatters: "2 dossiers ouverts",
    teamPage: "Équipe",
    member1: "Sara Amrani",
    member2: "Mehdi Kabbaj",
    member3: "Yasmine Benali",
    rolePartner: "Associée",
    roleAssociate: "Collaborateur",
    roleAssistant: "Assistante juridique",
    online: "En ligne",
    analysisReady: "Analyse juridique prête",
    juriaAnalysis: "Analyse juridique",
    matterType: "Type de dossier",
    statusLabel: "Statut",
    typeHearing: "Audience",
    typeConsult: "Consultation",
    typeInternal: "Interne",
    assignedTo: "Assigné",
    brand: "JURE",
    juriaMatter: "Affaire",
    juriaMatterName: "Litige de propriété",
    juriaStatus: "Statut",
    juriaStatusDone: "Analyse terminée",
    juriaIssues: "Points clés",
    juriaIssue1: "Propriété",
    juriaIssue2: "Immatriculation",
    juriaIssue3: "Hypothèque",
    juriaIssue4: "Indivision",
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
    kpiCases: "ملفات نشطة",
    kpiConsult: "استشارات اليوم",
    kpiDocs: "بانتظار المراجعة",
    upcoming: "القادم",
    recentMatters: "ملفات حديثة",
    consultTitle: "استشارة — أطلس للنسيج",
    consultTime: "اليوم · 10:30",
    eventHearing: "جلسة — المحكمة التجارية",
    eventHearingTime: "خميس · 14:00",
    eventReview: "مراجعة الفريق",
    eventReviewTime: "جمعة · 09:30",
    thisWeek: "هذا الأسبوع",
    company: "شركة",
    clientEmail: "legal@atlas-textile.ma",
    clientPhone: "+212 522 00 00 00",
    openMatters: "ملفان مفتوحان",
    teamPage: "الفريق",
    member1: "سارة عمراني",
    member2: "مهدي القباج",
    member3: "ياسمين بنعلي",
    rolePartner: "شريكة",
    roleAssociate: "محامٍ متعاون",
    roleAssistant: "مساعدة قانونية",
    online: "متصل",
    analysisReady: "التحليل القانوني جاهز",
    juriaAnalysis: "تحليل قانوني",
    matterType: "نوع الملف",
    statusLabel: "الحالة",
    typeHearing: "جلسة",
    typeConsult: "استشارة",
    typeInternal: "داخلي",
    assignedTo: "معيّن",
    brand: "JURE",
    juriaMatter: "القضية",
    juriaMatterName: "نزاع ملكية عقار",
    juriaStatus: "الحالة",
    juriaStatusDone: "اكتمل التحليل",
    juriaIssues: "المسائل الرئيسية",
    juriaIssue1: "الملكية",
    juriaIssue2: "التسجيل",
    juriaIssue3: "الرهن",
    juriaIssue4: "الملكية المشتركة",
  },
};

const Chrome: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({
  title,
  children,
  className = "",
}) => (
  <div
    className={`landing-app-frame overflow-hidden text-start ${className}`}
    role="img"
    aria-label={title}
  >
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#20004d]/8 dark:border-white/10 bg-[#f7f7f5] dark:bg-slate-950/50">
      <span className="text-[10px] font-bold tracking-[0.18em] text-[#20004d] dark:text-[#b968ff]">
        JURE
      </span>
      <span className="h-3 w-px bg-[#20004d]/12 dark:bg-white/15" />
      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
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
    <div className="hidden sm:flex flex-col gap-0.5 p-3 border-e border-[#20004d]/8 dark:border-white/10 min-w-[138px] bg-[#faf9f7] dark:bg-slate-950/40">
      {items.map(({ key, icon: Icon }) => (
        <div
          key={key}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium ${
            key === active
              ? "bg-[#2949E8]/10 text-[#2949E8] dark:bg-[#2949E8]/25 dark:text-[#B968FF]"
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
    <Chrome title={t.cases} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="cases" />
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold tracking-tight truncate">{t.caseTitle}</div>
              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {t.caseClient}: {t.clientName}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                {t.statusActive}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2949E8]/10 text-[#2949E8] dark:text-[#B968FF]">
                {t.litigation}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              [t.caseClient, t.clientName],
              [t.matterType, t.litigation],
              [t.statusLabel, t.statusActive],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-md border border-[#20004d]/8 dark:border-white/10 bg-white dark:bg-slate-900/40 px-2.5 py-1.5"
              >
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {label}
                </div>
                <div className="mt-0.5 text-[11px] font-medium truncate">{value}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 text-[11px] font-medium border-b border-[#20004d]/8 dark:border-white/10 pb-1.5">
            <span className="text-[#2949E8] dark:text-[#B968FF] border-b-2 border-[#2949E8] pb-1 -mb-2">
              {t.tabDocuments}
            </span>
            <span className="text-slate-400">{t.tabTasks}</span>
            <span className="text-slate-400">{t.tabTeam}</span>
          </div>

          <div className="space-y-1">
            {[t.doc1, t.doc2, t.doc3].map((doc) => (
              <div
                key={doc}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white dark:bg-slate-900/40 border border-[#20004d]/6 dark:border-white/8"
              >
                <FileText className="w-3.5 h-3.5 text-[#2949E8] shrink-0" />
                <span className="text-[11px] truncate">{doc}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { task: t.task1, due: "18/09" },
              { task: t.task2, due: "25/09" },
            ].map((item) => (
              <div
                key={item.task}
                className="flex items-start gap-2 px-2.5 py-2 rounded-md bg-white dark:bg-slate-900/40 border border-[#20004d]/6 dark:border-white/8"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2949E8] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] font-medium leading-snug">{item.task}</div>
                  <div className="mt-0.5 text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {t.due} {item.due}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 rounded-md bg-[#20004d]/[0.04] dark:bg-[#A855F7]/10 border border-[#20004d]/8 dark:border-white/10">
            <div className="flex items-center gap-2 text-[11px] font-medium text-[#20004d] dark:text-[#B968FF]">
              <Calendar className="w-3.5 h-3.5" /> {t.deadline} · 02/10
            </div>
            <div className="flex items-center gap-1">
              {["SA", "MK", "YB"].map((ini) => (
                <span
                  key={ini}
                  className="w-5 h-5 rounded-full bg-[#20004d] text-white text-[8px] font-semibold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 -ms-1 first:ms-0"
                >
                  {ini}
                </span>
              ))}
              <span className="ms-1.5 text-[10px] text-slate-500">{t.team}</span>
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
  const docs = [t.doc1, t.doc2, t.doc3];
  return (
    <Chrome title={t.library} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="library" />
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-900/50 border border-[#20004d]/8 dark:border-white/10">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-400">{t.searchDocs}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[t.catContracts, t.catPleadings, t.catCorrespondence].map((cat, i) => (
              <span
                key={cat}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  i === 0
                    ? "bg-[#20004d] text-white"
                    : "bg-[#20004d]/8 text-[#20004d] dark:bg-white/10 dark:text-[#B968FF]"
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
          <div className="divide-y divide-[#20004d]/8 dark:divide-white/10 border border-[#20004d]/8 dark:border-white/10 rounded-md overflow-hidden bg-white dark:bg-slate-900/40">
            {docs.map((doc) => (
              <div key={doc} className="flex items-center gap-2.5 px-3 py-2.5">
                <FileText className="w-4 h-4 text-[#2949E8] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium truncate">{doc}</div>
                  <div className="text-[10px] text-slate-400">
                    {t.updated} 08/09
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[#2949E8] dark:text-[#B968FF] shrink-0">
                  {t.preview}
                </span>
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

/** Juria legal AI: structured matter analysis with explicit human review. Early access. */
export const JuriaFrame: React.FC<{ lang: Lang; className?: string }> = ({ lang, className }) => {
  const t = FRAME_STRINGS[lang];
  const issues = [t.juriaIssue1, t.juriaIssue2, t.juriaIssue3, t.juriaIssue4];
  return (
    <Chrome title={t.juriaTitle} className={className}>
      <div className="p-4 space-y-3 text-slate-700 dark:text-slate-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--jure-blue)] to-[var(--jure-violet)] flex items-center justify-center shrink-0 shadow-[0_8px_20px_-8px_rgba(168,85,247,0.7)]">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </span>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold tracking-tight">JURIA</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{t.juriaAnalysis}</div>
            </div>
          </div>
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 uppercase tracking-wide shrink-0">
            {t.juriaStatusDone}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-[#A855F7]/12 bg-white/55 dark:bg-slate-900/50 px-3 py-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {t.juriaMatter}
            </div>
            <div className="mt-1 text-[12px] font-semibold leading-snug">{t.juriaMatterName}</div>
          </div>
          <div className="rounded-xl border border-[#2949E8]/15 bg-[#2949E8]/[0.06] dark:bg-[#2949E8]/15 px-3 py-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              {t.juriaStatus}
            </div>
            <div className="mt-1 text-[12px] font-semibold leading-snug text-[#2949E8] dark:text-[#B968FF]">
              {t.juriaStatusDone}
            </div>
          </div>
        </div>

        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5">
            {t.juriaIssues}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {issues.map((issue) => (
              <div
                key={issue}
                className="flex items-center gap-2 rounded-lg border border-[#A855F7]/10 bg-white/50 dark:bg-slate-900/40 px-2.5 py-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[var(--jure-blue)] to-[var(--jure-violet)] shrink-0" />
                <span className="text-[11px] font-medium truncate">{issue}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-[10px] font-medium text-amber-700 dark:text-amber-400">
          <Users className="w-3.5 h-3.5 shrink-0" /> {t.humanReview}
        </div>
        <div className="text-[9px] text-slate-400">{t.aiDisclaimer}</div>
      </div>
    </Chrome>
  );
};

const Kpi: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-white/70 dark:bg-slate-900/50 border border-[#A58CF4]/10 px-2 sm:px-3 py-2 sm:py-2.5 min-w-0">
    <div className="text-sm sm:text-[15px] font-semibold tabular-nums tracking-tight text-[#171321] dark:text-white">
      {value}
    </div>
    <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
      {label}
    </div>
  </div>
);

/** Firm dashboard: cases, consultations, documents, upcoming work. */
export const DashboardFrame: React.FC<{ lang: Lang; className?: string }> = ({
  lang,
  className,
}) => {
  const t = FRAME_STRINGS[lang];
  return (
    <Chrome title={`JURE — ${t.dashboard}`} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="dashboard" />
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="text-sm font-semibold landing-rise">{t.dashboard}</div>
          <div className="grid grid-cols-3 gap-2 landing-rise">
            <Kpi value="12" label={t.kpiCases} />
            <Kpi value="3" label={t.kpiConsult} />
            <Kpi value="24" label={t.kpiDocs} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 landing-rise">
            <div className="rounded-xl border border-[#A58CF4]/10 bg-white/50 dark:bg-slate-900/50 p-2.5 space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                {t.recentMatters}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium truncate">{t.caseTitle}</span>
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  {t.statusActive}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">{t.clientName}</div>
            </div>
            <div className="rounded-xl border border-[#A58CF4]/10 bg-white/50 dark:bg-slate-900/50 p-2.5 space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                {t.upcoming}
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-[#7C4DFF] shrink-0" />
                <span className="truncate">{t.consultTitle}</span>
              </div>
              <div className="text-[10px] text-slate-500">{t.consultTime}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-[#A855F7]/8 border border-[#A855F7]/15 landing-rise">
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--jure-blue)] to-[var(--jure-violet)] flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-white" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold truncate">{t.juriaTitle}</div>
              <div className="text-[10px] text-slate-500 truncate">{t.analysisReady}</div>
            </div>
          </div>
        </div>
      </div>
    </Chrome>
  );
};

/** Client profile preview: company client with open matters. */
export const ClientFrame: React.FC<{ lang: Lang; className?: string }> = ({
  lang,
  className,
}) => {
  const t = FRAME_STRINGS[lang];
  return (
    <Chrome title={t.clients} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="clients" />
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-[#20004d]/8 text-[#20004d] dark:text-[#B968FF] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold truncate">{t.clientName}</div>
              <div className="text-[11px] text-slate-500">{t.company}</div>
            </div>
            <span className="ms-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
              {t.statusActive}
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <Mail className="w-3.5 h-3.5 text-[#2949E8] shrink-0" />
              <span className="truncate">{t.clientEmail}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <Phone className="w-3.5 h-3.5 text-[#2949E8] shrink-0" />
              {t.clientPhone}
            </div>
          </div>
          <div className="rounded-md border border-[#20004d]/8 dark:border-white/10 bg-white dark:bg-slate-900/40 p-2.5">
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <Briefcase className="w-3.5 h-3.5 text-[#2949E8]" />
              {t.openMatters}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-[#f7f7f5] dark:bg-slate-950/40 px-2.5 py-2">
              <div className="min-w-0">
                <div className="text-[11px] font-medium truncate">{t.caseTitle}</div>
                <div className="text-[10px] text-slate-500">{t.litigation}</div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#2949E8]/10 text-[#2949E8] shrink-0">
                {t.statusActive}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Chrome>
  );
};

/** Shared calendar: consultation, hearing, team review. */
export const CalendarFrame: React.FC<{ lang: Lang; className?: string }> = ({
  lang,
  className,
}) => {
  const t = FRAME_STRINGS[lang];
  const events = [
    { title: t.consultTitle, time: t.consultTime, type: t.typeConsult, tone: "violet" },
    { title: t.eventHearing, time: t.eventHearingTime, type: t.typeHearing, tone: "amber" },
    { title: t.eventReview, time: t.eventReviewTime, type: t.typeInternal, tone: "slate" },
  ];
  return (
    <Chrome title={t.calendar} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="calendar" />
        <div className="flex-1 p-4 space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold">{t.thisWeek}</div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#20004d]/8 text-[#20004d] dark:text-[#B968FF]">
              {t.calendar}
            </span>
          </div>
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.title}
                className="flex items-start gap-2.5 px-2.5 py-2 rounded-md bg-white dark:bg-slate-900/40 border border-[#20004d]/8 dark:border-white/10"
              >
                <span
                  className={`mt-0.5 w-1 h-9 rounded-full shrink-0 ${
                    event.tone === "violet"
                      ? "bg-[#2949E8]"
                      : event.tone === "amber"
                        ? "bg-[#20004d]"
                        : "bg-slate-300"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-medium truncate">{event.title}</div>
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">
                      {event.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {event.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Chrome>
  );
};

/** Team roster with roles, presence, assignments and matter-linked conversation. */
export const TeamFrame: React.FC<{ lang: Lang; className?: string }> = ({
  lang,
  className,
}) => {
  const t = FRAME_STRINGS[lang];
  const members = [
    { name: t.member1, role: t.rolePartner, ini: "SA" },
    { name: t.member2, role: t.roleAssociate, ini: "MK" },
    { name: t.member3, role: t.roleAssistant, ini: "YB" },
  ];
  return (
    <Chrome title={t.teamPage} className={className}>
      <div className="flex text-slate-700 dark:text-slate-200">
        <SideNav t={t} active="messages" />
        <div className="flex-1 min-w-0 grid sm:grid-cols-5">
          <div className="sm:col-span-2 p-3 space-y-2 border-b sm:border-b-0 sm:border-e border-[#20004d]/8 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <div className="text-[12px] font-semibold">{t.teamPage}</div>
              <span className="text-[10px] text-emerald-700 font-medium">3 {t.online}</span>
            </div>
            {members.map((m) => (
              <div
                key={m.ini}
                className="flex items-center gap-2 px-2 py-2 rounded-md bg-white dark:bg-slate-900/40 border border-[#20004d]/8 dark:border-white/10"
              >
                <span className="relative w-7 h-7 rounded-full bg-[#20004d] text-white text-[9px] font-semibold flex items-center justify-center shrink-0">
                  {m.ini}
                  <span className="absolute -bottom-0.5 -end-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium truncate">{m.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {m.role} · {t.assignedTo}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sm:col-span-3 p-3 space-y-2.5 min-w-0">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#20004d]/8 dark:border-white/10">
              <div className="min-w-0">
                <div className="text-[12px] font-semibold truncate">{t.convTitle}</div>
                <div className="text-[10px] text-slate-500 truncate">{t.caseTitle}</div>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-medium text-[#2949E8] shrink-0">
                <Phone className="w-3 h-3" /> {t.call}
              </span>
            </div>
            <div className="max-w-[92%] px-3 py-2 rounded-lg rounded-ss-sm bg-[#f7f7f5] dark:bg-slate-900/50 text-[11px] leading-snug">
              {t.msg1}
            </div>
            <div className="max-w-[92%] ms-auto px-3 py-2 rounded-lg rounded-se-sm bg-[#20004d] text-white text-[11px] leading-snug">
              {t.msg2}
            </div>
          </div>
        </div>
      </div>
    </Chrome>
  );
};

type MiniCardProps = {
  children: React.ReactNode;
  className?: string;
  label: string;
};

/** Compact glass product card used as a floating hero accent. */
export const MiniProductCard: React.FC<MiniCardProps> = ({
  children,
  className = "",
  label,
}) => (
  <div
    className={`landing-mini-card ${className}`}
    role="img"
    aria-label={label}
  >
    {children}
  </div>
);

