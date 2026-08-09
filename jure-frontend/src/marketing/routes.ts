/**
 * Single source of truth for every marketing route: slug, per-locale
 * metadata and sitemap hints. Drives the router, the sitemap, server-side
 * head injection and internal linking.
 *
 * IMPORTANT: imported by the Vite build plugin (Node context). Keep it free
 * of JSX, React and app-only imports.
 */
import type { MarketingLocale } from "./site";

export type LocalizedText = Record<MarketingLocale, string>;

export interface LocalizedMeta {
  title: LocalizedText;
  description: LocalizedText;
}

export interface MarketingRoute extends LocalizedMeta {
  key: string;
  /** Path under the locale prefix. "" means the localized home page. */
  slug: string;
  /** Sitemap hints. */
  priority: number;
  changefreq: "weekly" | "monthly" | "yearly";
  /** Short label used for breadcrumbs and footer links. */
  label: LocalizedText;
}

export interface InsightArticleMeta extends LocalizedMeta {
  slug: string;
  /** ISO date, shown on page and used in Article JSON-LD. */
  datePublished: string;
  dateModified: string;
  label: LocalizedText;
}

export const MARKETING_ROUTES: MarketingRoute[] = [
  {
    key: "home",
    slug: "",
    priority: 1.0,
    changefreq: "weekly",
    label: { en: "Home", fr: "Accueil", ar: "الرئيسية" },
    title: {
      en: "JURE | AI-Powered LegalTech Platform for Modern Legal Teams",
      fr: "JURE | Plateforme LegalTech et IA pour les équipes juridiques",
      ar: "JURE | منصة LegalTech والذكاء الاصطناعي للفرق القانونية الحديثة",
    },
    description: {
      en: "JURE is a LegalTech platform for law firms and legal teams, combining AI-powered legal research, case management, document workflows and secure collaboration in one workspace. Built for modern legal teams across Morocco, MENA and Africa.",
      fr: "JURE est une plateforme LegalTech pour cabinets d'avocats et équipes juridiques, qui réunit recherche juridique assistée par IA, gestion de dossiers, flux documentaires et collaboration sécurisée. Conçue pour les équipes modernes au Maroc, au Moyen-Orient et en Afrique.",
      ar: "JURE منصة LegalTech لمكاتب المحاماة والفرق القانونية، تجمع البحث القانوني المدعوم بالذكاء الاصطناعي وإدارة القضايا وسير عمل المستندات والتعاون الآمن في مساحة واحدة. صُممت للفرق القانونية الحديثة في المغرب ومنطقة الشرق الأوسط وشمال أفريقيا وأفريقيا.",
    },
  },
  {
    key: "juria",
    slug: "juria",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Juria", fr: "Juria", ar: "جوريا" },
    title: {
      en: "Juria | AI Legal Assistant by JURE",
      fr: "Juria | Assistant IA juridique par JURE",
      ar: "جوريا | مساعد الذكاء الاصطناعي القانوني من JURE",
    },
    description: {
      en: "Juria is JURE's AI legal assistant for legal research, contract analysis, drafting and knowledge workflows — inside the same secure workspace as your matters, with lawyer review at every step.",
      fr: "Juria est l'assistant IA juridique de JURE pour la recherche, l'analyse de contrats, la rédaction et les flux de connaissances — dans le même espace sécurisé que vos dossiers, avec relecture par l'avocat à chaque étape.",
      ar: "جوريا هو مساعد الذكاء الاصطناعي القانوني من JURE للبحث وتحليل العقود والصياغة وسير عمل المعرفة — داخل مساحة العمل الآمنة نفسها مع ملفاتك، مع مراجعة المحامي في كل خطوة.",
    },
  },
  {
    key: "solutionsLawFirms",
    slug: "solutions/law-firms",
    priority: 0.85,
    changefreq: "monthly",
    label: { en: "For law firms", fr: "Pour les cabinets", ar: "لمكاتب المحاماة" },
    title: {
      en: "Legal Software for Law Firms | JURE",
      fr: "Logiciel juridique pour cabinets d'avocats | JURE",
      ar: "برمجيات قانونية لمكاتب المحاماة | JURE",
    },
    description: {
      en: "JURE is a LegalTech platform for law firms: matter management, documents, deadlines, team collaboration and Juria AI assistance in one secure workspace.",
      fr: "JURE est une plateforme LegalTech pour cabinets d'avocats : gestion de dossiers, documents, échéances, collaboration d'équipe et assistance IA Juria dans un espace sécurisé.",
      ar: "JURE منصة LegalTech لمكاتب المحاماة: إدارة الملفات والمستندات والمواعيد وتعاون الفريق ومساعدة جوريا بالذكاء الاصطناعي في مساحة آمنة واحدة.",
    },
  },
  {
    key: "solutionsLegalDepartments",
    slug: "solutions/legal-departments",
    priority: 0.85,
    changefreq: "monthly",
    label: { en: "For legal departments", fr: "Pour les directions juridiques", ar: "للإدارات القانونية" },
    title: {
      en: "LegalTech for Legal Departments | JURE",
      fr: "LegalTech pour directions juridiques | JURE",
      ar: "LegalTech للإدارات القانونية | JURE",
    },
    description: {
      en: "Give in-house legal teams shared visibility over matters, documents and deadlines — with secure collaboration and responsible AI assistance from JURE.",
      fr: "Donnez aux équipes juridiques internes une visibilité partagée sur dossiers, documents et échéances — avec collaboration sécurisée et assistance IA responsable de JURE.",
      ar: "امنح فرق الشؤون القانونية الداخلية رؤية مشتركة للملفات والمستندات والمواعيد — مع تعاون آمن ومساعدة ذكاء اصطناعي مسؤولة من JURE.",
    },
  },
  {
    key: "features",
    slug: "features",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Platform", fr: "Plateforme", ar: "المنصة" },
    title: {
      en: "JURE Platform — Matters, Documents, Tasks & Legal AI",
      fr: "Plateforme JURE — Dossiers, documents, tâches et IA juridique",
      ar: "منصة JURE — الملفات والمستندات والمهام والذكاء الاصطناعي القانوني",
    },
    description: {
      en: "Explore the JURE LegalTech platform: matter management, document library, tasks and deadlines, team collaboration, practice finance, and Juria — JURE's AI legal assistant in early access.",
      fr: "Découvrez la plateforme LegalTech JURE : gestion des dossiers, bibliothèque documentaire, tâches et échéances, collaboration d'équipe, finance du cabinet et Juria, l'assistant IA juridique de JURE en accès anticipé.",
      ar: "اكتشف منصة LegalTech من JURE: إدارة الملفات القانونية، مكتبة المستندات، المهام والمواعيد النهائية، تعاون الفريق، ومساعد الذكاء الاصطناعي القانوني جوريا من JURE في مرحلة الوصول المبكر.",
    },
  },
  {
    key: "about",
    slug: "about",
    priority: 0.7,
    changefreq: "monthly",
    label: { en: "About", fr: "À propos", ar: "من نحن" },
    title: {
      en: "About JURE — LegalTech Platform for Modern Legal Teams",
      fr: "À propos de JURE — Plateforme LegalTech pour équipes juridiques",
      ar: "عن JURE — منصة LegalTech للفرق القانونية الحديثة",
    },
    description: {
      en: "JURE is a LegalTech platform for modern legal teams — born in Morocco, built for multilingual practice across MENA and Africa, combining AI-powered legal work with matter management, documents and secure collaboration.",
      fr: "JURE est une plateforme LegalTech pour les équipes juridiques modernes — née au Maroc, conçue pour la pratique multilingue au Moyen-Orient, en Afrique du Nord et en Afrique, alliant travail juridique assisté par IA, gestion de dossiers, documents et collaboration sécurisée.",
      ar: "JURE منصة LegalTech للفرق القانونية الحديثة — انطلقت من المغرب وصُممت للممارسة متعددة اللغات عبر الشرق الأوسط وشمال أفريقيا وأفريقيا، تجمع العمل القانوني المدعوم بالذكاء الاصطناعي مع إدارة الملفات والمستندات والتعاون الآمن.",
    },
  },
  {
    key: "contact",
    slug: "contact",
    priority: 0.6,
    changefreq: "yearly",
    label: { en: "Contact", fr: "Contact", ar: "اتصل بنا" },
    title: {
      en: "Contact JURE — Talk to the Team",
      fr: "Contact JURE — Parlez à l'équipe",
      ar: "اتصل بـ JURE — تحدث إلى الفريق",
    },
    description: {
      en: "Get in touch with the JURE team about the platform, early access, partnerships or support. We reply in French, English and Arabic.",
      fr: "Contactez l'équipe JURE au sujet de la plateforme, de l'accès anticipé, de partenariats ou du support. Nous répondons en français, anglais et arabe.",
      ar: "تواصل مع فريق JURE بخصوص المنصة أو الوصول المبكر أو الشراكات أو الدعم. نرد بالفرنسية والإنجليزية والعربية.",
    },
  },
  {
    key: "pricing",
    slug: "pricing",
    priority: 0.8,
    changefreq: "monthly",
    label: { en: "Pricing", fr: "Tarifs", ar: "الأسعار" },
    title: {
      en: "JURE Pricing — Plans for Law Firms and Legal Teams",
      fr: "Tarifs JURE — Des offres pour cabinets et équipes juridiques",
      ar: "أسعار JURE — خطط لمكاتب المحاماة والفرق القانونية",
    },
    description: {
      en: "Simple plans for solo lawyers, law firms and legal teams. Start with JURE and scale as your practice grows.",
      fr: "Des offres simples pour avocats indépendants, cabinets et équipes juridiques. Commencez avec JURE et évoluez avec votre pratique.",
      ar: "خطط بسيطة للمحامين المستقلين ومكاتب المحاماة والفرق القانونية. ابدأ مع JURE وتوسّع مع نمو ممارستك.",
    },
  },
  {
    key: "security",
    slug: "security",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Security", fr: "Sécurité", ar: "الأمان" },
    title: {
      en: "JURE Security — Built for Confidential Legal Work",
      fr: "Sécurité JURE — Conçu pour le travail juridique confidentiel",
      ar: "أمان JURE — مصمم للعمل القانوني السري",
    },
    description: {
      en: "How JURE protects confidential legal work: per-firm data isolation, role-based access control, authenticated sessions, TLS in transit — and a transparent security roadmap.",
      fr: "Comment JURE protège le travail juridique confidentiel : isolation des données par cabinet, contrôle d'accès par rôles, sessions authentifiées, chiffrement TLS — et une feuille de route sécurité transparente.",
      ar: "كيف تحمي JURE العمل القانوني السري: عزل بيانات كل مكتب، التحكم في الوصول حسب الأدوار، جلسات موثّقة، تشفير TLS أثناء النقل، وخارطة طريق أمنية شفافة.",
    },
  },
  {
    key: "demo",
    slug: "demo",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "See JURE in action", fr: "JURE en action", ar: "شاهد JURE عمليًا" },
    title: {
      en: "See JURE in Action — Interactive Product Demo",
      fr: "JURE en action — Démo interactive du produit",
      ar: "شاهد JURE عمليًا — عرض تفاعلي للمنتج",
    },
    description: {
      en: "Walk through the JURE workspace: matters, documents, tasks, collaboration and legal AI. See how legal work comes together in one platform.",
      fr: "Parcourez l'espace de travail JURE : dossiers, documents, tâches, collaboration et IA juridique. Découvrez comment le travail juridique se réunit sur une seule plateforme.",
      ar: "تجوّل في مساحة عمل JURE: الملفات والمستندات والمهام والتعاون والذكاء الاصطناعي القانوني. اكتشف كيف يجتمع العمل القانوني في منصة واحدة.",
    },
  },
  {
    key: "docs",
    slug: "docs",
    priority: 0.4,
    changefreq: "monthly",
    label: { en: "Documentation", fr: "Documentation", ar: "الوثائق" },
    title: {
      en: "JURE Documentation",
      fr: "Documentation JURE",
      ar: "وثائق JURE",
    },
    description: {
      en: "Guides and documentation for the JURE legal work platform.",
      fr: "Guides et documentation de la plateforme de travail juridique JURE.",
      ar: "أدلة ووثائق منصة العمل القانوني JURE.",
    },
  },
  {
    key: "community",
    slug: "community",
    priority: 0.4,
    changefreq: "monthly",
    label: { en: "Community", fr: "Communauté", ar: "المجتمع" },
    title: {
      en: "JURE Community",
      fr: "Communauté JURE",
      ar: "مجتمع JURE",
    },
    description: {
      en: "Join the JURE community: discussions, peer help and training for legal professionals adopting modern legal technology.",
      fr: "Rejoignez la communauté JURE : discussions, entraide et formation pour les professionnels du droit qui adoptent la technologie juridique moderne.",
      ar: "انضم إلى مجتمع JURE: نقاشات ومساعدة متبادلة وتدريب للمهنيين القانونيين الذين يتبنون التقنية القانونية الحديثة.",
    },
  },
  {
    key: "privacy",
    slug: "privacy",
    priority: 0.3,
    changefreq: "yearly",
    label: { en: "Privacy", fr: "Confidentialité", ar: "الخصوصية" },
    title: {
      en: "Privacy Policy — JURE",
      fr: "Politique de confidentialité — JURE",
      ar: "سياسة الخصوصية — JURE",
    },
    description: {
      en: "How JURE collects, uses and protects personal data.",
      fr: "Comment JURE collecte, utilise et protège les données personnelles.",
      ar: "كيف تجمع JURE البيانات الشخصية وتستخدمها وتحميها.",
    },
  },
  {
    key: "terms",
    slug: "terms",
    priority: 0.3,
    changefreq: "yearly",
    label: { en: "Terms", fr: "Conditions", ar: "الشروط" },
    title: {
      en: "Terms of Service — JURE",
      fr: "Conditions d'utilisation — JURE",
      ar: "شروط الاستخدام — JURE",
    },
    description: {
      en: "The terms that govern your use of the JURE platform.",
      fr: "Les conditions qui régissent votre utilisation de la plateforme JURE.",
      ar: "الشروط التي تحكم استخدامك لمنصة JURE.",
    },
  },
  {
    key: "status",
    slug: "status",
    priority: 0.3,
    changefreq: "weekly",
    label: { en: "Status", fr: "Statut", ar: "الحالة" },
    title: {
      en: "JURE Status",
      fr: "Statut JURE",
      ar: "حالة JURE",
    },
    description: {
      en: "Live status of the JURE platform and services.",
      fr: "État en direct de la plateforme et des services JURE.",
      ar: "الحالة المباشرة لمنصة JURE وخدماتها.",
    },
  },
  {
    key: "statusSubscribe",
    slug: "status/subscribe",
    priority: 0.1,
    changefreq: "yearly",
    label: { en: "Status updates", fr: "Alertes statut", ar: "تنبيهات الحالة" },
    title: {
      en: "Subscribe to JURE Status Updates",
      fr: "S'abonner aux alertes de statut JURE",
      ar: "الاشتراك في تنبيهات حالة JURE",
    },
    description: {
      en: "Get notified about JURE platform incidents and maintenance windows.",
      fr: "Recevez des notifications sur les incidents et maintenances de la plateforme JURE.",
      ar: "احصل على إشعارات حول أعطال منصة JURE وفترات الصيانة.",
    },
  },

  // ---- High-intent landing pages -------------------------------------------
  {
    key: "legalAi",
    slug: "legal-ai",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Legal AI", fr: "IA juridique", ar: "الذكاء الاصطناعي القانوني" },
    title: {
      en: "Legal AI — AI for Lawyers Inside Their Legal Work | JURE",
      fr: "IA juridique — L'IA pour avocats au cœur du travail | JURE",
      ar: "الذكاء الاصطناعي القانوني — ذكاء اصطناعي للمحامين | JURE",
    },
    description: {
      en: "What a legal AI platform is and how JURE embeds AI into real legal work: contract analysis, research-style Q&A and drafting assistance — human-in-the-loop, in early access.",
      fr: "Ce qu'est une plateforme d'IA juridique et comment JURE intègre l'IA au travail juridique réel : analyse de contrats, recherche et aide à la rédaction — avec validation humaine, en accès anticipé.",
      ar: "ما هي منصة الذكاء الاصطناعي القانوني وكيف تدمج JURE الذكاء الاصطناعي في العمل القانوني الفعلي: تحليل العقود والبحث والمساعدة في الصياغة — مع مراجعة بشرية، في مرحلة الوصول المبكر.",
    },
  },
  {
    key: "legalCaseManagement",
    slug: "legal-case-management",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Case management", fr: "Gestion de dossiers", ar: "إدارة القضايا" },
    title: {
      en: "Legal Case Management Software — One Workspace per Matter | JURE",
      fr: "Logiciel de gestion de dossiers juridiques | JURE",
      ar: "برنامج إدارة القضايا القانونية | JURE",
    },
    description: {
      en: "What legal case management software does and how JURE connects each matter to its client, documents, tasks, deadlines and team in one secure workspace.",
      fr: "Ce que fait un logiciel de gestion de dossiers et comment JURE relie chaque dossier à son client, ses documents, ses tâches, ses échéances et son équipe dans un espace sécurisé.",
      ar: "ما الذي يقوم به برنامج إدارة القضايا وكيف تربط JURE كل ملف بموكله ومستنداته ومهامه ومواعيده وفريقه في مساحة عمل آمنة واحدة.",
    },
  },
  {
    key: "legalPracticeManagement",
    slug: "legal-practice-management",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Practice management", fr: "Gestion de cabinet", ar: "إدارة المكاتب" },
    title: {
      en: "Legal Practice Management Software for Modern Firms | JURE",
      fr: "Logiciel de gestion de cabinet d'avocats | JURE",
      ar: "برنامج إدارة مكاتب المحاماة | JURE",
    },
    description: {
      en: "How legal practice management software works and how JURE unifies matters, clients, calendar, tasks, documents and firm finance for law firms of any size.",
      fr: "Comment fonctionne un logiciel de gestion de cabinet et comment JURE unifie dossiers, clients, agenda, tâches, documents et finance du cabinet, quelle que soit sa taille.",
      ar: "كيف يعمل برنامج إدارة مكتب المحاماة وكيف توحّد JURE الملفات والعملاء والمفكرة والمهام والمستندات ومالية المكتب لمكاتب من كل الأحجام.",
    },
  },
  {
    key: "legalResearch",
    slug: "legal-research",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Legal research", fr: "Recherche juridique", ar: "البحث القانوني" },
    title: {
      en: "AI Legal Research — From Question to Reviewed Analysis | JURE",
      fr: "Recherche juridique assistée par IA | JURE",
      ar: "البحث القانوني بمساعدة الذكاء الاصطناعي | JURE",
    },
    description: {
      en: "How AI-assisted legal research works, its limits, and how JURE's research mode helps lawyers move from question to analysis with human review at every step.",
      fr: "Comment fonctionne la recherche juridique assistée par IA, ses limites, et comment le mode recherche de JURE aide les avocats à passer de la question à l'analyse avec validation humaine à chaque étape.",
      ar: "كيف يعمل البحث القانوني بمساعدة الذكاء الاصطناعي وما حدوده، وكيف يساعد وضع البحث في JURE المحامين على الانتقال من السؤال إلى التحليل مع مراجعة بشرية في كل خطوة.",
    },
  },
  {
    key: "legalDocumentManagement",
    slug: "legal-document-management",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Document management", fr: "Gestion documentaire", ar: "إدارة المستندات" },
    title: {
      en: "Legal Document Management Software — Secure Library | JURE",
      fr: "Logiciel de gestion documentaire juridique | JURE",
      ar: "برنامج إدارة المستندات القانونية | JURE",
    },
    description: {
      en: "What legal document management software is and how JURE's document library organizes, previews and secures firm documents — connected to matters, tasks and teams.",
      fr: "Ce qu'est la gestion documentaire juridique et comment la bibliothèque JURE organise, prévisualise et sécurise les documents du cabinet — reliés aux dossiers, tâches et équipes.",
      ar: "ما هي إدارة المستندات القانونية وكيف تنظّم مكتبة JURE مستندات المكتب وتعاينها وتؤمّنها — مرتبطة بالملفات والمهام والفرق.",
    },
  },
  {
    key: "legalOperations",
    slug: "legal-operations",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Legal operations", fr: "Legal operations", ar: "العمليات القانونية" },
    title: {
      en: "Legal Operations Software — Visibility Across Legal Work | JURE",
      fr: "Logiciel de legal operations | JURE",
      ar: "برنامج العمليات القانونية | JURE",
    },
    description: {
      en: "What legal operations means, why it matters, and how JURE gives legal teams shared visibility over matters, workloads, deadlines and documents.",
      fr: "Ce que recouvrent les legal operations, pourquoi elles comptent, et comment JURE donne aux équipes juridiques une visibilité partagée sur les dossiers, charges de travail, échéances et documents.",
      ar: "ما معنى العمليات القانونية ولماذا هي مهمة، وكيف تمنح JURE الفرق القانونية رؤية مشتركة للملفات وأعباء العمل والمواعيد والمستندات.",
    },
  },
  {
    key: "legalKnowledgeManagement",
    slug: "legal-knowledge-management",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Knowledge management", fr: "Gestion des connaissances", ar: "إدارة المعرفة" },
    title: {
      en: "Legal Knowledge Management — Firm Knowledge, Organized | JURE",
      fr: "Gestion des connaissances juridiques | JURE",
      ar: "إدارة المعرفة القانونية | JURE",
    },
    description: {
      en: "What legal knowledge management is and how JURE turns firm documents into an organized, searchable knowledge hub shared across the team.",
      fr: "Ce qu'est la gestion des connaissances juridiques et comment JURE transforme les documents du cabinet en un hub de connaissances organisé, consultable et partagé par l'équipe.",
      ar: "ما هي إدارة المعرفة القانونية وكيف تحوّل JURE مستندات المكتب إلى مركز معرفة منظم وقابل للبحث ومشترك بين الفريق.",
    },
  },
  {
    key: "responsibleLegalAi",
    slug: "responsible-legal-ai",
    priority: 0.9,
    changefreq: "monthly",
    label: { en: "Responsible AI", fr: "IA responsable", ar: "الذكاء الاصطناعي المسؤول" },
    title: {
      en: "Responsible Legal AI — Human-in-the-Loop by Design | JURE",
      fr: "IA juridique responsable — Validation humaine par conception | JURE",
      ar: "الذكاء الاصطناعي القانوني المسؤول | JURE",
    },
    description: {
      en: "JURE's approach to responsible AI in legal work: human review over AI output, transparency about limits, data protection, and why AI should augment lawyers, not replace them.",
      fr: "L'approche JURE de l'IA responsable dans le travail juridique : relecture humaine des résultats d'IA, transparence sur les limites, protection des données, et pourquoi l'IA doit augmenter les avocats, pas les remplacer.",
      ar: "نهج JURE للذكاء الاصطناعي المسؤول في العمل القانوني: مراجعة بشرية لمخرجات الذكاء الاصطناعي، وشفافية بشأن الحدود، وحماية البيانات، ولماذا يجب أن يعزّز الذكاء الاصطناعي المحامين لا أن يحل محلهم.",
    },
  },

  // ---- Insights -------------------------------------------------------------
  {
    key: "insights",
    slug: "insights",
    priority: 0.8,
    changefreq: "weekly",
    label: { en: "Insights", fr: "Insights", ar: "رؤى" },
    title: {
      en: "JURE Insights — LegalTech, Legal AI and Legal Operations",
      fr: "JURE Insights — LegalTech, IA juridique et legal operations",
      ar: "رؤى JURE — التقنية القانونية والذكاء الاصطناعي القانوني",
    },
    description: {
      en: "Original analysis and practical guides on LegalTech, legal AI, responsible AI and the future of legal work — from the team building JURE.",
      fr: "Analyses originales et guides pratiques sur la LegalTech, l'IA juridique, l'IA responsable et l'avenir du travail juridique — par l'équipe qui construit JURE.",
      ar: "تحليلات أصلية وأدلة عملية حول التقنية القانونية والذكاء الاصطناعي القانوني والذكاء الاصطناعي المسؤول ومستقبل العمل القانوني — من الفريق الذي يبني JURE.",
    },
  },
];

export const INSIGHT_ARTICLES: InsightArticleMeta[] = [
  {
    slug: "what-is-legaltech",
    datePublished: "2026-08-09",
    dateModified: "2026-08-09",
    label: { en: "What is LegalTech?", fr: "Qu'est-ce que la LegalTech ?", ar: "ما هي التقنية القانونية؟" },
    title: {
      en: "What Is LegalTech? How Technology Is Changing Legal Work",
      fr: "Qu'est-ce que la LegalTech ? Comment la technologie transforme le travail juridique",
      ar: "ما هي التقنية القانونية؟ كيف تغيّر التكنولوجيا العمل القانوني",
    },
    description: {
      en: "A practical introduction to LegalTech: what it covers, how it evolved, what it changes for law firms and legal departments, and why emerging and multilingual markets matter.",
      fr: "Une introduction pratique à la LegalTech : ce qu'elle recouvre, son évolution, ce qu'elle change pour les cabinets et directions juridiques, et pourquoi les marchés émergents et multilingues comptent.",
      ar: "مقدمة عملية للتقنية القانونية: ما الذي تشمله، كيف تطورت، ماذا تغيّر لمكاتب المحاماة والإدارات القانونية، ولماذا تهم الأسواق الناشئة ومتعددة اللغات.",
    },
  },
  {
    slug: "legaltech-in-morocco",
    datePublished: "2026-08-09",
    dateModified: "2026-08-09",
    label: { en: "LegalTech in Morocco", fr: "LegalTech au Maroc", ar: "التقنية القانونية في المغرب" },
    title: {
      en: "LegalTech in Morocco: What Modern Legal Teams Actually Need",
      fr: "LegalTech au Maroc : de quoi les équipes juridiques modernes ont vraiment besoin",
      ar: "التقنية القانونية في المغرب: ما تحتاجه الفرق القانونية الحديثة فعليًا",
    },
    description: {
      en: "A practical map of LegalTech in Morocco: multilingual practice, civil-law workflows, what firms need before AI, and a responsible path to adoption.",
      fr: "Une carte pratique de la LegalTech au Maroc : pratique multilingue, flux de droit civil, ce dont les cabinets ont besoin avant l'IA, et un parcours d'adoption responsable.",
      ar: "خريطة عملية للتقنية القانونية في المغرب: الممارسة متعددة اللغات، مسارات القانون المدني، ما تحتاجه المكاتب قبل الذكاء الاصطناعي، ومسار تبنٍّ مسؤول.",
    },
  },
  {
    slug: "legal-ai-in-mena",
    datePublished: "2026-08-09",
    dateModified: "2026-08-09",
    label: { en: "Legal AI in MENA", fr: "IA juridique au Moyen-Orient et en Afrique du Nord", ar: "الذكاء الاصطناعي القانوني في الشرق الأوسط وشمال أفريقيا" },
    title: {
      en: "Legal AI in MENA: Multilingual Work, Confidentiality and Human Review",
      fr: "IA juridique au Moyen-Orient et en Afrique du Nord : multilinguisme, confidentialité et relecture humaine",
      ar: "الذكاء الاصطناعي القانوني في الشرق الأوسط وشمال أفريقيا: تعدد اللغات والسرية والمراجعة البشرية",
    },
    description: {
      en: "What legal AI means across MENA: multilingual constraints, confidentiality risks, a responsible adoption checklist, and why AI must serve lawyers — not replace them.",
      fr: "Ce que signifie l'IA juridique dans la région : contraintes multilingues, risques de confidentialité, checklist d'adoption responsable, et pourquoi l'IA doit servir les avocats — non les remplacer.",
      ar: "ماذا يعني الذكاء الاصطناعي القانوني في المنطقة: قيود تعدد اللغات ومخاطر السرية وقائمة تحقق للتبنّي المسؤول، ولماذا يجب أن يخدم الذكاء الاصطناعي المحامين لا أن يحل محلهم.",
    },
  },
  {
    slug: "legal-technology-african-law-firms",
    datePublished: "2026-08-09",
    dateModified: "2026-08-09",
    label: { en: "Legal technology for African law firms", fr: "Technologie juridique pour cabinets africains", ar: "التقنية القانونية لمكاتب المحاماة الأفريقية" },
    title: {
      en: "Legal Technology for African Law Firms: Leapfrogging Without Skipping Foundations",
      fr: "Technologie juridique pour cabinets africains : leapfrog sans sauter les fondations",
      ar: "التقنية القانونية لمكاتب المحاماة الأفريقية: قفز تكنولوجي دون تخطّي الأسس",
    },
    description: {
      en: "How African law firms can adopt modern LegalTech: matter hygiene first, then collaboration, then responsible AI — built for multilingual and civil-law practice.",
      fr: "Comment les cabinets africains peuvent adopter une LegalTech moderne : hygiène des dossiers d'abord, puis collaboration, puis IA responsable — pour une pratique multilingue et de droit civil.",
      ar: "كيف يمكن لمكاتب المحاماة الأفريقية تبنّي LegalTech حديثة: نظافة الملفات أولًا ثم التعاون ثم الذكاء الاصطناعي المسؤول — للممارسة متعددة اللغات والقانون المدني.",
    },
  },
  {
    slug: "responsible-ai-for-lawyers",
    datePublished: "2026-08-09",
    dateModified: "2026-08-09",
    label: { en: "Responsible AI for lawyers", fr: "IA responsable pour avocats", ar: "الذكاء الاصطناعي المسؤول للمحامين" },
    title: {
      en: "Responsible AI for Lawyers: From AI Assistance to Human-in-the-Loop Legal Work",
      fr: "IA responsable pour avocats : de l'assistance IA au travail juridique avec validation humaine",
      ar: "الذكاء الاصطناعي المسؤول للمحامين: من المساعدة الآلية إلى المراجعة البشرية",
    },
    description: {
      en: "What responsible AI means in legal practice: risks of unreviewed AI output, why human-in-the-loop is non-negotiable, and a practical framework for adopting AI in a law firm.",
      fr: "Ce que signifie l'IA responsable dans la pratique juridique : les risques des résultats d'IA non relus, pourquoi la validation humaine est non négociable, et un cadre pratique pour adopter l'IA en cabinet.",
      ar: "ماذا يعني الذكاء الاصطناعي المسؤول في الممارسة القانونية: مخاطر المخرجات غير المراجَعة، ولماذا المراجعة البشرية غير قابلة للتفاوض، وإطار عملي لتبني الذكاء الاصطناعي في مكتب المحاماة.",
    },
  },
  {
    slug: "convergence-of-legal-work",
    datePublished: "2026-08-09",
    dateModified: "2026-08-09",
    label: { en: "The convergence of legal work", fr: "La convergence du travail juridique", ar: "تقارب العمل القانوني" },
    title: {
      en: "Why Matter Management, Knowledge and AI Are Converging",
      fr: "Pourquoi la gestion des dossiers, les connaissances et l'IA convergent",
      ar: "لماذا تتقارب إدارة الملفات والمعرفة والذكاء الاصطناعي",
    },
    description: {
      en: "Legal teams spent a decade adding disconnected tools. The next decade is about convergence: why matters, documents, knowledge and AI belong in one workspace.",
      fr: "Les équipes juridiques ont passé une décennie à empiler des outils déconnectés. La prochaine décennie sera celle de la convergence : pourquoi dossiers, documents, connaissances et IA doivent se réunir dans un même espace de travail.",
      ar: "أمضت الفرق القانونية عقدًا في إضافة أدوات منفصلة. العقد القادم هو عقد التقارب: لماذا تنتمي الملفات والمستندات والمعرفة والذكاء الاصطناعي إلى مساحة عمل واحدة.",
    },
  },
];

export function getRoute(key: string): MarketingRoute {
  const route = MARKETING_ROUTES.find((r) => r.key === key);
  if (!route) throw new Error(`Unknown marketing route key: ${key}`);
  return route;
}

export function getArticle(slug: string): InsightArticleMeta | undefined {
  return INSIGHT_ARTICLES.find((a) => a.slug === slug);
}
