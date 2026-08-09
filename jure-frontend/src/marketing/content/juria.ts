import type { MarketingLocale } from "../site";
import type { FaqEntry } from "../structuredData";

/**
 * Public /juria entity page — Juria as JURE's AI legal assistant.
 * Capabilities match shipped early-access features only.
 */

export interface JuriaContent {
  eyebrow: string;
  h1: string;
  intro: string;
  relationTitle: string;
  relationBody: string;
  capabilitiesTitle: string;
  capabilities: Array<{ title: string; body: string }>;
  howTitle: string;
  howSteps: string[];
  disclaimer: string;
  faqsTitle: string;
  faqs: FaqEntry[];
  ctaTitle: string;
  ctaBody: string;
  ctaPrimary: string;
  ctaSecondary: string;
  relatedLegalAi: string;
  relatedPlatform: string;
}

const en: JuriaContent = {
  eyebrow: "AI legal assistant by JURE",
  h1: "Juria — AI legal assistance inside your legal workspace",
  intro:
    "Juria is JURE's AI legal assistant for research-style questions, contract analysis, drafting help and knowledge workflows. It works inside the same secure workspace as your matters — not in a separate chatbot tab.",
  relationTitle: "Part of JURE, not a separate product identity",
  relationBody:
    "JURE is the LegalTech platform. Juria is the AI capability inside it. That hierarchy matters: AI assistance is useful when it sits next to matters, documents, tasks and your team — with lawyer review built into the workflow.",
  capabilitiesTitle: "What Juria can do today",
  capabilities: [
    {
      title: "Legal Q&A chat",
      body: "Ask research-style legal questions in natural language and receive a clearly labeled AI draft to review.",
    },
    {
      title: "Contract analysis",
      body: "Upload PDF or DOCX contracts to surface key points and risk flags — a structured starting point for lawyer review, not a substitute for it.",
    },
    {
      title: "Research mode",
      body: "Orient on unfamiliar questions with a research-style mode oriented to Moroccan law. Every reference must still be verified in authoritative sources.",
    },
    {
      title: "Drafting assistance",
      body: "Generate a first draft of legal text, then rewrite, verify and complete it yourself before any professional use.",
    },
  ],
  howTitle: "How Juria fits into legal work",
  howSteps: [
    "Open the matter you are working on in JURE",
    "Ask Juria — chat, contract analysis or drafting",
    "Receive a clearly labeled AI draft",
    "Lawyer reviews, verifies and corrects",
    "Use the validated result in the matter",
  ],
  disclaimer:
    "Juria is in early access. AI assists; lawyers decide. Output is always subject to human review.",
  faqsTitle: "Frequently asked questions",
  faqs: [
    {
      question: "What is Juria?",
      answer:
        "Juria is JURE's AI legal assistant — a capability inside the JURE LegalTech platform for research-style questions, contract analysis and drafting help, always subject to lawyer review.",
    },
    {
      question: "Is Juria the same as JURE?",
      answer:
        "No. JURE is the LegalTech platform for modern legal teams (matters, documents, collaboration, security and more). Juria is the AI legal assistant inside JURE.",
    },
    {
      question: "Is Juria generally available?",
      answer:
        "Juria is currently in early access and is rolled out progressively so it can be refined with real legal teams before wider availability.",
    },
    {
      question: "Can Juria replace a lawyer?",
      answer:
        "No. Juria accelerates first passes and first drafts. Judgment, verification and professional responsibility remain with the lawyer.",
    },
  ],
  ctaTitle: "See Juria inside the JURE platform",
  ctaBody:
    "AI assistance is most useful where the work already lives. Explore Juria in context — or see the full JURE LegalTech platform.",
  ctaPrimary: "See JURE in action",
  ctaSecondary: "Explore Legal AI",
  relatedLegalAi: "Legal AI overview",
  relatedPlatform: "JURE platform",
};

const fr: JuriaContent = {
  eyebrow: "Assistant IA juridique par JURE",
  h1: "Juria — l'assistance IA juridique dans votre espace de travail",
  intro:
    "Juria est l'assistant IA juridique de JURE pour les questions de recherche, l'analyse de contrats, l'aide à la rédaction et les flux de connaissances. Il travaille dans le même espace sécurisé que vos dossiers — pas dans un onglet chatbot séparé.",
  relationTitle: "Une capacité de JURE, pas une identité séparée",
  relationBody:
    "JURE est la plateforme LegalTech. Juria est la capacité d'IA à l'intérieur. Cette hiérarchie compte : l'assistance IA est utile quand elle vit à côté des dossiers, documents, tâches et de votre équipe — avec la relecture par l'avocat intégrée au flux.",
  capabilitiesTitle: "Ce que Juria peut faire aujourd'hui",
  capabilities: [
    {
      title: "Chat juridique Q&R",
      body: "Posez des questions juridiques en langage naturel et recevez un projet clairement identifié comme généré par IA, à relire.",
    },
    {
      title: "Analyse de contrats",
      body: "Téléversez des contrats PDF ou DOCX pour faire ressortir points clés et signaux de risque — un point de départ structuré pour la revue de l'avocat, pas un substitut.",
    },
    {
      title: "Mode recherche",
      body: "Orientez-vous sur une question peu familière avec un mode recherche orienté vers le droit marocain. Chaque référence doit être vérifiée dans des sources faisant autorité.",
    },
    {
      title: "Aide à la rédaction",
      body: "Obtenez un premier jet de texte juridique, puis réécrivez, vérifiez et complétez avant tout usage professionnel.",
    },
  ],
  howTitle: "Comment Juria s'inscrit dans le travail juridique",
  howSteps: [
    "Ouvrir le dossier sur lequel vous travaillez dans JURE",
    "Solliciter Juria — chat, analyse de contrat ou rédaction",
    "Recevoir un projet clairement identifié comme généré par IA",
    "L'avocat relit, vérifie et corrige",
    "Utiliser le résultat validé dans le dossier",
  ],
  disclaimer:
    "Juria est en accès anticipé. L'IA assiste ; les avocats décident. Les résultats sont toujours soumis à une relecture humaine.",
  faqsTitle: "Questions fréquentes",
  faqs: [
    {
      question: "Qu'est-ce que Juria ?",
      answer:
        "Juria est l'assistant IA juridique de JURE — une capacité de la plateforme LegalTech JURE pour les questions de recherche, l'analyse de contrats et l'aide à la rédaction, toujours soumise à la relecture d'un avocat.",
    },
    {
      question: "Juria et JURE, est-ce la même chose ?",
      answer:
        "Non. JURE est la plateforme LegalTech pour les équipes juridiques modernes (dossiers, documents, collaboration, sécurité, etc.). Juria est l'assistant IA juridique à l'intérieur de JURE.",
    },
    {
      question: "Juria est-il disponible pour tous ?",
      answer:
        "Juria est actuellement en accès anticipé et déployé progressivement afin d'être affiné avec de vraies équipes juridiques avant une disponibilité plus large.",
    },
    {
      question: "Juria peut-il remplacer un avocat ?",
      answer:
        "Non. Juria accélère les premières passes et les premiers jets. Le jugement, la vérification et la responsabilité professionnelle restent ceux de l'avocat.",
    },
  ],
  ctaTitle: "Voir Juria dans la plateforme JURE",
  ctaBody:
    "L'assistance IA est surtout utile là où vit déjà le travail. Découvrez Juria en contexte — ou explorez toute la plateforme LegalTech JURE.",
  ctaPrimary: "Voir JURE en action",
  ctaSecondary: "Explorer l'IA juridique",
  relatedLegalAi: "Vue d'ensemble IA juridique",
  relatedPlatform: "Plateforme JURE",
};

const ar: JuriaContent = {
  eyebrow: "مساعد الذكاء الاصطناعي القانوني من JURE",
  h1: "جوريا — مساعدة ذكاء اصطناعي قانوني داخل مساحة عملك",
  intro:
    "جوريا هو مساعد الذكاء الاصطناعي القانوني من JURE لأسئلة البحث وتحليل العقود والمساعدة في الصياغة وسير عمل المعرفة. يعمل داخل مساحة العمل الآمنة نفسها مع ملفاتك — لا في تبويب روبوت محادثة منفصل.",
  relationTitle: "جزء من JURE، وليس هوية منفصلة",
  relationBody:
    "JURE هي منصة LegalTech. وجوريا هي قدرة الذكاء الاصطناعي داخلها. هذه الهرمية مهمة: تكون المساعدة الذكية مفيدة عندما تعيش بجانب الملفات والمستندات والمهام وفريقك — مع مراجعة المحامي مدمجة في المسار.",
  capabilitiesTitle: "ماذا تستطيع جوريا اليوم",
  capabilities: [
    {
      title: "محادثة أسئلة وأجوبة قانونية",
      body: "اطرح أسئلة قانونية بأسلوب بحث باللغة الطبيعية واحصل على مسودة موسومة بوضوح كنتاج ذكاء اصطناعي للمراجعة.",
    },
    {
      title: "تحليل العقود",
      body: "ارفع عقودًا بصيغة PDF أو DOCX لإبراز النقاط الرئيسية وإشارات المخاطر — نقطة انطلاق منظمة لمراجعة المحامي، لا بديلًا عنها.",
    },
    {
      title: "وضع البحث",
      body: "توجّه في الأسئلة غير المألوفة بوضع بحث موجّه نحو القانون المغربي. يجب التحقق من كل مرجع في مصادر موثوقة.",
    },
    {
      title: "المساعدة في الصياغة",
      body: "احصل على مسودة أولى لنص قانوني، ثم أعد كتابتها وتحقق منها وأكملها قبل أي استخدام مهني.",
    },
  ],
  howTitle: "كيف تندمج جوريا في العمل القانوني",
  howSteps: [
    "افتح الملف الذي تعمل عليه في JURE",
    "اطلب من جوريا — محادثة أو تحليل عقد أو صياغة",
    "استلم مسودة موسومة بوضوح كنتاج ذكاء اصطناعي",
    "يراجع المحامي ويتحقق ويصحّح",
    "استخدم النتيجة المُعتمدة في الملف",
  ],
  disclaimer:
    "جوريا في مرحلة الوصول المبكر. الذكاء الاصطناعي يساعد؛ والمحامون يقررون. المخرجات تخضع دائمًا لمراجعة بشرية.",
  faqsTitle: "الأسئلة الشائعة",
  faqs: [
    {
      question: "ما هي جوريا؟",
      answer:
        "جوريا هو مساعد الذكاء الاصطناعي القانوني من JURE — قدرة داخل منصة LegalTech الخاصة بـ JURE لأسئلة البحث وتحليل العقود والمساعدة في الصياغة، مع خضوع دائم لمراجعة المحامي.",
    },
    {
      question: "هل جوريا هي نفسها JURE؟",
      answer:
        "لا. JURE منصة LegalTech للفرق القانونية الحديثة (الملفات والمستندات والتعاون والأمان وغيرها). وجوريا هو مساعد الذكاء الاصطناعي القانوني داخل JURE.",
    },
    {
      question: "هل جوريا متاحة للجميع؟",
      answer:
        "جوريا حاليًا في مرحلة الوصول المبكر وتُطرح تدريجيًا ليُصقل مع فرق قانونية حقيقية قبل إتاحة أوسع.",
    },
    {
      question: "هل يمكن لجوريا أن تحل محل محامٍ؟",
      answer:
        "لا. تسرّع جوريا المرور الأول والمسودات الأولى. أما الحكم والتحقق والمسؤولية المهنية فتبقى للمحامي.",
    },
  ],
  ctaTitle: "شاهد جوريا داخل منصة JURE",
  ctaBody:
    "المساعدة بالذكاء الاصطناعي تكون أكثر فائدة حيث يعيش العمل أصلًا. استكشف جوريا في سياقها — أو اطّلع على منصة LegalTech الكاملة من JURE.",
  ctaPrimary: "شاهد JURE عمليًا",
  ctaSecondary: "استكشف الذكاء الاصطناعي القانوني",
  relatedLegalAi: "نظرة عامة على الذكاء الاصطناعي القانوني",
  relatedPlatform: "منصة JURE",
};

export const JURIA_CONTENT: Record<MarketingLocale, JuriaContent> = { en, fr, ar };
