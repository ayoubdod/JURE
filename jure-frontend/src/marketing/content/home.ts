import type { MarketingLocale } from "../site";
import type { FaqEntry } from "../structuredData";

/**
 * Homepage copy — EN/FR/AR. Every claim maps to a shipped capability.
 * AI is framed as early access with human review; nothing invented.
 */

export interface HomeContent {
  hero: {
    eyebrow: string;
    h1a: string;
    h1b: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    ctaPricing: string;
    imageAlt: string;
  };
  sitelinks: {
    title: string;
  };
  editorial: {
    titleA: string;
    titleB: string;
    cards: Array<{ index: string; title: string; body: string }>;
  };
  metrics: {
    title: string;
    items: Array<{
      index: string;
      kicker: string;
      headline: string;
      body: string;
    }>;
  };
  features: {
    eyebrow: string;
    headline: string;
    body: string;
    close: string;
    closeCta: string;
    finaleTitle: string;
    finaleBody: string;
    cases: { category: string; title: string; body: string; link: string };
    clients: { category: string; title: string; body: string; link: string };
    calendar: { category: string; title: string; body: string; link: string };
    documents: { category: string; title: string; body: string; link: string };
    team: { category: string; title: string; body: string; link: string };
    tasks: { category: string; title: string; body: string };
    finance: { category: string; title: string; body: string };
    juriaAi: { category: string; title: string; body: string };
    knowledge: { category: string; title: string; body: string };
  };
  juria: {
    badge: string;
    titleA: string;
    titleB: string;
    body: string;
    disclaimer: string;
    link: string;
  };
  security: {
    title: string;
    body: string;
    items: string[];
    cta: string;
  };
  floats: {
    activeCases: string;
    consultations: string;
    documents: string;
    juriaReady: string;
    teamOnline: string;
    clientMeta: string;
    clientName: string;
    nextConsult: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    lead: string;
    ctaPrompt: string;
    cta: string;
    entries: FaqEntry[];
  };
  finalCta: {
    kicker: string;
    title: string;
    body: string;
    primary: string;
    secondary: string;
    tagline: string;
  };
}

const en: HomeContent = {
  hero: {
    eyebrow: "The operating system for modern law firms",
    h1a: "Run your law firm.",
    h1b: "Smarter.",
    subtitle:
      "JURE brings cases, clients, documents, team collaboration and AI-powered legal intelligence into one workspace.",
    ctaPrimary: "Get Started",
    ctaSecondary: "Explore JURE",
    ctaPricing: "View pricing",
    imageAlt: "JURE workspace — cases, calendar, documents and JURIA in one interface",
  },
  sitelinks: {
    title: "Explore JURE",
  },
  editorial: {
    titleA: "Everything your firm needs.",
    titleB: "One intelligent workspace.",
    cards: [
      {
        index: "01",
        title: "Manage",
        body: "Cases, clients and consultations live in one place — with the structure each matter type actually needs.",
      },
      {
        index: "02",
        title: "Collaborate",
        body: "Connect lawyers, assistants and teams around every matter, with messaging, files and calls in context.",
      },
      {
        index: "03",
        title: "Automate",
        body: "Cut repetitive administrative work: deadlines, documents, assignments and follow-ups stay attached to the file.",
      },
      {
        index: "04",
        title: "Think with JURIA",
        body: "Use AI-powered legal intelligence on the matter in front of you — while lawyers stay in control of every decision.",
      },
    ],
  },
  metrics: {
    title: "Built for modern legal teams",
    items: [
      {
        index: "01",
        kicker: "One workspace",
        headline: "Run your entire firm from one place.",
        body: "Manage matters, clients, documents, tasks, deadlines, collaboration, and billing without switching between disconnected tools.",
      },
      {
        index: "02",
        kicker: "Built for legal practice",
        headline: "Work naturally across French, English, and Arabic.",
        body: "JURE is designed for multilingual legal teams operating across Morocco, MENA, and international markets.",
      },
      {
        index: "03",
        kicker: "AI with lawyers in control",
        headline: "AI assists. Lawyers decide.",
        body: "Every AI-generated output is designed to remain subject to professional review before it is relied upon.",
      },
    ],
  },
  features: {
    eyebrow: "The workspace, in practice",
    headline: "A calm interface for the operational and intellectual work of law.",
    body: "JURE brings the daily work of a law firm into one connected workspace — from the first client interaction to the matter, documents, deadlines, team and final outcome.",
    close: "Everything connected. Intelligence when you need it.",
    closeCta: "Explore JURE",
    finaleTitle: "One workspace. One connected system.",
    finaleBody:
      "From the first client interaction to the final outcome, the work stays connected.",
    cases: {
      category: "Case management",
      title: "Every matter, connected.",
      body: "Every matter connects its client, documents, tasks, deadlines and team. Litigation, consultation and administrative files each carry the structure they need.",
      link: "Explore case management",
    },
    clients: {
      category: "Client management",
      title: "Know the client behind every matter.",
      body: "Keep company and individual clients alongside the matters they belong to — with contacts, history and open files available from one profile.",
      link: "Explore client management",
    },
    calendar: {
      category: "Consultations & calendar",
      title: "A calendar built around legal work.",
      body: "Hearings, consultations, tasks and firm events share one calendar, so nothing slips between inboxes, spreadsheets or disconnected tools.",
      link: "Explore practice management",
    },
    documents: {
      category: "Documents & legal knowledge",
      title: "Your firm's knowledge, within reach.",
      body: "Upload, categorize, tag, search and preview PDF and Word files without leaving the workspace — and attach them directly to matters.",
      link: "Explore document management",
    },
    team: {
      category: "Team management",
      title: "Keep the firm connected to the work.",
      body: "Roles, presence and assignments stay visible. Messaging, group conversations and calls remain connected to the matters your team is working on.",
      link: "Explore the platform",
    },
    tasks: {
      category: "Tasks & deadlines",
      title: "Turn legal work into clear next steps.",
      body: "Assign work to the responsible lawyer, attach it to the matter, and keep due dates and status visible — so the next step is never lost in an inbox.",
    },
    finance: {
      category: "Finance & billing",
      title: "Keep the business of the firm visible.",
      body: "Fees, invoices and payments stay attached to the matter, so the operational work of the file and the economics of the file remain in the same place.",
    },
    juriaAi: {
      category: "Juria AI",
      title: "AI, inside the legal workflow.",
      body: "Ask questions about the matter in front of you. Juria answers from the documents on the file — clearly marked as AI-assisted, and always subject to lawyer review.",
    },
    knowledge: {
      category: "Firm knowledge",
      title: "One knowledge layer for the firm.",
      body: "Matter files feed the firm's library. Search once, find what the firm already knows, and reuse it on the next file.",
    },
  },
  juria: {
    badge: "Early access",
    titleA: "Meet JURIA.",
    titleB: "Your firm's intelligent legal assistant.",
    body: "JURIA helps with contract analysis, research-style questions and drafting — inside the matter you're working on. Output is clearly marked as AI-generated and always subject to lawyer review.",
    disclaimer: "AI assists. Lawyers decide.",
    link: "Meet JURIA",
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
  floats: {
    activeCases: "Active cases",
    consultations: "Consultations today",
    documents: "Pending review",
    juriaReady: "Legal analysis ready",
    teamOnline: "Members online",
    clientMeta: "Company · 2 open matters",
    clientName: "Atlas Textile SARL",
    nextConsult: "Upcoming consultation",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Questions, answered.",
    lead: "A few things law firms and legal teams often ask before getting started with JURE.",
    ctaPrompt: "Still have questions?",
    cta: "Talk to us",
    entries: [
      {
        question: "What is JURE?",
        answer:
          "JURE is a legal workspace designed for law firms and legal teams. It brings matters, clients, documents, tasks, deadlines, calendar, team collaboration, finance and AI-assisted legal work into one connected environment.",
      },
      {
        question: "Who is JURE designed for?",
        answer:
          "JURE is built for law firms — from independent lawyers and small practices to larger firms — and for legal teams managing multiple matters, clients and collaborators.",
      },
      {
        question: "Can JURE manage different types of legal matters?",
        answer:
          "Yes. JURE supports litigation, consultations and administrative matters, keeping the relevant client, documents, tasks, deadlines and team connected to each file.",
      },
      {
        question: "Can we manage our firm's documents and legal knowledge in JURE?",
        answer:
          "Yes. Teams can upload, organize, categorize, tag, search and preview PDF and Word files, and attach them directly to matters and clients — so working knowledge stays in the same workspace.",
      },
      {
        question: "How does Juria, JURE's AI assistant, work?",
        answer:
          "Juria is JURE's AI legal assistant, available in early access. It assists with research-style questions, contract analysis and drafting inside the matter you are working on. Output is clearly marked as AI-generated and always subject to lawyer review.",
      },
      {
        question: "Is our firm's data secure?",
        answer:
          "Each firm's data is isolated to its own workspace. Access is controlled by roles and permissions, accounts require verified email sign-in, and traffic is encrypted in transit. Our security page separates what is live today from what is on the roadmap.",
      },
      {
        question: "Can JURE support multiple lawyers and teams?",
        answer:
          "Yes. JURE supports team-based work with roles, assignments, messaging, calls and matter-level visibility, so everyone can see who is responsible for what.",
      },
      {
        question: "Can JURE be adapted to our firm's workflow?",
        answer:
          "JURE is organized around how legal teams actually work. Matter types, roles, tasks, documents, deadlines and collaboration live in one workspace so the firm can run its operational rhythm without switching tools.",
      },
      {
        question: "Does JURE replace our lawyers or legal judgment?",
        answer:
          "No. JURE is a professional workspace. Its purpose is to help legal professionals organize information, reduce administrative friction and work more efficiently — while keeping human judgment at the center.",
      },
      {
        question: "How can we get started?",
        answer:
          "Start with a conversation about your firm's workflow and requirements. We can help you understand how JURE can fit into your practice.",
      },
    ],
  },
  finalCta: {
    kicker: "Built for modern firms",
    title: "Your firm deserves a better workspace.",
    body: "Bring your practice, your team and your legal intelligence together with JURE.",
    primary: "Get Started",
    secondary: "Contact us",
    tagline: "LegalTech for modern legal teams — built responsibly.",
  },
};

const fr: HomeContent = {
  hero: {
    eyebrow: "Le système d'exploitation des cabinets modernes",
    h1a: "Pilotez votre cabinet.",
    h1b: "Plus intelligemment.",
    subtitle:
      "JURE réunit dossiers, clients, documents, collaboration d'équipe et intelligence juridique assistée par IA dans un seul espace de travail.",
    ctaPrimary: "Commencer",
    ctaSecondary: "Explorer JURE",
    ctaPricing: "Voir les tarifs",
    imageAlt: "Espace de travail JURE — dossiers, agenda, documents et JURIA dans une seule interface",
  },
  sitelinks: {
    title: "Explorer JURE",
  },
  editorial: {
    titleA: "Tout ce dont votre cabinet a besoin.",
    titleB: "Un seul espace intelligent.",
    cards: [
      {
        index: "01",
        title: "Piloter",
        body: "Dossiers, clients et consultations au même endroit — avec la structure propre à chaque type de dossier.",
      },
      {
        index: "02",
        title: "Collaborer",
        body: "Reliez avocats, assistants et équipes autour de chaque affaire, avec messagerie, fichiers et appels dans le contexte.",
      },
      {
        index: "03",
        title: "Automatiser",
        body: "Réduisez le travail administratif répétitif : échéances, documents, assignations et relances restent attachés au dossier.",
      },
      {
        index: "04",
        title: "Penser avec JURIA",
        body: "Utilisez l'intelligence juridique assistée par IA sur le dossier en cours — les avocats restent maîtres de chaque décision.",
      },
    ],
  },
  metrics: {
    title: "Conçu pour les équipes juridiques modernes",
    items: [
      {
        index: "01",
        kicker: "Un seul espace",
        headline: "Pilotez l'ensemble du cabinet depuis un seul endroit.",
        body: "Gérez dossiers, clients, documents, tâches, échéances, collaboration et facturation sans passer d'un outil à l'autre.",
      },
      {
        index: "02",
        kicker: "Conçu pour la pratique du droit",
        headline: "Travaillez naturellement en français, en anglais et en arabe.",
        body: "JURE est conçu pour les équipes juridiques plurilingues qui opèrent au Maroc, au Moyen-Orient et à l'international.",
      },
      {
        index: "03",
        kicker: "L'IA sous contrôle de l'avocat",
        headline: "L'IA assiste. L'avocat décide.",
        body: "Chaque production générée par l'IA est conçue pour rester soumise à une relecture professionnelle avant d'être utilisée.",
      },
    ],
  },
  features: {
    eyebrow: "L'espace de travail, en pratique",
    headline: "Une interface calme pour le travail opérationnel et intellectuel du droit.",
    body: "JURE rassemble le travail quotidien d'un cabinet dans un seul espace connecté — du premier échange avec le client au dossier, aux documents, aux échéances, à l'équipe et à l'issue.",
    close: "Tout est relié. L'intelligence, au moment où vous en avez besoin.",
    closeCta: "Explorer JURE",
    finaleTitle: "Un espace de travail. Un système connecté.",
    finaleBody:
      "Du premier échange avec le client jusqu'à l'issue, le travail reste relié.",
    cases: {
      category: "Gestion des dossiers",
      title: "Chaque affaire, reliée.",
      body: "Chaque affaire relie son client, ses documents, ses tâches, ses échéances et son équipe. Contentieux, consultation et dossiers administratifs ont chacun la structure dont ils ont besoin.",
      link: "Explorer la gestion de dossiers",
    },
    clients: {
      category: "Gestion des clients",
      title: "Connaître le client derrière chaque affaire.",
      body: "Gardez sociétés et particuliers à côté des dossiers qui les concernent — contacts, historique et affaires ouvertes dans un seul profil.",
      link: "Explorer la gestion des clients",
    },
    calendar: {
      category: "Consultations et agenda",
      title: "Un agenda conçu pour le travail juridique.",
      body: "Audiences, consultations, tâches et événements du cabinet partagent un seul agenda, pour que rien ne se perde entre messageries, tableurs et outils déconnectés.",
      link: "Explorer la gestion de cabinet",
    },
    documents: {
      category: "Documents et connaissances",
      title: "La connaissance du cabinet, à portée de main.",
      body: "Importez, catégorisez, taguez, recherchez et prévisualisez les fichiers PDF et Word sans quitter l'espace de travail — et rattachez-les directement aux dossiers.",
      link: "Explorer la gestion documentaire",
    },
    team: {
      category: "Gestion d'équipe",
      title: "Garder le cabinet relié au travail.",
      body: "Rôles, présence et assignations restent visibles. Messagerie, conversations de groupe et appels restent liés aux dossiers sur lesquels l'équipe travaille.",
      link: "Explorer la plateforme",
    },
    tasks: {
      category: "Tâches et échéances",
      title: "Transformer le travail juridique en prochaines étapes claires.",
      body: "Assignez le travail à l'avocat responsable, rattachez-le au dossier, et gardez échéances et statut visibles — pour que la prochaine étape ne se perde jamais dans une messagerie.",
    },
    finance: {
      category: "Finance et facturation",
      title: "Garder visible l'activité économique du cabinet.",
      body: "Honoraires, factures et paiements restent attachés au dossier, pour que le travail opérationnel du fichier et son économie restent au même endroit.",
    },
    juriaAi: {
      category: "Juria IA",
      title: "L'IA, dans le flux de travail juridique.",
      body: "Posez des questions sur le dossier devant vous. Juria répond à partir des documents du fichier — clairement identifié comme assisté par IA, et toujours soumis à la relecture de l'avocat.",
    },
    knowledge: {
      category: "Connaissance du cabinet",
      title: "Une couche de connaissance pour le cabinet.",
      body: "Les documents des dossiers alimentent la bibliothèque du cabinet. Cherchez une fois, retrouvez ce que le cabinet sait déjà, et réutilisez-le sur le prochain dossier.",
    },
  },
  juria: {
    badge: "Accès anticipé",
    titleA: "Découvrez JURIA.",
    titleB: "L'assistant juridique intelligent de votre cabinet.",
    body: "JURIA aide à l'analyse de contrats, aux questions de recherche et à la rédaction — au sein du dossier sur lequel vous travaillez. Les résultats sont clairement identifiés comme générés par IA et toujours soumis à la relecture de l'avocat.",
    disclaimer: "L'IA assiste. Les avocats décident.",
    link: "Découvrir JURIA",
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
  floats: {
    activeCases: "Dossiers actifs",
    consultations: "Consultations aujourd'hui",
    documents: "En relecture",
    juriaReady: "Analyse juridique prête",
    teamOnline: "Membres en ligne",
    clientMeta: "Société · 2 dossiers ouverts",
    clientName: "Atlas Textile SARL",
    nextConsult: "Consultation à venir",
  },
  faq: {
    eyebrow: "FAQ",
    title: "Des questions, des réponses.",
    lead: "Ce que les cabinets et les équipes juridiques nous demandent le plus souvent avant de commencer avec JURE.",
    ctaPrompt: "Encore une question ?",
    cta: "Parler à l'équipe",
    entries: [
      {
        question: "Qu'est-ce que JURE ?",
        answer:
          "JURE est un espace de travail juridique conçu pour les cabinets et les équipes juridiques. Il réunit dossiers, clients, documents, tâches, échéances, agenda, collaboration d'équipe, finance et travail juridique assisté par IA dans un même environnement connecté.",
      },
      {
        question: "À qui s'adresse JURE ?",
        answer:
          "JURE est conçu pour les cabinets d'avocats — de l'avocat indépendant au cabinet plus large — et pour les équipes juridiques qui gèrent plusieurs dossiers, clients et collaborateurs.",
      },
      {
        question: "JURE peut-il gérer différents types de dossiers ?",
        answer:
          "Oui. JURE prend en charge le contentieux, les consultations et les dossiers administratifs, en gardant le client, les documents, les tâches, les échéances et l'équipe reliés à chaque affaire.",
      },
      {
        question: "Pouvons-nous gérer les documents et la connaissance du cabinet dans JURE ?",
        answer:
          "Oui. Les équipes peuvent importer, organiser, catégoriser, taguer, rechercher et prévisualiser des fichiers PDF et Word, et les rattacher directement aux dossiers et aux clients — pour que la connaissance de travail reste dans le même espace.",
      },
      {
        question: "Comment fonctionne Juria, l'assistant IA de JURE ?",
        answer:
          "Juria est l'assistant juridique IA de JURE, en accès anticipé. Il aide aux questions de recherche, à l'analyse de contrats et à la rédaction, dans le dossier sur lequel vous travaillez. Les résultats sont clairement identifiés comme générés par IA et toujours soumis à la relecture de l'avocat.",
      },
      {
        question: "Les données de notre cabinet sont-elles protégées ?",
        answer:
          "Les données de chaque cabinet sont isolées dans leur propre espace. L'accès est contrôlé par rôles et permissions, les comptes exigent une connexion avec e-mail vérifié, et le trafic est chiffré en transit. Notre page sécurité distingue ce qui est en production de ce qui est sur la feuille de route.",
      },
      {
        question: "JURE peut-il accueillir plusieurs avocats et équipes ?",
        answer:
          "Oui. JURE prend en charge le travail d'équipe avec des rôles, des assignations, la messagerie, les appels et une visibilité par dossier, pour que chacun sache qui est responsable de quoi.",
      },
      {
        question: "JURE peut-il s'adapter au fonctionnement de notre cabinet ?",
        answer:
          "JURE est organisé autour de la façon dont les équipes juridiques travaillent réellement. Types de dossiers, rôles, tâches, documents, échéances et collaboration vivent dans un seul espace, pour que le cabinet tienne son rythme opérationnel sans changer d'outil.",
      },
      {
        question: "JURE remplace-t-il les avocats ou le jugement juridique ?",
        answer:
          "Non. JURE est un espace de travail professionnel. Son rôle est d'aider les juristes à organiser l'information, à réduire la friction administrative et à travailler plus efficacement — tout en gardant le jugement humain au centre.",
      },
      {
        question: "Comment commencer ?",
        answer:
          "Commencez par un échange sur le fonctionnement et les besoins de votre cabinet. Nous vous aiderons à voir comment JURE peut s'intégrer à votre pratique.",
      },
    ],
  },
  finalCta: {
    kicker: "Pensé pour les cabinets modernes",
    title: "Votre cabinet mérite un meilleur espace de travail.",
    body: "Réunissez votre pratique, votre équipe et votre intelligence juridique avec JURE.",
    primary: "Commencer",
    secondary: "Nous contacter",
    tagline: "La LegalTech pour les équipes juridiques modernes — construite de manière responsable.",
  },
};

const ar: HomeContent = {
  hero: {
    eyebrow: "نظام التشغيل لمكاتب المحاماة الحديثة",
    h1a: "أدر مكتبك.",
    h1b: "بذكاء.",
    subtitle:
      "تجمع JURE القضايا والعملاء والمستندات وتعاون الفريق والذكاء القانوني المدعوم بالذكاء الاصطناعي في مساحة عمل واحدة.",
    ctaPrimary: "ابدأ الآن",
    ctaSecondary: "استكشف JURE",
    ctaPricing: "عرض الأسعار",
    imageAlt: "مساحة عمل JURE — الملفات والمفكرة والمستندات وجوريا في واجهة واحدة",
  },
  sitelinks: {
    title: "استكشف JURE",
  },
  editorial: {
    titleA: "كل ما يحتاجه مكتبك.",
    titleB: "مساحة عمل ذكية واحدة.",
    cards: [
      {
        index: "01",
        title: "أدر",
        body: "الملفات والعملاء والاستشارات في مكان واحد — بهيكل يليق بكل نوع من القضايا.",
      },
      {
        index: "02",
        title: "تعاون",
        body: "اربط المحامين والمساعدين والفرق حول كل ملف، مع المراسلة والملفات والمكالمات في سياق العمل.",
      },
      {
        index: "03",
        title: "أتمت",
        body: "قلل العمل الإداري المتكرر: المواعيد والمستندات والتعيينات والمتابعات تبقى مرتبطة بالملف.",
      },
      {
        index: "04",
        title: "فكر مع جوريا",
        body: "استخدم الذكاء القانوني المدعوم بالذكاء الاصطناعي على الملف أمامك — والمحامون يبقون مسيطرين على كل قرار.",
      },
    ],
  },
  metrics: {
    title: "مبنية للفرق القانونية الحديثة",
    items: [
      {
        index: "01",
        kicker: "مساحة عمل واحدة",
        headline: "أدر مكتبك بالكامل من مكان واحد.",
        body: "أدر القضايا والعملاء والمستندات والمهام والمواعيد والتعاون والفواتير دون التنقل بين أدوات منفصلة.",
      },
      {
        index: "02",
        kicker: "مبنية لممارسة القانون",
        headline: "اعمل بسلاسة بالفرنسية والإنجليزية والعربية.",
        body: "صممت JURE للفرق القانونية متعددة اللغات التي تعمل في المغرب والشرق الأوسط والأسواق الدولية.",
      },
      {
        index: "03",
        kicker: "ذكاء اصطناعي تحت سيطرة المحامي",
        headline: "الذكاء الاصطناعي يساعد. المحامي يقرر.",
        body: "كل مخرجات الذكاء الاصطناعي مصممة لتبقى خاضعة للمراجعة المهنية قبل الاعتماد عليها.",
      },
    ],
  },
  features: {
    eyebrow: "مساحة العمل، عمليا",
    headline: "واجهة هادئة للعمل التشغيلي والفكري في القانون.",
    body: "تجمع JURE العمل اليومي لمكتب المحاماة في مساحة متصلة واحدة — من أول تواصل مع العميل إلى الملف والمستندات والمواعيد والفريق والنتيجة.",
    close: "كل شيء متصل. والذكاء حين تحتاجونه.",
    closeCta: "استكشف JURE",
    finaleTitle: "مساحة عمل واحدة. نظام متصل واحد.",
    finaleBody: "من أول تواصل مع العميل إلى النتيجة النهائية، يبقى العمل متصلا.",
    cases: {
      category: "إدارة القضايا",
      title: "كل قضية، متصلة.",
      body: "كل قضية تربط موكلها ومستنداتها ومهامها ومواعيدها وفريقها. النزاعات والاستشارات والملفات الإدارية لكل منها الهيكل الذي تحتاجه.",
      link: "استكشف إدارة القضايا",
    },
    clients: {
      category: "إدارة العملاء",
      title: "اعرف العميل خلف كل قضية.",
      body: "أبق الشركات والأفراد بجانب الملفات التي تخصهم — جهات الاتصال والسجل والملفات المفتوحة من ملف واحد.",
      link: "استكشف إدارة العملاء",
    },
    calendar: {
      category: "الاستشارات والمفكرة",
      title: "مفكرة مبنية حول العمل القانوني.",
      body: "الجلسات والاستشارات والمهام وأحداث المكتب تشترك في مفكرة واحدة، حتى لا يضيع شيء بين البريد والجداول والأدوات المنفصلة.",
      link: "استكشف إدارة المكاتب",
    },
    documents: {
      category: "المستندات والمعرفة القانونية",
      title: "معرفة مكتبك، في متناول اليد.",
      body: "ارفع وصنف وضع الوسوم وابحث وعاين ملفات PDF وWord دون مغادرة مساحة العمل — واربطها مباشرة بالملفات.",
      link: "استكشف إدارة المستندات",
    },
    team: {
      category: "إدارة الفريق",
      title: "أبق المكتب متصلا بالعمل.",
      body: "الأدوار والحضور والتعيينات تبقى ظاهرة. المراسلة والمحادثات الجماعية والمكالمات تبقى مرتبطة بالملفات التي يعمل عليها الفريق.",
      link: "استكشف المنصة",
    },
    tasks: {
      category: "المهام والمواعيد",
      title: "حول العمل القانوني إلى خطوات تالية واضحة.",
      body: "عين العمل للمحامي المسؤول، واربطه بالملف، وأبق المواعيد والحالة ظاهرة — حتى لا تضيع الخطوة التالية في صندوق بريد.",
    },
    finance: {
      category: "المالية والفوترة",
      title: "أبق نشاط المكتب الاقتصادي ظاهرا.",
      body: "الأتعاب والفواتير والمدفوعات تبقى مرتبطة بالملف، فيبقى العمل التشغيلي واقتصاد الملف في المكان نفسه.",
    },
    juriaAi: {
      category: "جوريا",
      title: "ذكاء اصطناعي داخل مسار العمل القانوني.",
      body: "اسأل عن الملف الذي أمامك. تجيب جوريا من مستندات الملف — موسومة بوضوح كمساعدة بالذكاء الاصطناعي، وتخضع دائما لمراجعة المحامي.",
    },
    knowledge: {
      category: "معرفة المكتب",
      title: "طبقة معرفة واحدة للمكتب.",
      body: "مستندات الملفات تغذي مكتبة المكتب. ابحث مرة، اعثر على ما يعرفه المكتب أصلا، وأعد استخدامه في الملف التالي.",
    },
  },
  juria: {
    badge: "وصول مبكر",
    titleA: "تعرف على جوريا.",
    titleB: "المساعد القانوني الذكي لمكتبك.",
    body: "تساعد جوريا في تحليل العقود وأسئلة البحث والصياغة — داخل الملف الذي تعمل عليه. المخرجات موسومة بوضوح كنتاج ذكاء اصطناعي وتخضع دائما لمراجعة المحامي.",
    disclaimer: "الذكاء الاصطناعي يساعد. والمحامون يقررون.",
    link: "تعرف على جوريا",
  },
  security: {
    title: "مصمم للعمل القانوني السري.",
    body: "ملفاتك ومستنداتك ومحادثاتك محصورة في نطاق مكتبك ومحمية بصلاحيات حسب الأدوار. نحن شفافون بشأن ما هو متاح اليوم وما هو على خارطة الطريق.",
    items: [
      "عزل البيانات لكل مكتب",
      "التحكم في الوصول حسب الأدوار",
      "حسابات موثقة ومتحقق منها",
      "تشفير أثناء النقل (TLS)",
    ],
    cta: "استكشف الأمان",
  },
  floats: {
    activeCases: "ملفات نشطة",
    consultations: "استشارات اليوم",
    documents: "بانتظار المراجعة",
    juriaReady: "التحليل القانوني جاهز",
    teamOnline: "أعضاء متصلون",
    clientMeta: "شركة · ملفان مفتوحان",
    clientName: "أطلس للنسيج ش.ذ.م.م",
    nextConsult: "استشارة قادمة",
  },
  faq: {
    eyebrow: "الأسئلة الشائعة",
    title: "أسئلة، وإجاباتها.",
    lead: "أسئلة تتكرر لدى مكاتب المحاماة والفرق القانونية قبل البدء مع JURE.",
    ctaPrompt: "ما زالت لديكم أسئلة؟",
    cta: "تحدثوا إلينا",
    entries: [
      {
        question: "ما هي JURE؟",
        answer:
          "JURE مساحة عمل قانونية صممت لمكاتب المحاماة والفرق القانونية. تجمع الملفات والعملاء والمستندات والمهام والمواعيد والمفكرة وتعاون الفريق والمالية والعمل القانوني المدعوم بالذكاء الاصطناعي في بيئة متصلة واحدة.",
      },
      {
        question: "لمن صممت JURE؟",
        answer:
          "صممت JURE لمكاتب المحاماة — من المحامي المستقل والمكاتب الصغيرة إلى المكاتب الأكبر — وللفرق القانونية التي تدير ملفات وعملاء ومتعاونين متعددين.",
      },
      {
        question: "هل تدير JURE أنواعا مختلفة من الملفات القانونية؟",
        answer:
          "نعم. تدعم JURE النزاعات والاستشارات والملفات الإدارية، مع إبقاء العميل والمستندات والمهام والمواعيد والفريق متصلين بكل ملف.",
      },
      {
        question: "هل يمكننا إدارة مستندات المكتب ومعرفته القانونية في JURE؟",
        answer:
          "نعم. يمكن للفرق رفع المستندات وتنظيمها وتصنيفها ووضع الوسوم والبحث فيها ومعاينة ملفات PDF وWord، وربطها مباشرة بالملفات والعملاء — فتبقى معرفة العمل في مساحة واحدة.",
      },
      {
        question: "كيف تعمل جوريا، مساعدة الذكاء الاصطناعي في JURE؟",
        answer:
          "جوريا هي المساعدة القانونية بالذكاء الاصطناعي من JURE، في مرحلة الوصول المبكر. تساعد في أسئلة البحث وتحليل العقود والصياغة داخل الملف الذي تعملون عليه. المخرجات موسومة بوضوح كنتاج ذكاء اصطناعي وتخضع دائما لمراجعة المحامي.",
      },
      {
        question: "هل بيانات مكتبنا آمنة؟",
        answer:
          "بيانات كل مكتب معزولة في مساحته الخاصة. الوصول محكوم بالأدوار والصلاحيات، والحسابات تتطلب تسجيل دخول ببريد إلكتروني متحقق منه، وحركة البيانات مشفرة أثناء النقل. صفحة الأمان تفصل ما هو متاح اليوم عما هو على خارطة الطريق.",
      },
      {
        question: "هل تدعم JURE عدة محامين وفرق؟",
        answer:
          "نعم. تدعم JURE العمل الجماعي بالأدوار والتعيينات والمراسلة والمكالمات والرؤية على مستوى الملف، حتى يعرف الجميع من المسؤول عن ماذا.",
      },
      {
        question: "هل يمكن تكييف JURE مع طريقة عمل مكتبنا؟",
        answer:
          "نظمت JURE حول طريقة عمل الفرق القانونية فعليا. أنواع الملفات والأدوار والمهام والمستندات والمواعيد والتعاون تعيش في مساحة واحدة، فيستطيع المكتب إدارة إيقاعه التشغيلي دون تبديل الأدوات.",
      },
      {
        question: "هل تحل JURE محل المحامين أو الحكم القانوني؟",
        answer:
          "لا. JURE مساحة عمل مهنية. هدفها مساعدة المهنيين القانونيين على تنظيم المعلومات وتقليل الاحتكاك الإداري والعمل بكفاءة أكبر — مع إبقاء الحكم البشري في المركز.",
      },
      {
        question: "كيف نبدأ؟",
        answer:
          "ابدأوا بمحادثة حول طريقة عمل مكتبكم واحتياجاته. نساعدكم على فهم كيف يمكن لـ JURE أن تنسجم مع ممارستكم.",
      },
    ],
  },
  finalCta: {
    kicker: "للمكاتب الحديثة",
    title: "مكتبك يستحق مساحة عمل أفضل.",
    body: "اجمع ممارستك وفريقك وذكاءك القانوني مع JURE.",
    primary: "ابدأ الآن",
    secondary: "تواصل معنا",
    tagline: "LegalTech للفرق القانونية الحديثة — مبنية بمسؤولية.",
  },
};

export const HOME_CONTENT: Record<MarketingLocale, HomeContent> = { en, fr, ar };
