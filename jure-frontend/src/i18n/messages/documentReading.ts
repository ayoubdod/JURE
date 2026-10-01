export type DocumentReadingMessages = {
  readingMode: string;
  back: string;
  file: string;
  searchInDoc: string;
  pages: string;
  bookmarks: string;
  highlights: string;
  documentInfo: string;
  noBookmarks: string;
  pageOf: string;
  pageShort: string;
  pageRef: string;
  prev: string;
  next: string;
  zoomIn: string;
  zoomOut: string;
  fitWidth: string;
  search: string;
  highlight: string;
  addNote: string;
  bookmark: string;
  askJuriaShort: string;
  share: string;
  copy: string;
  openTab: string;
  download: string;
  noFile: string;
  tabNotes: string;
  tabJuria: string;
  tabShare: string;
  newNote: string;
  untitledNote: string;
  noteTitle: string;
  noteContent: string;
  noteTags: string;
  attachSelection: string;
  emptyNotes: string;
  noteSaved: string;
  addToCase: string;
  addToCaseTitle: string;
  searchCases: string;
  noCases: string;
  addedToCase: string;
  save: string;
  cancel: string;
  delete: string;
  send: string;
  loading: string;
  sampleHighlight: string;
  juriaTitle: string;
  juriaSubtitle: string;
  context: string;
  askJuria: string;
  ask: string;
  juriaThinking: string;
  draftResponse: string;
  sources: string;
  supportedBySources: string;
  verifyBeforeRelying: string;
  addToNote: string;
  juriaNoteTitle: string;
  highlightedPassage: string;
  summarizePage: string;
  summarizeDoc: string;
  explainClause: string;
  findProvisions: string;
  identifyRisks: string;
  prepareResponse: string;
  draftArgument: string;
  createCaseNote: string;
  juriaPageAnswer: string;
  juriaSelectionAnswer: string;
  juriaDisabled: string;
  juriaAskFailed: string;
  ocrThisPage: string;
  ocrRunning: string;
  ocrProgress: string;
  ocrDone: string;
  ocrFailed: string;
  ocrHint: string;
  sendTo: string;
  sendHint: string;
  searchColleague: string;
  noColleagues: string;
  colleague: string;
  message: string;
  messagePlaceholder: string;
  attachment: string;
  sentTo: string;
};

export const documentReadingEn: DocumentReadingMessages = {
  readingMode: 'Reading Mode',
  back: 'Back',
  file: 'File',
  searchInDoc: 'Search in document…',
  pages: 'Pages',
  bookmarks: 'Bookmarks',
  highlights: 'Highlights',
  documentInfo: 'Document info',
  noBookmarks: 'No bookmarks yet',
  pageOf: 'Page {current} of {total}',
  pageShort: 'Page {page}',
  pageRef: 'Page {page}',
  prev: 'Previous page',
  next: 'Next page',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  fitWidth: 'Fit width',
  search: 'Search',
  highlight: 'Highlight',
  addNote: 'Add note',
  bookmark: 'Bookmark',
  askJuriaShort: 'Ask Juria',
  share: 'Share',
  copy: 'Copy',
  openTab: 'Open in tab',
  download: 'Download',
  noFile: 'No file available for this document.',
  tabNotes: 'Notes',
  tabJuria: 'Juria',
  tabShare: 'Share',
  newNote: 'New note',
  untitledNote: 'Untitled note',
  noteTitle: 'Note title',
  noteContent: 'Write your note…',
  noteTags: 'Tags (comma-separated)',
  attachSelection: 'Attach selected text',
  emptyNotes: 'No notes yet. Capture insights while you read.',
  noteSaved: 'Note saved',
  addToCase: 'Add to case',
  addToCaseTitle: 'Add this note to a case',
  searchCases: 'Search cases…',
  noCases: 'No cases found',
  addedToCase: 'Note added to {ref} · Linked to Page {page}',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  send: 'Send',
  loading: 'Loading…',
  sampleHighlight: 'Selected passage',
  juriaTitle: 'Juria',
  juriaSubtitle: 'AI legal assistant',
  context: 'Juria context',
  askJuria: 'Ask Juria about this document…',
  ask: 'Ask Juria',
  juriaThinking: 'Juria is analyzing the document…',
  draftResponse: 'Draft response',
  sources: 'Sources',
  supportedBySources: 'Supported by cited documents',
  verifyBeforeRelying: 'Verify before relying on this conclusion',
  addToNote: 'Add to note',
  juriaNoteTitle: 'Juria insight',
  highlightedPassage: 'Highlighted passage',
  summarizePage: 'Summarize this page',
  summarizeDoc: 'Summarize this document',
  explainClause: 'Explain this clause',
  findProvisions: 'Find relevant provisions',
  identifyRisks: 'Identify risks',
  prepareResponse: 'Prepare a response',
  draftArgument: 'Draft a legal argument',
  createCaseNote: 'Create a case note',
  juriaPageAnswer:
    'Based on {title} (page {page} of {total}), here is an initial analysis for: “{question}”.\n\nThis draft is grounded in the open document context. Treat legal conclusions as provisional until you verify the cited passages.',
  juriaSelectionAnswer:
    'Regarding the selected text on page {page} of {title}:\n\n“{selection}”\n\nThis passage appears material to the issue under review. Confirm the surrounding pages and related correspondence before relying on any conclusion.',
  juriaDisabled: 'Juria is disabled or unavailable. Enable VITE_JURIA_ENABLED and check the backend.',
  juriaAskFailed: 'Juria could not answer. Please try again.',
  ocrThisPage: 'OCR this page',
  ocrRunning: 'Reading scanned page with OCR…',
  ocrProgress: 'OCR page {page} ({current}/{total}) — {pct}%',
  ocrDone: 'OCR finished — text is ready for Juria.',
  ocrFailed:
    'Could not read text from this page (scanned PDF OCR failed). Try a clearer scan or paste the passage.',
  ocrHint: 'No selectable text detected. Use OCR for scanned pages.',
  sendTo: 'Send to',
  sendHint: 'Share a note, highlight, or excerpt without leaving Reading Mode.',
  searchColleague: 'Search colleague…',
  noColleagues: 'No colleagues found',
  colleague: 'colleague',
  message: 'Message',
  messagePlaceholder: 'Please review this section…',
  attachment: 'Attachment',
  sentTo: 'Sent to {name}',
};

export const documentReadingFr: DocumentReadingMessages = {
  ...documentReadingEn,
  readingMode: 'Mode lecture',
  back: 'Retour',
  file: 'Fichier',
  searchInDoc: 'Rechercher dans le document…',
  pages: 'Pages',
  bookmarks: 'Signets',
  highlights: 'Surlignages',
  documentInfo: 'Infos document',
  noBookmarks: 'Aucun signet',
  pageOf: 'Page {current} sur {total}',
  pageShort: 'Page {page}',
  pageRef: 'Page {page}',
  prev: 'Page précédente',
  next: 'Page suivante',
  zoomIn: 'Zoom avant',
  zoomOut: 'Zoom arrière',
  fitWidth: 'Largeur',
  search: 'Rechercher',
  highlight: 'Surligner',
  addNote: 'Ajouter une note',
  bookmark: 'Signet',
  askJuriaShort: 'Demander à Juria',
  share: 'Partager',
  copy: 'Copier',
  openTab: 'Ouvrir dans un onglet',
  download: 'Télécharger',
  noFile: 'Aucun fichier disponible pour ce document.',
  tabNotes: 'Notes',
  tabJuria: 'Juria',
  tabShare: 'Partager',
  newNote: 'Nouvelle note',
  untitledNote: 'Note sans titre',
  noteTitle: 'Titre de la note',
  noteContent: 'Rédigez votre note…',
  noteTags: 'Tags (séparés par des virgules)',
  attachSelection: 'Joindre le texte sélectionné',
  emptyNotes: 'Aucune note. Capturez vos idées pendant la lecture.',
  noteSaved: 'Note enregistrée',
  addToCase: 'Ajouter au dossier',
  addToCaseTitle: 'Ajouter cette note à un dossier',
  searchCases: 'Rechercher des dossiers…',
  noCases: 'Aucun dossier trouvé',
  addedToCase: 'Note ajoutée à {ref} · Liée à la page {page}',
  save: 'Enregistrer',
  cancel: 'Annuler',
  delete: 'Supprimer',
  send: 'Envoyer',
  loading: 'Chargement…',
  sampleHighlight: 'Passage sélectionné',
  juriaTitle: 'Juria',
  juriaSubtitle: 'Assistante juridique IA',
  context: 'Contexte Juria',
  askJuria: 'Demandez à Juria à propos de ce document…',
  ask: 'Demander à Juria',
  juriaThinking: 'Juria analyse le document…',
  draftResponse: 'Brouillon de réponse',
  sources: 'Sources',
  supportedBySources: 'Appuyé par les documents cités',
  verifyBeforeRelying: 'À vérifier avant de s’y fier',
  addToNote: 'Ajouter à une note',
  juriaNoteTitle: 'Analyse Juria',
  highlightedPassage: 'Passage surligné',
  summarizePage: 'Résumer cette page',
  summarizeDoc: 'Résumer ce document',
  explainClause: 'Expliquer cette clause',
  findProvisions: 'Trouver des dispositions pertinentes',
  identifyRisks: 'Identifier les risques',
  prepareResponse: 'Préparer une réponse',
  draftArgument: 'Rédiger un argument',
  createCaseNote: 'Créer une note de dossier',
  juriaPageAnswer:
    'D’après {title} (page {page} sur {total}), voici une analyse initiale pour : « {question} ».\n\nCe brouillon s’appuie sur le document ouvert. Traitez toute conclusion juridique comme provisoire jusqu’à vérification des passages cités.',
  juriaSelectionAnswer:
    'Concernant le texte sélectionné à la page {page} de {title} :\n\n« {selection} »\n\nCe passage semble pertinent. Confirmez les pages environnantes et la correspondance liée avant toute conclusion.',
  juriaDisabled: 'Juria est désactivée ou indisponible. Activez VITE_JURIA_ENABLED et vérifiez le backend.',
  juriaAskFailed: 'Juria n’a pas pu répondre. Réessayez.',
  ocrThisPage: 'OCR cette page',
  ocrRunning: 'Lecture de la page scannée (OCR)…',
  ocrProgress: 'OCR page {page} ({current}/{total}) — {pct} %',
  ocrDone: 'OCR terminé — le texte est prêt pour Juria.',
  ocrFailed:
    'Impossible de lire le texte de cette page (échec OCR). Essayez un scan plus net ou collez le passage.',
  ocrHint: 'Aucun texte sélectionnable. Utilisez l’OCR pour les pages scannées.',
  sendTo: 'Envoyer à',
  sendHint: 'Partagez une note, un surlignage ou un extrait sans quitter le mode lecture.',
  searchColleague: 'Rechercher un collègue…',
  noColleagues: 'Aucun collègue trouvé',
  colleague: 'collègue',
  message: 'Message',
  messagePlaceholder: 'Merci de revoir cette section…',
  attachment: 'Pièce jointe',
  sentTo: 'Envoyé à {name}',
};

export const documentReadingAr: DocumentReadingMessages = {
  ...documentReadingEn,
  readingMode: 'وضع القراءة',
  back: 'رجوع',
  file: 'ملف',
  searchInDoc: 'البحث داخل المستند…',
  pages: 'الصفحات',
  bookmarks: 'الإشارات المرجعية',
  highlights: 'التمييزات',
  documentInfo: 'معلومات المستند',
  noBookmarks: 'لا توجد إشارات مرجعية',
  pageOf: 'صفحة {current} من {total}',
  pageShort: 'صفحة {page}',
  pageRef: 'صفحة {page}',
  prev: 'الصفحة السابقة',
  next: 'الصفحة التالية',
  zoomIn: 'تكبير',
  zoomOut: 'تصغير',
  fitWidth: 'ملاءمة العرض',
  search: 'بحث',
  highlight: 'تمييز',
  addNote: 'إضافة ملاحظة',
  bookmark: 'إشارة مرجعية',
  askJuriaShort: 'اسأل جوريا',
  share: 'مشاركة',
  copy: 'نسخ',
  openTab: 'فتح في تبويب',
  download: 'تنزيل',
  noFile: 'لا يوجد ملف لهذا المستند.',
  tabNotes: 'ملاحظات',
  tabJuria: 'جوريا',
  tabShare: 'مشاركة',
  newNote: 'ملاحظة جديدة',
  untitledNote: 'ملاحظة بلا عنوان',
  noteTitle: 'عنوان الملاحظة',
  noteContent: 'اكتب ملاحظتك…',
  noteTags: 'وسوم (مفصولة بفواصل)',
  attachSelection: 'إرفاق النص المحدد',
  emptyNotes: 'لا ملاحظات بعد. سجّل أفكارك أثناء القراءة.',
  noteSaved: 'تم حفظ الملاحظة',
  addToCase: 'إضافة إلى القضية',
  addToCaseTitle: 'أضف هذه الملاحظة إلى قضية',
  searchCases: 'البحث في القضايا…',
  noCases: 'لا توجد قضايا',
  addedToCase: 'أُضيفت الملاحظة إلى {ref} · مرتبطة بالصفحة {page}',
  save: 'حفظ',
  cancel: 'إلغاء',
  delete: 'حذف',
  send: 'إرسال',
  loading: 'جارٍ التحميل…',
  sampleHighlight: 'مقطع محدد',
  juriaTitle: 'جوريا',
  juriaSubtitle: 'مساعد قانوني بالذكاء الاصطناعي',
  context: 'سياق جوريا',
  askJuria: 'اسأل جوريا عن هذا المستند…',
  ask: 'اسأل جوريا',
  juriaThinking: 'جوريا تحلّل المستند…',
  draftResponse: 'مسودة رد',
  sources: 'المصادر',
  supportedBySources: 'مدعوم بالمستندات المذكورة',
  verifyBeforeRelying: 'تحقق قبل الاعتماد على هذا الاستنتاج',
  addToNote: 'إضافة إلى ملاحظة',
  juriaNoteTitle: 'تحليل جوريا',
  highlightedPassage: 'مقطع مميز',
  summarizePage: 'لخّص هذه الصفحة',
  summarizeDoc: 'لخّص هذا المستند',
  explainClause: 'اشرح هذا البند',
  findProvisions: 'ابحث عن أحكام ذات صلة',
  identifyRisks: 'حدد المخاطر',
  prepareResponse: 'أعد ردًا',
  draftArgument: 'صغ حجة قانونية',
  createCaseNote: 'أنشئ ملاحظة قضية',
  juriaPageAnswer:
    'بناءً على {title} (صفحة {page} من {total})، هذا تحليل أولي لـ: «{question}».\n\nهذه المسودة مستندة إلى سياق المستند المفتوح. اعتبر الاستنتاجات القانونية مؤقتة حتى التحقق من المقاطع المذكورة.',
  juriaSelectionAnswer:
    'بخصوص النص المحدد في الصفحة {page} من {title}:\n\n«{selection}»\n\nيبدو هذا المقطع مهمًا. أكّد الصفحات المحيطة والمراسلات ذات الصلة قبل أي استنتاج.',
  juriaDisabled: 'جوريا معطّلة أو غير متاحة. فعّل VITE_JURIA_ENABLED وتحقق من الخادم.',
  juriaAskFailed: 'تعذّر على جوريا الإجابة. حاول مجددًا.',
  ocrThisPage: 'تعرّف ضوئي لهذه الصفحة',
  ocrRunning: 'جارٍ قراءة الصفحة الممسوحة ضوئيًا…',
  ocrProgress: 'تعرّف الصفحة {page} ({current}/{total}) — {pct}%',
  ocrDone: 'اكتمل التعرّف الضوئي — النص جاهز لجوريا.',
  ocrFailed:
    'تعذّر قراءة نص هذه الصفحة (فشل التعرّف الضوئي). جرّب مسحًا أوضح أو الصق المقطع.',
  ocrHint: 'لا يوجد نص قابل للتحديد. استخدم التعرّف الضوئي للصفحات الممسوحة.',
  sendTo: 'إرسال إلى',
  sendHint: 'شارك ملاحظة أو تمييزًا أو مقتطفًا دون مغادرة وضع القراءة.',
  searchColleague: 'البحث عن زميل…',
  noColleagues: 'لا يوجد زملاء',
  colleague: 'زميل',
  message: 'رسالة',
  messagePlaceholder: 'يرجى مراجعة هذا القسم…',
  attachment: 'مرفق',
  sentTo: 'أُرسل إلى {name}',
};
