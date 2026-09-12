import type { MarketingLocale } from "../site";
import type { FaqEntry } from "../structuredData";

/**
 * Audience solution page — law firms.
 * Claims map to shipped JURE capabilities only.
 */

export interface SolutionContent {
  h1: string;
  intro: string;
  whoTitle: string;
  whoBody: string;
  challengesTitle: string;
  challenges: Array<{ title: string; body: string }>;
  approachTitle: string;
  approachBody: string;
  points: string[];
  workflowTitle: string;
  workflowSteps: string[];
  faqs: FaqEntry[];
  related: string[];
  cta: { title: string; body: string };
}

export type SolutionsContentMap = Record<string, Record<MarketingLocale, SolutionContent>>;

export const SOLUTIONS_CONTENT: SolutionsContentMap = {
  solutionsLawFirms: {
    en: {
      h1: "LegalTech for law firms — one workspace for the whole practice",
      intro:
        "Law firms need more than a filing cabinet and an inbox. JURE is a LegalTech platform that brings matters, clients, documents, deadlines, team collaboration and AI assistance into one secure workspace — so partners and associates work from the same picture of every case.",
      whoTitle: "Built for firm practice, not generic project tools",
      whoBody:
        "Whether you are a solo lawyer, a growing boutique or a multi-lawyer cabinet, the daily friction is similar: matters scattered across email and drives, deadlines easy to miss, and AI tools that live outside the file. JURE is designed for that reality.",
      challengesTitle: "What law firms struggle with",
      challenges: [
        {
          title: "Matters live in too many places",
          body: "Client emails, shared folders, spreadsheets and chat threads each hold a piece of the truth. Reconstructing a matter wastes billable time and hides risk.",
        },
        {
          title: "Deadlines and ownership are hard to see",
          body: "Hearings, filings and internal tasks slip when they are not attached to the matter and visible to the team.",
        },
        {
          title: "AI sits outside the file",
          body: "Pasting client facts into a separate chatbot loses context and raises confidentiality questions. Assistance should live where the matter already lives.",
        },
      ],
      approachTitle: "How JURE supports law firms",
      approachBody:
        "JURE connects each matter to its client, documents, tasks, deadlines and assigned lawyers. Team messaging and calls stay attached to the work. Juria — JURE's AI legal assistant, in early access — helps with contract analysis, research-style questions and drafting inside the same workspace, with lawyer review at every step.",
      points: [
        "Matter and case management with client linkage",
        "Document library with PDF and DOCX preview",
        "Tasks, deadlines and shared firm calendar",
        "Real-time team messaging and voice/video calls",
        "Practice finance for Owner and Admin roles",
        "Juria AI assistant in early access, human-in-the-loop",
        "French, English and Arabic — including RTL",
      ],
      workflowTitle: "A typical firm workflow in JURE",
      workflowSteps: [
        "Open or create the matter and link the client",
        "Upload documents and attach them to the matter",
        "Create tasks, set deadlines and assign the team",
        "Collaborate in chat or calls without leaving the file",
        "Use Juria for a first pass — then lawyer review before anything is relied on",
      ],
      faqs: [
        {
          question: "Is JURE only for large firms?",
          answer:
            "No. Solo lawyers and small cabinets use the same workspace model: matters, documents, tasks and collaboration in one place. Features such as practice finance are available to Owner and Admin roles as the firm grows.",
        },
        {
          question: "Does JURE replace our existing tools overnight?",
          answer:
            "JURE is designed as the primary workspace for matters and collaboration. Teams typically start with new matters and migrate documents as they go — without needing to claim a big-bang switchover.",
        },
        {
          question: "How does AI fit into firm work?",
          answer:
            "Juria is JURE's AI legal assistant, available in early access. It helps with analysis, research-style questions and drafting inside the matter. Output is labeled as AI-generated and must be reviewed by a lawyer.",
        },
        {
          question: "Which languages does JURE support for firms?",
          answer:
            "The interface works in French, English and Arabic, with full right-to-left support — reflecting multilingual practice common in Morocco, MENA and Francophone Africa.",
        },
      ],
      related: ["legalCaseManagement", "legalPracticeManagement", "juria", "security"],
      cta: {
        title: "See how a modern firm workspace looks",
        body: "Walk through matters, documents, collaboration and Juria inside JURE — built for law firm practice.",
      },
    },
    fr: {
      h1: "LegalTech pour cabinets d'avocats — un espace pour toute la pratique",
      intro:
        "Un cabinet a besoin de plus qu'un classeur et une boîte mail. JURE est une plateforme LegalTech qui réunit dossiers, clients, documents, échéances, collaboration d'équipe et assistance IA dans un espace sécurisé — pour que associés et collaborateurs partagent la même vision de chaque dossier.",
      whoTitle: "Conçu pour la pratique du cabinet, pas pour des outils projet génériques",
      whoBody:
        "Avocat indépendant, boutique en croissance ou cabinet pluridisciplinaire : le frottement quotidien est le même — dossiers éparpillés, échéances faciles à manquer, IA hors du fichier. JURE est pensé pour cette réalité.",
      challengesTitle: "Ce qui freine les cabinets",
      challenges: [
        {
          title: "Les dossiers vivent à trop d'endroits",
          body: "E-mails, disques partagés, tableurs et messageries détiennent chacun un fragment de la vérité. Reconstituer un dossier coûte du temps et masque les risques.",
        },
        {
          title: "Échéances et responsabilités peu visibles",
          body: "Audiences, dépôts et tâches internes glissent quand elles ne sont pas rattachées au dossier et visibles pour l'équipe.",
        },
        {
          title: "L'IA reste hors du dossier",
          body: "Coller des faits clients dans un chatbot séparé perd le contexte et pose des questions de confidentialité. L'assistance doit vivre là où vit déjà le dossier.",
        },
      ],
      approachTitle: "Comment JURE aide les cabinets",
      approachBody:
        "JURE relie chaque dossier à son client, ses documents, ses tâches, ses échéances et ses avocats. La messagerie et les appels restent attachés au travail. Juria — l'assistant IA juridique de JURE, en accès anticipé — aide à l'analyse de contrats, aux questions de recherche et à la rédaction dans le même espace, avec relecture par l'avocat.",
      points: [
        "Gestion des dossiers et affaires liée au client",
        "Bibliothèque documentaire avec prévisualisation PDF et DOCX",
        "Tâches, échéances et agenda partagé du cabinet",
        "Messagerie temps réel et appels audio/vidéo",
        "Finance du cabinet pour les rôles Owner et Admin",
        "Assistant IA Juria en accès anticipé, validation humaine",
        "Français, anglais et arabe — y compris RTL",
      ],
      workflowTitle: "Un flux typique en cabinet dans JURE",
      workflowSteps: [
        "Ouvrir ou créer le dossier et lier le client",
        "Importer les documents et les rattacher au dossier",
        "Créer les tâches, fixer les échéances et assigner l'équipe",
        "Collaborer en chat ou en appel sans quitter le dossier",
        "Utiliser Juria pour une première passe — puis relecture avant tout usage",
      ],
      faqs: [
        {
          question: "JURE est-il réservé aux grands cabinets ?",
          answer:
            "Non. Les avocats indépendants et les petits cabinets utilisent le même modèle d'espace de travail. La finance du cabinet est disponible pour les rôles Owner et Admin à mesure que le cabinet grandit.",
        },
        {
          question: "Faut-il remplacer tous nos outils d'un coup ?",
          answer:
            "JURE est conçu comme l'espace principal pour dossiers et collaboration. Les équipes commencent souvent par les nouveaux dossiers et migrent les documents progressivement.",
        },
        {
          question: "Comment l'IA s'intègre-t-elle au travail du cabinet ?",
          answer:
            "Juria, l'assistant IA de JURE en accès anticipé, aide à l'analyse, à la recherche et à la rédaction dans le dossier. Les résultats sont identifiés comme générés par IA et doivent être relus par un avocat.",
        },
        {
          question: "Quelles langues pour les cabinets ?",
          answer:
            "L'interface fonctionne en français, anglais et arabe, avec prise en charge RTL — adaptée à la pratique multilingue au Maroc, au Moyen-Orient et en Afrique francophone.",
        },
      ],
      related: ["legalCaseManagement", "legalPracticeManagement", "juria", "security"],
      cta: {
        title: "Voir un espace de travail de cabinet moderne",
        body: "Parcourez dossiers, documents, collaboration et Juria dans JURE — conçu pour la pratique en cabinet.",
      },
    },
    ar: {
      h1: "LegalTech لمكاتب المحاماة — مساحة عمل واحدة للممارسة كلها",
      intro:
        "تحتاج مكاتب المحاماة إلى أكثر من خزانة ملفات وصندوق بريد. JURE منصة LegalTech تجمع الملفات والعملاء والمستندات والمواعيد وتعاون الفريق والمساعدة بالذكاء الاصطناعي في مساحة آمنة واحدة — ليعمل الشركاء والمساعدون من نفس صورة كل قضية.",
      whoTitle: "مصممة لممارسة المكتب، لا لأدوات مشاريع عامة",
      whoBody:
        "سواء كنت محاميا مستقلا أو مكتبا ناشئا أو مكتبا متعدد المحامين، الاحتكاك اليومي متشابه: ملفات مشتتة، مواعيد سهلة الفوات، وأدوات ذكاء اصطناعي خارج الملف. صممت JURE لهذه الواقعية.",
      challengesTitle: "ما الذي يعيق مكاتب المحاماة",
      challenges: [
        {
          title: "الملفات تعيش في أماكن كثيرة",
          body: "البريد والأقراص المشتركة والجداول والمحادثات يحمل كل منها جزءا من الحقيقة. إعادة بناء الملف يهدر الوقت ويخفي المخاطر.",
        },
        {
          title: "المواعيد والمسؤوليات صعبة الرؤية",
          body: "الجلسات والإيداعات والمهام الداخلية تفلت حين لا تربط بالملف وتكون مرئية للفريق.",
        },
        {
          title: "الذكاء الاصطناعي خارج الملف",
          body: "لصق وقائع العميل في روبوت محادثة منفصل يفقد السياق ويطرح أسئلة السرية. يجب أن تعيش المساعدة حيث يعيش الملف.",
        },
      ],
      approachTitle: "كيف تدعم JURE مكاتب المحاماة",
      approachBody:
        "تربط JURE كل ملف بموكله ومستنداته ومهامه ومواعيده والمحامين المعينين. تبقى المراسلة والمكالمات مرتبطة بالعمل. وجوريا — مساعد الذكاء الاصطناعي من JURE في الوصول المبكر — يساعد في تحليل العقود وأسئلة البحث والصياغة داخل المساحة نفسها، مع مراجعة المحامي.",
      points: [
        "إدارة الملفات والقضايا مرتبطة بالعميل",
        "مكتبة مستندات مع معاينة PDF وDOCX",
        "مهام ومواعيد ومفكرة مكتب مشتركة",
        "مراسلة فورية ومكالمات صوتية/مرئية",
        "مالية المكتب لأدوار المالك والمسؤول",
        "مساعد جوريا في الوصول المبكر مع مراجعة بشرية",
        "الفرنسية والإنجليزية والعربية — بما فيها RTL",
      ],
      workflowTitle: "مسار عمل نموذجي للمكتب في JURE",
      workflowSteps: [
        "افتح أو أنشئ الملف واربط العميل",
        "ارفع المستندات واربطها بالملف",
        "أنشئ المهام وحدد المواعيد وعين الفريق",
        "تعاون عبر المحادثة أو المكالمات دون مغادرة الملف",
        "استخدم جوريا للمرور الأول — ثم مراجعة المحامي قبل الاعتماد",
      ],
      faqs: [
        {
          question: "هل JURE للمكاتب الكبيرة فقط؟",
          answer:
            "لا. يستخدم المحامون المستقلون والمكاتب الصغيرة نفس نموذج مساحة العمل. تتوفر مالية المكتب لأدوار المالك والمسؤول مع نمو المكتب.",
        },
        {
          question: "هل يجب استبدال كل الأدوات دفعة واحدة؟",
          answer:
            "صممت JURE كمساحة أساسية للملفات والتعاون. تبدأ الفرق عادة بالملفات الجديدة وتنقل المستندات تدريجيا.",
        },
        {
          question: "كيف يندمج الذكاء الاصطناعي في عمل المكتب؟",
          answer:
            "جوريا مساعد JURE في الوصول المبكر يساعد في التحليل والبحث والصياغة داخل الملف. المخرجات موسومة كذكاء اصطناعي ويجب أن يراجعها محام.",
        },
        {
          question: "ما اللغات التي تدعمها JURE للمكاتب؟",
          answer:
            "تعمل الواجهة بالفرنسية والإنجليزية والعربية مع دعم RTL — بما يتوافق مع الممارسة متعددة اللغات في المغرب ومنطقة الشرق الأوسط وشمال أفريقيا وأفريقيا الفرنكوفونية.",
        },
      ],
      related: ["legalCaseManagement", "legalPracticeManagement", "juria", "security"],
      cta: {
        title: "شاهد مساحة عمل مكتب حديثة",
        body: "تجول في الملفات والمستندات والتعاون وجوريا داخل JURE — مصممة لممارسة مكاتب المحاماة.",
      },
    },
  },
};
