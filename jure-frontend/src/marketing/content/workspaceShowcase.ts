import type { MarketingLocale } from "../site";

/** UI labels for the homepage workspace showcase mock — fictional Atlas Textile file. */
export type ShowcaseUi = {
  brand: string;
  matter: string;
  matterType: string;
  status: string;
  statusLabel: string;
  client: string;
  documents: string;
  tasks: string;
  deadlines: string;
  team: string;
  hearings: string;
  fees: string;
  nav: {
    dashboard: string;
    cases: string;
    clients: string;
    calendar: string;
    library: string;
    team: string;
    finance: string;
    juria: string;
  };
  commercialDispute: string;
  company: string;
  contacts: string;
  activeMatters: string;
  previousMatters: string;
  history: string;
  contactName: string;
  contactRole: string;
  previousMatter: string;
  closed: string;
  events: Array<{ time: string; title: string; kind: string }>;
  calendarMatter: string;
  docs: string[];
  search: string;
  searchQuery: string;
  attach: string;
  attached: string;
  preview: string;
  partner: string;
  associate: string;
  assistant: string;
  junior: string;
  assigned: string;
  taskReview: string;
  inProgress: string;
  tomorrow: string;
  invoice: string;
  invoiceNo: string;
  pending: string;
  legalFees: string;
  billedTo: string;
  prompt: string;
  answer: string;
  sources: string;
  aiLabel: string;
  matterDocs: string;
  firmKnowledge: string;
  reusable: string;
  network: string[];
};

const en: ShowcaseUi = {
  brand: "JURE",
  matter: "Atlas Textile SARL",
  matterType: "Commercial dispute",
  status: "Active",
  statusLabel: "Status",
  client: "Client",
  documents: "Documents",
  tasks: "Tasks",
  deadlines: "Deadlines",
  team: "Team",
  hearings: "Hearings",
  fees: "Fees",
  nav: {
    dashboard: "Dashboard",
    cases: "Cases",
    clients: "Clients",
    calendar: "Calendar",
    library: "Library",
    team: "Team",
    finance: "Finance",
    juria: "Juria",
  },
  commercialDispute: "Commercial dispute — Atlas Textile SARL",
  company: "Company",
  contacts: "Contacts",
  activeMatters: "Active matters",
  previousMatters: "Previous matters",
  history: "Correspondence",
  contactName: "Nadia El Fassi",
  contactRole: "General counsel",
  previousMatter: "Supply contract review",
  closed: "Closed",
  events: [
    { time: "09:30", title: "Client consultation", kind: "Consultation" },
    { time: "11:00", title: "Commercial Court hearing", kind: "Hearing" },
    { time: "14:00", title: "Review settlement agreement", kind: "Task" },
    { time: "16:30", title: "Internal team meeting", kind: "Internal" },
  ],
  calendarMatter: "Commercial dispute — Atlas Textile SARL",
  docs: [
    "Commercial Lease Agreement.pdf",
    "Court Decision — 02.10.2026.pdf",
    "Settlement Proposal.docx",
    "Corporate Documents.pdf",
    "Client Correspondence.docx",
  ],
  search: "Search documents…",
  searchQuery: "commercial lease termination",
  attach: "Attach to Atlas Textile SARL",
  attached: "Attached to matter",
  preview: "Preview",
  partner: "Partner",
  associate: "Associate",
  assistant: "Legal assistant",
  junior: "Junior lawyer",
  assigned: "Assigned",
  taskReview: "Review settlement proposal",
  inProgress: "In progress",
  tomorrow: "Tomorrow",
  invoice: "Invoice",
  invoiceNo: "INV-0142",
  pending: "Pending",
  legalFees: "Legal fees — commercial dispute",
  billedTo: "Billed to matter",
  prompt: "Summarize the key obligations under the lease agreement.",
  answer:
    "The lease requires Atlas Textile to maintain the premises, notify the lessor of defects within 15 days, and seek consent before any sublease. Termination is tied to a formal notice period.",
  sources: "Sources",
  aiLabel: "AI-assisted. Human-reviewed.",
  matterDocs: "Matter documents",
  firmKnowledge: "Firm knowledge",
  reusable: "Reusable knowledge",
  network: [
    "Clients",
    "Matters",
    "Documents",
    "Tasks",
    "Calendar",
    "Team",
    "Finance",
    "Juria",
    "Knowledge",
  ],
};

const fr: ShowcaseUi = {
  brand: "JURE",
  matter: "Atlas Textile SARL",
  matterType: "Contentieux commercial",
  status: "Actif",
  statusLabel: "Statut",
  client: "Client",
  documents: "Documents",
  tasks: "Tâches",
  deadlines: "Échéances",
  team: "Équipe",
  hearings: "Audiences",
  fees: "Honoraires",
  nav: {
    dashboard: "Tableau de bord",
    cases: "Dossiers",
    clients: "Clients",
    calendar: "Agenda",
    library: "Bibliothèque",
    team: "Équipe",
    finance: "Finance",
    juria: "Juria",
  },
  commercialDispute: "Contentieux commercial — Atlas Textile SARL",
  company: "Société",
  contacts: "Contacts",
  activeMatters: "Dossiers actifs",
  previousMatters: "Dossiers précédents",
  history: "Correspondance",
  contactName: "Nadia El Fassi",
  contactRole: "Directrice juridique",
  previousMatter: "Revue de contrat d'approvisionnement",
  closed: "Clos",
  events: [
    { time: "09:30", title: "Consultation client", kind: "Consultation" },
    { time: "11:00", title: "Audience — Tribunal de commerce", kind: "Audience" },
    { time: "14:00", title: "Relecture du protocole d'accord", kind: "Tâche" },
    { time: "16:30", title: "Réunion d'équipe", kind: "Interne" },
  ],
  calendarMatter: "Contentieux commercial — Atlas Textile SARL",
  docs: [
    "Bail commercial.pdf",
    "Décision — 02.10.2026.pdf",
    "Protocole d'accord.docx",
    "Documents sociaux.pdf",
    "Correspondance client.docx",
  ],
  search: "Rechercher des documents…",
  searchQuery: "résiliation bail commercial",
  attach: "Rattacher à Atlas Textile SARL",
  attached: "Rattaché au dossier",
  preview: "Aperçu",
  partner: "Associé",
  associate: "Collaborateur",
  assistant: "Assistant juridique",
  junior: "Juriste junior",
  assigned: "Assigné",
  taskReview: "Relire le protocole d'accord",
  inProgress: "En cours",
  tomorrow: "Demain",
  invoice: "Facture",
  invoiceNo: "FAC-0142",
  pending: "En attente",
  legalFees: "Honoraires — contentieux commercial",
  billedTo: "Facturé sur le dossier",
  prompt: "Résumez les obligations principales du bail commercial.",
  answer:
    "Le bail impose à Atlas Textile d'entretenir les locaux, de notifier les vices au bailleur sous 15 jours, et d'obtenir un accord avant toute sous-location. La résiliation est liée à un préavis formel.",
  sources: "Sources",
  aiLabel: "Assisté par IA. Relu par l'avocat.",
  matterDocs: "Documents du dossier",
  firmKnowledge: "Connaissance du cabinet",
  reusable: "Connaissance réutilisable",
  network: [
    "Clients",
    "Dossiers",
    "Documents",
    "Tâches",
    "Agenda",
    "Équipe",
    "Finance",
    "Juria",
    "Connaissance",
  ],
};

const ar: ShowcaseUi = {
  brand: "JURE",
  matter: "Atlas Textile SARL",
  matterType: "نزاع تجاري",
  status: "نشط",
  statusLabel: "الحالة",
  client: "العميل",
  documents: "المستندات",
  tasks: "المهام",
  deadlines: "المواعيد",
  team: "الفريق",
  hearings: "الجلسات",
  fees: "الأتعاب",
  nav: {
    dashboard: "لوحة التحكم",
    cases: "القضايا",
    clients: "العملاء",
    calendar: "المفكرة",
    library: "المكتبة",
    team: "الفريق",
    finance: "المالية",
    juria: "جوريا",
  },
  commercialDispute: "نزاع تجاري — Atlas Textile SARL",
  company: "شركة",
  contacts: "جهات الاتصال",
  activeMatters: "ملفات نشطة",
  previousMatters: "ملفات سابقة",
  history: "المراسلات",
  contactName: "نادية الفاسي",
  contactRole: "المستشار العام",
  previousMatter: "مراجعة عقد توريد",
  closed: "مغلق",
  events: [
    { time: "09:30", title: "استشارة عميل", kind: "استشارة" },
    { time: "11:00", title: "جلسة المحكمة التجارية", kind: "جلسة" },
    { time: "14:00", title: "مراجعة اتفاق التسوية", kind: "مهمة" },
    { time: "16:30", title: "اجتماع الفريق", kind: "داخلي" },
  ],
  calendarMatter: "نزاع تجاري — Atlas Textile SARL",
  docs: [
    "عقد الإيجار التجاري.pdf",
    "حكم المحكمة — 02.10.2026.pdf",
    "مقترح التسوية.docx",
    "وثائق الشركة.pdf",
    "مراسلات العميل.docx",
  ],
  search: "ابحث في المستندات…",
  searchQuery: "إنهاء الإيجار التجاري",
  attach: "إرفاق بـ Atlas Textile SARL",
  attached: "مرفق بالملف",
  preview: "معاينة",
  partner: "شريك",
  associate: "محام متعاون",
  assistant: "مساعد قانوني",
  junior: "محام مبتدئ",
  assigned: "معين",
  taskReview: "مراجعة مقترح التسوية",
  inProgress: "قيد التنفيذ",
  tomorrow: "غدا",
  invoice: "فاتورة",
  invoiceNo: "INV-0142",
  pending: "معلقة",
  legalFees: "أتعاب قانونية — نزاع تجاري",
  billedTo: "مفوترة على الملف",
  prompt: "لخص الالتزامات الأساسية في عقد الإيجار.",
  answer:
    "يلزم الإيجار Atlas Textile بصيانة المقر، وإخطار المؤجر بالعيوب خلال 15 يوما، والحصول على موافقة قبل أي تأجير من الباطن. والإنهاء مرتبط بمهلة إخطار رسمية.",
  sources: "المصادر",
  aiLabel: "مساعدة بالذكاء الاصطناعي. مراجعة بشرية.",
  matterDocs: "مستندات الملف",
  firmKnowledge: "معرفة المكتب",
  reusable: "معرفة قابلة لإعادة الاستخدام",
  network: [
    "العملاء",
    "الملفات",
    "المستندات",
    "المهام",
    "المفكرة",
    "الفريق",
    "المالية",
    "جوريا",
    "المعرفة",
  ],
};

export const SHOWCASE_UI: Record<MarketingLocale, ShowcaseUi> = { en, fr, ar };
