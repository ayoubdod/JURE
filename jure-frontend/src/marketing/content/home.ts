import type { MarketingLocale } from "../site";
import type { FaqEntry } from "../structuredData";

/**
 * Homepage copy — EN/FR/AR. Every claim maps to a shipped capability
 * (see the capability inventory). AI is framed as early access with
 * human review; nothing invented.
 */

export interface HomeContent {
  hero: {
    eyebrow: string;
    h1a: string;
    h1b: string;
    verbs: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trustChips: string[];
  };
  problem: {
    title: string;
    body1: string;
    body2: string;
    fragments: string[];
    convergenceTitle: string;
    convergenceSub: string;
  };
  pillars: {
    title: string;
    subtitle: string;
    matter: { title: string; body: string; link: string };
    ai: { title: string; badge: string; body: string; disclaimer: string; link: string };
    documents: { title: string; body: string; link: string };
    collaboration: { title: string; body: string; link: string };
  };
  workflows: {
    title: string;
    subtitle: string;
    docToMatter: { title: string; steps: string[] };
    questionToResearch: { title: string; steps: string[]; note: string };
  };
  security: {
    title: string;
    body: string;
    items: string[];
    cta: string;
  };
  audiences: {
    title: string;
    firms: { title: string; body: string };
    departments: { title: string; body: string };
    lawyers: { title: string; body: string };
  };
  insights: {
    title: string;
    subtitle: string;
    readMore: string;
    viewAll: string;
  };
  faq: {
    title: string;
    entries: FaqEntry[];
  };
  finalCta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
    tagline: string;
  };
}

const en: HomeContent = {
  hero: {
    eyebrow: "JURE · LegalTech",
    h1a: "The AI-native",
    h1b: "legal work platform",
    verbs: "Manage matters. Research law. Work with AI. Collaborate securely.",
    subtitle:
      "JURE brings matters, clients, documents, tasks, knowledge and responsible AI into one secure workspace — built for law firms and legal teams working in French, English and Arabic.",
    ctaPrimary: "See JURE in action",
    ctaSecondary: "Explore the platform",
    trustChips: [
      "AI-assisted, human-in-the-loop",
      "Secure by design",
      "Built for legal teams",
      "FR · EN · AR",
    ],
  },
  problem: {
    title: "Legal work is fragmented. Your tools shouldn't be.",
    body1:
      "A single matter lives across email threads, shared drives, spreadsheets, chat apps and paper files. Every switch between tools loses context, duplicates work and hides deadlines.",
    body2:
      "Legal teams shouldn't need five disconnected tools to manage one matter.",
    fragments: ["Research", "Documents", "Matter", "Tasks", "Knowledge", "Collaboration"],
    convergenceTitle: "One legal workspace.",
    convergenceSub: "Everything a matter needs, connected in one place.",
  },
  pillars: {
    title: "What you can do with JURE",
    subtitle: "The operational and intellectual work of a legal team, in one platform.",
    matter: {
      title: "Matter management",
      body: "Every case connects its client, documents, tasks, deadlines and team. Litigation, consultation and administrative matters each carry their own structure — with a shared calendar so nothing slips.",
      link: "Explore case management",
    },
    ai: {
      title: "Legal AI, built responsibly",
      badge: "Early access",
      body: "Juria, JURE's legal AI assistant, helps with contract analysis, research-style questions and document drafting — inside the matter you're working on. Output is clearly marked as AI-generated and always subject to lawyer review.",
      disclaimer: "AI assists. Lawyers decide.",
      link: "Explore Legal AI",
    },
    documents: {
      title: "Documents & knowledge",
      body: "A secure library for the firm's documents: upload, categorize, tag, search and preview PDF and Word files without leaving the workspace — and attach them directly to matters.",
      link: "Explore document management",
    },
    collaboration: {
      title: "Collaboration",
      body: "Real-time team messaging, group conversations, file sharing and voice or video calls — connected to your matters, so the discussion and the work stay together.",
      link: "Explore the platform",
    },
  },
  workflows: {
    title: "How legal work flows through JURE",
    subtitle: "Real workflows, not feature lists.",
    docToMatter: {
      title: "From document to matter",
      steps: ["Upload document", "Attach to matter", "Create tasks", "Set deadline", "Assign team"],
    },
    questionToResearch: {
      title: "From question to reviewed analysis",
      steps: ["Legal question", "AI research mode", "Draft analysis", "Lawyer review", "Legal decision"],
      note: "The lawyer review step is not optional — it's how JURE is designed.",
    },
  },
  security: {
    title: "Built for confidential legal work.",
    body: "Your matters, documents and conversations are scoped to your firm and protected by role-based permissions. We're transparent about what's live today and what's on our roadmap.",
    items: [
      "Per-firm data isolation",
      "Role-based access control",
      "Authenticated, verified accounts",
      "Encrypted in transit (TLS)",
    ],
    cta: "Explore security",
  },
  audiences: {
    title: "Who JURE is for",
    firms: {
      title: "Law firms",
      body: "Manage matters, clients, documents, deadlines, teams and firm finance in one place — from solo practices to multi-lawyer cabinets.",
    },
    departments: {
      title: "Corporate legal departments",
      body: "Centralize legal requests, documents and knowledge; give the team shared visibility over workloads and deadlines.",
    },
    lawyers: {
      title: "Lawyers",
      body: "Research, analyze, draft and manage your work faster — with AI assistance that keeps you in control.",
    },
  },
  insights: {
    title: "JURE Insights",
    subtitle: "Original analysis on LegalTech, legal AI and the future of legal work.",
    readMore: "Read article",
    viewAll: "View all insights",
  },
  faq: {
    title: "Frequently asked questions",
    entries: [
      {
        question: "What is JURE?",
        answer:
          "JURE is an AI-native legal work platform: one secure workspace where law firms and legal teams manage matters, clients, documents, tasks, deadlines and team collaboration, with an integrated legal AI assistant (Juria) available in early access.",
      },
      {
        question: "What is a legal work platform?",
        answer:
          "A legal work platform unifies the operational work of legal teams (matters, tasks, deadlines, documents, collaboration) and the intellectual work (research, analysis, drafting, knowledge) in a single system, instead of spreading it across disconnected tools.",
      },
      {
        question: "Who is JURE designed for?",
        answer:
          "Law firms of all sizes, corporate legal departments, solo lawyers and legal operations teams. The interface works in French, English and Arabic, including right-to-left layout.",
      },
      {
        question: "Does JURE replace lawyers?",
        answer:
          "No. JURE is built human-in-the-loop by design: AI output is clearly marked, and analysis, drafting suggestions and research always pass through lawyer review before any legal decision. AI augments legal professionals — it does not replace them.",
      },
      {
        question: "How does JURE's legal AI work?",
        answer:
          "Juria, JURE's legal AI assistant, offers chat, contract analysis, research-style questions and document drafting, connected to the matter you're working on. It's currently in early access, and its output is always subject to human review.",
      },
      {
        question: "How does JURE protect confidential legal information?",
        answer:
          "Each firm's data is isolated to its own workspace, access is controlled by roles and permissions, accounts require verified email sign-in, and traffic is encrypted in transit. Our security page transparently separates what's live today from what's on the roadmap.",
      },
      {
        question: "Which languages does JURE support?",
        answer:
          "JURE works in French, English and Arabic, with full right-to-left support for Arabic — reflecting its roots in Morocco and multilingual legal markets.",
      },
      {
        question: "How is JURE different from traditional legal practice management software?",
        answer:
          "Traditional practice management tools digitize administration. JURE is designed AI-native: matters, documents, knowledge, collaboration and AI assistance live in one workspace, so the intellectual work of law and the operational work of running it stay connected.",
      },
    ],
  },
  finalCta: {
    title: "We're building JURE with the first firms.",
    body: "JURE is in active development with early legal teams. Join now to shape the platform — your feedback drives what we build next.",
    primary: "Start with JURE",
    secondary: "See JURE in action",
    tagline: "The future of law, built responsibly.",
  },
};

const fr: HomeContent = {
  hero: {
    eyebrow: "JURE · LegalTech",
    h1a: "La plateforme de travail juridique",
    h1b: "native IA",
    verbs: "Gérez vos dossiers. Recherchez le droit. Travaillez avec l'IA. Collaborez en sécurité.",
    subtitle:
      "JURE réunit dossiers, clients, documents, tâches, connaissances et IA responsable dans un espace de travail sécurisé — conçu pour les cabinets d'avocats et équipes juridiques travaillant en français, anglais et arabe.",
    ctaPrimary: "Voir JURE en action",
    ctaSecondary: "Explorer la plateforme",
    trustChips: [
      "IA assistée, validation humaine",
      "Sécurisé par conception",
      "Conçu pour les équipes juridiques",
      "FR · EN · AR",
    ],
  },
  problem: {
    title: "Le travail juridique est fragmenté. Vos outils ne devraient pas l'être.",
    body1:
      "Un même dossier vit dans des fils d'e-mails, des disques partagés, des tableurs, des messageries et des dossiers papier. Chaque changement d'outil fait perdre le contexte, duplique le travail et masque les échéances.",
    body2:
      "Une équipe juridique ne devrait pas avoir besoin de cinq outils déconnectés pour gérer un seul dossier.",
    fragments: ["Recherche", "Documents", "Dossier", "Tâches", "Connaissances", "Collaboration"],
    convergenceTitle: "Un seul espace de travail juridique.",
    convergenceSub: "Tout ce dont un dossier a besoin, connecté au même endroit.",
  },
  pillars: {
    title: "Ce que vous pouvez faire avec JURE",
    subtitle: "Le travail opérationnel et intellectuel d'une équipe juridique, sur une seule plateforme.",
    matter: {
      title: "Gestion des dossiers",
      body: "Chaque dossier relie son client, ses documents, ses tâches, ses échéances et son équipe. Contentieux, consultation et dossiers administratifs ont chacun leur structure — avec un agenda partagé pour ne rien laisser passer.",
      link: "Explorer la gestion de dossiers",
    },
    ai: {
      title: "IA juridique, conçue de manière responsable",
      badge: "Accès anticipé",
      body: "Juria, l'assistant IA juridique de JURE, aide à l'analyse de contrats, aux questions de recherche et à la rédaction de documents — au sein du dossier sur lequel vous travaillez. Les résultats sont clairement identifiés comme générés par IA et toujours soumis à la relecture de l'avocat.",
      disclaimer: "L'IA assiste. Les avocats décident.",
      link: "Explorer l'IA juridique",
    },
    documents: {
      title: "Documents & connaissances",
      body: "Une bibliothèque sécurisée pour les documents du cabinet : importez, catégorisez, taguez, recherchez et prévisualisez les fichiers PDF et Word sans quitter l'espace de travail — et rattachez-les directement aux dossiers.",
      link: "Explorer la gestion documentaire",
    },
    collaboration: {
      title: "Collaboration",
      body: "Messagerie d'équipe en temps réel, conversations de groupe, partage de fichiers et appels audio ou vidéo — connectés à vos dossiers, pour que la discussion et le travail restent ensemble.",
      link: "Explorer la plateforme",
    },
  },
  workflows: {
    title: "Comment le travail juridique circule dans JURE",
    subtitle: "De vrais flux de travail, pas des listes de fonctionnalités.",
    docToMatter: {
      title: "Du document au dossier",
      steps: ["Importer le document", "Rattacher au dossier", "Créer les tâches", "Fixer l'échéance", "Assigner l'équipe"],
    },
    questionToResearch: {
      title: "De la question à l'analyse validée",
      steps: ["Question juridique", "Mode recherche IA", "Projet d'analyse", "Relecture par l'avocat", "Décision juridique"],
      note: "L'étape de relecture par l'avocat n'est pas optionnelle — c'est la conception même de JURE.",
    },
  },
  security: {
    title: "Conçu pour le travail juridique confidentiel.",
    body: "Vos dossiers, documents et conversations sont cloisonnés par cabinet et protégés par des permissions par rôles. Nous sommes transparents sur ce qui est en production aujourd'hui et sur notre feuille de route.",
    items: [
      "Isolation des données par cabinet",
      "Contrôle d'accès par rôles",
      "Comptes authentifiés et vérifiés",
      "Chiffrement en transit (TLS)",
    ],
    cta: "Explorer la sécurité",
  },
  audiences: {
    title: "À qui s'adresse JURE",
    firms: {
      title: "Cabinets d'avocats",
      body: "Gérez dossiers, clients, documents, échéances, équipes et finance du cabinet au même endroit — de l'avocat indépendant au cabinet pluridisciplinaire.",
    },
    departments: {
      title: "Directions juridiques",
      body: "Centralisez les demandes juridiques, les documents et les connaissances ; donnez à l'équipe une visibilité partagée sur les charges et les échéances.",
    },
    lawyers: {
      title: "Avocats",
      body: "Recherchez, analysez, rédigez et gérez votre travail plus vite — avec une assistance IA qui vous laisse le contrôle.",
    },
  },
  insights: {
    title: "JURE Insights",
    subtitle: "Analyses originales sur la LegalTech, l'IA juridique et l'avenir du travail juridique.",
    readMore: "Lire l'article",
    viewAll: "Voir tous les articles",
  },
  faq: {
    title: "Questions fréquentes",
    entries: [
      {
        question: "Qu'est-ce que JURE ?",
        answer:
          "JURE est une plateforme de travail juridique native IA : un espace de travail sécurisé où cabinets et équipes juridiques gèrent dossiers, clients, documents, tâches, échéances et collaboration, avec un assistant IA juridique intégré (Juria) disponible en accès anticipé.",
      },
      {
        question: "Qu'est-ce qu'une plateforme de travail juridique ?",
        answer:
          "Une plateforme de travail juridique unifie le travail opérationnel des équipes juridiques (dossiers, tâches, échéances, documents, collaboration) et le travail intellectuel (recherche, analyse, rédaction, connaissances) dans un seul système, au lieu de le disperser entre des outils déconnectés.",
      },
      {
        question: "À qui s'adresse JURE ?",
        answer:
          "Aux cabinets d'avocats de toutes tailles, aux directions juridiques d'entreprise, aux avocats indépendants et aux équipes de legal operations. L'interface fonctionne en français, anglais et arabe, y compris en écriture de droite à gauche.",
      },
      {
        question: "JURE remplace-t-il les avocats ?",
        answer:
          "Non. JURE est conçu avec validation humaine par principe : les résultats d'IA sont clairement identifiés, et l'analyse, les suggestions de rédaction et la recherche passent toujours par la relecture d'un avocat avant toute décision juridique. L'IA augmente les professionnels du droit — elle ne les remplace pas.",
      },
      {
        question: "Comment fonctionne l'IA juridique de JURE ?",
        answer:
          "Juria, l'assistant IA juridique de JURE, propose du chat, de l'analyse de contrats, des questions de recherche et de la rédaction de documents, connectés au dossier sur lequel vous travaillez. Il est actuellement en accès anticipé et ses résultats sont toujours soumis à une relecture humaine.",
      },
      {
        question: "Comment JURE protège-t-il les informations juridiques confidentielles ?",
        answer:
          "Les données de chaque cabinet sont isolées dans leur propre espace, l'accès est contrôlé par rôles et permissions, les comptes exigent une connexion avec e-mail vérifié, et le trafic est chiffré en transit. Notre page sécurité distingue de manière transparente ce qui est en production de ce qui est sur la feuille de route.",
      },
      {
        question: "Quelles langues JURE prend-il en charge ?",
        answer:
          "JURE fonctionne en français, anglais et arabe, avec prise en charge complète de l'écriture de droite à gauche pour l'arabe — reflet de ses racines au Maroc et des marchés juridiques multilingues.",
      },
      {
        question: "En quoi JURE diffère-t-il d'un logiciel de gestion de cabinet traditionnel ?",
        answer:
          "Les outils traditionnels numérisent l'administration. JURE est conçu nativement autour de l'IA : dossiers, documents, connaissances, collaboration et assistance IA vivent dans un même espace de travail, pour que le travail intellectuel du droit et le travail opérationnel du cabinet restent connectés.",
      },
    ],
  },
  finalCta: {
    title: "Nous construisons JURE avec les premiers cabinets.",
    body: "JURE est en développement actif avec des équipes juridiques pionnières. Rejoignez-nous pour façonner la plateforme — vos retours orientent ce que nous construisons.",
    primary: "Commencer avec JURE",
    secondary: "Voir JURE en action",
    tagline: "L'avenir du droit, construit de manière responsable.",
  },
};

const ar: HomeContent = {
  hero: {
    eyebrow: "JURE · التقنية القانونية",
    h1a: "منصة العمل القانوني",
    h1b: "القائمة على الذكاء الاصطناعي",
    verbs: "أدر ملفاتك. ابحث في القانون. اعمل مع الذكاء الاصطناعي. تعاون بأمان.",
    subtitle:
      "تجمع JURE الملفات والعملاء والمستندات والمهام والمعرفة والذكاء الاصطناعي المسؤول في مساحة عمل آمنة واحدة — صُممت لمكاتب المحاماة والفرق القانونية العاملة بالفرنسية والإنجليزية والعربية.",
    ctaPrimary: "شاهد JURE عمليًا",
    ctaSecondary: "استكشف المنصة",
    trustChips: [
      "ذكاء اصطناعي بمراجعة بشرية",
      "آمن بالتصميم",
      "مصمم للفرق القانونية",
      "FR · EN · AR",
    ],
  },
  problem: {
    title: "العمل القانوني مشتت. أدواتك لا ينبغي أن تكون كذلك.",
    body1:
      "الملف الواحد يعيش بين سلاسل البريد الإلكتروني والأقراص المشتركة وجداول البيانات وتطبيقات المراسلة والملفات الورقية. كل تنقل بين الأدوات يفقد السياق ويكرر العمل ويخفي المواعيد النهائية.",
    body2: "لا ينبغي أن تحتاج الفرق القانونية إلى خمس أدوات منفصلة لإدارة ملف واحد.",
    fragments: ["البحث", "المستندات", "الملف", "المهام", "المعرفة", "التعاون"],
    convergenceTitle: "مساحة عمل قانونية واحدة.",
    convergenceSub: "كل ما يحتاجه الملف، متصل في مكان واحد.",
  },
  pillars: {
    title: "ماذا يمكنك أن تفعل مع JURE",
    subtitle: "العمل التشغيلي والفكري للفريق القانوني، في منصة واحدة.",
    matter: {
      title: "إدارة الملفات",
      body: "كل قضية تربط موكلها ومستنداتها ومهامها ومواعيدها وفريقها. النزاعات والاستشارات والملفات الإدارية لكل منها هيكلها الخاص — مع مفكرة مشتركة حتى لا يفوت شيء.",
      link: "استكشف إدارة القضايا",
    },
    ai: {
      title: "ذكاء اصطناعي قانوني، مبني بمسؤولية",
      badge: "وصول مبكر",
      body: "جوريا، مساعد JURE للذكاء الاصطناعي القانوني، يساعد في تحليل العقود وأسئلة البحث وصياغة المستندات — داخل الملف الذي تعمل عليه. المخرجات موسومة بوضوح كنتاج ذكاء اصطناعي وتخضع دائمًا لمراجعة المحامي.",
      disclaimer: "الذكاء الاصطناعي يساعد. والمحامون يقررون.",
      link: "استكشف الذكاء الاصطناعي القانوني",
    },
    documents: {
      title: "المستندات والمعرفة",
      body: "مكتبة آمنة لمستندات المكتب: ارفع وصنّف وضع الوسوم وابحث وعاين ملفات PDF وWord دون مغادرة مساحة العمل — واربطها مباشرة بالملفات.",
      link: "استكشف إدارة المستندات",
    },
    collaboration: {
      title: "التعاون",
      body: "مراسلة فورية للفريق ومحادثات جماعية ومشاركة ملفات ومكالمات صوتية ومرئية — متصلة بملفاتك، ليبقى النقاش والعمل معًا.",
      link: "استكشف المنصة",
    },
  },
  workflows: {
    title: "كيف يتدفق العمل القانوني عبر JURE",
    subtitle: "مسارات عمل حقيقية، لا قوائم ميزات.",
    docToMatter: {
      title: "من المستند إلى الملف",
      steps: ["رفع المستند", "الربط بالملف", "إنشاء المهام", "تحديد الموعد النهائي", "تعيين الفريق"],
    },
    questionToResearch: {
      title: "من السؤال إلى تحليل مُراجَع",
      steps: ["سؤال قانوني", "وضع البحث بالذكاء الاصطناعي", "مسودة التحليل", "مراجعة المحامي", "القرار القانوني"],
      note: "خطوة مراجعة المحامي ليست اختيارية — هكذا صُممت JURE.",
    },
  },
  security: {
    title: "مصمم للعمل القانوني السري.",
    body: "ملفاتك ومستنداتك ومحادثاتك محصورة في نطاق مكتبك ومحمية بصلاحيات حسب الأدوار. نحن شفافون بشأن ما هو متاح اليوم وما هو على خارطة الطريق.",
    items: [
      "عزل البيانات لكل مكتب",
      "التحكم في الوصول حسب الأدوار",
      "حسابات موثّقة ومُتحقق منها",
      "تشفير أثناء النقل (TLS)",
    ],
    cta: "استكشف الأمان",
  },
  audiences: {
    title: "لمن صُممت JURE",
    firms: {
      title: "مكاتب المحاماة",
      body: "أدر الملفات والعملاء والمستندات والمواعيد والفرق ومالية المكتب في مكان واحد — من المحامي المستقل إلى المكاتب متعددة المحامين.",
    },
    departments: {
      title: "الإدارات القانونية للشركات",
      body: "مركزة الطلبات القانونية والمستندات والمعرفة؛ وامنح الفريق رؤية مشتركة لأعباء العمل والمواعيد.",
    },
    lawyers: {
      title: "المحامون",
      body: "ابحث وحلّل وصِغ وأدر عملك أسرع — بمساعدة ذكاء اصطناعي تُبقيك مسيطرًا.",
    },
  },
  insights: {
    title: "رؤى JURE",
    subtitle: "تحليلات أصلية حول التقنية القانونية والذكاء الاصطناعي القانوني ومستقبل العمل القانوني.",
    readMore: "اقرأ المقال",
    viewAll: "عرض كل الرؤى",
  },
  faq: {
    title: "الأسئلة الشائعة",
    entries: [
      {
        question: "ما هي JURE؟",
        answer:
          "JURE منصة عمل قانوني قائمة على الذكاء الاصطناعي: مساحة عمل آمنة واحدة تدير فيها مكاتب المحاماة والفرق القانونية الملفات والعملاء والمستندات والمهام والمواعيد والتعاون، مع مساعد ذكاء اصطناعي قانوني مدمج (جوريا) متاح في مرحلة الوصول المبكر.",
      },
      {
        question: "ما هي منصة العمل القانوني؟",
        answer:
          "منصة العمل القانوني توحّد العمل التشغيلي للفرق القانونية (الملفات والمهام والمواعيد والمستندات والتعاون) والعمل الفكري (البحث والتحليل والصياغة والمعرفة) في نظام واحد، بدلًا من تشتيته بين أدوات منفصلة.",
      },
      {
        question: "لمن صُممت JURE؟",
        answer:
          "لمكاتب المحاماة بجميع أحجامها، والإدارات القانونية للشركات، والمحامين المستقلين، وفرق العمليات القانونية. تعمل الواجهة بالفرنسية والإنجليزية والعربية، بما في ذلك الكتابة من اليمين إلى اليسار.",
      },
      {
        question: "هل تحل JURE محل المحامين؟",
        answer:
          "لا. صُممت JURE على مبدأ المراجعة البشرية: مخرجات الذكاء الاصطناعي موسومة بوضوح، ويمر التحليل واقتراحات الصياغة والبحث دائمًا بمراجعة محامٍ قبل أي قرار قانوني. الذكاء الاصطناعي يعزز المهنيين القانونيين — ولا يحل محلهم.",
      },
      {
        question: "كيف يعمل الذكاء الاصطناعي القانوني في JURE؟",
        answer:
          "جوريا، مساعد JURE للذكاء الاصطناعي القانوني، يقدم المحادثة وتحليل العقود وأسئلة البحث وصياغة المستندات، متصلة بالملف الذي تعمل عليه. وهو حاليًا في مرحلة الوصول المبكر، ومخرجاته تخضع دائمًا لمراجعة بشرية.",
      },
      {
        question: "كيف تحمي JURE المعلومات القانونية السرية؟",
        answer:
          "بيانات كل مكتب معزولة في مساحته الخاصة، والوصول محكوم بالأدوار والصلاحيات، والحسابات تتطلب تسجيل دخول ببريد إلكتروني مُتحقق منه، وحركة البيانات مشفرة أثناء النقل. صفحة الأمان لدينا تفصل بشفافية بين ما هو متاح اليوم وما هو على خارطة الطريق.",
      },
      {
        question: "ما اللغات التي تدعمها JURE؟",
        answer:
          "تعمل JURE بالفرنسية والإنجليزية والعربية، مع دعم كامل للكتابة من اليمين إلى اليسار — انعكاسًا لجذورها في المغرب والأسواق القانونية متعددة اللغات.",
      },
      {
        question: "بماذا تختلف JURE عن برامج إدارة المكاتب التقليدية؟",
        answer:
          "الأدوات التقليدية ترقمن الإدارة فقط. أما JURE فمصممة أصلًا حول الذكاء الاصطناعي: الملفات والمستندات والمعرفة والتعاون والمساعدة الذكية تعيش في مساحة عمل واحدة، ليبقى العمل الفكري للقانون والعمل التشغيلي للمكتب متصلين.",
      },
    ],
  },
  finalCta: {
    title: "نبني JURE مع المكاتب الأولى.",
    body: "JURE في تطوير نشط مع فرق قانونية رائدة. انضم الآن لتشكيل المنصة — ملاحظاتك توجه ما نبنيه.",
    primary: "ابدأ مع JURE",
    secondary: "شاهد JURE عمليًا",
    tagline: "مستقبل القانون، مبني بمسؤولية.",
  },
};

export const HOME_CONTENT: Record<MarketingLocale, HomeContent> = { en, fr, ar };
