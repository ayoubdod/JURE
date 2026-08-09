import type { IntentContentMap } from "./intentTypes";

/**
 * Content for the 8 high-intent landing pages — EN/FR/AR.
 * Every claim maps to a shipped capability. Juria (legal AI) is always
 * framed as early access with mandatory lawyer review; nothing invented.
 */

export const INTENT_CONTENT: IntentContentMap = {
  // ---------------------------------------------------------------------------
  // Legal AI
  // ---------------------------------------------------------------------------
  legalAi: {
    en: {
      h1: "Legal AI for lawyers, inside the work itself",
      intro:
        "Most AI tools for lawyers live in a separate tab, disconnected from the matter you are actually working on. JURE takes a different approach: Juria, our legal AI assistant, works inside the same workspace as your matters, documents and tasks. It is available in early access today, with lawyer review built into every workflow.",
      definition: {
        title: "What is a legal AI platform?",
        body: "A legal AI platform applies large language models to the daily work of legal professionals: answering legal questions, analyzing contracts, summarizing documents and helping draft memos or clauses. It differs from a general-purpose chatbot in two ways. First, it is oriented to legal material — statutes, case law, contractual language — rather than general knowledge. Second, and more importantly, it is built for a profession where errors carry real consequences, so a serious platform includes safeguards: AI output that is clearly labeled as such, workflows that route every draft through human review, and confidentiality protections appropriate for privileged client information. The value of legal AI lies in speed on first drafts and first passes; the judgment, the verification and the professional responsibility remain with the lawyer.",
      },
      problem: {
        title: "Why a separate chatbot is not enough",
        body: "Lawyers who use consumer chatbots for legal work face three recurring problems. Context is lost: the AI knows nothing about the matter, so every question starts from zero and every answer must be copied back by hand. Confidentiality is at risk: pasting client information into a general-purpose tool sits uneasily with professional secrecy obligations. And there is no review structure: the output looks polished whether it is right or wrong, and nothing in the tool reminds anyone to verify it. The result is faster typing but not safer work.",
      },
      approach: {
        title: "How JURE embeds AI into legal work",
        body: "JURE integrates Juria, its legal AI assistant, directly into the legal workspace rather than beside it. In early access today, Juria offers chat for legal questions, contract analysis, a research mode oriented to Moroccan law, and drafting assistance — all inside the platform where your matters, clients and documents already live. Every response is clearly labeled as AI-generated, and JURE's workflows are designed so that a lawyer reviews and validates AI output before it informs any legal decision.",
        points: [
          "Juria chat for legal questions, in early access",
          "Contract analysis of PDF and DOCX files, with key points and risk flags",
          "A research mode oriented to Moroccan law",
          "Drafting assistance for legal documents",
          "Every output labeled as AI-generated and subject to lawyer review",
        ],
      },
      workflow: {
        title: "From question to validated output",
        steps: [
          "Open the matter you are working on",
          "Ask Juria: chat, contract analysis or drafting",
          "Receive a clearly labeled AI draft",
          "Lawyer reviews, verifies and corrects",
          "Use the validated result in the matter",
        ],
      },
      useCases: {
        title: "Where legal AI helps in practice",
        items: [
          {
            title: "Contract review for an SME client",
            body: "A client sends a supplier agreement for review. The lawyer uploads the PDF to Juria's contract analysis and receives the key points and risk flags in minutes. That analysis becomes the starting checklist for the lawyer's own review — not a substitute for it.",
          },
          {
            title: "First draft of a legal memo",
            body: "Instead of starting from a blank page, an associate asks Juria for a structured first draft on a defined question. The associate then rewrites, verifies and completes it — turning hours of drafting into focused review and editing.",
          },
          {
            title: "Getting oriented on an unfamiliar question",
            body: "Before diving into deep research, a lawyer uses Juria's research mode to map the terrain: the relevant concepts, the likely legal texts, the questions to ask. Every reference is then verified in authoritative sources before anything is relied on.",
          },
        ],
      },
      security: {
        title: "Confidentiality and legal AI",
        body: "Using AI inside JURE means client work stays inside the firm's own workspace instead of being pasted into consumer chatbots. Each firm's data is isolated to its own environment, and role-based access control determines who in the team can see which matters and documents.",
      },
      faqs: [
        {
          question: "Is Juria available to every JURE user?",
          answer:
            "Juria is currently in early access: it is being rolled out progressively rather than switched on for everyone at once. This deliberate pace lets us refine the assistant with real legal teams before general availability.",
        },
        {
          question: "Does Juria cite its sources?",
          answer:
            "Juria is instructed to reference the legal sources it relies on in its answers, but JURE does not offer a structured citation feature, and AI-generated references can be wrong. Every reference must be verified by a lawyer in authoritative sources before it is relied on.",
        },
        {
          question: "Can Juria's contract analysis replace a lawyer's review?",
          answer:
            "No. Contract analysis produces key points and risk flags that accelerate a lawyer's own review — it is a structured starting point, not a legal opinion. The lawyer remains responsible for the final assessment.",
        },
        {
          question: "What file types does contract analysis accept?",
          answer:
            "You can upload contracts as PDF or DOCX files. Juria analyzes the document and returns key points and risk flags for the lawyer to review.",
        },
        {
          question: "Which law is Juria's research mode oriented to?",
          answer:
            "Juria's research mode is oriented to Moroccan law and answers in a research style. Like all AI output, its answers must be verified against official sources before being used in legal work.",
        },
        {
          question: "Why is Juria in early access rather than generally available?",
          answer:
            "Because releasing legal AI responsibly matters more than releasing it fast. Early access lets us observe how the assistant behaves on real legal work, gather feedback from practicing lawyers and strengthen the review workflows before opening it more widely.",
        },
      ],
      related: ["legalResearch", "responsibleLegalAi", "legalCaseManagement"],
      cta: {
        title: "Try legal AI where your work already lives",
        body: "Juria is in early access inside the JURE workspace — connected to your matters, with lawyer review at every step. See how AI assistance works when it is part of the platform, not a separate tab.",
      },
    },
    fr: {
      h1: "L'IA juridique pour avocats, au cœur du travail lui-même",
      intro:
        "La plupart des outils d'IA pour avocats vivent dans un onglet séparé, déconnectés du dossier sur lequel vous travaillez réellement. JURE prend le contre-pied : Juria, notre assistant IA juridique, travaille dans le même espace que vos dossiers, documents et tâches. Il est disponible dès aujourd'hui en accès anticipé, avec la relecture par l'avocat intégrée à chaque flux de travail.",
      definition: {
        title: "Qu'est-ce qu'une plateforme d'IA juridique ?",
        body: "Une plateforme d'IA juridique applique les grands modèles de langage au travail quotidien des professionnels du droit : répondre à des questions juridiques, analyser des contrats, synthétiser des documents et aider à rédiger des notes ou des clauses. Elle se distingue d'un chatbot généraliste de deux manières. D'abord, elle est orientée vers la matière juridique — textes de loi, jurisprudence, langage contractuel — plutôt que vers la connaissance générale. Ensuite, et surtout, elle est conçue pour une profession où l'erreur a des conséquences réelles : une plateforme sérieuse intègre donc des garde-fous — des résultats d'IA clairement identifiés comme tels, des flux de travail qui font passer chaque projet par une relecture humaine, et des protections de confidentialité adaptées aux informations couvertes par le secret professionnel. La valeur de l'IA juridique tient à la rapidité des premiers jets ; le jugement, la vérification et la responsabilité professionnelle restent à l'avocat.",
      },
      problem: {
        title: "Pourquoi un chatbot séparé ne suffit pas",
        body: "Les avocats qui utilisent des chatbots grand public pour leur travail juridique rencontrent trois problèmes récurrents. Le contexte se perd : l'IA ne sait rien du dossier, chaque question repart de zéro et chaque réponse doit être recopiée à la main. La confidentialité est en jeu : coller des informations clients dans un outil généraliste s'accorde mal avec le secret professionnel. Et il n'y a aucune structure de relecture : le résultat paraît soigné qu'il soit juste ou faux, et rien dans l'outil ne rappelle de le vérifier. On tape plus vite, mais on ne travaille pas plus sûrement.",
      },
      approach: {
        title: "Comment JURE intègre l'IA au travail juridique",
        body: "JURE intègre Juria, son assistant IA juridique, directement dans l'espace de travail juridique plutôt qu'à côté. En accès anticipé aujourd'hui, Juria propose un chat pour les questions juridiques, l'analyse de contrats, un mode recherche orienté vers le droit marocain et une aide à la rédaction — le tout au sein de la plateforme où vivent déjà vos dossiers, clients et documents. Chaque réponse est clairement identifiée comme générée par IA, et les flux de travail de JURE sont conçus pour qu'un avocat relise et valide les résultats avant toute décision juridique.",
        points: [
          "Le chat Juria pour les questions juridiques, en accès anticipé",
          "L'analyse de contrats PDF et DOCX, avec points clés et signaux de risque",
          "Un mode recherche orienté vers le droit marocain",
          "Une aide à la rédaction de documents juridiques",
          "Chaque résultat identifié comme généré par IA et soumis à la relecture de l'avocat",
        ],
      },
      workflow: {
        title: "De la question au résultat validé",
        steps: [
          "Ouvrir le dossier en cours",
          "Solliciter Juria : chat, analyse de contrat ou rédaction",
          "Recevoir un projet clairement identifié comme IA",
          "Relecture, vérification et correction par l'avocat",
          "Utiliser le résultat validé dans le dossier",
        ],
      },
      useCases: {
        title: "Où l'IA juridique aide en pratique",
        items: [
          {
            title: "Revue de contrat pour un client PME",
            body: "Un client envoie un contrat fournisseur à examiner. L'avocat téléverse le PDF dans l'analyse de contrats de Juria et reçoit en quelques minutes les points clés et les signaux de risque. Cette analyse devient la liste de contrôle de départ de sa propre revue — pas son remplacement.",
          },
          {
            title: "Premier jet d'une note juridique",
            body: "Plutôt que de partir d'une page blanche, un collaborateur demande à Juria un premier jet structuré sur une question définie. Il le réécrit, le vérifie et le complète ensuite — des heures de rédaction deviennent une relecture ciblée.",
          },
          {
            title: "Se repérer sur une question inhabituelle",
            body: "Avant de plonger dans une recherche approfondie, un avocat utilise le mode recherche de Juria pour cartographier le terrain : les notions pertinentes, les textes probables, les questions à poser. Chaque référence est ensuite vérifiée dans les sources faisant autorité avant toute utilisation.",
          },
        ],
      },
      security: {
        title: "Confidentialité et IA juridique",
        body: "Utiliser l'IA dans JURE, c'est garder le travail des clients dans l'espace propre du cabinet au lieu de le coller dans des chatbots grand public. Les données de chaque cabinet sont isolées dans leur propre environnement, et le contrôle d'accès par rôles détermine qui, dans l'équipe, voit quels dossiers et quels documents.",
      },
      faqs: [
        {
          question: "Juria est-il disponible pour tous les utilisateurs de JURE ?",
          answer:
            "Juria est actuellement en accès anticipé : il est déployé progressivement plutôt qu'activé pour tout le monde à la fois. Ce rythme délibéré nous permet d'affiner l'assistant avec de vraies équipes juridiques avant la disponibilité générale.",
        },
        {
          question: "Juria cite-t-il ses sources ?",
          answer:
            "Juria a pour consigne de mentionner dans ses réponses les sources juridiques sur lesquelles il s'appuie, mais JURE ne propose pas de fonctionnalité de citations structurées, et les références générées par IA peuvent être erronées. Chaque référence doit être vérifiée par un avocat dans les sources faisant autorité avant d'être utilisée.",
        },
        {
          question: "L'analyse de contrats de Juria peut-elle remplacer la revue d'un avocat ?",
          answer:
            "Non. L'analyse de contrats produit des points clés et des signaux de risque qui accélèrent la revue de l'avocat — c'est un point de départ structuré, pas un avis juridique. L'avocat reste responsable de l'appréciation finale.",
        },
        {
          question: "Quels formats de fichiers l'analyse de contrats accepte-t-elle ?",
          answer:
            "Vous pouvez téléverser des contrats au format PDF ou DOCX. Juria analyse le document et restitue les points clés et les signaux de risque, à relire par l'avocat.",
        },
        {
          question: "Vers quel droit le mode recherche de Juria est-il orienté ?",
          answer:
            "Le mode recherche de Juria est orienté vers le droit marocain et répond dans un style de recherche. Comme tout résultat d'IA, ses réponses doivent être vérifiées dans les sources officielles avant tout usage juridique.",
        },
        {
          question: "Pourquoi Juria est-il en accès anticipé plutôt qu'en disponibilité générale ?",
          answer:
            "Parce que déployer l'IA juridique de manière responsable compte plus que la déployer vite. L'accès anticipé nous permet d'observer le comportement de l'assistant sur du vrai travail juridique, de recueillir les retours d'avocats en exercice et de renforcer les flux de relecture avant une ouverture plus large.",
        },
      ],
      related: ["legalResearch", "responsibleLegalAi", "legalCaseManagement"],
      cta: {
        title: "Essayez l'IA juridique là où votre travail vit déjà",
        body: "Juria est en accès anticipé dans l'espace de travail JURE — connecté à vos dossiers, avec la relecture de l'avocat à chaque étape. Découvrez ce que donne l'assistance IA quand elle fait partie de la plateforme, et non d'un onglet séparé.",
      },
    },
    ar: {
      h1: "الذكاء الاصطناعي القانوني للمحامين، في قلب العمل نفسه",
      intro:
        "معظم أدوات الذكاء الاصطناعي للمحامين تعيش في نافذة منفصلة، بعيدة عن الملف الذي تعمل عليه فعلًا. تسلك JURE طريقًا مختلفًا: جوريا، مساعدنا للذكاء الاصطناعي القانوني، يعمل داخل مساحة العمل نفسها التي تضم ملفاتك ومستنداتك ومهامك. وهو متاح اليوم في مرحلة الوصول المبكر، مع مراجعة المحامي مدمجة في كل مسار عمل.",
      definition: {
        title: "ما هي منصة الذكاء الاصطناعي القانوني؟",
        body: "منصة الذكاء الاصطناعي القانوني تُطبّق النماذج اللغوية الكبيرة على العمل اليومي للمهنيين القانونيين: الإجابة عن الأسئلة القانونية، وتحليل العقود، وتلخيص المستندات، والمساعدة في صياغة المذكرات والبنود. وهي تختلف عن روبوت المحادثة العام في أمرين. أولًا، هي موجهة نحو المادة القانونية — النصوص التشريعية والاجتهاد القضائي واللغة التعاقدية — لا نحو المعرفة العامة. وثانيًا، وهو الأهم، أنها مصممة لمهنة تكون فيها للأخطاء عواقب حقيقية، لذلك تُدمج المنصة الجادة ضمانات واضحة: وسم مخرجات الذكاء الاصطناعي بوضوح، ومسارات عمل تُمرّر كل مسودة عبر مراجعة بشرية، وحماية للسرية تليق بمعلومات الموكلين المشمولة بالسر المهني. قيمة الذكاء الاصطناعي القانوني تكمن في سرعة المسودات الأولى؛ أما الحكم والتحقق والمسؤولية المهنية فتبقى للمحامي.",
      },
      problem: {
        title: "لماذا لا يكفي روبوت محادثة منفصل",
        body: "المحامون الذين يستخدمون روبوتات المحادثة العامة في عملهم القانوني يواجهون ثلاث مشكلات متكررة. ضياع السياق: فالذكاء الاصطناعي لا يعرف شيئًا عن الملف، فيبدأ كل سؤال من الصفر ويُنقل كل جواب يدويًا. والسرية في خطر: فلصق معلومات الموكلين في أداة عامة لا يستقيم مع واجب السر المهني. ولا توجد بنية للمراجعة: فالمخرجات تبدو متقنة سواء أكانت صحيحة أم خاطئة، ولا شيء في الأداة يذكّر بوجوب التحقق منها. النتيجة كتابة أسرع، لا عمل أكثر أمانًا.",
      },
      approach: {
        title: "كيف تدمج JURE الذكاء الاصطناعي في العمل القانوني",
        body: "تدمج JURE جوريا، مساعدها للذكاء الاصطناعي القانوني، مباشرة داخل مساحة العمل القانونية لا بجانبها. في مرحلة الوصول المبكر اليوم، يقدم جوريا محادثة للأسئلة القانونية، وتحليلًا للعقود، ووضع بحث موجهًا نحو القانون المغربي، ومساعدة في الصياغة — كل ذلك داخل المنصة التي تعيش فيها ملفاتك وعملاؤك ومستنداتك أصلًا. كل إجابة موسومة بوضوح كمخرجات ذكاء اصطناعي، ومسارات العمل في JURE مصممة بحيث يراجع المحامي مخرجات الذكاء الاصطناعي ويعتمدها قبل أن تُبنى عليها أي قرارات قانونية.",
        points: [
          "محادثة جوريا للأسئلة القانونية، في مرحلة الوصول المبكر",
          "تحليل عقود بصيغتي PDF وDOCX، مع النقاط الأساسية وإشارات المخاطر",
          "وضع بحث موجه نحو القانون المغربي",
          "مساعدة في صياغة المستندات القانونية",
          "كل مخرجات موسومة كنتاج ذكاء اصطناعي وخاضعة لمراجعة المحامي",
        ],
      },
      workflow: {
        title: "من السؤال إلى نتيجة معتمدة",
        steps: [
          "افتح الملف الذي تعمل عليه",
          "اسأل جوريا: محادثة أو تحليل عقد أو صياغة",
          "استلم مسودة موسومة بوضوح كذكاء اصطناعي",
          "يراجع المحامي ويتحقق ويصحح",
          "استخدم النتيجة المعتمدة في الملف",
        ],
      },
      useCases: {
        title: "أين يساعد الذكاء الاصطناعي القانوني عمليًا",
        items: [
          {
            title: "مراجعة عقد لعميل من الشركات الصغيرة والمتوسطة",
            body: "يرسل العميل عقد توريد للمراجعة. يرفع المحامي ملف PDF إلى تحليل العقود في جوريا فيتلقى خلال دقائق النقاط الأساسية وإشارات المخاطر. يصبح هذا التحليل قائمة الانطلاق لمراجعة المحامي نفسه — لا بديلًا عنها.",
          },
          {
            title: "المسودة الأولى لمذكرة قانونية",
            body: "بدل البدء من صفحة بيضاء، يطلب المحامي المتعاون من جوريا مسودة أولى منظمة حول سؤال محدد. ثم يعيد كتابتها ويتحقق منها ويكملها — فتتحول ساعات الصياغة إلى مراجعة وتحرير مركزين.",
          },
          {
            title: "الاستئناس بمسألة غير مألوفة",
            body: "قبل الغوص في بحث معمق، يستخدم المحامي وضع البحث في جوريا لرسم معالم الموضوع: المفاهيم ذات الصلة، والنصوص المحتملة، والأسئلة الواجب طرحها. ثم يُتحقق من كل مرجع في المصادر الموثوقة قبل الاعتماد على أي شيء.",
          },
        ],
      },
      security: {
        title: "السرية والذكاء الاصطناعي القانوني",
        body: "استخدام الذكاء الاصطناعي داخل JURE يعني بقاء عمل الموكلين داخل مساحة المكتب الخاصة بدل لصقه في روبوتات المحادثة العامة. بيانات كل مكتب معزولة في بيئته الخاصة، والتحكم في الوصول حسب الأدوار يحدد من في الفريق يرى أي ملفات وأي مستندات.",
      },
      faqs: [
        {
          question: "هل جوريا متاح لكل مستخدمي JURE؟",
          answer:
            "جوريا حاليًا في مرحلة الوصول المبكر: يُطرح تدريجيًا بدل تفعيله للجميع دفعة واحدة. هذا الإيقاع المتعمد يتيح لنا صقل المساعد مع فرق قانونية حقيقية قبل الإتاحة العامة.",
        },
        {
          question: "هل يذكر جوريا مصادره؟",
          answer:
            "جوريا موجَّه للإشارة في إجاباته إلى المصادر القانونية التي يستند إليها، لكن JURE لا تقدم خاصية استشهادات منظمة، والمراجع المولدة بالذكاء الاصطناعي قد تكون خاطئة. يجب أن يتحقق المحامي من كل مرجع في المصادر الموثوقة قبل الاعتماد عليه.",
        },
        {
          question: "هل يمكن لتحليل العقود في جوريا أن يحل محل مراجعة المحامي؟",
          answer:
            "لا. تحليل العقود يُنتج نقاطًا أساسية وإشارات مخاطر تُسرّع مراجعة المحامي — إنه نقطة انطلاق منظمة، لا رأيًا قانونيًا. ويبقى المحامي مسؤولًا عن التقدير النهائي.",
        },
        {
          question: "ما صيغ الملفات التي يقبلها تحليل العقود؟",
          answer:
            "يمكنك رفع العقود بصيغة PDF أو DOCX. يحلل جوريا المستند ويعيد النقاط الأساسية وإشارات المخاطر ليراجعها المحامي.",
        },
        {
          question: "نحو أي قانون يتوجه وضع البحث في جوريا؟",
          answer:
            "وضع البحث في جوريا موجه نحو القانون المغربي ويجيب بأسلوب بحثي. وكسائر مخرجات الذكاء الاصطناعي، يجب التحقق من إجاباته في المصادر الرسمية قبل استخدامها في العمل القانوني.",
        },
        {
          question: "لماذا جوريا في مرحلة الوصول المبكر بدل الإتاحة العامة؟",
          answer:
            "لأن طرح الذكاء الاصطناعي القانوني بمسؤولية أهم من طرحه بسرعة. يتيح لنا الوصول المبكر مراقبة سلوك المساعد على عمل قانوني حقيقي، وجمع ملاحظات محامين ممارسين، وتقوية مسارات المراجعة قبل التوسع في الإتاحة.",
        },
      ],
      related: ["legalResearch", "responsibleLegalAi", "legalCaseManagement"],
      cta: {
        title: "جرّب الذكاء الاصطناعي القانوني حيث يعيش عملك أصلًا",
        body: "جوريا في مرحلة الوصول المبكر داخل مساحة عمل JURE — متصل بملفاتك، مع مراجعة المحامي في كل خطوة. اكتشف كيف تعمل المساعدة الذكية حين تكون جزءًا من المنصة لا نافذة منفصلة.",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Legal case management
  // ---------------------------------------------------------------------------
  legalCaseManagement: {
    en: {
      h1: "Case management that keeps every matter whole",
      intro:
        "A matter is more than a folder: it is a client, documents, tasks, deadlines and a team that all have to move together. JURE's case management gives each matter one workspace where all of that stays connected — for litigation, consultation and administrative matters alike.",
      definition: {
        title: "What is legal case management software?",
        body: "Legal case management software organizes everything a law firm or legal team needs to handle a matter from opening to closing. At its core, it links the parties involved (the client, the responsible lawyers), the work to be done (tasks, hearings, filings), the time constraints (deadlines, appointments, limitation periods) and the material (documents, correspondence) around a single matter record. Good case management replaces the informal system most practices actually run on — memory, inboxes and paper — with a structure the whole team can see. The measure of success is simple: anyone authorized to work on the matter can open it and understand its status, its next deadline and who is doing what, without asking around.",
      },
      problem: {
        title: "The cost of scattered matters",
        body: "When a matter lives across an inbox, a shared drive, a paper file and someone's memory, three failures follow. Deadlines depend on individuals: if the one person tracking a limitation period is away, the risk is invisible until it is urgent. Context is expensive to rebuild: every handover or status question means reconstructing the matter from fragments. And supervision becomes guesswork: partners cannot see workload or progress across matters without interrupting everyone. None of these are competence problems — they are structure problems, and they compound as the practice grows.",
      },
      approach: {
        title: "How JURE structures a matter",
        body: "In JURE, every matter is a workspace. It carries a type — litigation, consultation or administrative — and links to the client record, the attached documents, the tasks with their priorities and due dates, and the team members assigned to it. Deadlines and appointments appear on a calendar shared across the firm, with reminders and in-app and email notifications so dates are never held in one person's head. Everything is scoped to your firm and governed by role-based access.",
        points: [
          "Matters typed as litigation, consultation or administrative",
          "Each matter linked to its client record",
          "Documents attached directly to the matter",
          "Tasks with priorities, due dates and deadline reminders",
          "Shared team calendar and team member assignment",
        ],
      },
      workflow: {
        title: "From new client to matter in motion",
        steps: [
          "Create the client record",
          "Open the matter and set its type",
          "Attach documents and create tasks",
          "Set deadlines on the shared calendar",
          "Assign the team and track progress",
        ],
      },
      useCases: {
        title: "Case management in practice",
        items: [
          {
            title: "Litigation deadline management",
            body: "A litigation matter carries procedural deadlines that cannot slip. In JURE, each deadline becomes a dated task or calendar entry visible to the whole assigned team, with reminders before it falls due. The deadline no longer depends on one person remembering it.",
          },
          {
            title: "A consultation matter for a corporate client",
            body: "A company asks for an opinion on a commercial question. The lawyer opens a consultation matter, attaches the client's documents, tracks the drafting as tasks and keeps the exchange organized — so the advice, its basis and its timeline are all in one place if the question returns.",
          },
          {
            title: "Onboarding a new associate",
            body: "A new associate joins mid-matter. Instead of forwarding email threads, the firm assigns them to the matter: they see the client, the documents, the open tasks and the coming deadlines immediately, and start contributing on day one.",
          },
        ],
      },
      security: {
        title: "Matters stay inside the firm",
        body: "Every matter, client record and document in JURE is scoped to your firm's own workspace, isolated from every other firm on the platform. Within the firm, role-based access control determines who can view and manage matters — from owner down to viewer.",
      },
      faqs: [
        {
          question: "What types of matters can JURE manage?",
          answer:
            "JURE structures matters as litigation, consultation or administrative, so each carries the shape that fits its work. All three types connect to a client, documents, tasks, deadlines and an assigned team.",
        },
        {
          question: "How does JURE help the team keep deadlines?",
          answer:
            "Deadlines live as dated tasks and calendar entries on a calendar shared across the firm. JURE sends deadline reminders and in-app and email notifications, so dates are visible to the whole assigned team rather than tracked by one person.",
        },
        {
          question: "Can documents be attached directly to a matter?",
          answer:
            "Yes. Documents uploaded to JURE's library can be attached to matters, so pleadings, contracts and correspondence sit alongside the tasks and deadlines they relate to.",
        },
        {
          question: "Who in the firm can see a matter?",
          answer:
            "Access is governed by role-based permissions within your firm, with roles ranging from owner to viewer. Matters are never visible outside your firm's workspace.",
        },
        {
          question: "Does JURE's case management work for a solo lawyer?",
          answer:
            "Yes. The same structure — matter, client, documents, tasks, deadlines — is just as useful for a solo practice, and the shared calendar and team assignment become more valuable as the practice grows.",
        },
      ],
      related: ["legalPracticeManagement", "legalDocumentManagement", "legalOperations"],
      cta: {
        title: "Give every matter one home",
        body: "See how a matter looks in JURE when its client, documents, tasks, deadlines and team live in one connected workspace.",
      },
    },
    fr: {
      h1: "Une gestion de dossiers qui garde chaque affaire entière",
      intro:
        "Un dossier, c'est plus qu'une chemise : c'est un client, des documents, des tâches, des échéances et une équipe qui doivent avancer ensemble. La gestion de dossiers de JURE donne à chaque affaire un espace de travail où tout cela reste connecté — pour le contentieux, la consultation comme les dossiers administratifs.",
      definition: {
        title: "Qu'est-ce qu'un logiciel de gestion de dossiers juridiques ?",
        body: "Un logiciel de gestion de dossiers organise tout ce dont un cabinet ou une équipe juridique a besoin pour traiter une affaire, de l'ouverture à la clôture. Son cœur : relier autour d'une même fiche dossier les personnes concernées (le client, les avocats responsables), le travail à accomplir (tâches, audiences, dépôts), les contraintes de temps (échéances, rendez-vous, délais de prescription) et la matière (documents, correspondances). Une bonne gestion de dossiers remplace le système informel sur lequel tournent la plupart des cabinets — la mémoire, les boîtes mail et le papier — par une structure visible de toute l'équipe. Le critère de réussite est simple : toute personne autorisée à travailler sur le dossier peut l'ouvrir et comprendre son état, sa prochaine échéance et qui fait quoi, sans avoir à demander autour d'elle.",
      },
      problem: {
        title: "Le coût des dossiers éparpillés",
        body: "Quand un dossier vit entre une boîte mail, un disque partagé, une chemise papier et la mémoire de quelqu'un, trois défaillances suivent. Les échéances dépendent des individus : si la seule personne qui suit un délai de prescription s'absente, le risque reste invisible jusqu'à l'urgence. Reconstituer le contexte coûte cher : chaque transmission ou question d'avancement oblige à reconstruire le dossier à partir de fragments. Et la supervision devient une devinette : les associés ne voient ni la charge ni l'avancement sans interrompre tout le monde. Rien de tout cela n'est un problème de compétence — ce sont des problèmes de structure, qui s'aggravent avec la croissance du cabinet.",
      },
      approach: {
        title: "Comment JURE structure un dossier",
        body: "Dans JURE, chaque dossier est un espace de travail. Il porte un type — contentieux, consultation ou administratif — et relie la fiche client, les documents rattachés, les tâches avec leurs priorités et leurs dates limites, et les membres de l'équipe qui y sont assignés. Échéances et rendez-vous apparaissent sur un agenda partagé à l'échelle du cabinet, avec rappels et notifications dans l'application et par e-mail, pour qu'aucune date ne repose sur la mémoire d'une seule personne. Le tout est cloisonné par cabinet et régi par un contrôle d'accès par rôles.",
        points: [
          "Des dossiers typés : contentieux, consultation ou administratif",
          "Chaque dossier relié à sa fiche client",
          "Des documents rattachés directement au dossier",
          "Des tâches avec priorités, dates limites et rappels d'échéances",
          "Un agenda d'équipe partagé et l'assignation des membres",
        ],
      },
      workflow: {
        title: "Du nouveau client au dossier en mouvement",
        steps: [
          "Créer la fiche client",
          "Ouvrir le dossier et définir son type",
          "Rattacher les documents et créer les tâches",
          "Fixer les échéances sur l'agenda partagé",
          "Assigner l'équipe et suivre l'avancement",
        ],
      },
      useCases: {
        title: "La gestion de dossiers en pratique",
        items: [
          {
            title: "Gestion des échéances en contentieux",
            body: "Un dossier contentieux porte des délais de procédure qui ne peuvent pas glisser. Dans JURE, chaque échéance devient une tâche datée ou une entrée d'agenda visible de toute l'équipe assignée, avec des rappels avant la date. L'échéance ne dépend plus de la mémoire d'une seule personne.",
          },
          {
            title: "Un dossier de consultation pour un client entreprise",
            body: "Une société demande un avis sur une question commerciale. L'avocat ouvre un dossier de consultation, rattache les documents du client, suit la rédaction sous forme de tâches et garde l'échange organisé — l'avis, ses fondements et sa chronologie restent au même endroit si la question revient.",
          },
          {
            title: "Intégrer un nouveau collaborateur",
            body: "Un collaborateur rejoint le cabinet en cours de dossier. Au lieu de transférer des fils d'e-mails, le cabinet l'assigne au dossier : il voit immédiatement le client, les documents, les tâches ouvertes et les échéances à venir, et contribue dès le premier jour.",
          },
        ],
      },
      security: {
        title: "Les dossiers restent dans le cabinet",
        body: "Chaque dossier, fiche client et document dans JURE est cloisonné dans l'espace propre de votre cabinet, isolé de tous les autres cabinets de la plateforme. Au sein du cabinet, le contrôle d'accès par rôles détermine qui peut consulter et gérer les dossiers — du propriétaire au simple lecteur.",
      },
      faqs: [
        {
          question: "Quels types de dossiers JURE peut-il gérer ?",
          answer:
            "JURE structure les dossiers en contentieux, consultation ou administratif, pour que chacun porte la forme adaptée à son travail. Les trois types relient un client, des documents, des tâches, des échéances et une équipe assignée.",
        },
        {
          question: "Comment JURE aide-t-il l'équipe à tenir les échéances ?",
          answer:
            "Les échéances vivent sous forme de tâches datées et d'entrées d'agenda sur un calendrier partagé à l'échelle du cabinet. JURE envoie des rappels d'échéances et des notifications dans l'application et par e-mail, pour que les dates soient visibles de toute l'équipe assignée plutôt que suivies par une seule personne.",
        },
        {
          question: "Peut-on rattacher des documents directement à un dossier ?",
          answer:
            "Oui. Les documents importés dans la bibliothèque JURE peuvent être rattachés aux dossiers : conclusions, contrats et correspondances côtoient les tâches et échéances auxquelles ils se rapportent.",
        },
        {
          question: "Qui, dans le cabinet, peut voir un dossier ?",
          answer:
            "L'accès est régi par des permissions par rôles au sein de votre cabinet, du propriétaire au lecteur. Les dossiers ne sont jamais visibles en dehors de l'espace de votre cabinet.",
        },
        {
          question: "La gestion de dossiers de JURE convient-elle à un avocat indépendant ?",
          answer:
            "Oui. La même structure — dossier, client, documents, tâches, échéances — sert tout autant une pratique individuelle, et l'agenda partagé comme l'assignation d'équipe prennent de la valeur à mesure que le cabinet grandit.",
        },
      ],
      related: ["legalPracticeManagement", "legalDocumentManagement", "legalOperations"],
      cta: {
        title: "Donnez à chaque dossier un seul foyer",
        body: "Découvrez à quoi ressemble un dossier dans JURE quand son client, ses documents, ses tâches, ses échéances et son équipe vivent dans un même espace connecté.",
      },
    },
    ar: {
      h1: "إدارة قضايا تُبقي كل ملف متكاملًا",
      intro:
        "الملف أكثر من مجرد إضبارة: إنه موكل ومستندات ومهام وآجال وفريق يجب أن يتقدموا معًا. تمنح إدارة القضايا في JURE كل ملف مساحة عمل واحدة يبقى فيها كل ذلك متصلًا — للنزاعات والاستشارات والملفات الإدارية على السواء.",
      definition: {
        title: "ما هو برنامج إدارة القضايا القانونية؟",
        body: "برنامج إدارة القضايا ينظّم كل ما يحتاجه مكتب المحاماة أو الفريق القانوني لمعالجة ملف من فتحه إلى إقفاله. جوهره ربط الأطراف المعنية (الموكل والمحامون المسؤولون)، والعمل المطلوب (المهام والجلسات والإيداعات)، وقيود الزمن (الآجال والمواعيد وآجال التقادم)، والمادة (المستندات والمراسلات) حول سجل ملف واحد. إدارة القضايا الجيدة تستبدل النظام غير الرسمي الذي تسير عليه معظم المكاتب فعليًا — الذاكرة وصناديق البريد والورق — ببنية يراها الفريق كله. ومعيار النجاح بسيط: أن يستطيع أي شخص مخوَّل بالعمل على الملف فتحه وفهم حالته وموعده النهائي القادم ومن يقوم بماذا، دون أن يسأل من حوله.",
      },
      problem: {
        title: "كلفة الملفات المبعثرة",
        body: "حين يعيش الملف بين بريد إلكتروني وقرص مشترك وإضبارة ورقية وذاكرة شخص ما، تتبع ذلك ثلاث إخفاقات. الآجال تعتمد على الأفراد: فإذا غاب الشخص الوحيد الذي يتابع أجل التقادم، بقي الخطر خفيًا حتى يصير طارئًا. وإعادة بناء السياق مكلفة: فكل تسليم أو سؤال عن الحالة يعني إعادة تركيب الملف من شذرات. والإشراف يتحول إلى تخمين: فلا يرى الشركاء أعباء العمل ولا التقدم دون مقاطعة الجميع. لا شيء من ذلك مشكلة كفاءة — إنها مشكلات بنية، وتتفاقم مع نمو المكتب.",
      },
      approach: {
        title: "كيف تبني JURE هيكل الملف",
        body: "في JURE، كل ملف هو مساحة عمل. يحمل نوعًا — نزاع أو استشارة أو ملف إداري — ويرتبط بسجل الموكل، والمستندات المرفقة، والمهام بأولوياتها ومواعيدها النهائية، وأعضاء الفريق المعينين عليه. تظهر الآجال والمواعيد على مفكرة مشتركة على مستوى المكتب، مع تذكيرات وإشعارات داخل التطبيق وعبر البريد الإلكتروني، حتى لا تبقى التواريخ في رأس شخص واحد. وكل ذلك محصور في نطاق مكتبك ومحكوم بالتحكم في الوصول حسب الأدوار.",
        points: [
          "ملفات مصنفة: نزاع أو استشارة أو ملف إداري",
          "كل ملف مرتبط بسجل موكله",
          "مستندات مرفقة مباشرة بالملف",
          "مهام بأولويات ومواعيد نهائية وتذكيرات بالآجال",
          "مفكرة فريق مشتركة وتعيين أعضاء الفريق",
        ],
      },
      workflow: {
        title: "من موكل جديد إلى ملف يتحرك",
        steps: [
          "أنشئ سجل الموكل",
          "افتح الملف وحدد نوعه",
          "أرفق المستندات وأنشئ المهام",
          "حدد الآجال على المفكرة المشتركة",
          "عيّن الفريق وتابع التقدم",
        ],
      },
      useCases: {
        title: "إدارة القضايا عمليًا",
        items: [
          {
            title: "إدارة آجال النزاعات",
            body: "ملف النزاع يحمل آجالًا إجرائية لا تحتمل التأخير. في JURE، يصبح كل أجل مهمة مؤرخة أو موعدًا في المفكرة يراه كامل الفريق المعين، مع تذكيرات قبل حلوله. لم يعد الأجل رهين ذاكرة شخص واحد.",
          },
          {
            title: "ملف استشارة لعميل من الشركات",
            body: "تطلب شركة رأيًا في مسألة تجارية. يفتح المحامي ملف استشارة، ويرفق مستندات العميل، ويتابع الصياغة كمهام، ويحفظ التبادل منظمًا — فيبقى الرأي وأسسه وتسلسله الزمني في مكان واحد إذا عادت المسألة.",
          },
          {
            title: "إدماج محامٍ متعاون جديد",
            body: "ينضم محامٍ متعاون في منتصف ملف. بدل إعادة توجيه سلاسل البريد، يعيّنه المكتب على الملف: فيرى فورًا الموكل والمستندات والمهام المفتوحة والآجال القادمة، ويبدأ المساهمة من اليوم الأول.",
          },
        ],
      },
      security: {
        title: "الملفات تبقى داخل المكتب",
        body: "كل ملف وسجل موكل ومستند في JURE محصور في مساحة عمل مكتبك الخاصة، معزولًا عن كل مكتب آخر على المنصة. وداخل المكتب، يحدد التحكم في الوصول حسب الأدوار من يستطيع الاطلاع على الملفات وإدارتها — من المالك إلى المطالع فقط.",
      },
      faqs: [
        {
          question: "ما أنواع الملفات التي تديرها JURE؟",
          answer:
            "تنظم JURE الملفات كنزاعات أو استشارات أو ملفات إدارية، ليحمل كل ملف الشكل المناسب لعمله. وترتبط الأنواع الثلاثة كلها بموكل ومستندات ومهام وآجال وفريق معين.",
        },
        {
          question: "كيف تساعد JURE الفريق على احترام الآجال؟",
          answer:
            "تعيش الآجال كمهام مؤرخة ومواعيد على مفكرة مشتركة على مستوى المكتب. وترسل JURE تذكيرات بالآجال وإشعارات داخل التطبيق وعبر البريد الإلكتروني، فتكون التواريخ مرئية لكامل الفريق المعين بدل أن يتابعها شخص واحد.",
        },
        {
          question: "هل يمكن إرفاق المستندات مباشرة بالملف؟",
          answer:
            "نعم. المستندات المرفوعة إلى مكتبة JURE يمكن إرفاقها بالملفات، فتجاور المذكرات والعقود والمراسلات المهام والآجال التي تتعلق بها.",
        },
        {
          question: "من في المكتب يستطيع رؤية الملف؟",
          answer:
            "الوصول محكوم بصلاحيات حسب الأدوار داخل مكتبك، بأدوار تتدرج من المالك إلى المطالع فقط. ولا تكون الملفات مرئية أبدًا خارج مساحة عمل مكتبك.",
        },
        {
          question: "هل تناسب إدارة القضايا في JURE المحامي المستقل؟",
          answer:
            "نعم. البنية نفسها — ملف وموكل ومستندات ومهام وآجال — تفيد الممارسة الفردية بالقدر نفسه، وتزداد قيمة المفكرة المشتركة وتعيين الفريق مع نمو المكتب.",
        },
      ],
      related: ["legalPracticeManagement", "legalDocumentManagement", "legalOperations"],
      cta: {
        title: "امنح كل ملف بيتًا واحدًا",
        body: "شاهد كيف يبدو الملف في JURE حين يعيش موكله ومستنداته ومهامه وآجاله وفريقه في مساحة واحدة متصلة.",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Legal practice management
  // ---------------------------------------------------------------------------
  legalPracticeManagement: {
    en: {
      h1: "Run the whole firm from one platform",
      intro:
        "Practice management is everything a firm does around the law itself: clients, calendars, tasks, documents, money and people. JURE brings those firm-wide operations into the same workspace as the matters they serve — so running the practice stops being a second job done in five other tools.",
      definition: {
        title: "What is legal practice management software?",
        body: "Legal practice management software is the operating system of a law firm. Where case management focuses on individual matters, practice management covers the firm as a whole: the client base, the shared calendar of appointments and deadlines, the distribution of tasks across the team, the document library, the billing and payments, and the roles and permissions that decide who may do what. Historically firms assembled this from separate tools — a calendar here, a spreadsheet of invoices there, files on a shared drive. Practice management software replaces that patchwork with one system, so information entered once (a client, a deadline, an invoice) is visible wherever the firm needs it, under access rules the firm controls.",
      },
      problem: {
        title: "The patchwork tax on law firms",
        body: "Most firms run on a patchwork: one tool for the calendar, another for files, a spreadsheet for invoices, and email for everything else. The tax is paid daily. The same client exists in four places with three spellings. An appointment moved in one calendar is missed in another. Nobody is sure whether an invoice was paid without asking the person who sent it. And because none of these tools know about roles, sensitive information — especially financial — is either overshared or locked away with one person. The firm works hard, but its information works against it.",
      },
      approach: {
        title: "How JURE unifies the practice",
        body: "JURE puts the firm's operations in one workspace scoped to the firm itself. Matters and clients are managed together; appointments and deadlines live on one shared calendar; tasks carry priorities, due dates and assignees across the team; and the document library connects to the matters it documents. Practice finance — invoices, payments, fees and dashboards — is built in and restricted to owner and admin roles, so financial visibility follows responsibility. Role-based access control, from owner to viewer, governs the whole workspace.",
        points: [
          "Matters and clients managed per firm, in one place",
          "A shared calendar for appointments and deadlines",
          "Tasks with priorities, due dates and assignees across the team",
          "A document library connected to matters",
          "Invoices, payments, fees and dashboards for owners and admins",
        ],
      },
      workflow: {
        title: "A firm's day in JURE",
        steps: [
          "Check the shared calendar",
          "Work matters, tasks and documents",
          "Collaborate in messaging and calls",
          "Record invoices and payments (owner/admin)",
          "Review the practice dashboards",
        ],
      },
      useCases: {
        title: "Practice management in practice",
        items: [
          {
            title: "A growing firm outgrows its spreadsheets",
            body: "A three-lawyer cabinet becomes six. The spreadsheet of matters and the shared calendar in someone's personal account stop scaling. Moving to JURE gives the firm one client base, one calendar and one task list — with roles deciding who manages what.",
          },
          {
            title: "Setting up roles when hiring",
            body: "The firm hires an assistant and a junior associate. With role-based access from owner to viewer, each new member gets the visibility their role requires — the assistant manages the calendar and documents, while financial data stays with owners and admins.",
          },
          {
            title: "An owner reviewing the month",
            body: "At the end of the month, the managing partner opens the finance section: invoices issued, payments received, fees recorded, and dashboards summarizing the position. No collecting spreadsheets from three people — the operational and financial picture is in the same platform as the work that produced it.",
          },
        ],
      },
      security: {
        title: "Firm-wide data, firm-only access",
        body: "Everything the practice runs on — clients, matters, calendar, documents, finance — is isolated to your firm's workspace. Role-based access control means financial data is restricted to owners and admins, while every member sees exactly what their role allows.",
      },
      faqs: [
        {
          question: "Who can see the firm's financial data in JURE?",
          answer:
            "Practice finance — invoices, payments, fees and dashboards — is restricted to owner and admin roles. Other team members work with matters, tasks, documents and the calendar without access to financial information.",
        },
        {
          question: "What roles does JURE support?",
          answer:
            "JURE uses role-based access control with roles ranging from owner to viewer. Roles determine what each member can see and manage across matters, clients, documents and firm finance.",
        },
        {
          question: "Is JURE suitable for a solo practice?",
          answer:
            "Yes. A solo lawyer gets the same structure — matters, clients, calendar, tasks, documents and finance — in one place, and the collaboration and role features become useful the day the practice grows.",
        },
        {
          question: "Does practice management in JURE include team communication?",
          answer:
            "Yes. JURE includes real-time team messaging with direct and group conversations, plus voice and video calls — and you can share matters, tasks and appointments directly into a conversation.",
        },
        {
          question: "How is practice management different from case management?",
          answer:
            "Case management organizes the work inside a single matter; practice management runs the firm around all of them — clients, calendar, workloads, documents and finance. In JURE the two are the same platform, so nothing is re-entered between systems.",
        },
      ],
      related: ["legalCaseManagement", "legalOperations", "legalDocumentManagement"],
      cta: {
        title: "One platform for the practice and the work",
        body: "See how JURE runs matters, clients, calendar, tasks, documents and firm finance together — with roles keeping each in the right hands.",
      },
    },
    fr: {
      h1: "Pilotez tout le cabinet depuis une seule plateforme",
      intro:
        "La gestion de cabinet, c'est tout ce qu'un cabinet fait autour du droit lui-même : clients, agendas, tâches, documents, finances et équipe. JURE réunit ces opérations à l'échelle du cabinet dans le même espace que les dossiers qu'elles servent — pour que gérer le cabinet cesse d'être un second métier réparti sur cinq autres outils.",
      definition: {
        title: "Qu'est-ce qu'un logiciel de gestion de cabinet ?",
        body: "Un logiciel de gestion de cabinet est le système d'exploitation d'un cabinet d'avocats. Là où la gestion de dossiers se concentre sur chaque affaire, la gestion de cabinet couvre l'ensemble : la base clients, l'agenda partagé des rendez-vous et des échéances, la répartition des tâches dans l'équipe, la bibliothèque documentaire, la facturation et les paiements, et les rôles et permissions qui décident qui peut faire quoi. Historiquement, les cabinets assemblaient tout cela à partir d'outils séparés — un agenda ici, un tableur de factures là, des fichiers sur un disque partagé. Le logiciel de gestion de cabinet remplace ce patchwork par un seul système : une information saisie une fois (un client, une échéance, une facture) est visible partout où le cabinet en a besoin, selon des règles d'accès que le cabinet contrôle.",
      },
      problem: {
        title: "La taxe du patchwork sur les cabinets",
        body: "La plupart des cabinets fonctionnent sur un patchwork : un outil pour l'agenda, un autre pour les fichiers, un tableur pour les factures, et l'e-mail pour tout le reste. La taxe se paie chaque jour. Le même client existe à quatre endroits avec trois orthographes. Un rendez-vous déplacé dans un agenda est manqué dans un autre. Personne ne sait si une facture a été payée sans interroger celui qui l'a envoyée. Et comme aucun de ces outils ne connaît les rôles, l'information sensible — surtout financière — est soit trop partagée, soit verrouillée chez une seule personne. Le cabinet travaille dur, mais son information travaille contre lui.",
      },
      approach: {
        title: "Comment JURE unifie le cabinet",
        body: "JURE place les opérations du cabinet dans un espace de travail cloisonné au cabinet lui-même. Dossiers et clients se gèrent ensemble ; rendez-vous et échéances vivent sur un agenda partagé ; les tâches portent priorités, dates limites et assignés à travers l'équipe ; et la bibliothèque documentaire se relie aux dossiers qu'elle documente. La finance du cabinet — factures, paiements, honoraires et tableaux de bord — est intégrée et réservée aux rôles propriétaire et administrateur, pour que la visibilité financière suive la responsabilité. Le contrôle d'accès par rôles, du propriétaire au lecteur, régit tout l'espace.",
        points: [
          "Dossiers et clients gérés par cabinet, au même endroit",
          "Un agenda partagé pour les rendez-vous et les échéances",
          "Des tâches avec priorités, dates limites et assignés dans l'équipe",
          "Une bibliothèque documentaire reliée aux dossiers",
          "Factures, paiements, honoraires et tableaux de bord pour propriétaires et administrateurs",
        ],
      },
      workflow: {
        title: "La journée d'un cabinet dans JURE",
        steps: [
          "Consulter l'agenda partagé",
          "Travailler dossiers, tâches et documents",
          "Collaborer par messagerie et appels",
          "Enregistrer factures et paiements (propriétaire/admin)",
          "Passer en revue les tableaux de bord",
        ],
      },
      useCases: {
        title: "La gestion de cabinet en pratique",
        items: [
          {
            title: "Un cabinet en croissance dépasse ses tableurs",
            body: "Un cabinet de trois avocats passe à six. Le tableur des dossiers et l'agenda partagé sur un compte personnel ne suivent plus. Passer à JURE donne au cabinet une seule base clients, un seul agenda et une seule liste de tâches — avec des rôles qui décident qui gère quoi.",
          },
          {
            title: "Définir les rôles lors d'un recrutement",
            body: "Le cabinet recrute une assistante et un collaborateur junior. Avec un accès par rôles du propriétaire au lecteur, chaque nouveau membre reçoit la visibilité que son rôle exige — l'assistante gère l'agenda et les documents, tandis que les données financières restent aux propriétaires et administrateurs.",
          },
          {
            title: "Un associé fait le point du mois",
            body: "En fin de mois, l'associé gérant ouvre la section finance : factures émises, paiements reçus, honoraires enregistrés, et tableaux de bord résumant la situation. Plus besoin de collecter des tableurs auprès de trois personnes — la vue opérationnelle et financière est sur la même plateforme que le travail qui l'a produite.",
          },
        ],
      },
      security: {
        title: "Des données de cabinet, un accès de cabinet",
        body: "Tout ce qui fait tourner le cabinet — clients, dossiers, agenda, documents, finance — est isolé dans l'espace de votre cabinet. Le contrôle d'accès par rôles réserve les données financières aux propriétaires et administrateurs, et chaque membre voit exactement ce que son rôle autorise.",
      },
      faqs: [
        {
          question: "Qui peut voir les données financières du cabinet dans JURE ?",
          answer:
            "La finance du cabinet — factures, paiements, honoraires et tableaux de bord — est réservée aux rôles propriétaire et administrateur. Les autres membres travaillent sur les dossiers, tâches, documents et l'agenda sans accès aux informations financières.",
        },
        {
          question: "Quels rôles JURE propose-t-il ?",
          answer:
            "JURE applique un contrôle d'accès par rôles allant du propriétaire au lecteur. Les rôles déterminent ce que chaque membre peut voir et gérer parmi les dossiers, clients, documents et la finance du cabinet.",
        },
        {
          question: "JURE convient-il à une pratique individuelle ?",
          answer:
            "Oui. Un avocat indépendant retrouve la même structure — dossiers, clients, agenda, tâches, documents et finance — au même endroit, et les fonctions de collaboration et de rôles deviennent utiles le jour où le cabinet grandit.",
        },
        {
          question: "La gestion de cabinet dans JURE inclut-elle la communication d'équipe ?",
          answer:
            "Oui. JURE inclut une messagerie d'équipe en temps réel avec conversations directes et de groupe, ainsi que des appels audio et vidéo — et vous pouvez partager dossiers, tâches et rendez-vous directement dans une conversation.",
        },
        {
          question: "Quelle différence entre gestion de cabinet et gestion de dossiers ?",
          answer:
            "La gestion de dossiers organise le travail au sein d'une affaire ; la gestion de cabinet fait tourner le cabinet autour de toutes — clients, agenda, charges de travail, documents et finance. Dans JURE, les deux sont la même plateforme : rien n'est ressaisi entre systèmes.",
        },
      ],
      related: ["legalCaseManagement", "legalOperations", "legalDocumentManagement"],
      cta: {
        title: "Une plateforme pour le cabinet et pour le travail",
        body: "Découvrez comment JURE fait fonctionner ensemble dossiers, clients, agenda, tâches, documents et finance du cabinet — avec des rôles qui gardent chaque chose entre les bonnes mains.",
      },
    },
    ar: {
      h1: "أدر المكتب كله من منصة واحدة",
      intro:
        "إدارة المكتب هي كل ما يقوم به المكتب حول القانون نفسه: العملاء والمفكرات والمهام والمستندات والمال والفريق. تجمع JURE هذه العمليات على مستوى المكتب في مساحة العمل نفسها التي تضم الملفات التي تخدمها — فلا تعود إدارة المكتب مهنة ثانية موزعة على خمس أدوات أخرى.",
      definition: {
        title: "ما هو برنامج إدارة مكتب المحاماة؟",
        body: "برنامج إدارة مكتب المحاماة هو نظام تشغيل المكتب. فبينما تركز إدارة القضايا على كل ملف على حدة، تغطي إدارة المكتب الكيان كله: قاعدة العملاء، والمفكرة المشتركة للمواعيد والآجال، وتوزيع المهام على الفريق، ومكتبة المستندات، والفوترة والمدفوعات، والأدوار والصلاحيات التي تقرر من يفعل ماذا. تاريخيًا، جمّعت المكاتب كل ذلك من أدوات متفرقة — مفكرة هنا، وجدول فواتير هناك، وملفات على قرص مشترك. يستبدل برنامج إدارة المكتب هذه الرقعة المتنافرة بنظام واحد: فالمعلومة المدخلة مرة واحدة (عميل، أجل، فاتورة) تصبح مرئية حيثما احتاجها المكتب، وفق قواعد وصول يتحكم فيها المكتب نفسه.",
      },
      problem: {
        title: "ضريبة الأدوات المتفرقة على المكاتب",
        body: "تعمل معظم المكاتب على رقعة متنافرة: أداة للمفكرة، وأخرى للملفات، وجدول للفواتير، والبريد الإلكتروني لكل ما تبقى. وتُدفع الضريبة يوميًا. العميل نفسه موجود في أربعة أماكن بثلاث كتابات مختلفة. موعد نُقل في مفكرة يضيع في أخرى. لا أحد يعرف هل سُددت فاتورة دون سؤال من أرسلها. ولأن هذه الأدوات لا تعرف الأدوار، تكون المعلومات الحساسة — المالية خصوصًا — إما مفرطة الانتشار أو حبيسة عند شخص واحد. يعمل المكتب بجد، لكن معلوماته تعمل ضده.",
      },
      approach: {
        title: "كيف توحّد JURE إدارة المكتب",
        body: "تضع JURE عمليات المكتب في مساحة عمل واحدة محصورة في نطاق المكتب نفسه. تُدار الملفات والعملاء معًا؛ وتعيش المواعيد والآجال على مفكرة مشتركة واحدة؛ وتحمل المهام أولويات ومواعيد نهائية ومكلفين عبر الفريق؛ وترتبط مكتبة المستندات بالملفات التي توثقها. أما مالية المكتب — الفواتير والمدفوعات والأتعاب ولوحات المتابعة — فمدمجة ومقصورة على دوري المالك والمدير، لتتبع الرؤية المالية المسؤولية. ويحكم التحكم في الوصول حسب الأدوار، من المالك إلى المطالع، مساحة العمل كلها.",
        points: [
          "ملفات وعملاء يُدارون لكل مكتب، في مكان واحد",
          "مفكرة مشتركة للمواعيد والآجال",
          "مهام بأولويات ومواعيد نهائية ومكلفين عبر الفريق",
          "مكتبة مستندات مرتبطة بالملفات",
          "فواتير ومدفوعات وأتعاب ولوحات متابعة للمالكين والمديرين",
        ],
      },
      workflow: {
        title: "يوم المكتب في JURE",
        steps: [
          "راجع المفكرة المشتركة",
          "اعمل على الملفات والمهام والمستندات",
          "تعاون عبر المراسلة والمكالمات",
          "سجّل الفواتير والمدفوعات (المالك/المدير)",
          "استعرض لوحات متابعة المكتب",
        ],
      },
      useCases: {
        title: "إدارة المكتب عمليًا",
        items: [
          {
            title: "مكتب ينمو ويتجاوز جداوله",
            body: "مكتب من ثلاثة محامين يصبح ستة. جدول الملفات والمفكرة المشتركة على حساب شخصي لم يعودا يكفيان. الانتقال إلى JURE يمنح المكتب قاعدة عملاء واحدة ومفكرة واحدة وقائمة مهام واحدة — مع أدوار تقرر من يدير ماذا.",
          },
          {
            title: "ضبط الأدوار عند التوظيف",
            body: "يوظف المكتب مساعِدة ومحاميًا مبتدئًا. بفضل الوصول حسب الأدوار من المالك إلى المطالع، ينال كل عضو جديد الرؤية التي يتطلبها دوره — فتدير المساعِدة المفكرة والمستندات، بينما تبقى البيانات المالية للمالكين والمديرين.",
          },
          {
            title: "شريك يراجع حصيلة الشهر",
            body: "في نهاية الشهر، يفتح الشريك المدير قسم المالية: الفواتير الصادرة، والمدفوعات المستلمة، والأتعاب المسجلة، ولوحات متابعة تلخص الوضع. لا حاجة لجمع جداول من ثلاثة أشخاص — فالصورة التشغيلية والمالية على المنصة نفسها التي أنتجت العمل.",
          },
        ],
      },
      security: {
        title: "بيانات المكتب، ووصول للمكتب وحده",
        body: "كل ما يدير المكتب — العملاء والملفات والمفكرة والمستندات والمالية — معزول في مساحة عمل مكتبك. ويعني التحكم في الوصول حسب الأدوار أن البيانات المالية مقصورة على المالكين والمديرين، وأن كل عضو يرى بالضبط ما يسمح به دوره.",
      },
      faqs: [
        {
          question: "من يستطيع رؤية البيانات المالية للمكتب في JURE؟",
          answer:
            "مالية المكتب — الفواتير والمدفوعات والأتعاب ولوحات المتابعة — مقصورة على دوري المالك والمدير. أما بقية أعضاء الفريق فيعملون على الملفات والمهام والمستندات والمفكرة دون وصول إلى المعلومات المالية.",
        },
        {
          question: "ما الأدوار التي تدعمها JURE؟",
          answer:
            "تعتمد JURE التحكم في الوصول حسب الأدوار، بأدوار تتدرج من المالك إلى المطالع فقط. وتحدد الأدوار ما يستطيع كل عضو رؤيته وإدارته من ملفات وعملاء ومستندات ومالية المكتب.",
        },
        {
          question: "هل تناسب JURE الممارسة الفردية؟",
          answer:
            "نعم. يجد المحامي المستقل البنية نفسها — ملفات وعملاء ومفكرة ومهام ومستندات ومالية — في مكان واحد، وتصبح ميزات التعاون والأدوار مفيدة يوم ينمو المكتب.",
        },
        {
          question: "هل تشمل إدارة المكتب في JURE تواصل الفريق؟",
          answer:
            "نعم. تتضمن JURE مراسلة فريق فورية بمحادثات مباشرة وجماعية، إضافة إلى مكالمات صوتية ومرئية — ويمكنك مشاركة الملفات والمهام والمواعيد مباشرة داخل المحادثة.",
        },
        {
          question: "ما الفرق بين إدارة المكتب وإدارة القضايا؟",
          answer:
            "إدارة القضايا تنظم العمل داخل ملف واحد؛ أما إدارة المكتب فتدير المكتب حول الملفات كلها — العملاء والمفكرة وأعباء العمل والمستندات والمالية. وفي JURE هما منصة واحدة، فلا يُعاد إدخال شيء بين نظامين.",
        },
      ],
      related: ["legalCaseManagement", "legalOperations", "legalDocumentManagement"],
      cta: {
        title: "منصة واحدة للمكتب وللعمل",
        body: "اكتشف كيف تُشغّل JURE الملفات والعملاء والمفكرة والمهام والمستندات ومالية المكتب معًا — بأدوار تُبقي كل شيء في اليد الصحيحة.",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Legal research
  // ---------------------------------------------------------------------------
  legalResearch: {
    en: {
      h1: "AI-assisted legal research, with the lawyer in charge",
      intro:
        "AI can compress the first hours of legal research into minutes — and it can also invent authorities that do not exist. This page explains how AI-assisted research actually works, where its limits are, and how JURE's research mode is designed around one non-negotiable step: lawyer verification before anything is relied on.",
      definition: {
        title: "What is AI-assisted legal research?",
        body: "AI-assisted legal research uses large language models to help lawyers move from a legal question to a working analysis. Instead of starting with keyword searches across databases, the lawyer describes the question in plain language and receives a structured, research-style answer: the relevant concepts, the legal texts likely to apply, and lines of reasoning to test. It is best understood as a first pass, not a final one. Language models generate plausible text; they do not guarantee that a cited article, judgment or rule actually exists or says what the answer claims. That is why serious AI-assisted research always pairs the speed of generation with a verification step, where a lawyer checks every reference against authoritative sources before it enters any legal work product.",
      },
      problem: {
        title: "Slow to start, dangerous to trust blindly",
        body: "Traditional research has a cold-start problem: on an unfamiliar question, the first hours go to simply finding the right terrain — which texts, which concepts, which terms to search. Raw chatbots solve the cold start but create a worse problem: confidently phrased answers that may rest on invented or misread authorities, a risk that has already embarrassed lawyers in real proceedings. Legal teams are caught between a slow method they trust and a fast one they cannot. What is missing is not a smarter chatbot — it is a workflow that uses AI speed while making verification a structural step rather than a personal virtue.",
      },
      approach: {
        title: "How research works in JURE",
        body: "Juria, JURE's legal AI assistant, includes a dedicated research mode in early access. It answers legal questions in a research style, oriented to Moroccan law, and is instructed to reference the legal sources it relies on — references the lawyer then verifies, because JURE deliberately treats them as leads, not proof. The draft analysis takes shape inside the same workspace as the matter it serves, and JURE's workflow places lawyer review before any conclusion is used. The research gets faster; the responsibility stays where it belongs.",
        points: [
          "A dedicated research mode in Juria, in early access",
          "Research-style answers oriented to Moroccan law",
          "Answers instructed to reference legal sources — as leads for the lawyer to verify",
          "Draft analyses developed in the same workspace as the matter",
          "Lawyer review before any conclusion is relied on",
        ],
      },
      workflow: {
        title: "From question to reviewed analysis",
        steps: [
          "Frame the legal question",
          "Run it in Juria's research mode",
          "Read the draft and its referenced sources",
          "Lawyer verifies sources and corrects",
          "Finalize the analysis for the matter",
        ],
      },
      useCases: {
        title: "AI-assisted research in practice",
        items: [
          {
            title: "Preparing a consultation answer",
            body: "A client asks a question at the edge of the lawyer's usual practice area. Research mode produces a structured first map of the issue in minutes. The lawyer verifies each referenced text, corrects the framing and turns the draft into a reliable consultation answer.",
          },
          {
            title: "Before a client meeting",
            body: "With an hour before a meeting, a lawyer uses research mode to refresh the key rules on the topic and anticipate likely questions. Nothing goes to the client unverified — but the lawyer walks in oriented instead of guessing.",
          },
          {
            title: "An associate's research memo, reviewed by a senior",
            body: "An associate drafts a research memo with Juria's help, verifying every reference along the way. The senior lawyer reviews the memo as they always would — except the associate spent the time on verification and analysis instead of on the blank page.",
          },
        ],
      },
      security: {
        title: "Research questions are client information",
        body: "The questions a firm researches often reveal exactly what a client is facing. In JURE, research happens inside the firm's own isolated workspace rather than in a consumer chatbot, and role-based access control governs who in the team can see the matters that research relates to.",
      },
      faqs: [
        {
          question: "Does JURE replace legal databases and official sources?",
          answer:
            "No. Juria's research mode helps you frame, orient and draft — but verification happens in authoritative sources, as it always has. Think of it as a faster first pass, not a replacement for official texts and case law.",
        },
        {
          question: "How accurate are Juria's research answers?",
          answer:
            "Like all large language models, Juria can be wrong and can produce references that are inaccurate or do not exist. That is precisely why JURE's research workflow makes lawyer verification a structural step: no AI answer should be relied on before a lawyer has checked it against authoritative sources.",
        },
        {
          question: "Which jurisdiction does the research mode cover?",
          answer:
            "The research mode is oriented to Moroccan law and answers in a research style. For any jurisdiction, its output must be verified against official sources before use.",
        },
        {
          question: "Can I trust the sources Juria mentions?",
          answer:
            "Treat them as leads, not citations. Juria is instructed to reference the legal sources behind its answers, but JURE does not offer a structured citation feature, and each reference must be independently verified by a lawyer before it appears in any work product.",
        },
        {
          question: "Is the research mode available to everyone?",
          answer:
            "Research mode is part of Juria, which is currently in early access. It is being rolled out progressively so we can refine it with practicing lawyers before general availability.",
        },
      ],
      related: ["legalAi", "responsibleLegalAi", "legalKnowledgeManagement"],
      cta: {
        title: "Research faster. Verify always.",
        body: "See how Juria's research mode, in early access, turns a legal question into a draft analysis — with lawyer review built into the workflow, not left to chance.",
      },
    },
    fr: {
      h1: "La recherche juridique assistée par IA, sous le contrôle de l'avocat",
      intro:
        "L'IA peut compresser en minutes les premières heures d'une recherche juridique — et elle peut aussi inventer des sources qui n'existent pas. Cette page explique comment fonctionne réellement la recherche assistée par IA, où sont ses limites, et comment le mode recherche de JURE est conçu autour d'une étape non négociable : la vérification par l'avocat avant toute utilisation.",
      definition: {
        title: "Qu'est-ce que la recherche juridique assistée par IA ?",
        body: "La recherche juridique assistée par IA utilise les grands modèles de langage pour aider les avocats à passer d'une question juridique à une analyse de travail. Au lieu de commencer par des recherches par mots-clés dans des bases de données, l'avocat décrit sa question en langage courant et reçoit une réponse structurée, de style recherche : les notions pertinentes, les textes probablement applicables, des pistes de raisonnement à tester. Il faut la comprendre comme un premier passage, pas un dernier. Les modèles de langage génèrent du texte plausible ; ils ne garantissent pas qu'un article, un arrêt ou une règle cités existent réellement ou disent ce que la réponse affirme. C'est pourquoi une recherche assistée sérieuse associe toujours la vitesse de génération à une étape de vérification, où l'avocat contrôle chaque référence dans les sources faisant autorité avant qu'elle n'entre dans un travail juridique.",
      },
      problem: {
        title: "Lente à démarrer, dangereuse à croire aveuglément",
        body: "La recherche traditionnelle a un problème de démarrage à froid : sur une question inhabituelle, les premières heures servent seulement à trouver le bon terrain — quels textes, quelles notions, quels termes chercher. Les chatbots bruts résolvent le démarrage à froid mais créent un problème pire : des réponses formulées avec assurance qui peuvent reposer sur des sources inventées ou mal lues — un risque qui a déjà embarrassé des avocats dans de vraies procédures. Les équipes juridiques sont coincées entre une méthode lente en laquelle elles ont confiance et une méthode rapide qu'elles ne peuvent pas croire. Ce qui manque, ce n'est pas un chatbot plus malin — c'est un flux de travail qui exploite la vitesse de l'IA en faisant de la vérification une étape structurelle, pas une vertu personnelle.",
      },
      approach: {
        title: "Comment la recherche fonctionne dans JURE",
        body: "Juria, l'assistant IA juridique de JURE, comprend un mode recherche dédié, en accès anticipé. Il répond aux questions juridiques dans un style de recherche, orienté vers le droit marocain, et a pour consigne de mentionner les sources juridiques sur lesquelles il s'appuie — des références que l'avocat vérifie ensuite, car JURE les traite délibérément comme des pistes, pas comme des preuves. Le projet d'analyse prend forme dans le même espace de travail que le dossier qu'il sert, et le flux de JURE place la relecture de l'avocat avant toute utilisation d'une conclusion. La recherche accélère ; la responsabilité reste où elle doit être.",
        points: [
          "Un mode recherche dédié dans Juria, en accès anticipé",
          "Des réponses de style recherche orientées vers le droit marocain",
          "Des réponses avec mention des sources juridiques — des pistes à vérifier par l'avocat",
          "Des projets d'analyse développés dans le même espace que le dossier",
          "La relecture de l'avocat avant toute conclusion utilisée",
        ],
      },
      workflow: {
        title: "De la question à l'analyse validée",
        steps: [
          "Formuler la question juridique",
          "La soumettre au mode recherche de Juria",
          "Lire le projet et ses sources mentionnées",
          "L'avocat vérifie les sources et corrige",
          "Finaliser l'analyse pour le dossier",
        ],
      },
      useCases: {
        title: "La recherche assistée en pratique",
        items: [
          {
            title: "Préparer la réponse à une consultation",
            body: "Un client pose une question aux confins du domaine habituel de l'avocat. Le mode recherche produit en quelques minutes une première cartographie structurée du sujet. L'avocat vérifie chaque texte mentionné, corrige le cadrage et transforme le projet en réponse de consultation fiable.",
          },
          {
            title: "Avant un rendez-vous client",
            body: "À une heure d'un rendez-vous, un avocat utilise le mode recherche pour rafraîchir les règles clés du sujet et anticiper les questions probables. Rien ne part chez le client sans vérification — mais l'avocat arrive orienté plutôt qu'à l'aveugle.",
          },
          {
            title: "La note de recherche d'un collaborateur, relue par un senior",
            body: "Un collaborateur rédige une note de recherche avec l'aide de Juria, en vérifiant chaque référence au fil de l'eau. L'avocat senior relit la note comme il l'a toujours fait — sauf que le collaborateur a passé son temps sur la vérification et l'analyse plutôt que sur la page blanche.",
          },
        ],
      },
      security: {
        title: "Les questions de recherche sont des informations clients",
        body: "Les questions qu'un cabinet recherche révèlent souvent exactement ce que traverse un client. Dans JURE, la recherche se fait dans l'espace isolé du cabinet plutôt que dans un chatbot grand public, et le contrôle d'accès par rôles régit qui, dans l'équipe, voit les dossiers auxquels la recherche se rapporte.",
      },
      faqs: [
        {
          question: "JURE remplace-t-il les bases de données juridiques et les sources officielles ?",
          answer:
            "Non. Le mode recherche de Juria aide à cadrer, s'orienter et rédiger — mais la vérification se fait dans les sources faisant autorité, comme elle l'a toujours été. Voyez-y un premier passage plus rapide, pas un remplacement des textes officiels et de la jurisprudence.",
        },
        {
          question: "Quelle est la fiabilité des réponses de recherche de Juria ?",
          answer:
            "Comme tout grand modèle de langage, Juria peut se tromper et produire des références inexactes ou inexistantes. C'est précisément pourquoi le flux de recherche de JURE fait de la vérification par l'avocat une étape structurelle : aucune réponse d'IA ne doit être utilisée avant qu'un avocat ne l'ait contrôlée dans les sources faisant autorité.",
        },
        {
          question: "Quelle juridiction le mode recherche couvre-t-il ?",
          answer:
            "Le mode recherche est orienté vers le droit marocain et répond dans un style de recherche. Quelle que soit la juridiction, ses résultats doivent être vérifiés dans les sources officielles avant usage.",
        },
        {
          question: "Peut-on se fier aux sources que Juria mentionne ?",
          answer:
            "Traitez-les comme des pistes, pas comme des citations. Juria a pour consigne de mentionner les sources juridiques derrière ses réponses, mais JURE ne propose pas de fonctionnalité de citations structurées, et chaque référence doit être vérifiée indépendamment par un avocat avant de figurer dans un travail juridique.",
        },
        {
          question: "Le mode recherche est-il disponible pour tout le monde ?",
          answer:
            "Le mode recherche fait partie de Juria, actuellement en accès anticipé. Il est déployé progressivement pour que nous puissions l'affiner avec des avocats en exercice avant la disponibilité générale.",
        },
      ],
      related: ["legalAi", "responsibleLegalAi", "legalKnowledgeManagement"],
      cta: {
        title: "Recherchez plus vite. Vérifiez toujours.",
        body: "Découvrez comment le mode recherche de Juria, en accès anticipé, transforme une question juridique en projet d'analyse — avec la relecture de l'avocat intégrée au flux de travail, pas laissée au hasard.",
      },
    },
    ar: {
      h1: "بحث قانوني بمساعدة الذكاء الاصطناعي، والمحامي هو المتحكم",
      intro:
        "يستطيع الذكاء الاصطناعي ضغط الساعات الأولى من البحث القانوني في دقائق — ويستطيع أيضًا اختلاق مراجع لا وجود لها. تشرح هذه الصفحة كيف يعمل البحث بمساعدة الذكاء الاصطناعي فعليًا، وأين حدوده، وكيف صُمم وضع البحث في JURE حول خطوة غير قابلة للتفاوض: تحقق المحامي قبل الاعتماد على أي شيء.",
      definition: {
        title: "ما هو البحث القانوني بمساعدة الذكاء الاصطناعي؟",
        body: "البحث القانوني بمساعدة الذكاء الاصطناعي يستخدم النماذج اللغوية الكبيرة لمساعدة المحامين على الانتقال من سؤال قانوني إلى تحليل عملي. فبدل البدء بالبحث بالكلمات المفتاحية في قواعد البيانات، يصف المحامي سؤاله بلغة عادية ويتلقى إجابة منظمة بأسلوب بحثي: المفاهيم ذات الصلة، والنصوص المرجح انطباقها، وخطوط استدلال تُختبر. وأفضل فهم له أنه مرور أول، لا أخير. فالنماذج اللغوية تولّد نصًا معقولًا في ظاهره؛ لكنها لا تضمن أن الفصل أو الحكم أو القاعدة المذكورة موجودة فعلًا أو تقول ما تدعيه الإجابة. لهذا يقرن البحثُ الجاد بمساعدة الذكاء الاصطناعي سرعةَ التوليد دائمًا بخطوة تحقق، يراجع فيها المحامي كل مرجع في المصادر الموثوقة قبل أن يدخل أي عمل قانوني.",
      },
      problem: {
        title: "بطيء في الانطلاق، خطير عند الثقة العمياء",
        body: "للبحث التقليدي مشكلة انطلاقة باردة: ففي مسألة غير مألوفة، تذهب الساعات الأولى لمجرد إيجاد الأرضية الصحيحة — أي النصوص وأي المفاهيم وأي المصطلحات تُبحث. تحل روبوتات المحادثة الخام مشكلة الانطلاقة لكنها تخلق مشكلة أسوأ: إجابات واثقة الصياغة قد تستند إلى مراجع مختلقة أو مقروءة خطأً — وهو خطر أحرج محامين فعلًا في إجراءات حقيقية. فتجد الفرق القانونية نفسها بين طريقة بطيئة تثق بها وطريقة سريعة لا تستطيع تصديقها. والمفقود ليس روبوتًا أذكى — بل مسار عمل يستثمر سرعة الذكاء الاصطناعي ويجعل التحقق خطوة بنيوية لا فضيلة شخصية.",
      },
      approach: {
        title: "كيف يعمل البحث في JURE",
        body: "يتضمن جوريا، مساعد JURE للذكاء الاصطناعي القانوني، وضع بحث مخصصًا في مرحلة الوصول المبكر. يجيب عن الأسئلة القانونية بأسلوب بحثي، موجهًا نحو القانون المغربي، وهو موجَّه للإشارة إلى المصادر القانونية التي يستند إليها — مراجع يتحقق منها المحامي بعد ذلك، لأن JURE تتعامل معها عمدًا كخيوط بحث لا كأدلة. تتشكل مسودة التحليل داخل مساحة العمل نفسها التي تضم الملف الذي تخدمه، ويضع مسار عمل JURE مراجعة المحامي قبل استخدام أي استنتاج. يتسارع البحث؛ وتبقى المسؤولية حيث يجب أن تكون.",
        points: [
          "وضع بحث مخصص في جوريا، في مرحلة الوصول المبكر",
          "إجابات بأسلوب بحثي موجهة نحو القانون المغربي",
          "إجابات موجَّهة للإشارة إلى المصادر القانونية — كخيوط يتحقق منها المحامي",
          "مسودات تحليل تتطور في مساحة العمل نفسها مع الملف",
          "مراجعة المحامي قبل الاعتماد على أي استنتاج",
        ],
      },
      workflow: {
        title: "من السؤال إلى تحليل مُراجَع",
        steps: [
          "صِغ السؤال القانوني",
          "شغّله في وضع البحث في جوريا",
          "اقرأ المسودة ومصادرها المذكورة",
          "يتحقق المحامي من المصادر ويصحح",
          "أنجز التحليل النهائي للملف",
        ],
      },
      useCases: {
        title: "البحث بمساعدة الذكاء الاصطناعي عمليًا",
        items: [
          {
            title: "إعداد جواب استشارة",
            body: "يطرح عميل سؤالًا على حافة مجال الممارسة المعتاد للمحامي. ينتج وضع البحث في دقائق خريطة أولى منظمة للمسألة. يتحقق المحامي من كل نص مذكور، ويصحح التأطير، ويحوّل المسودة إلى جواب استشارة موثوق.",
          },
          {
            title: "قبل اجتماع مع عميل",
            body: "قبل ساعة من الاجتماع، يستخدم المحامي وضع البحث لتحديث معرفته بالقواعد الأساسية للموضوع وتوقع الأسئلة المحتملة. لا شيء يصل إلى العميل دون تحقق — لكن المحامي يدخل الاجتماع متمكنًا لا مخمنًا.",
          },
          {
            title: "مذكرة بحث لمتعاون يراجعها محامٍ أقدم",
            body: "يحرر محامٍ متعاون مذكرة بحث بمساعدة جوريا، متحققًا من كل مرجع أولًا بأول. يراجع المحامي الأقدم المذكرة كعادته — غير أن المتعاون أنفق وقته في التحقق والتحليل بدل الصفحة البيضاء.",
          },
        ],
      },
      security: {
        title: "أسئلة البحث معلومات عن الموكلين",
        body: "الأسئلة التي يبحثها المكتب كثيرًا ما تكشف بالضبط ما يواجهه الموكل. في JURE، يجري البحث داخل مساحة المكتب المعزولة لا في روبوت محادثة عام، ويحكم التحكم في الوصول حسب الأدوار من في الفريق يرى الملفات التي يتعلق بها البحث.",
      },
      faqs: [
        {
          question: "هل تحل JURE محل قواعد البيانات القانونية والمصادر الرسمية؟",
          answer:
            "لا. يساعدك وضع البحث في جوريا على التأطير والاستئناس والصياغة — أما التحقق فيجري في المصادر الموثوقة كما كان دائمًا. اعتبره مرورًا أول أسرع، لا بديلًا عن النصوص الرسمية والاجتهاد القضائي.",
        },
        {
          question: "ما مدى دقة إجابات البحث في جوريا؟",
          answer:
            "كسائر النماذج اللغوية الكبيرة، قد يخطئ جوريا وقد ينتج مراجع غير دقيقة أو غير موجودة. ولهذا بالتحديد يجعل مسار البحث في JURE تحققَ المحامي خطوة بنيوية: لا ينبغي الاعتماد على أي إجابة ذكاء اصطناعي قبل أن يراجعها محامٍ في المصادر الموثوقة.",
        },
        {
          question: "أي قانون يغطيه وضع البحث؟",
          answer:
            "وضع البحث موجه نحو القانون المغربي ويجيب بأسلوب بحثي. وأيًا كانت الولاية القضائية، يجب التحقق من مخرجاته في المصادر الرسمية قبل الاستخدام.",
        },
        {
          question: "هل يمكن الوثوق بالمصادر التي يذكرها جوريا؟",
          answer:
            "تعامل معها كخيوط بحث لا كاستشهادات. جوريا موجَّه للإشارة إلى المصادر القانونية وراء إجاباته، لكن JURE لا تقدم خاصية استشهادات منظمة، ويجب أن يتحقق محامٍ من كل مرجع على حدة قبل أن يظهر في أي عمل قانوني.",
        },
        {
          question: "هل وضع البحث متاح للجميع؟",
          answer:
            "وضع البحث جزء من جوريا، وهو حاليًا في مرحلة الوصول المبكر. يُطرح تدريجيًا لنصقله مع محامين ممارسين قبل الإتاحة العامة.",
        },
      ],
      related: ["legalAi", "responsibleLegalAi", "legalKnowledgeManagement"],
      cta: {
        title: "ابحث أسرع. وتحقق دائمًا.",
        body: "اكتشف كيف يحوّل وضع البحث في جوريا، في مرحلة الوصول المبكر، سؤالًا قانونيًا إلى مسودة تحليل — مع مراجعة المحامي مدمجة في مسار العمل، لا متروكة للصدفة.",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Legal document management
  // ---------------------------------------------------------------------------
  legalDocumentManagement: {
    en: {
      h1: "A secure library for the documents your practice runs on",
      intro:
        "Legal work produces documents constantly — contracts, pleadings, correspondence, evidence — and loses them just as constantly to inboxes and shared drives. JURE gives the firm one secure document library: organized with categories and tags, previewable in the browser, and attachable directly to the matters the documents belong to.",
      definition: {
        title: "What is legal document management software?",
        body: "Legal document management software gives a firm a single, controlled place to store, organize and retrieve its documents. Three things distinguish it from a generic shared drive. First, structure designed for legal work: documents are classified with categories and tags, described with titles and descriptions, and connected to the matters and clients they concern. Second, retrieval: a lawyer looking for a document searches by what it is about, not by remembering which folder someone chose two years ago. Third, control: because legal documents are almost always confidential, access is governed by the firm's own permission rules rather than by whoever happens to hold a link. The goal is simple — any authorized person finds the right document in seconds, and nobody else finds it at all.",
      },
      problem: {
        title: "Where firm documents actually live today",
        body: "In most practices, documents live where they landed: attached to an email, saved to a desktop, dropped in a shared drive folder whose logic only its creator understands. The consequences are familiar. Finding a document means asking the person who filed it. Sending the wrong attachment is one misclick away. Confidential files sit in personal inboxes with no access rules at all. And when someone leaves the firm, their filing system leaves with them. The problem is not carelessness — it is that email and generic drives were never designed to be a law firm's document system.",
      },
      approach: {
        title: "How JURE's document library works",
        body: "JURE gives each firm a secure document library scoped to its own workspace. Documents are uploaded once, organized with categories and tags, and described with a title and description that power search. PDF, DOCX, image and video files preview directly in the browser, so checking a document does not mean downloading it. Documents attach directly to matters, keeping each file next to the tasks and deadlines it relates to, and files can be shared into team conversations. Role-based access control governs who sees what — and the library is internal to the firm's team.",
        points: [
          "Upload once, organize with categories and tags",
          "Search by title and description",
          "Preview PDF, DOCX, images and video in the browser",
          "Attach documents directly to matters",
          "Share files into team conversations",
        ],
      },
      workflow: {
        title: "A document's life in JURE",
        steps: [
          "Upload the document",
          "Categorize and tag it",
          "Preview it without downloading",
          "Attach it to the matter",
          "Find it later by title, tag or category",
        ],
      },
      useCases: {
        title: "Document management in practice",
        items: [
          {
            title: "An incoming contract from a client",
            body: "A client emails a signed contract. Instead of living in one lawyer's inbox, it is uploaded to the library, tagged, given a clear title and attached to the client's matter — visible to the assigned team from that moment on.",
          },
          {
            title: "Building the firm's collection of models",
            body: "The firm gathers its best clauses, model contracts and standard pleadings into the library under dedicated categories. The next time a similar matter opens, the starting document is a search away instead of a memory away.",
          },
          {
            title: "Finding the precedent from last year",
            body: "An associate needs the submission the firm drafted in a similar case last year. Because it was titled, described and tagged when filed, a search on those terms finds it in seconds — with an in-browser preview to confirm it is the right one.",
          },
        ],
      },
      security: {
        title: "Documents are the most confidential thing a firm holds",
        body: "The document library is isolated per firm: no document is ever visible outside your workspace. Within the firm, role-based access control decides who can view and manage documents, and the library is designed for the internal team — there is no external sharing surface to misconfigure.",
      },
      faqs: [
        {
          question: "Which file types can be previewed in JURE?",
          answer:
            "PDF and DOCX documents, images and video files preview directly in the browser, so the team can check a document's contents without downloading it.",
        },
        {
          question: "How does document search work in JURE?",
          answer:
            "Search works on document titles and descriptions, combined with the categories and tags you assign. That makes the quality of naming and tagging worth the few seconds it takes — a well-described document is findable by anyone on the team, not just the person who filed it.",
        },
        {
          question: "Does JURE offer document versioning?",
          answer:
            "No — JURE does not offer document versioning today. Each document in the library is a single file with its title, description, categories and tags.",
        },
        {
          question: "Can documents be shared with clients or people outside the firm?",
          answer:
            "No. The document library is internal to your firm's team. Documents can be attached to matters and shared into team conversations, but there is no client portal or external sharing.",
        },
        {
          question: "Who controls access to the firm's documents?",
          answer:
            "Your firm does. Documents are scoped to your firm's isolated workspace, and role-based access control — from owner to viewer — governs what each team member can see and manage.",
        },
      ],
      related: ["legalKnowledgeManagement", "legalCaseManagement", "legalPracticeManagement"],
      cta: {
        title: "Give the firm's documents one secure home",
        body: "See how the JURE library organizes, previews and protects your documents — and connects each one to the matter it belongs to.",
      },
    },
    fr: {
      h1: "Une bibliothèque sécurisée pour les documents qui font tourner le cabinet",
      intro:
        "Le travail juridique produit des documents en permanence — contrats, conclusions, correspondances, pièces — et les perd tout aussi constamment dans les boîtes mail et les disques partagés. JURE donne au cabinet une seule bibliothèque documentaire sécurisée : organisée par catégories et tags, prévisualisable dans le navigateur, et rattachable directement aux dossiers auxquels les documents appartiennent.",
      definition: {
        title: "Qu'est-ce qu'un logiciel de gestion documentaire juridique ?",
        body: "Un logiciel de gestion documentaire juridique donne au cabinet un lieu unique et contrôlé pour stocker, organiser et retrouver ses documents. Trois choses le distinguent d'un disque partagé générique. D'abord, une structure pensée pour le travail juridique : les documents sont classés par catégories et tags, décrits par des titres et descriptions, et reliés aux dossiers et clients qu'ils concernent. Ensuite, la recherche : un avocat qui cherche un document interroge ce dont il traite, sans devoir se rappeler quel dossier quelqu'un a choisi il y a deux ans. Enfin, le contrôle : les documents juridiques étant presque toujours confidentiels, l'accès est régi par les règles de permission du cabinet plutôt que par quiconque détient un lien. L'objectif est simple — toute personne autorisée trouve le bon document en quelques secondes, et personne d'autre ne le trouve du tout.",
      },
      problem: {
        title: "Où vivent réellement les documents du cabinet aujourd'hui",
        body: "Dans la plupart des cabinets, les documents vivent là où ils ont atterri : en pièce jointe d'un e-mail, sauvegardés sur un bureau, déposés dans un dossier partagé dont seul son créateur comprend la logique. Les conséquences sont connues. Trouver un document, c'est demander à celui qui l'a classé. Envoyer la mauvaise pièce jointe est à un clic de distance. Des fichiers confidentiels dorment dans des boîtes personnelles sans aucune règle d'accès. Et quand quelqu'un quitte le cabinet, son système de classement part avec lui. Le problème n'est pas la négligence — c'est que l'e-mail et les disques génériques n'ont jamais été conçus pour être le système documentaire d'un cabinet.",
      },
      approach: {
        title: "Comment fonctionne la bibliothèque JURE",
        body: "JURE donne à chaque cabinet une bibliothèque documentaire sécurisée, cloisonnée dans son propre espace. Les documents sont importés une fois, organisés par catégories et tags, et décrits par un titre et une description qui alimentent la recherche. Les fichiers PDF, DOCX, images et vidéos se prévisualisent directement dans le navigateur : vérifier un document ne veut plus dire le télécharger. Les documents se rattachent directement aux dossiers, chaque fichier restant à côté des tâches et échéances auxquelles il se rapporte, et les fichiers se partagent dans les conversations d'équipe. Le contrôle d'accès par rôles régit qui voit quoi — et la bibliothèque est interne à l'équipe du cabinet.",
        points: [
          "Importer une fois, organiser par catégories et tags",
          "Rechercher par titre et description",
          "Prévisualiser PDF, DOCX, images et vidéos dans le navigateur",
          "Rattacher les documents directement aux dossiers",
          "Partager les fichiers dans les conversations d'équipe",
        ],
      },
      workflow: {
        title: "La vie d'un document dans JURE",
        steps: [
          "Importer le document",
          "Le catégoriser et le taguer",
          "Le prévisualiser sans le télécharger",
          "Le rattacher au dossier",
          "Le retrouver par titre, tag ou catégorie",
        ],
      },
      useCases: {
        title: "La gestion documentaire en pratique",
        items: [
          {
            title: "Un contrat entrant envoyé par un client",
            body: "Un client envoie un contrat signé par e-mail. Au lieu de rester dans la boîte d'un seul avocat, il est importé dans la bibliothèque, tagué, doté d'un titre clair et rattaché au dossier du client — visible dès cet instant par l'équipe assignée.",
          },
          {
            title: "Constituer la collection de modèles du cabinet",
            body: "Le cabinet rassemble ses meilleures clauses, contrats types et actes standards dans la bibliothèque, sous des catégories dédiées. À l'ouverture du prochain dossier similaire, le document de départ est à une recherche de distance, pas à une mémoire de distance.",
          },
          {
            title: "Retrouver le précédent de l'an dernier",
            body: "Un collaborateur a besoin des conclusions rédigées par le cabinet dans une affaire similaire l'an dernier. Parce qu'elles ont été titrées, décrites et taguées au classement, une recherche sur ces termes les retrouve en secondes — avec une prévisualisation dans le navigateur pour confirmer que c'est le bon document.",
          },
        ],
      },
      security: {
        title: "Les documents sont ce qu'un cabinet détient de plus confidentiel",
        body: "La bibliothèque documentaire est isolée par cabinet : aucun document n'est jamais visible hors de votre espace. Au sein du cabinet, le contrôle d'accès par rôles décide qui peut consulter et gérer les documents, et la bibliothèque est conçue pour l'équipe interne — il n'existe aucune surface de partage externe à mal configurer.",
      },
      faqs: [
        {
          question: "Quels types de fichiers peuvent être prévisualisés dans JURE ?",
          answer:
            "Les documents PDF et DOCX, les images et les fichiers vidéo se prévisualisent directement dans le navigateur, pour que l'équipe vérifie le contenu d'un document sans le télécharger.",
        },
        {
          question: "Comment fonctionne la recherche de documents dans JURE ?",
          answer:
            "La recherche porte sur les titres et descriptions des documents, combinés aux catégories et tags que vous attribuez. La qualité du nommage et du tagage vaut donc les quelques secondes qu'elle demande — un document bien décrit est retrouvable par toute l'équipe, pas seulement par celui qui l'a classé.",
        },
        {
          question: "JURE propose-t-il la gestion des versions de documents ?",
          answer:
            "Non — JURE ne propose pas de gestion des versions aujourd'hui. Chaque document de la bibliothèque est un fichier unique avec son titre, sa description, ses catégories et ses tags.",
        },
        {
          question: "Peut-on partager des documents avec des clients ou des personnes extérieures ?",
          answer:
            "Non. La bibliothèque documentaire est interne à l'équipe de votre cabinet. Les documents peuvent être rattachés aux dossiers et partagés dans les conversations d'équipe, mais il n'existe ni portail client ni partage externe.",
        },
        {
          question: "Qui contrôle l'accès aux documents du cabinet ?",
          answer:
            "Votre cabinet. Les documents sont cloisonnés dans l'espace isolé de votre cabinet, et le contrôle d'accès par rôles — du propriétaire au lecteur — régit ce que chaque membre peut voir et gérer.",
        },
      ],
      related: ["legalKnowledgeManagement", "legalCaseManagement", "legalPracticeManagement"],
      cta: {
        title: "Donnez aux documents du cabinet un seul foyer sécurisé",
        body: "Découvrez comment la bibliothèque JURE organise, prévisualise et protège vos documents — et relie chacun au dossier auquel il appartient.",
      },
    },
    ar: {
      h1: "مكتبة آمنة للمستندات التي يقوم عليها عمل المكتب",
      intro:
        "ينتج العمل القانوني المستندات باستمرار — عقودًا ومذكرات ومراسلات ووثائق إثبات — ويفقدها باستمرار أيضًا في صناديق البريد والأقراص المشتركة. تمنح JURE المكتب مكتبة مستندات آمنة واحدة: منظمة بالفئات والوسوم، قابلة للمعاينة في المتصفح، وقابلة للإرفاق مباشرة بالملفات التي تنتمي إليها.",
      definition: {
        title: "ما هو برنامج إدارة المستندات القانونية؟",
        body: "برنامج إدارة المستندات القانونية يمنح المكتب مكانًا واحدًا مضبوطًا لتخزين مستنداته وتنظيمها واسترجاعها. ثلاثة أمور تميزه عن القرص المشترك العادي. أولًا، بنية مصممة للعمل القانوني: تُصنّف المستندات بالفئات والوسوم، وتوصف بالعناوين والأوصاف، وتُربط بالملفات والعملاء الذين تخصهم. ثانيًا، الاسترجاع: فالمحامي الباحث عن مستند يبحث بموضوعه، لا بتذكر أي مجلد اختاره أحدهم قبل سنتين. ثالثًا، الضبط: فلأن المستندات القانونية سرية في الغالب، يُحكم الوصول إليها بقواعد صلاحيات المكتب نفسه لا بمن يصادف أن بيده رابط. والهدف بسيط — أن يجد أي شخص مخوَّل المستند الصحيح في ثوانٍ، وألا يجده أحد سواه إطلاقًا.",
      },
      problem: {
        title: "أين تعيش مستندات المكتب فعليًا اليوم",
        body: "في معظم المكاتب، تعيش المستندات حيث حطّت: مرفقة برسالة بريد، أو محفوظة على سطح مكتب، أو ملقاة في مجلد مشترك لا يفهم منطقه إلا من أنشأه. والعواقب مألوفة. العثور على مستند يعني سؤال من أرشفه. وإرسال المرفق الخطأ على بعد نقرة واحدة. وملفات سرية قابعة في صناديق بريد شخصية دون أي قواعد وصول. وحين يغادر أحدهم المكتب، يغادر نظامُ تصنيفه معه. المشكلة ليست الإهمال — بل أن البريد والأقراص العامة لم تُصمم يومًا لتكون النظام الوثائقي لمكتب محاماة.",
      },
      approach: {
        title: "كيف تعمل مكتبة المستندات في JURE",
        body: "تمنح JURE كل مكتب مكتبة مستندات آمنة محصورة في مساحته الخاصة. تُرفع المستندات مرة واحدة، وتُنظم بالفئات والوسوم، وتوصف بعنوان ووصف يغذيان البحث. وتُعاين ملفات PDF وDOCX والصور والفيديو مباشرة في المتصفح، فلا تعود مراجعة مستند تعني تنزيله. وتُرفق المستندات مباشرة بالملفات، فيبقى كل ملف بجوار المهام والآجال التي يتعلق بها، ويمكن مشاركة الملفات في محادثات الفريق. ويحكم التحكم في الوصول حسب الأدوار من يرى ماذا — والمكتبة داخلية لفريق المكتب.",
        points: [
          "ارفع مرة واحدة، ونظّم بالفئات والوسوم",
          "ابحث بالعنوان والوصف",
          "عاين PDF وDOCX والصور والفيديو في المتصفح",
          "أرفق المستندات مباشرة بالملفات",
          "شارك الملفات في محادثات الفريق",
        ],
      },
      workflow: {
        title: "حياة المستند في JURE",
        steps: [
          "ارفع المستند",
          "صنّفه وضَع له الوسوم",
          "عاينه دون تنزيل",
          "أرفقه بالملف",
          "اعثر عليه لاحقًا بالعنوان أو الوسم أو الفئة",
        ],
      },
      useCases: {
        title: "إدارة المستندات عمليًا",
        items: [
          {
            title: "عقد وارد من عميل",
            body: "يرسل عميل عقدًا موقعًا بالبريد الإلكتروني. بدل أن يبقى في صندوق محامٍ واحد، يُرفع إلى المكتبة، ويوسم، ويُمنح عنوانًا واضحًا، ويُرفق بملف العميل — فيراه الفريق المعين منذ تلك اللحظة.",
          },
          {
            title: "بناء مجموعة نماذج المكتب",
            body: "يجمع المكتب أفضل بنوده وعقوده النموذجية ومذكراته المعيارية في المكتبة تحت فئات مخصصة. وعند فتح الملف المشابه التالي، يكون مستند الانطلاق على بعد بحث واحد، لا على بعد ذاكرة أحدهم.",
          },
          {
            title: "العثور على سابقة العام الماضي",
            body: "يحتاج محامٍ متعاون إلى المذكرة التي حررها المكتب في قضية مشابهة العام الماضي. ولأنها عُنونت ووُصفت ووُسمت عند الأرشفة، يجدها البحث بتلك المصطلحات في ثوانٍ — مع معاينة في المتصفح للتأكد أنها المستند الصحيح.",
          },
        ],
      },
      security: {
        title: "المستندات أكثر ما يحوزه المكتب سرية",
        body: "مكتبة المستندات معزولة لكل مكتب: لا يكون أي مستند مرئيًا خارج مساحة عملك أبدًا. وداخل المكتب، يقرر التحكم في الوصول حسب الأدوار من يستطيع الاطلاع على المستندات وإدارتها، والمكتبة مصممة للفريق الداخلي — فلا توجد واجهة مشاركة خارجية يمكن أن تُضبط خطأً.",
      },
      faqs: [
        {
          question: "ما أنواع الملفات التي يمكن معاينتها في JURE؟",
          answer:
            "تُعاين مستندات PDF وDOCX والصور وملفات الفيديو مباشرة في المتصفح، ليتحقق الفريق من محتوى المستند دون تنزيله.",
        },
        {
          question: "كيف يعمل البحث عن المستندات في JURE؟",
          answer:
            "يعمل البحث على عناوين المستندات وأوصافها، مقترنة بالفئات والوسوم التي تحددها. لذا تستحق جودة التسمية والوسم الثواني القليلة التي تتطلبها — فالمستند الموصوف جيدًا يجده أي عضو في الفريق، لا من أرشفه فقط.",
        },
        {
          question: "هل تقدم JURE إدارة إصدارات للمستندات؟",
          answer:
            "لا — لا تقدم JURE إدارة إصدارات للمستندات اليوم. كل مستند في المكتبة ملف واحد بعنوانه ووصفه وفئاته ووسومه.",
        },
        {
          question: "هل يمكن مشاركة المستندات مع العملاء أو جهات خارج المكتب؟",
          answer:
            "لا. مكتبة المستندات داخلية لفريق مكتبك. يمكن إرفاق المستندات بالملفات ومشاركتها في محادثات الفريق، لكن لا توجد بوابة عملاء ولا مشاركة خارجية.",
        },
        {
          question: "من يتحكم في الوصول إلى مستندات المكتب؟",
          answer:
            "مكتبك أنت. فالمستندات محصورة في مساحة مكتبك المعزولة، والتحكم في الوصول حسب الأدوار — من المالك إلى المطالع — يحكم ما يراه ويديره كل عضو.",
        },
      ],
      related: ["legalKnowledgeManagement", "legalCaseManagement", "legalPracticeManagement"],
      cta: {
        title: "امنح مستندات المكتب بيتًا آمنًا واحدًا",
        body: "اكتشف كيف تنظم مكتبة JURE مستنداتك وتعاينها وتحميها — وتربط كل واحد منها بالملف الذي ينتمي إليه.",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Legal operations
  // ---------------------------------------------------------------------------
  legalOperations: {
    en: {
      h1: "Legal operations: shared visibility over all the legal work",
      intro:
        "Legal operations is the discipline of running legal work like a system: who is doing what, what is due when, and how the team's capacity is spent. JURE provides the operational layer — shared calendar, structured tasks, consistent matter types, roles and practice finance — that makes that visibility real.",
      definition: {
        title: "What is legal operations?",
        body: "Legal operations (often shortened to legal ops) is the practice of managing the business side of legal work: processes, workload, deadlines, tools, knowledge and budget. It grew out of corporate legal departments but applies equally to law firms — anywhere legal work must be planned, distributed and tracked across more than one person. Where a lawyer asks \"what does the law require here?\", legal ops asks \"how does this work get done reliably?\": how matters are opened and structured, how tasks are assigned and prioritized, how deadlines are tracked so nothing depends on one person's memory, and how leadership sees workload and cost. Good legal ops does not bureaucratize legal work; it removes the invisible frictions that make good lawyers slow.",
      },
      problem: {
        title: "Legal work without an operational layer",
        body: "In many teams, the operational state of legal work lives nowhere: it is distributed across inboxes, personal task lists and the memory of senior lawyers. The symptoms are predictable. Workload is invisible, so one associate drowns while another waits for assignments. Deadlines surface as emergencies rather than plans. Every status question costs an interruption. And leadership decisions — hiring, pricing, prioritization — are made on impressions rather than on what the work actually shows. The team is full of competent people; what is missing is a shared operational picture they can all see.",
      },
      approach: {
        title: "JURE as the operational layer",
        body: "JURE gives legal teams the operational picture in the same platform as the work itself. A calendar shared across the firm holds appointments and deadlines. Tasks carry priorities, due dates and assignees, so distribution of work is explicit rather than remembered. Matters follow a consistent structure — litigation, consultation, administrative — which makes them comparable and reviewable. Role-based access, from owner to viewer, maps the tool to how the team actually delegates. And for owners and admins, practice finance adds invoices, payments, fees and dashboards to the same picture.",
        points: [
          "A shared team calendar for appointments and deadlines",
          "Tasks with priorities, due dates and assignees",
          "Consistent matter structure: litigation, consultation, administrative",
          "Role-based access from owner to viewer",
          "Practice finance and dashboards for owners and admins",
        ],
      },
      workflow: {
        title: "An operational rhythm in JURE",
        steps: [
          "Structure matters by type",
          "Plan the work as dated, prioritized tasks",
          "Assign tasks across the team",
          "Track progress on the shared calendar",
          "Review finance and dashboards (owner/admin)",
        ],
      },
      useCases: {
        title: "Legal operations in practice",
        items: [
          {
            title: "A legal department gaining visibility",
            body: "A corporate legal team handles requests from across the company with no shared view of what is in flight. Structuring each request as a matter with tasks and deadlines in JURE turns the invisible queue into a visible one — reviewable in one place instead of reconstructed from inboxes.",
          },
          {
            title: "Balancing workload across associates",
            body: "Because every task in JURE has an assignee, a priority and a due date, a supervising lawyer can see how work is distributed before reassigning it — instead of discovering the imbalance when someone burns out or a deadline slips.",
          },
          {
            title: "Deadline governance across the firm",
            body: "Instead of each lawyer tracking dates privately, all deadlines live on the firm's shared calendar with reminders and notifications. The firm gains a single answer to the operational question that matters most: what is due, and when.",
          },
        ],
      },
      security: {
        title: "Operational visibility without oversharing",
        body: "Shared visibility does not mean everyone sees everything. JURE's role-based access control — from owner to viewer — lets the firm decide who sees which matters, documents and financial data, all within a workspace isolated to the firm itself.",
      },
      faqs: [
        {
          question: "Is legal operations only relevant for large teams?",
          answer:
            "No. Even a two-lawyer practice benefits from explicit tasks, a shared calendar and consistent matter structure. Legal ops is not about headcount — it is about whether the state of the work is visible or trapped in people's heads.",
        },
        {
          question: "What does JURE give someone responsible for legal operations?",
          answer:
            "One place to see the operational state of the team's work: matters structured by type, tasks with assignees, priorities and due dates, deadlines on a shared calendar — and, for owners and admins, practice finance with invoices, payments, fees and dashboards.",
        },
        {
          question: "Does JURE include reporting or dashboards?",
          answer:
            "JURE includes dashboards as part of practice finance, restricted to owner and admin roles, covering invoices, payments and fees. Day-to-day operational visibility comes from the shared calendar and the task and matter views the whole team works in.",
        },
        {
          question: "Does JURE integrate with other tools?",
          answer:
            "Not today. JURE's approach is to reduce the number of tools legal work needs by bringing matters, tasks, calendar, documents, collaboration and finance into one platform. Notifications reach the team in-app and by email.",
        },
        {
          question: "How does JURE help standardize how the team works?",
          answer:
            "By giving the work a consistent shape: every matter has a type, a client and a team; every task has an assignee, a priority and a due date; every deadline lives on the shared calendar. Standardization comes from the structure, not from a policy document nobody reads.",
        },
      ],
      related: ["legalPracticeManagement", "legalCaseManagement", "legalKnowledgeManagement"],
      cta: {
        title: "Make the state of the work visible",
        body: "See how JURE's calendar, tasks, matter structure and roles give your team one shared operational picture of its legal work.",
      },
    },
    fr: {
      h1: "Legal operations : une visibilité partagée sur tout le travail juridique",
      intro:
        "Les legal operations, c'est la discipline qui consiste à faire fonctionner le travail juridique comme un système : qui fait quoi, qu'est-ce qui échoit quand, et comment la capacité de l'équipe est employée. JURE fournit la couche opérationnelle — agenda partagé, tâches structurées, types de dossiers cohérents, rôles et finance du cabinet — qui rend cette visibilité réelle.",
      definition: {
        title: "Qu'est-ce que les legal operations ?",
        body: "Les legal operations (ou legal ops) désignent la gestion du versant opérationnel du travail juridique : processus, charge de travail, échéances, outils, connaissances et budget. Nées dans les directions juridiques d'entreprise, elles s'appliquent tout autant aux cabinets — partout où le travail juridique doit être planifié, réparti et suivi entre plusieurs personnes. Là où l'avocat demande « qu'exige le droit ici ? », les legal ops demandent « comment ce travail se fait-il de manière fiable ? » : comment les dossiers sont ouverts et structurés, comment les tâches sont assignées et priorisées, comment les échéances sont suivies pour que rien ne dépende de la mémoire d'une seule personne, et comment la direction voit la charge et les coûts. De bonnes legal ops ne bureaucratisent pas le travail juridique ; elles suppriment les frictions invisibles qui ralentissent les bons avocats.",
      },
      problem: {
        title: "Le travail juridique sans couche opérationnelle",
        body: "Dans beaucoup d'équipes, l'état opérationnel du travail juridique ne vit nulle part : il est dispersé entre boîtes mail, listes de tâches personnelles et mémoire des avocats seniors. Les symptômes sont prévisibles. La charge est invisible : un collaborateur se noie pendant qu'un autre attend des missions. Les échéances surgissent en urgences plutôt qu'en plans. Chaque question d'avancement coûte une interruption. Et les décisions de direction — recrutement, tarification, priorisation — se prennent sur des impressions plutôt que sur ce que montre réellement le travail. L'équipe est pleine de gens compétents ; ce qui manque, c'est une image opérationnelle partagée que tous peuvent voir.",
      },
      approach: {
        title: "JURE comme couche opérationnelle",
        body: "JURE donne aux équipes juridiques l'image opérationnelle sur la même plateforme que le travail lui-même. Un agenda partagé à l'échelle du cabinet porte rendez-vous et échéances. Les tâches ont des priorités, des dates limites et des assignés : la répartition du travail est explicite plutôt que mémorisée. Les dossiers suivent une structure cohérente — contentieux, consultation, administratif — qui les rend comparables et supervisables. L'accès par rôles, du propriétaire au lecteur, calque l'outil sur la manière dont l'équipe délègue réellement. Et pour les propriétaires et administrateurs, la finance du cabinet ajoute factures, paiements, honoraires et tableaux de bord à la même image.",
        points: [
          "Un agenda d'équipe partagé pour rendez-vous et échéances",
          "Des tâches avec priorités, dates limites et assignés",
          "Une structure de dossiers cohérente : contentieux, consultation, administratif",
          "Un accès par rôles, du propriétaire au lecteur",
          "Finance du cabinet et tableaux de bord pour propriétaires et administrateurs",
        ],
      },
      workflow: {
        title: "Un rythme opérationnel dans JURE",
        steps: [
          "Structurer les dossiers par type",
          "Planifier le travail en tâches datées et priorisées",
          "Assigner les tâches dans l'équipe",
          "Suivre l'avancement sur l'agenda partagé",
          "Passer en revue finance et tableaux de bord (propriétaire/admin)",
        ],
      },
      useCases: {
        title: "Les legal operations en pratique",
        items: [
          {
            title: "Une direction juridique qui gagne en visibilité",
            body: "Une équipe juridique d'entreprise traite les demandes de toute la société sans vue partagée de ce qui est en cours. Structurer chaque demande en dossier avec tâches et échéances dans JURE transforme la file invisible en file visible — supervisable en un seul endroit au lieu d'être reconstituée depuis les boîtes mail.",
          },
          {
            title: "Équilibrer la charge entre collaborateurs",
            body: "Parce que chaque tâche dans JURE a un assigné, une priorité et une date limite, un avocat superviseur voit comment le travail est réparti avant de le réassigner — au lieu de découvrir le déséquilibre quand quelqu'un s'épuise ou qu'une échéance glisse.",
          },
          {
            title: "La gouvernance des échéances à l'échelle du cabinet",
            body: "Au lieu que chaque avocat suive ses dates en privé, toutes les échéances vivent sur l'agenda partagé du cabinet avec rappels et notifications. Le cabinet gagne une réponse unique à la question opérationnelle qui compte le plus : qu'est-ce qui échoit, et quand.",
          },
        ],
      },
      security: {
        title: "La visibilité opérationnelle sans surpartage",
        body: "Visibilité partagée ne veut pas dire que tout le monde voit tout. Le contrôle d'accès par rôles de JURE — du propriétaire au lecteur — laisse le cabinet décider qui voit quels dossiers, documents et données financières, le tout dans un espace isolé au cabinet lui-même.",
      },
      faqs: [
        {
          question: "Les legal operations ne concernent-elles que les grandes équipes ?",
          answer:
            "Non. Même un cabinet de deux avocats gagne à des tâches explicites, un agenda partagé et une structure de dossiers cohérente. Les legal ops ne sont pas une affaire d'effectifs — mais de savoir si l'état du travail est visible ou enfermé dans les têtes.",
        },
        {
          question: "Qu'apporte JURE à un responsable des legal operations ?",
          answer:
            "Un seul endroit pour voir l'état opérationnel du travail de l'équipe : des dossiers structurés par type, des tâches avec assignés, priorités et dates limites, des échéances sur un agenda partagé — et, pour les propriétaires et administrateurs, la finance du cabinet avec factures, paiements, honoraires et tableaux de bord.",
        },
        {
          question: "JURE inclut-il du reporting ou des tableaux de bord ?",
          answer:
            "JURE inclut des tableaux de bord au sein de la finance du cabinet, réservés aux rôles propriétaire et administrateur, couvrant factures, paiements et honoraires. La visibilité opérationnelle du quotidien vient de l'agenda partagé et des vues tâches et dossiers dans lesquelles toute l'équipe travaille.",
        },
        {
          question: "JURE s'intègre-t-il à d'autres outils ?",
          answer:
            "Pas aujourd'hui. L'approche de JURE consiste à réduire le nombre d'outils dont le travail juridique a besoin, en réunissant dossiers, tâches, agenda, documents, collaboration et finance sur une seule plateforme. Les notifications atteignent l'équipe dans l'application et par e-mail.",
        },
        {
          question: "Comment JURE aide-t-il à standardiser la façon de travailler ?",
          answer:
            "En donnant au travail une forme cohérente : chaque dossier a un type, un client et une équipe ; chaque tâche a un assigné, une priorité et une date limite ; chaque échéance vit sur l'agenda partagé. La standardisation vient de la structure, pas d'une charte que personne ne lit.",
        },
      ],
      related: ["legalPracticeManagement", "legalCaseManagement", "legalKnowledgeManagement"],
      cta: {
        title: "Rendez visible l'état du travail",
        body: "Découvrez comment l'agenda, les tâches, la structure de dossiers et les rôles de JURE donnent à votre équipe une image opérationnelle partagée de son travail juridique.",
      },
    },
    ar: {
      h1: "العمليات القانونية: رؤية مشتركة لكل العمل القانوني",
      intro:
        "العمليات القانونية هي فن تشغيل العمل القانوني كنظام: من يفعل ماذا، وما الذي يستحق ومتى، وكيف تُصرف طاقة الفريق. توفر JURE الطبقة التشغيلية — مفكرة مشتركة، ومهام منظمة، وأنواع ملفات متسقة، وأدوار ومالية المكتب — التي تجعل هذه الرؤية حقيقة.",
      definition: {
        title: "ما هي العمليات القانونية؟",
        body: "العمليات القانونية (legal operations) هي إدارة الجانب التشغيلي للعمل القانوني: المسارات، وأعباء العمل، والآجال، والأدوات، والمعرفة، والميزانية. نشأت في الإدارات القانونية للشركات لكنها تنطبق بالقدر نفسه على مكاتب المحاماة — أينما وجب تخطيط العمل القانوني وتوزيعه وتتبعه بين أكثر من شخص. فحيث يسأل المحامي: «ماذا يقتضي القانون هنا؟»، تسأل العمليات القانونية: «كيف يُنجز هذا العمل بموثوقية؟»: كيف تُفتح الملفات وتُهيكل، وكيف تُسند المهام وتُرتب أولوياتها، وكيف تُتابع الآجال حتى لا يعتمد شيء على ذاكرة شخص واحد، وكيف ترى القيادة أعباء العمل والكلفة. العمليات القانونية الجيدة لا تُغرق العمل القانوني في البيروقراطية؛ بل تزيل الاحتكاكات الخفية التي تجعل المحامين الجيدين بطيئين.",
      },
      problem: {
        title: "عمل قانوني بلا طبقة تشغيلية",
        body: "في فرق كثيرة، لا تعيش الحالة التشغيلية للعمل القانوني في أي مكان: فهي موزعة بين صناديق البريد وقوائم المهام الشخصية وذاكرة المحامين الأقدم. والأعراض متوقعة. أعباء العمل غير مرئية، فيغرق متعاون بينما ينتظر آخر التكليف. والآجال تظهر كطوارئ لا كخطط. وكل سؤال عن الحالة يكلف مقاطعة. وقرارات القيادة — التوظيف والتسعير والأولويات — تُتخذ على انطباعات لا على ما يُظهره العمل فعلًا. الفريق مليء بالأكفاء؛ والمفقود صورة تشغيلية مشتركة يراها الجميع.",
      },
      approach: {
        title: "JURE بوصفها الطبقة التشغيلية",
        body: "تمنح JURE الفرق القانونية الصورة التشغيلية على المنصة نفسها التي يجري فيها العمل. مفكرة مشتركة على مستوى المكتب تحمل المواعيد والآجال. ومهام لها أولويات ومواعيد نهائية ومكلفون، فيصبح توزيع العمل صريحًا لا محفوظًا في الذاكرة. وملفات تتبع بنية متسقة — نزاع واستشارة وملف إداري — تجعلها قابلة للمقارنة والإشراف. ووصول حسب الأدوار، من المالك إلى المطالع، يطابق الأداة مع طريقة تفويض الفريق فعليًا. وللمالكين والمديرين، تضيف مالية المكتب الفواتير والمدفوعات والأتعاب ولوحات المتابعة إلى الصورة نفسها.",
        points: [
          "مفكرة فريق مشتركة للمواعيد والآجال",
          "مهام بأولويات ومواعيد نهائية ومكلفين",
          "بنية ملفات متسقة: نزاع واستشارة وملف إداري",
          "وصول حسب الأدوار من المالك إلى المطالع",
          "مالية المكتب ولوحات المتابعة للمالكين والمديرين",
        ],
      },
      workflow: {
        title: "إيقاع تشغيلي في JURE",
        steps: [
          "هيكل الملفات حسب النوع",
          "خطط العمل كمهام مؤرخة ومرتبة الأولوية",
          "وزّع المهام على الفريق",
          "تابع التقدم على المفكرة المشتركة",
          "راجع المالية ولوحات المتابعة (المالك/المدير)",
        ],
      },
      useCases: {
        title: "العمليات القانونية عمليًا",
        items: [
          {
            title: "إدارة قانونية تكتسب الرؤية",
            body: "فريق قانوني في شركة يعالج طلبات من كل الأقسام دون رؤية مشتركة لما هو جارٍ. هيكلة كل طلب كملف بمهام وآجال في JURE تحول الطابور الخفي إلى طابور مرئي — يُشرف عليه من مكان واحد بدل إعادة تركيبه من صناديق البريد.",
          },
          {
            title: "موازنة أعباء العمل بين المتعاونين",
            body: "لأن كل مهمة في JURE لها مكلف وأولوية وموعد نهائي، يرى المحامي المشرف كيف يتوزع العمل قبل إعادة إسناده — بدل اكتشاف الخلل حين يحترق أحدهم أو يفلت أجل.",
          },
          {
            title: "حوكمة الآجال على مستوى المكتب",
            body: "بدل أن يتابع كل محامٍ تواريخه على حدة، تعيش كل الآجال على مفكرة المكتب المشتركة مع تذكيرات وإشعارات. فيحصل المكتب على جواب واحد للسؤال التشغيلي الأهم: ما الذي يستحق، ومتى.",
          },
        ],
      },
      security: {
        title: "رؤية تشغيلية دون إفراط في المشاركة",
        body: "الرؤية المشتركة لا تعني أن يرى الجميع كل شيء. فالتحكم في الوصول حسب الأدوار في JURE — من المالك إلى المطالع — يدع المكتب يقرر من يرى أي ملفات ومستندات وبيانات مالية، وكل ذلك في مساحة معزولة للمكتب نفسه.",
      },
      faqs: [
        {
          question: "هل العمليات القانونية للفرق الكبيرة فقط؟",
          answer:
            "لا. حتى مكتب من محاميَين يستفيد من مهام صريحة ومفكرة مشتركة وبنية ملفات متسقة. العمليات القانونية ليست مسألة عدد — بل مسألة هل حالة العمل مرئية أم حبيسة الرؤوس.",
        },
        {
          question: "ماذا تمنح JURE المسؤول عن العمليات القانونية؟",
          answer:
            "مكانًا واحدًا لرؤية الحالة التشغيلية لعمل الفريق: ملفات مهيكلة حسب النوع، ومهام بمكلفين وأولويات ومواعيد نهائية، وآجال على مفكرة مشتركة — وللمالكين والمديرين، مالية المكتب بفواتيرها ومدفوعاتها وأتعابها ولوحات متابعتها.",
        },
        {
          question: "هل تتضمن JURE تقارير أو لوحات متابعة؟",
          answer:
            "تتضمن JURE لوحات متابعة ضمن مالية المكتب، مقصورة على دوري المالك والمدير، تغطي الفواتير والمدفوعات والأتعاب. أما الرؤية التشغيلية اليومية فتأتي من المفكرة المشتركة وعروض المهام والملفات التي يعمل فيها الفريق كله.",
        },
        {
          question: "هل تتكامل JURE مع أدوات أخرى؟",
          answer:
            "ليس اليوم. نهج JURE هو تقليل عدد الأدوات التي يحتاجها العمل القانوني بجمع الملفات والمهام والمفكرة والمستندات والتعاون والمالية في منصة واحدة. وتصل الإشعارات إلى الفريق داخل التطبيق وعبر البريد الإلكتروني.",
        },
        {
          question: "كيف تساعد JURE على توحيد طريقة عمل الفريق؟",
          answer:
            "بمنح العمل شكلًا متسقًا: كل ملف له نوع وموكل وفريق؛ وكل مهمة لها مكلف وأولوية وموعد نهائي؛ وكل أجل يعيش على المفكرة المشتركة. التوحيد يأتي من البنية، لا من وثيقة إجراءات لا يقرأها أحد.",
        },
      ],
      related: ["legalPracticeManagement", "legalCaseManagement", "legalKnowledgeManagement"],
      cta: {
        title: "اجعل حالة العمل مرئية",
        body: "اكتشف كيف تمنح مفكرة JURE ومهامها وبنية ملفاتها وأدوارها فريقك صورة تشغيلية مشتركة واحدة لعمله القانوني.",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Legal knowledge management
  // ---------------------------------------------------------------------------
  legalKnowledgeManagement: {
    en: {
      h1: "Turn the firm's documents into knowledge the whole team can use",
      intro:
        "Every firm already owns a knowledge base — it is just scattered across inboxes, desktops and the memory of its most senior people. Legal knowledge management is the discipline of making that knowledge organized, findable and shared. JURE's document library, with its categories, tags and search, is where that work starts.",
      definition: {
        title: "What is legal knowledge management?",
        body: "Legal knowledge management is the practice of capturing what a legal team learns — model contracts, strong clauses, past pleadings, research memos, consultation answers — and organizing it so the whole team can find and reuse it. It rests on three habits. Capture: when work of lasting value is produced, it is saved somewhere shared rather than left in one person's files. Description: each item gets a meaningful title, description and classification, because knowledge that cannot be found does not exist. And reuse: the team's default first step on new work is to check what the firm has already done. Firms that manage knowledge well stop paying twice for the same thinking, and their expertise survives departures instead of leaving with them.",
      },
      problem: {
        title: "Knowledge that leaves at the end of the day",
        body: "In most firms, knowledge belongs to individuals by accident. The best clause for a given situation is in one partner's old files. The memo that answers this month's question was written three years ago — by someone who has since left. A new associate spends weeks rediscovering what the firm collectively already knows. None of this is a failure of talent; it is the absence of a shared place and a shared habit. The cost is invisible but constant: duplicated research, inconsistent documents, slow onboarding, and expertise that walks out the door with every departure.",
      },
      approach: {
        title: "How JURE becomes the firm's knowledge hub",
        body: "JURE's document library gives the firm one shared place to build its knowledge base. Categories and tags form a taxonomy the firm designs for itself — by practice area, by document type, by whatever cut fits its work. Titles and descriptions make each item findable by search, and in-browser preview lets the team check a document before reusing it. Knowledge connects back to work: documents attach to matters, and files can be shared into team conversations. To be clear about today's limits: search works on titles, descriptions, categories and tags — careful description is what makes the library powerful.",
        points: [
          "One shared library for the whole firm's documents",
          "Categories and tags as a firm-designed taxonomy",
          "Search across titles and descriptions",
          "In-browser preview before reuse",
          "Knowledge attached to matters and shared into conversations",
        ],
      },
      workflow: {
        title: "From work product to firm knowledge",
        steps: [
          "Save the document to the library",
          "Title and describe it clearly",
          "Classify it with categories and tags",
          "The team finds it by search",
          "Reuse it in the next matter",
        ],
      },
      useCases: {
        title: "Knowledge management in practice",
        items: [
          {
            title: "Building a clause and model collection",
            body: "The firm collects its strongest contract models and clauses in the library under a dedicated category, each with a description of when to use it. Drafting starts from the firm's accumulated judgment instead of from a blank page or an old email.",
          },
          {
            title: "Onboarding a new associate",
            body: "Instead of learning the firm's way of working by osmosis, a new associate browses the library: the standard pleadings, the model contracts, the past consultation answers. Weeks of implicit apprenticeship become days of reading — with a preview for every document.",
          },
          {
            title: "Capturing a consultation for reuse",
            body: "A well-researched consultation answer is saved to the library with a title and description naming the question it resolves. When a similar question arrives next year, the search finds it — whoever is asking, whoever originally wrote it.",
          },
        ],
      },
      security: {
        title: "Shared knowledge, controlled access",
        body: "A knowledge base concentrates a firm's most valuable thinking, so access matters. In JURE, the library is isolated to your firm's workspace, and role-based access control determines who can view and manage its contents — knowledge is shared with the team, not with the world.",
      },
      faqs: [
        {
          question: "How is knowledge management different from document management?",
          answer:
            "Document management organizes the files a firm needs to run its matters; knowledge management curates the subset worth reusing — models, clauses, memos, past answers — and describes it so the team actually finds it. In JURE, both happen in the same library: the difference is the habit, not the tool.",
        },
        {
          question: "Can JURE's AI search or reason over my firm's document library?",
          answer:
            "No. Juria, JURE's AI assistant in early access, does not search or index your firm's document library. Finding firm knowledge works through the library's own search — titles, descriptions, categories and tags.",
        },
        {
          question: "How does the team find knowledge in the library?",
          answer:
            "By searching titles and descriptions and by browsing categories and tags. That is why describing documents well is the core knowledge-management habit: a precise title and description make an item findable by everyone, forever.",
        },
        {
          question: "How should a small firm start with knowledge management?",
          answer:
            "Start narrow: pick one category — say, model contracts — agree on a few tags, and describe each document as you file it. A small, well-described collection beats a large, unlabeled one; the taxonomy can grow with the firm.",
        },
        {
          question: "Who decides how the library is organized?",
          answer:
            "Your firm. Categories and tags are yours to design, and role-based access control determines who can manage the library's structure and contents.",
        },
      ],
      related: ["legalDocumentManagement", "legalResearch", "legalOperations"],
      cta: {
        title: "Stop paying twice for the same thinking",
        body: "See how the JURE library turns your firm's documents into an organized, searchable knowledge base the whole team can draw on.",
      },
    },
    fr: {
      h1: "Transformez les documents du cabinet en connaissances utilisables par toute l'équipe",
      intro:
        "Chaque cabinet possède déjà une base de connaissances — elle est simplement éparpillée entre boîtes mail, bureaux d'ordinateurs et la mémoire de ses membres les plus expérimentés. La gestion des connaissances juridiques est la discipline qui rend ce savoir organisé, retrouvable et partagé. La bibliothèque documentaire de JURE, avec ses catégories, ses tags et sa recherche, est le point de départ de ce travail.",
      definition: {
        title: "Qu'est-ce que la gestion des connaissances juridiques ?",
        body: "La gestion des connaissances juridiques consiste à capturer ce qu'une équipe juridique apprend — contrats types, clauses éprouvées, conclusions passées, notes de recherche, réponses de consultation — et à l'organiser pour que toute l'équipe puisse le retrouver et le réutiliser. Elle repose sur trois habitudes. La capture : quand un travail de valeur durable est produit, il est enregistré dans un lieu partagé plutôt que laissé dans les fichiers d'une seule personne. La description : chaque élément reçoit un titre, une description et un classement signifiants, car une connaissance introuvable n'existe pas. Et la réutilisation : le premier réflexe de l'équipe sur un nouveau travail est de vérifier ce que le cabinet a déjà fait. Les cabinets qui gèrent bien leurs connaissances cessent de payer deux fois la même réflexion, et leur expertise survit aux départs au lieu de partir avec eux.",
      },
      problem: {
        title: "Le savoir qui s'en va à la fin de la journée",
        body: "Dans la plupart des cabinets, le savoir appartient aux individus par accident. La meilleure clause pour une situation donnée est dans les vieux fichiers d'un associé. La note qui répond à la question du mois a été écrite il y a trois ans — par quelqu'un qui est parti depuis. Un nouveau collaborateur passe des semaines à redécouvrir ce que le cabinet, collectivement, sait déjà. Rien de tout cela n'est un défaut de talent ; c'est l'absence d'un lieu partagé et d'une habitude partagée. Le coût est invisible mais constant : recherches dupliquées, documents incohérents, intégrations lentes, et une expertise qui franchit la porte à chaque départ.",
      },
      approach: {
        title: "Comment JURE devient le hub de connaissances du cabinet",
        body: "La bibliothèque documentaire de JURE donne au cabinet un lieu partagé unique pour construire sa base de connaissances. Catégories et tags forment une taxonomie que le cabinet conçoit pour lui-même — par domaine de pratique, par type de document, par tout découpage adapté à son travail. Titres et descriptions rendent chaque élément retrouvable par la recherche, et la prévisualisation dans le navigateur permet de vérifier un document avant de le réutiliser. Les connaissances restent reliées au travail : les documents se rattachent aux dossiers, et les fichiers se partagent dans les conversations d'équipe. Soyons clairs sur les limites actuelles : la recherche porte sur les titres, descriptions, catégories et tags — c'est la description soignée qui fait la puissance de la bibliothèque.",
        points: [
          "Une bibliothèque partagée pour les documents de tout le cabinet",
          "Catégories et tags : une taxonomie conçue par le cabinet",
          "Une recherche sur les titres et les descriptions",
          "Une prévisualisation dans le navigateur avant réutilisation",
          "Des connaissances rattachées aux dossiers et partagées dans les conversations",
        ],
      },
      workflow: {
        title: "Du travail produit au savoir du cabinet",
        steps: [
          "Enregistrer le document dans la bibliothèque",
          "Le titrer et le décrire clairement",
          "Le classer par catégories et tags",
          "L'équipe le retrouve par la recherche",
          "Le réutiliser dans le prochain dossier",
        ],
      },
      useCases: {
        title: "La gestion des connaissances en pratique",
        items: [
          {
            title: "Constituer une collection de clauses et de modèles",
            body: "Le cabinet rassemble ses meilleurs contrats types et clauses dans la bibliothèque, sous une catégorie dédiée, chacun avec une description de son cas d'usage. La rédaction part du jugement accumulé du cabinet plutôt que d'une page blanche ou d'un vieil e-mail.",
          },
          {
            title: "Intégrer un nouveau collaborateur",
            body: "Au lieu d'apprendre la manière de travailler du cabinet par osmose, un nouveau collaborateur parcourt la bibliothèque : les actes standards, les contrats types, les réponses de consultation passées. Des semaines d'apprentissage implicite deviennent des jours de lecture — avec une prévisualisation pour chaque document.",
          },
          {
            title: "Capturer une consultation pour la réutiliser",
            body: "Une réponse de consultation bien documentée est enregistrée dans la bibliothèque avec un titre et une description nommant la question qu'elle résout. Quand une question similaire arrive l'année suivante, la recherche la retrouve — peu importe qui demande, peu importe qui l'avait écrite.",
          },
        ],
      },
      security: {
        title: "Un savoir partagé, un accès contrôlé",
        body: "Une base de connaissances concentre la réflexion la plus précieuse d'un cabinet : l'accès compte donc. Dans JURE, la bibliothèque est isolée dans l'espace de votre cabinet, et le contrôle d'accès par rôles détermine qui peut consulter et gérer son contenu — le savoir est partagé avec l'équipe, pas avec le monde.",
      },
      faqs: [
        {
          question: "Quelle différence entre gestion des connaissances et gestion documentaire ?",
          answer:
            "La gestion documentaire organise les fichiers dont le cabinet a besoin pour ses dossiers ; la gestion des connaissances sélectionne le sous-ensemble qui mérite d'être réutilisé — modèles, clauses, notes, réponses passées — et le décrit pour que l'équipe le retrouve vraiment. Dans JURE, les deux se font dans la même bibliothèque : la différence tient à l'habitude, pas à l'outil.",
        },
        {
          question: "L'IA de JURE peut-elle chercher ou raisonner sur la bibliothèque du cabinet ?",
          answer:
            "Non. Juria, l'assistant IA de JURE en accès anticipé, ne recherche pas et n'indexe pas la bibliothèque documentaire de votre cabinet. Les connaissances du cabinet se retrouvent par la recherche propre de la bibliothèque — titres, descriptions, catégories et tags.",
        },
        {
          question: "Comment l'équipe retrouve-t-elle les connaissances dans la bibliothèque ?",
          answer:
            "En recherchant sur les titres et descriptions et en parcourant catégories et tags. C'est pourquoi bien décrire les documents est l'habitude centrale de la gestion des connaissances : un titre et une description précis rendent un élément retrouvable par tous, pour toujours.",
        },
        {
          question: "Comment un petit cabinet doit-il commencer la gestion des connaissances ?",
          answer:
            "Commencez étroit : choisissez une catégorie — par exemple les contrats types —, convenez de quelques tags, et décrivez chaque document au moment du classement. Une petite collection bien décrite vaut mieux qu'une grande collection sans étiquettes ; la taxonomie grandira avec le cabinet.",
        },
        {
          question: "Qui décide de l'organisation de la bibliothèque ?",
          answer:
            "Votre cabinet. Les catégories et les tags sont les vôtres, et le contrôle d'accès par rôles détermine qui peut gérer la structure et le contenu de la bibliothèque.",
        },
      ],
      related: ["legalDocumentManagement", "legalResearch", "legalOperations"],
      cta: {
        title: "Cessez de payer deux fois la même réflexion",
        body: "Découvrez comment la bibliothèque JURE transforme les documents de votre cabinet en une base de connaissances organisée et consultable, au service de toute l'équipe.",
      },
    },
    ar: {
      h1: "حوّل مستندات المكتب إلى معرفة يستفيد منها الفريق كله",
      intro:
        "كل مكتب يملك أصلًا قاعدة معرفة — لكنها مبعثرة بين صناديق البريد وأسطح المكاتب وذاكرة أكثر أعضائه خبرة. إدارة المعرفة القانونية هي فن جعل هذه المعرفة منظمة وقابلة للعثور عليها ومشتركة. ومكتبة المستندات في JURE، بفئاتها ووسومها وبحثها، هي نقطة انطلاق هذا العمل.",
      definition: {
        title: "ما هي إدارة المعرفة القانونية؟",
        body: "إدارة المعرفة القانونية هي ممارسة التقاط ما يتعلمه الفريق القانوني — العقود النموذجية، والبنود المجرَّبة، والمذكرات السابقة، ومذكرات البحث، وأجوبة الاستشارات — وتنظيمه ليجده الفريق كله ويعيد استخدامه. وتقوم على ثلاث عادات. الالتقاط: حين يُنتج عمل ذو قيمة باقية، يُحفظ في مكان مشترك بدل أن يُترك في ملفات شخص واحد. والوصف: يُمنح كل عنصر عنوانًا ووصفًا وتصنيفًا ذا معنى، لأن المعرفة التي لا يمكن العثور عليها لا وجود لها. وإعادة الاستخدام: أول خطوة اعتيادية للفريق في أي عمل جديد هي مراجعة ما أنجزه المكتب من قبل. المكاتب التي تدير معرفتها جيدًا تكف عن دفع ثمن التفكير نفسه مرتين، وتبقى خبرتها بعد المغادرين بدل أن ترحل معهم.",
      },
      problem: {
        title: "معرفة تغادر في نهاية اليوم",
        body: "في معظم المكاتب، تعود المعرفة إلى الأفراد بمحض الصدفة. أفضل بند لحالة معينة قابع في ملفات شريك قديمة. والمذكرة التي تجيب عن سؤال هذا الشهر كُتبت قبل ثلاث سنوات — بيد شخص غادر منذ ذلك الحين. ويقضي المتعاون الجديد أسابيع في إعادة اكتشاف ما يعرفه المكتب جماعيًا بالفعل. لا شيء من هذا قصور في الموهبة؛ إنه غياب مكان مشترك وعادة مشتركة. والكلفة خفية لكنها دائمة: بحث مكرر، ومستندات متضاربة، وإدماج بطيء، وخبرة تعبر الباب مع كل مغادرة.",
      },
      approach: {
        title: "كيف تصبح JURE مركز معرفة المكتب",
        body: "تمنح مكتبة المستندات في JURE المكتب مكانًا مشتركًا واحدًا لبناء قاعدة معرفته. تشكل الفئات والوسوم تصنيفًا يصممه المكتب لنفسه — حسب مجال الممارسة أو نوع المستند أو أي تقسيم يناسب عمله. وتجعل العناوين والأوصاف كل عنصر قابلًا للعثور عليه بالبحث، وتتيح المعاينة في المتصفح فحص المستند قبل إعادة استخدامه. وتبقى المعرفة موصولة بالعمل: فالمستندات تُرفق بالملفات، والملفات تُشارك في محادثات الفريق. ولنكن واضحين بشأن حدود اليوم: يعمل البحث على العناوين والأوصاف والفئات والوسوم — والوصف المتقن هو ما يمنح المكتبة قوتها.",
        points: [
          "مكتبة مشتركة واحدة لمستندات المكتب كله",
          "فئات ووسوم: تصنيف يصممه المكتب بنفسه",
          "بحث في العناوين والأوصاف",
          "معاينة في المتصفح قبل إعادة الاستخدام",
          "معرفة مرفقة بالملفات ومشتركة في المحادثات",
        ],
      },
      workflow: {
        title: "من ناتج العمل إلى معرفة المكتب",
        steps: [
          "احفظ المستند في المكتبة",
          "عنونه وصِفه بوضوح",
          "صنّفه بالفئات والوسوم",
          "يجده الفريق بالبحث",
          "أعد استخدامه في الملف التالي",
        ],
      },
      useCases: {
        title: "إدارة المعرفة عمليًا",
        items: [
          {
            title: "بناء مجموعة بنود ونماذج",
            body: "يجمع المكتب أقوى عقوده النموذجية وبنوده في المكتبة تحت فئة مخصصة، لكل منها وصف يبين متى يُستخدم. فتنطلق الصياغة من حصيلة خبرة المكتب المتراكمة بدل صفحة بيضاء أو بريد قديم.",
          },
          {
            title: "إدماج محامٍ متعاون جديد",
            body: "بدل تعلم طريقة عمل المكتب بالملاحظة والتقليد، يتصفح المتعاون الجديد المكتبة: المذكرات المعيارية، والعقود النموذجية، وأجوبة الاستشارات السابقة. فتتحول أسابيع التمرس الضمني إلى أيام قراءة — مع معاينة لكل مستند.",
          },
          {
            title: "التقاط استشارة لإعادة الاستخدام",
            body: "جواب استشارة جيد التوثيق يُحفظ في المكتبة بعنوان ووصف يسميان المسألة التي يحسمها. وحين يصل سؤال مشابه في العام التالي، يجده البحث — أيًا كان السائل، وأيًا كان كاتبه الأصلي.",
          },
        ],
      },
      security: {
        title: "معرفة مشتركة، ووصول مضبوط",
        body: "قاعدة المعرفة تركز أثمن ما لدى المكتب من تفكير، لذا فالوصول إليها مهم. في JURE، المكتبة معزولة في مساحة عمل مكتبك، ويحدد التحكم في الوصول حسب الأدوار من يستطيع الاطلاع على محتواها وإدارته — فالمعرفة مشتركة مع الفريق، لا مع العالم.",
      },
      faqs: [
        {
          question: "ما الفرق بين إدارة المعرفة وإدارة المستندات؟",
          answer:
            "إدارة المستندات تنظم الملفات التي يحتاجها المكتب لتسيير ملفاته؛ أما إدارة المعرفة فتنتقي الجزء الجدير بإعادة الاستخدام — النماذج والبنود والمذكرات والأجوبة السابقة — وتصفه ليجده الفريق فعلًا. وفي JURE يجري الأمران في المكتبة نفسها: الفرق في العادة، لا في الأداة.",
        },
        {
          question: "هل يستطيع الذكاء الاصطناعي في JURE البحث في مكتبة مستندات مكتبي أو الاستدلال عليها؟",
          answer:
            "لا. جوريا، مساعد JURE للذكاء الاصطناعي في مرحلة الوصول المبكر، لا يبحث في مكتبة مستندات مكتبك ولا يفهرسها. العثور على معرفة المكتب يجري عبر بحث المكتبة نفسها — العناوين والأوصاف والفئات والوسوم.",
        },
        {
          question: "كيف يجد الفريق المعرفة في المكتبة؟",
          answer:
            "بالبحث في العناوين والأوصاف وبتصفح الفئات والوسوم. ولهذا فإن إجادة وصف المستندات هي العادة المحورية في إدارة المعرفة: عنوان دقيق ووصف دقيق يجعلان العنصر قابلًا للعثور عليه من الجميع، وإلى الأبد.",
        },
        {
          question: "كيف يبدأ مكتب صغير بإدارة المعرفة؟",
          answer:
            "ابدأ بنطاق ضيق: اختر فئة واحدة — العقود النموذجية مثلًا — واتفقوا على بضعة وسوم، وصِف كل مستند عند أرشفته. مجموعة صغيرة جيدة الوصف خير من مجموعة كبيرة بلا عناوين؛ وسينمو التصنيف مع نمو المكتب.",
        },
        {
          question: "من يقرر طريقة تنظيم المكتبة؟",
          answer:
            "مكتبك أنت. فالفئات والوسوم من تصميمك، والتحكم في الوصول حسب الأدوار يحدد من يستطيع إدارة بنية المكتبة ومحتواها.",
        },
      ],
      related: ["legalDocumentManagement", "legalResearch", "legalOperations"],
      cta: {
        title: "كفّ عن دفع ثمن التفكير نفسه مرتين",
        body: "اكتشف كيف تحوّل مكتبة JURE مستندات مكتبك إلى قاعدة معرفة منظمة قابلة للبحث ينهل منها الفريق كله.",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Responsible legal AI
  // ---------------------------------------------------------------------------
  responsibleLegalAi: {
    en: {
      h1: "Responsible legal AI: what it means, and how JURE builds for it",
      intro:
        "AI in legal work raises a question that markets tend to skip: not \"how much can the AI do?\" but \"how do we use it without compromising the duties lawyers owe their clients?\" This page sets out what responsible legal AI means — and the specific design choices JURE makes to practice it, from labeled AI output to review-first workflows and a deliberate early-access rollout.",
      definition: {
        title: "What is responsible legal AI?",
        body: "Responsible legal AI is the use of AI in legal work under conditions that preserve professional responsibility. It rests on four commitments. Human review: AI output is a draft for a lawyer's judgment, never a substitute for it — the lawyer who signs remains the author. Transparency about limits: language models generate plausible text and can be confidently wrong, so users must know what the tool can and cannot do. Confidentiality: client information handled by AI must remain under the same protection as everything else the firm holds. And clear provenance: everyone reading a document should be able to tell what came from the AI and what came from the lawyer. Under these conditions, AI changes the speed of legal work — not the location of responsibility.",
      },
      problem: {
        title: "The real risks of unreviewed AI in law",
        body: "The failure modes are no longer hypothetical. Courts have sanctioned lawyers for filings that cited AI-invented cases. Confidential facts have been pasted into consumer chatbots with unknown data practices. And a subtler risk compounds daily: fluent AI text that is slightly wrong — an outdated rule, a misread exception — absorbed into work product because it sounded right. The common thread is not that AI was used, but that it was used without structure: no labeling, no verification step, no confidentiality boundary. The frame \"will AI replace lawyers?\" misses the point; the operative question is whether AI-assisted work still passes through a lawyer's judgment.",
      },
      approach: {
        title: "JURE's design choices",
        body: "Responsibility in JURE is built into the product, not appended as a disclaimer. Output from Juria, our legal AI assistant, is clearly labeled as AI-generated, so its provenance is never ambiguous. Workflows are review-first: analysis, research answers and drafting suggestions are positioned as inputs to lawyer review, and JURE's own workflow diagrams put the review step before any decision. Juria ships as early access, rolled out progressively so it is refined with practicing lawyers rather than released broadly and patched later. And client work stays inside the firm's isolated workspace, governed by role-based access — not pasted into outside tools.",
        points: [
          "AI output clearly labeled as AI-generated",
          "Review-first workflows: lawyer validation before decisions",
          "A deliberate early-access rollout for Juria",
          "Transparency about what the AI can and cannot do",
          "Client work kept in the firm's isolated, role-controlled workspace",
        ],
      },
      workflow: {
        title: "Human-in-the-loop, step by step",
        steps: [
          "The lawyer frames the task",
          "Juria drafts — labeled as AI output",
          "References are checked against sources",
          "The lawyer reviews and corrects",
          "The lawyer decides and signs",
        ],
      },
      useCases: {
        title: "Responsible AI in daily practice",
        items: [
          {
            title: "Adopting an AI policy at a firm",
            body: "A firm wants its lawyers to benefit from AI without ungoverned use of consumer chatbots. Because JURE labels AI output and structures review into the workflow, the firm's policy can be short and enforceable: AI assistance happens in the workspace, and nothing AI-generated leaves without lawyer review.",
          },
          {
            title: "Being straight with clients about AI use",
            body: "A client asks whether AI touches their matter. The lawyer can answer precisely: AI assists with drafts and analysis inside the firm's own workspace, every AI output is labeled and reviewed by a lawyer, and the firm — not an outside chatbot — holds the data.",
          },
          {
            title: "Training juniors to verify, not trust",
            body: "Associates who grow up with AI need the verification habit from day one. JURE's labeling and review-first flow make the discipline visible in the tool itself: an AI draft is marked as such, and the workflow's next step is always the lawyer's own check.",
          },
        ],
      },
      security: {
        title: "Confidentiality is a precondition, not a feature",
        body: "No AI practice is responsible if client data leaks on the way. JURE keeps matters, documents and AI-assisted work inside each firm's isolated workspace, with role-based access control from owner to viewer determining who sees what.",
      },
      faqs: [
        {
          question: "Why is human review non-negotiable in legal AI?",
          answer:
            "Because responsibility cannot be delegated to a model. Language models produce plausible text without guaranteeing its truth, while a lawyer answers for accuracy professionally and ethically. Review is the mechanism that lets the profession use AI speed without surrendering its duty of care.",
        },
        {
          question: "Does JURE guarantee that Juria's answers are correct?",
          answer:
            "No — and treating any AI's answers as guaranteed would itself be irresponsible. Juria's output can be incomplete or wrong, which is exactly why it is labeled as AI-generated and why JURE's workflows route it through lawyer review before it informs any decision.",
        },
        {
          question: "Why is \"will AI replace lawyers?\" the wrong question?",
          answer:
            "Because it confuses producing text with practicing law. AI accelerates drafts, summaries and first-pass research; it does not carry professional responsibility, weigh a client's interests or sign a pleading. The useful question is whether AI-assisted work still passes through a lawyer's judgment — and in JURE, it does by design.",
        },
        {
          question: "Why does JURE release its AI as early access?",
          answer:
            "Because a progressive rollout is itself a responsibility practice. Early access lets us observe Juria on real legal work, gather feedback from practicing lawyers and strengthen the review workflows before making it generally available.",
        },
        {
          question: "How can I tell what is AI-generated in JURE?",
          answer:
            "Juria's output is clearly labeled as AI-generated wherever it appears. Provenance stays visible, so a reviewing lawyer always knows which text originated from the assistant and still requires verification.",
        },
        {
          question: "What should a firm check before adopting any legal AI tool?",
          answer:
            "Four things at minimum: whether AI output is distinguishable from human work, whether the workflow enforces review before use, where client data goes and who can access it, and whether the vendor is transparent about the tool's limits. These are the criteria JURE is built to meet — and fair criteria to hold any tool to, including ours.",
        },
      ],
      related: ["legalAi", "legalResearch", "legalCaseManagement"],
      cta: {
        title: "AI assists. Lawyers decide.",
        body: "See how JURE puts responsible AI into practice: labeled output, review-first workflows and an early-access rollout shaped with practicing lawyers.",
      },
    },
    fr: {
      h1: "L'IA juridique responsable : ce qu'elle signifie, et comment JURE la construit",
      intro:
        "L'IA dans le travail juridique pose une question que le marché tend à esquiver : non pas « que peut faire l'IA ? » mais « comment l'utiliser sans compromettre les devoirs de l'avocat envers ses clients ? ». Cette page expose ce que signifie l'IA juridique responsable — et les choix de conception concrets par lesquels JURE la pratique, des résultats d'IA identifiés aux flux de relecture d'abord, jusqu'à un déploiement délibéré en accès anticipé.",
      definition: {
        title: "Qu'est-ce que l'IA juridique responsable ?",
        body: "L'IA juridique responsable, c'est l'usage de l'IA dans le travail juridique à des conditions qui préservent la responsabilité professionnelle. Elle repose sur quatre engagements. La relecture humaine : un résultat d'IA est un projet soumis au jugement de l'avocat, jamais son substitut — l'avocat qui signe reste l'auteur. La transparence sur les limites : les modèles de langage génèrent du texte plausible et peuvent se tromper avec assurance ; l'utilisateur doit savoir ce que l'outil peut et ne peut pas faire. La confidentialité : les informations clients traitées par l'IA doivent rester sous la même protection que tout ce que détient le cabinet. Et la traçabilité : quiconque lit un document doit pouvoir distinguer ce qui vient de l'IA de ce qui vient de l'avocat. À ces conditions, l'IA change la vitesse du travail juridique — pas le lieu de la responsabilité.",
      },
      problem: {
        title: "Les vrais risques de l'IA non relue en droit",
        body: "Les modes de défaillance ne sont plus hypothétiques. Des tribunaux ont sanctionné des avocats pour des écritures citant des décisions inventées par l'IA. Des faits confidentiels ont été collés dans des chatbots grand public aux pratiques de données inconnues. Et un risque plus subtil s'accumule chaque jour : un texte d'IA fluide mais légèrement faux — une règle dépassée, une exception mal lue — absorbé dans le travail parce qu'il sonnait juste. Le fil commun n'est pas que l'IA ait été utilisée, mais qu'elle l'ait été sans structure : sans identification, sans étape de vérification, sans frontière de confidentialité. Le cadre « l'IA remplacera-t-elle les avocats ? » passe à côté ; la vraie question est de savoir si le travail assisté par IA passe encore par le jugement d'un avocat.",
      },
      approach: {
        title: "Les choix de conception de JURE",
        body: "Dans JURE, la responsabilité est construite dans le produit, pas ajoutée en avertissement. Les résultats de Juria, notre assistant IA juridique, sont clairement identifiés comme générés par IA : leur provenance n'est jamais ambiguë. Les flux de travail placent la relecture d'abord : analyses, réponses de recherche et suggestions de rédaction sont positionnées comme des entrées de la relecture d'avocat, et les schémas de flux de JURE placent l'étape de relecture avant toute décision. Juria sort en accès anticipé, déployé progressivement pour être affiné avec des avocats en exercice plutôt que lancé largement et corrigé ensuite. Et le travail des clients reste dans l'espace isolé du cabinet, régi par l'accès par rôles — pas collé dans des outils extérieurs.",
        points: [
          "Des résultats d'IA clairement identifiés comme générés par IA",
          "Des flux de relecture d'abord : validation par l'avocat avant les décisions",
          "Un déploiement délibéré de Juria en accès anticipé",
          "La transparence sur ce que l'IA peut et ne peut pas faire",
          "Le travail des clients gardé dans l'espace isolé du cabinet, contrôlé par rôles",
        ],
      },
      workflow: {
        title: "La validation humaine, étape par étape",
        steps: [
          "L'avocat cadre la tâche",
          "Juria rédige — identifié comme résultat d'IA",
          "Les références sont contrôlées dans les sources",
          "L'avocat relit et corrige",
          "L'avocat décide et signe",
        ],
      },
      useCases: {
        title: "L'IA responsable dans la pratique quotidienne",
        items: [
          {
            title: "Adopter une politique IA au cabinet",
            body: "Un cabinet veut que ses avocats profitent de l'IA sans usage incontrôlé de chatbots grand public. Parce que JURE identifie les résultats d'IA et structure la relecture dans le flux de travail, la politique du cabinet peut être courte et applicable : l'assistance IA se fait dans l'espace de travail, et rien de généré par IA ne sort sans relecture d'avocat.",
          },
          {
            title: "Parler franchement de l'IA aux clients",
            body: "Un client demande si l'IA touche à son dossier. L'avocat peut répondre précisément : l'IA assiste pour les projets et analyses dans l'espace propre du cabinet, chaque résultat d'IA est identifié et relu par un avocat, et c'est le cabinet — pas un chatbot extérieur — qui détient les données.",
          },
          {
            title: "Former les juniors à vérifier, pas à croire",
            body: "Les collaborateurs qui grandissent avec l'IA doivent acquérir le réflexe de vérification dès le premier jour. L'identification et le flux de relecture d'abord de JURE rendent cette discipline visible dans l'outil lui-même : un projet d'IA est marqué comme tel, et l'étape suivante du flux est toujours le contrôle de l'avocat.",
          },
        ],
      },
      security: {
        title: "La confidentialité est une condition préalable, pas une fonctionnalité",
        body: "Aucune pratique de l'IA n'est responsable si les données clients fuient en chemin. JURE garde les dossiers, les documents et le travail assisté par IA dans l'espace isolé de chaque cabinet, avec un contrôle d'accès par rôles, du propriétaire au lecteur, qui détermine qui voit quoi.",
      },
      faqs: [
        {
          question: "Pourquoi la relecture humaine est-elle non négociable dans l'IA juridique ?",
          answer:
            "Parce que la responsabilité ne se délègue pas à un modèle. Les modèles de langage produisent du texte plausible sans en garantir la vérité, alors que l'avocat répond de l'exactitude sur les plans professionnel et déontologique. La relecture est le mécanisme qui permet à la profession d'utiliser la vitesse de l'IA sans abandonner son devoir de diligence.",
        },
        {
          question: "JURE garantit-il l'exactitude des réponses de Juria ?",
          answer:
            "Non — et traiter les réponses d'une IA comme garanties serait en soi irresponsable. Les résultats de Juria peuvent être incomplets ou faux : c'est exactement pourquoi ils sont identifiés comme générés par IA et pourquoi les flux de JURE les font passer par la relecture d'un avocat avant toute décision.",
        },
        {
          question: "Pourquoi « l'IA remplacera-t-elle les avocats ? » est-elle la mauvaise question ?",
          answer:
            "Parce qu'elle confond produire du texte et exercer le droit. L'IA accélère les projets, les synthèses et les premières recherches ; elle ne porte pas la responsabilité professionnelle, ne pèse pas les intérêts d'un client et ne signe pas d'écritures. La question utile est de savoir si le travail assisté par IA passe encore par le jugement d'un avocat — et dans JURE, c'est le cas par conception.",
        },
        {
          question: "Pourquoi JURE lance-t-il son IA en accès anticipé ?",
          answer:
            "Parce qu'un déploiement progressif est lui-même une pratique de responsabilité. L'accès anticipé nous permet d'observer Juria sur du vrai travail juridique, de recueillir les retours d'avocats en exercice et de renforcer les flux de relecture avant la disponibilité générale.",
        },
        {
          question: "Comment savoir ce qui est généré par IA dans JURE ?",
          answer:
            "Les résultats de Juria sont clairement identifiés comme générés par IA partout où ils apparaissent. La provenance reste visible : l'avocat qui relit sait toujours quel texte vient de l'assistant et exige encore une vérification.",
        },
        {
          question: "Que doit vérifier un cabinet avant d'adopter un outil d'IA juridique ?",
          answer:
            "Quatre choses au minimum : si les résultats d'IA se distinguent du travail humain, si le flux impose la relecture avant usage, où vont les données clients et qui y accède, et si l'éditeur est transparent sur les limites de l'outil. Ce sont les critères que JURE est construit pour remplir — et des critères légitimes à opposer à tout outil, y compris le nôtre.",
        },
      ],
      related: ["legalAi", "legalResearch", "legalCaseManagement"],
      cta: {
        title: "L'IA assiste. Les avocats décident.",
        body: "Découvrez comment JURE met l'IA responsable en pratique : des résultats identifiés, des flux de relecture d'abord, et un déploiement en accès anticipé façonné avec des avocats en exercice.",
      },
    },
    ar: {
      h1: "الذكاء الاصطناعي القانوني المسؤول: ما معناه، وكيف تبنيه JURE",
      intro:
        "يطرح الذكاء الاصطناعي في العمل القانوني سؤالًا يميل السوق إلى تجاوزه: ليس «كم يستطيع الذكاء الاصطناعي أن يفعل؟» بل «كيف نستخدمه دون المساس بالواجبات التي يدين بها المحامون لموكليهم؟». تعرض هذه الصفحة معنى الذكاء الاصطناعي القانوني المسؤول — وخيارات التصميم المحددة التي تمارسه بها JURE، من وسم مخرجات الذكاء الاصطناعي إلى مسارات المراجعة أولًا والطرح المتدرج في مرحلة الوصول المبكر.",
      definition: {
        title: "ما هو الذكاء الاصطناعي القانوني المسؤول؟",
        body: "الذكاء الاصطناعي القانوني المسؤول هو استخدام الذكاء الاصطناعي في العمل القانوني بشروط تصون المسؤولية المهنية. ويقوم على أربعة التزامات. المراجعة البشرية: مخرجات الذكاء الاصطناعي مسودة تخضع لحكم المحامي، لا بديل عنه أبدًا — فالمحامي الذي يوقّع يبقى هو المؤلف. والشفافية بشأن الحدود: النماذج اللغوية تولّد نصًا معقول الظاهر وقد تخطئ بثقة، فيجب أن يعرف المستخدم ما تستطيعه الأداة وما لا تستطيعه. والسرية: معلومات الموكلين التي يعالجها الذكاء الاصطناعي يجب أن تبقى تحت الحماية نفسها التي يخضع لها كل ما يحوزه المكتب. ووضوح المصدر: ينبغي لكل من يقرأ مستندًا أن يميز ما جاء من الذكاء الاصطناعي وما جاء من المحامي. بهذه الشروط، يغيّر الذكاء الاصطناعي سرعة العمل القانوني — لا موضع المسؤولية.",
      },
      problem: {
        title: "المخاطر الحقيقية للذكاء الاصطناعي غير المراجَع في القانون",
        body: "لم تعد أنماط الفشل افتراضية. فقد عاقبت محاكم محامين على مذكرات استشهدت بقضايا اختلقها الذكاء الاصطناعي. ولُصقت وقائع سرية في روبوتات محادثة عامة ممارساتها في البيانات مجهولة. وثمة خطر أدق يتراكم يوميًا: نص ذكاء اصطناعي سلس لكنه خاطئ قليلًا — قاعدة تجاوزها الزمن، أو استثناء قُرئ خطأً — يُمتص في العمل لأنه بدا صحيحًا. والخيط المشترك ليس أن الذكاء الاصطناعي استُخدم، بل أنه استُخدم بلا بنية: بلا وسم، وبلا خطوة تحقق، وبلا حدود سرية. وإطار «هل سيحل الذكاء الاصطناعي محل المحامين؟» يخطئ الهدف؛ فالسؤال الفاعل هو: هل ما يزال العمل المدعوم بالذكاء الاصطناعي يمر عبر حكم محامٍ؟",
      },
      approach: {
        title: "خيارات التصميم في JURE",
        body: "المسؤولية في JURE مبنية في المنتج، لا ملحقة به كإخلاء مسؤولية. مخرجات جوريا، مساعدنا للذكاء الاصطناعي القانوني، موسومة بوضوح كمولدة بالذكاء الاصطناعي، فلا يلتبس مصدرها أبدًا. ومسارات العمل تقدم المراجعة أولًا: فالتحليلات وأجوبة البحث واقتراحات الصياغة تُعامل كمدخلات لمراجعة المحامي، ومخططات مسارات JURE نفسها تضع خطوة المراجعة قبل أي قرار. ويُطرح جوريا في مرحلة الوصول المبكر، تدريجيًا، ليُصقل مع محامين ممارسين بدل أن يُطلق على نطاق واسع ويُرقّع لاحقًا. ويبقى عمل الموكلين داخل مساحة المكتب المعزولة، محكومًا بالوصول حسب الأدوار — لا ملصوقًا في أدوات خارجية.",
        points: [
          "مخرجات ذكاء اصطناعي موسومة بوضوح كمولدة بالذكاء الاصطناعي",
          "مسارات عمل تقدم المراجعة أولًا: اعتماد المحامي قبل القرارات",
          "طرح متعمد لجوريا في مرحلة الوصول المبكر",
          "شفافية بشأن ما يستطيعه الذكاء الاصطناعي وما لا يستطيعه",
          "عمل الموكلين محفوظ في مساحة المكتب المعزولة المحكومة بالأدوار",
        ],
      },
      workflow: {
        title: "المراجعة البشرية، خطوة خطوة",
        steps: [
          "يؤطّر المحامي المهمة",
          "يصوغ جوريا — موسومًا كمخرجات ذكاء اصطناعي",
          "تُراجع المراجع في المصادر",
          "يراجع المحامي ويصحح",
          "يقرر المحامي ويوقّع",
        ],
      },
      useCases: {
        title: "الذكاء الاصطناعي المسؤول في الممارسة اليومية",
        items: [
          {
            title: "اعتماد سياسة للذكاء الاصطناعي في مكتب",
            body: "يريد مكتب أن يستفيد محاموه من الذكاء الاصطناعي دون استخدام منفلت لروبوتات المحادثة العامة. ولأن JURE تسم مخرجات الذكاء الاصطناعي وتبني المراجعة في مسار العمل، يمكن أن تكون سياسة المكتب قصيرة وقابلة للتطبيق: المساعدة الذكية تجري في مساحة العمل، ولا يخرج شيء مولد بالذكاء الاصطناعي دون مراجعة محامٍ.",
          },
          {
            title: "الصراحة مع الموكلين بشأن استخدام الذكاء الاصطناعي",
            body: "يسأل موكل: هل يمس الذكاء الاصطناعي ملفي؟ يستطيع المحامي الإجابة بدقة: الذكاء الاصطناعي يساعد في المسودات والتحليل داخل مساحة المكتب الخاصة، وكل مخرجاته موسومة ويراجعها محامٍ، والمكتب — لا روبوت خارجي — هو من يحوز البيانات.",
          },
          {
            title: "تدريب المبتدئين على التحقق لا التصديق",
            body: "المحامون الناشئون مع الذكاء الاصطناعي يحتاجون عادة التحقق من اليوم الأول. وسمُ JURE ومسارُ المراجعة أولًا يجعلان هذا الانضباط مرئيًا في الأداة نفسها: المسودة الذكية موسومة بصفتها تلك، والخطوة التالية في المسار هي دائمًا تدقيق المحامي بنفسه.",
          },
        ],
      },
      security: {
        title: "السرية شرط مسبق، لا ميزة",
        body: "لا تكون أي ممارسة للذكاء الاصطناعي مسؤولة إذا تسربت بيانات الموكلين في الطريق. تُبقي JURE الملفات والمستندات والعمل المدعوم بالذكاء الاصطناعي داخل مساحة كل مكتب المعزولة، مع تحكم في الوصول حسب الأدوار من المالك إلى المطالع يحدد من يرى ماذا.",
      },
      faqs: [
        {
          question: "لماذا المراجعة البشرية غير قابلة للتفاوض في الذكاء الاصطناعي القانوني؟",
          answer:
            "لأن المسؤولية لا تُفوَّض إلى نموذج. تنتج النماذج اللغوية نصًا معقول الظاهر دون ضمان صحته، بينما يجيب المحامي عن الدقة مهنيًا وأخلاقيًا. المراجعة هي الآلية التي تتيح للمهنة استثمار سرعة الذكاء الاصطناعي دون التخلي عن واجب العناية.",
        },
        {
          question: "هل تضمن JURE صحة إجابات جوريا؟",
          answer:
            "لا — واعتبار إجابات أي ذكاء اصطناعي مضمونة هو في ذاته انعدام مسؤولية. قد تكون مخرجات جوريا ناقصة أو خاطئة، ولهذا بالضبط تُوسم كمولدة بالذكاء الاصطناعي، ولهذا تمررها مسارات JURE عبر مراجعة محامٍ قبل أن تُبنى عليها أي قرارات.",
        },
        {
          question: "لماذا سؤال «هل سيحل الذكاء الاصطناعي محل المحامين؟» هو السؤال الخطأ؟",
          answer:
            "لأنه يخلط بين إنتاج النص وممارسة القانون. يسرّع الذكاء الاصطناعي المسودات والملخصات والبحث الأولي؛ لكنه لا يحمل المسؤولية المهنية، ولا يزن مصالح موكل، ولا يوقّع مذكرة. السؤال المفيد هو: هل ما يزال العمل المدعوم بالذكاء الاصطناعي يمر عبر حكم محامٍ — وفي JURE يمر كذلك بحكم التصميم.",
        },
        {
          question: "لماذا تطرح JURE ذكاءها الاصطناعي في مرحلة الوصول المبكر؟",
          answer:
            "لأن الطرح المتدرج هو نفسه ممارسة مسؤولة. يتيح لنا الوصول المبكر مراقبة جوريا على عمل قانوني حقيقي، وجمع ملاحظات محامين ممارسين، وتقوية مسارات المراجعة قبل الإتاحة العامة.",
        },
        {
          question: "كيف أميز ما هو مولد بالذكاء الاصطناعي في JURE؟",
          answer:
            "مخرجات جوريا موسومة بوضوح كمولدة بالذكاء الاصطناعي أينما ظهرت. يبقى المصدر مرئيًا، فيعرف المحامي المراجع دائمًا أي نص صدر عن المساعد وما يزال يتطلب تحققًا.",
        },
        {
          question: "ماذا ينبغي أن يتحقق منه المكتب قبل اعتماد أي أداة ذكاء اصطناعي قانوني؟",
          answer:
            "أربعة أمور على الأقل: هل تتميز مخرجات الذكاء الاصطناعي عن العمل البشري، وهل يفرض مسار العمل المراجعة قبل الاستخدام، وأين تذهب بيانات الموكلين ومن يصل إليها، وهل المزود شفاف بشأن حدود الأداة. هذه هي المعايير التي بُنيت JURE لتستوفيها — وهي معايير عادلة تُطبق على أي أداة، بما فيها أداتنا.",
        },
      ],
      related: ["legalAi", "legalResearch", "legalCaseManagement"],
      cta: {
        title: "الذكاء الاصطناعي يساعد. والمحامون يقررون.",
        body: "اكتشف كيف تضع JURE الذكاء الاصطناعي المسؤول موضع التطبيق: مخرجات موسومة، ومسارات تقدم المراجعة أولًا، وطرح في مرحلة الوصول المبكر يتشكل مع محامين ممارسين.",
      },
    },
  },
};
