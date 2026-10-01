/** Shared client portal + consultation request copy (en / fr / ar). */
export type ClientPortalMessages = {
  title: string;
  nav: {
    aria: string;
    home: string;
    cases: string;
    consultations: string;
    messages: string;
    documents: string;
    notifications: string;
    profile: string;
    logout: string;
    openMenu: string;
    closeMenu: string;
  };
  cta: { requestConsultation: string };
  common: {
    view: string;
    viewAll: string;
    back: string;
    download: string;
  };
  home: {
    greeting: string;
    subtitle: string;
    activeCases: string;
    pendingRequests: string;
    unreadMessages: string;
    myCases: string;
    myConsultations: string;
  };
  cases: {
    title: string;
    subtitle: string;
    viewCase: string;
    lawFirm: string;
    lawyer: string;
    lastUpdate: string;
    type: string;
    opened: string;
    timeline: string;
    documents: string;
    updates: string;
    requiredActions: string;
  };
  consultations: {
    title: string;
    subtitle: string;
  };
  form: {
    title: string;
    subtitle: string;
    subject: string;
    subjectPlaceholder: string;
    subjectRequired: string;
    legalArea: string;
    description: string;
    descriptionPlaceholder: string;
    descriptionRequired: string;
    relatedCase: string;
    noRelatedCase: string;
    format: string;
    availability: string;
    availabilityPlaceholder: string;
    documents: string;
    documentsHint: string;
    submit: string;
    submitting: string;
    successTitle: string;
    successBody: string;
  };
  detail: {
    confirmedTitle: string;
    confirmedBody: string;
    joinChat: string;
    lawyer: string;
    timeline: string;
    comments: string;
    commentPlaceholder: string;
    sendComment: string;
  };
  messages: { title: string; subtitle: string };
  documents: { title: string; subtitle: string };
  notifications: { title: string; subtitle: string };
  profile: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    phone: string;
    firm: string;
  };
  empty: {
    noCasesTitle: string;
    noCasesBody: string;
    noConsultationsTitle: string;
    noConsultationsBody: string;
    noMessagesTitle: string;
    noMessagesBody: string;
    noDocuments: string;
    noTimeline: string;
    noUpdates: string;
    noActions: string;
    noComments: string;
  };
  errors: { loadFailed: string; submitFailed: string };
  status: Record<string, string>;
  legalAreas: Record<string, string>;
  formats: Record<string, string>;
  events: Record<string, string>;
  admin: {
    navLabel: string;
    listTitle: string;
    listSubtitle: string;
    columns: {
      client: string;
      subject: string;
      legalArea: string;
      submitted: string;
      status: string;
      lawyer: string;
      priority: string;
      actions: string;
    };
    filters: {
      status: string;
      allStatuses: string;
      search: string;
    };
    detailTitle: string;
    clientSection: string;
    requestSection: string;
    actionPanel: string;
    assignLawyer: string;
    selectLawyer: string;
    assign: string;
    confirm: string;
    decline: string;
    setStatus: string;
    clientComment: string;
    internalNote: string;
    addComment: string;
    priority: string;
    openChat: string;
  };
};

export const clientPortalEn: ClientPortalMessages = {
  title: 'Client portal',
  nav: {
    aria: 'Client navigation',
    home: 'Home',
    cases: 'My cases',
    consultations: 'My consultations',
    messages: 'Messages',
    documents: 'Documents',
    notifications: 'Notifications',
    profile: 'My profile',
    logout: 'Log out',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  cta: { requestConsultation: 'Request a consultation' },
  common: { view: 'View', viewAll: 'View all', back: 'Back', download: 'Download' },
  home: {
    greeting: 'Hello, {name}',
    subtitle: 'Here is an overview of your matters and requests with your law firm.',
    activeCases: 'Active cases',
    pendingRequests: 'Pending requests',
    unreadMessages: 'Unread messages',
    myCases: 'My cases',
    myConsultations: 'My consultations',
  },
  cases: {
    title: 'My cases',
    subtitle: 'Matters managed by your law firm.',
    viewCase: 'View case',
    lawFirm: 'Law firm',
    lawyer: 'Assigned lawyer',
    lastUpdate: 'Last update',
    type: 'Type',
    opened: 'Opened',
    timeline: 'Timeline',
    documents: 'Documents',
    updates: 'Updates',
    requiredActions: 'Actions required',
  },
  consultations: {
    title: 'My consultations',
    subtitle: 'Track the status of your consultation requests.',
  },
  form: {
    title: 'Request a consultation',
    subtitle: 'Describe your legal question. Your firm will review and assign a lawyer.',
    subject: 'Subject',
    subjectPlaceholder: 'e.g. Dispute regarding a commercial contract',
    subjectRequired: 'Subject is required',
    legalArea: 'Legal area',
    description: 'Description',
    descriptionPlaceholder: 'Briefly describe your situation and legal question.',
    descriptionRequired: 'Please provide a short description (at least 20 characters).',
    relatedCase: 'Related case',
    noRelatedCase: 'No related case',
    format: 'Preferred format',
    availability: 'Preferred availability',
    availabilityPlaceholder: 'e.g. Weekday mornings',
    documents: 'Documents',
    documentsHint: 'Only attach documents necessary for reviewing your request.',
    submit: 'Submit request',
    submitting: 'Sending…',
    successTitle: 'Your request has been sent',
    successBody: 'Reference {ref}. Your firm will review it shortly.',
  },
  detail: {
    confirmedTitle: 'Your consultation is confirmed.',
    confirmedBody: 'You can now join the conversation with your assigned lawyer.',
    joinChat: 'Join conversation',
    lawyer: 'Assigned lawyer',
    timeline: 'Timeline',
    comments: 'Updates from the firm',
    commentPlaceholder: 'Reply to your law firm…',
    sendComment: 'Send',
  },
  messages: {
    title: 'Messages',
    subtitle: 'Secure conversations with your lawyers after a consultation is confirmed.',
  },
  documents: {
    title: 'Documents',
    subtitle: 'Files shared with you by your law firm.',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Updates about your cases and consultations.',
  },
  profile: {
    title: 'My profile',
    subtitle: 'Your contact details as known by your law firm.',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    firm: 'Law firm',
  },
  empty: {
    noCasesTitle: 'No cases yet',
    noCasesBody: 'Your cases will appear here when created by your law firm.',
    noConsultationsTitle: 'No consultations yet',
    noConsultationsBody: 'You have not submitted a consultation request yet.',
    noMessagesTitle: 'No conversations yet',
    noMessagesBody: 'A conversation will appear here once a consultation is confirmed.',
    noDocuments: 'No documents shared yet.',
    noTimeline: 'No timeline events yet.',
    noUpdates: 'No updates yet.',
    noActions: 'Nothing is required from you right now.',
    noComments: 'No comments yet.',
  },
  errors: {
    loadFailed: 'Unable to load this page. Please try again.',
    submitFailed: 'Something went wrong. Please try again.',
  },
  status: {
    SUBMITTED: 'Submitted',
    UNDER_REVIEW: 'Under review',
    NEEDS_INFORMATION: 'Information required',
    ASSIGNED: 'Lawyer assigned',
    CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    DECLINED: 'Declined',
  },
  legalAreas: {
    BUSINESS: 'Business law',
    LABOR: 'Labor law',
    REAL_ESTATE: 'Real estate law',
    COMMERCIAL: 'Commercial law',
    CORPORATE: 'Corporate law',
    TAX: 'Tax law',
    IP: 'Intellectual property',
    DATA_PROTECTION: 'Data protection',
    OTHER: 'Other',
  },
  formats: {
    CHAT: 'JURE Chat',
    VIDEO: 'Video consultation',
    PHONE: 'Phone',
    IN_PERSON: 'In person',
  },
  events: {
    CREATED: 'Request submitted',
    STATUS_CHANGED: 'Status updated',
    LAWYER_ASSIGNED: 'Lawyer assigned',
    COMMENT_ADDED: 'Comment added',
    DOCUMENT_UPLOADED: 'Document uploaded',
    CONFIRMED: 'Consultation confirmed',
    DECLINED: 'Request declined',
    CHAT_ACTIVATED: 'Conversation activated',
    INFORMATION_REQUESTED: 'Additional information requested',
  },
  admin: {
    navLabel: 'Consultation requests',
    listTitle: 'Consultation requests',
    listSubtitle: 'Review, assign and confirm client consultation requests.',
    columns: {
      client: 'Client',
      subject: 'Subject',
      legalArea: 'Legal area',
      submitted: 'Submitted',
      status: 'Status',
      lawyer: 'Lawyer',
      priority: 'Priority',
      actions: 'Actions',
    },
    filters: {
      status: 'Status',
      allStatuses: 'All statuses',
      search: 'Search…',
    },
    detailTitle: 'Consultation request',
    clientSection: 'Client',
    requestSection: 'Request',
    actionPanel: 'Actions',
    assignLawyer: 'Assign lawyer',
    selectLawyer: 'Select a lawyer',
    assign: 'Assign',
    confirm: 'Confirm consultation',
    decline: 'Decline',
    setStatus: 'Update status',
    clientComment: 'Client-facing comment',
    internalNote: 'Internal note',
    addComment: 'Add',
    priority: 'Priority',
    openChat: 'Open conversation',
  },
};

export const clientPortalFr: ClientPortalMessages = {
  ...clientPortalEn,
  title: 'Espace client',
  nav: {
    ...clientPortalEn.nav,
    aria: 'Navigation client',
    home: 'Accueil',
    cases: 'Mes dossiers',
    consultations: 'Mes consultations',
    messages: 'Messages',
    documents: 'Documents',
    notifications: 'Notifications',
    profile: 'Mon profil',
    logout: 'Déconnexion',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
  },
  cta: { requestConsultation: 'Demander une consultation' },
  common: { view: 'Voir', viewAll: 'Tout voir', back: 'Retour', download: 'Télécharger' },
  home: {
    greeting: 'Bonjour, {name}',
    subtitle: 'Voici un aperçu de vos dossiers et de vos demandes auprès de votre cabinet.',
    activeCases: 'Dossiers actifs',
    pendingRequests: 'Demandes en attente',
    unreadMessages: 'Messages non lus',
    myCases: 'Mes dossiers',
    myConsultations: 'Mes consultations',
  },
  cases: {
    title: 'Mes dossiers',
    subtitle: 'Dossiers gérés par votre cabinet.',
    viewCase: 'Voir le dossier',
    lawFirm: 'Cabinet',
    lawyer: 'Avocat assigné',
    lastUpdate: 'Dernière mise à jour',
    type: 'Type',
    opened: 'Ouverture',
    timeline: 'Chronologie',
    documents: 'Documents',
    updates: 'Mises à jour',
    requiredActions: 'Actions requises',
  },
  consultations: {
    title: 'Mes consultations',
    subtitle: 'Suivez le statut de vos demandes de consultation.',
  },
  form: {
    title: 'Demander une consultation',
    subtitle: 'Décrivez votre question juridique. Votre cabinet examinera et assignera un avocat.',
    subject: 'Objet',
    subjectPlaceholder: 'Ex. Litige concernant un contrat commercial',
    subjectRequired: 'L’objet est requis',
    legalArea: 'Domaine juridique',
    description: 'Description',
    descriptionPlaceholder: 'Décrivez brièvement votre situation et votre question juridique.',
    descriptionRequired: 'Veuillez fournir une description (20 caractères minimum).',
    relatedCase: 'Dossier lié',
    noRelatedCase: 'Aucun dossier',
    format: 'Format souhaité',
    availability: 'Disponibilités préférées',
    availabilityPlaceholder: 'Ex. Matinées en semaine',
    documents: 'Documents',
    documentsHint: 'Ne transmettez que les documents nécessaires à l’analyse de votre demande.',
    submit: 'Envoyer la demande',
    submitting: 'Envoi…',
    successTitle: 'Votre demande a bien été envoyée',
    successBody: 'Référence {ref}. Votre cabinet l’examinera prochainement.',
  },
  detail: {
    confirmedTitle: 'Votre consultation est confirmée.',
    confirmedBody: 'Vous pouvez rejoindre la conversation avec votre avocat.',
    joinChat: 'Rejoindre la conversation',
    lawyer: 'Avocat assigné',
    timeline: 'Chronologie',
    comments: 'Commentaires du cabinet',
    commentPlaceholder: 'Répondre à votre cabinet…',
    sendComment: 'Envoyer',
  },
  messages: {
    title: 'Messages',
    subtitle: 'Conversations sécurisées avec vos avocats après confirmation.',
  },
  documents: {
    title: 'Documents',
    subtitle: 'Fichiers partagés avec vous par votre cabinet.',
  },
  notifications: {
    title: 'Notifications',
    subtitle: 'Mises à jour concernant vos dossiers et consultations.',
  },
  profile: {
    title: 'Mon profil',
    subtitle: 'Vos coordonnées telles que connues de votre cabinet.',
    name: 'Nom',
    email: 'E-mail',
    phone: 'Téléphone',
    firm: 'Cabinet',
  },
  empty: {
    noCasesTitle: 'Aucun dossier',
    noCasesBody: 'Vos dossiers apparaîtront ici lorsqu’ils seront créés par votre cabinet.',
    noConsultationsTitle: 'Aucune consultation',
    noConsultationsBody: 'Vous n’avez pas encore envoyé de demande de consultation.',
    noMessagesTitle: 'Aucune conversation',
    noMessagesBody: 'Une conversation apparaîtra ici lorsqu’une consultation aura été confirmée.',
    noDocuments: 'Aucun document partagé pour le moment.',
    noTimeline: 'Aucun événement pour le moment.',
    noUpdates: 'Aucune mise à jour pour le moment.',
    noActions: 'Aucune action n’est requise de votre part.',
    noComments: 'Aucun commentaire pour le moment.',
  },
  errors: {
    loadFailed: 'Impossible de charger cette page. Veuillez réessayer.',
    submitFailed: 'Une erreur est survenue. Veuillez réessayer.',
  },
  status: {
    SUBMITTED: 'Demande envoyée',
    UNDER_REVIEW: 'En cours d’examen',
    NEEDS_INFORMATION: 'Informations complémentaires requises',
    ASSIGNED: 'Avocat assigné',
    CONFIRMED: 'Consultation confirmée',
    IN_PROGRESS: 'Consultation en cours',
    COMPLETED: 'Consultation terminée',
    DECLINED: 'Demande refusée',
  },
  legalAreas: {
    BUSINESS: 'Droit des affaires',
    LABOR: 'Droit du travail',
    REAL_ESTATE: 'Droit immobilier',
    COMMERCIAL: 'Droit commercial',
    CORPORATE: 'Droit des sociétés',
    TAX: 'Droit fiscal',
    IP: 'Propriété intellectuelle',
    DATA_PROTECTION: 'Protection des données',
    OTHER: 'Autre',
  },
  formats: {
    CHAT: 'JURE Chat',
    VIDEO: 'Visioconférence',
    PHONE: 'Téléphone',
    IN_PERSON: 'En présentiel',
  },
  events: {
    CREATED: 'Demande envoyée',
    STATUS_CHANGED: 'Statut mis à jour',
    LAWYER_ASSIGNED: 'Avocat assigné',
    COMMENT_ADDED: 'Commentaire ajouté',
    DOCUMENT_UPLOADED: 'Document téléversé',
    CONFIRMED: 'Consultation confirmée',
    DECLINED: 'Demande refusée',
    CHAT_ACTIVATED: 'Conversation activée',
    INFORMATION_REQUESTED: 'Informations complémentaires demandées',
  },
  admin: {
    navLabel: 'Demandes de consultation',
    listTitle: 'Demandes de consultation',
    listSubtitle: 'Examiner, assigner et confirmer les demandes clients.',
    columns: {
      client: 'Client',
      subject: 'Objet',
      legalArea: 'Domaine',
      submitted: 'Envoyée',
      status: 'Statut',
      lawyer: 'Avocat',
      priority: 'Priorité',
      actions: 'Actions',
    },
    filters: {
      status: 'Statut',
      allStatuses: 'Tous les statuts',
      search: 'Rechercher…',
    },
    detailTitle: 'Demande de consultation',
    clientSection: 'Client',
    requestSection: 'Demande',
    actionPanel: 'Actions',
    assignLawyer: 'Assigner un avocat',
    selectLawyer: 'Choisir un avocat',
    assign: 'Assigner',
    confirm: 'Confirmer la consultation',
    decline: 'Refuser',
    setStatus: 'Mettre à jour le statut',
    clientComment: 'Commentaire client',
    internalNote: 'Note interne',
    addComment: 'Ajouter',
    priority: 'Priorité',
    openChat: 'Ouvrir la conversation',
  },
};

export const clientPortalAr: ClientPortalMessages = {
  ...clientPortalEn,
  title: 'بوابة العميل',
  nav: {
    ...clientPortalEn.nav,
    aria: 'تنقل العميل',
    home: 'الرئيسية',
    cases: 'قضاياي',
    consultations: 'استشاراتي',
    messages: 'الرسائل',
    documents: 'المستندات',
    notifications: 'الإشعارات',
    profile: 'ملفي',
    logout: 'تسجيل الخروج',
    openMenu: 'فتح القائمة',
    closeMenu: 'إغلاق القائمة',
  },
  cta: { requestConsultation: 'طلب استشارة' },
  common: { view: 'عرض', viewAll: 'عرض الكل', back: 'رجوع', download: 'تحميل' },
  home: {
    greeting: 'مرحباً، {name}',
    subtitle: 'هذه نظرة عامة على ملفاتك وطلباتك لدى مكتبك القانوني.',
    activeCases: 'قضايا نشطة',
    pendingRequests: 'طلبات قيد الانتظار',
    unreadMessages: 'رسائل غير مقروءة',
    myCases: 'قضاياي',
    myConsultations: 'استشاراتي',
  },
  cases: {
    title: 'قضاياي',
    subtitle: 'الملفات التي يديرها مكتبك القانوني.',
    viewCase: 'عرض الملف',
    lawFirm: 'المكتب',
    lawyer: 'المحامي المعيّن',
    lastUpdate: 'آخر تحديث',
    type: 'النوع',
    opened: 'تاريخ الفتح',
    timeline: 'الجدول الزمني',
    documents: 'المستندات',
    updates: 'التحديثات',
    requiredActions: 'إجراءات مطلوبة',
  },
  consultations: {
    title: 'استشاراتي',
    subtitle: 'تتبع حالة طلبات الاستشارة.',
  },
  form: {
    title: 'طلب استشارة',
    subtitle: 'صف سؤالك القانوني. سيراجع المكتب ويعين محامياً.',
    subject: 'الموضوع',
    subjectPlaceholder: 'مثال: نزاع بشأن عقد تجاري',
    subjectRequired: 'الموضوع مطلوب',
    legalArea: 'المجال القانوني',
    description: 'الوصف',
    descriptionPlaceholder: 'صف بإيجاز وضعك وسؤالك القانوني.',
    descriptionRequired: 'يرجى تقديم وصف قصير (20 حرفاً على الأقل).',
    relatedCase: 'قضية مرتبطة',
    noRelatedCase: 'لا توجد قضية',
    format: 'الصيغة المفضلة',
    availability: 'التوفر المفضل',
    availabilityPlaceholder: 'مثال: صباح أيام الأسبوع',
    documents: 'المستندات',
    documentsHint: 'أرفق فقط المستندات اللازمة لمراجعة طلبك.',
    submit: 'إرسال الطلب',
    submitting: 'جارٍ الإرسال…',
    successTitle: 'تم إرسال طلبك',
    successBody: 'المرجع {ref}. سيراجعه مكتبك قريباً.',
  },
  detail: {
    confirmedTitle: 'تم تأكيد استشارتك.',
    confirmedBody: 'يمكنك الآن الانضمام إلى المحادثة مع محاميك.',
    joinChat: 'الانضمام إلى المحادثة',
    lawyer: 'المحامي المعيّن',
    timeline: 'الجدول الزمني',
    comments: 'تعليقات المكتب',
    commentPlaceholder: 'الرد على مكتبك…',
    sendComment: 'إرسال',
  },
  messages: {
    title: 'الرسائل',
    subtitle: 'محادثات آمنة مع محاميك بعد تأكيد الاستشارة.',
  },
  documents: {
    title: 'المستندات',
    subtitle: 'ملفات شاركها معك مكتبك القانوني.',
  },
  notifications: {
    title: 'الإشعارات',
    subtitle: 'تحديثات حول قضاياك واستشاراتك.',
  },
  profile: {
    title: 'ملفي',
    subtitle: 'بيانات الاتصال كما يعرفها مكتبك.',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    firm: 'المكتب',
  },
  empty: {
    noCasesTitle: 'لا توجد قضايا',
    noCasesBody: 'ستظهر قضاياك هنا عند إنشائها من قبل مكتبك.',
    noConsultationsTitle: 'لا توجد استشارات',
    noConsultationsBody: 'لم ترسل بعد طلب استشارة.',
    noMessagesTitle: 'لا توجد محادثات',
    noMessagesBody: 'ستظهر محادثة هنا عند تأكيد استشارة.',
    noDocuments: 'لا توجد مستندات مشتركة بعد.',
    noTimeline: 'لا أحداث بعد.',
    noUpdates: 'لا تحديثات بعد.',
    noActions: 'لا إجراء مطلوب منك حالياً.',
    noComments: 'لا تعليقات بعد.',
  },
  errors: {
    loadFailed: 'تعذر تحميل هذه الصفحة. حاول مرة أخرى.',
    submitFailed: 'حدث خطأ. حاول مرة أخرى.',
  },
  status: {
    SUBMITTED: 'تم الإرسال',
    UNDER_REVIEW: 'قيد المراجعة',
    NEEDS_INFORMATION: 'معلومات إضافية مطلوبة',
    ASSIGNED: 'تم تعيين محامٍ',
    CONFIRMED: 'مؤكدة',
    IN_PROGRESS: 'قيد التنفيذ',
    COMPLETED: 'مكتملة',
    DECLINED: 'مرفوضة',
  },
  legalAreas: {
    BUSINESS: 'قانون الأعمال',
    LABOR: 'قانون الشغل',
    REAL_ESTATE: 'القانون العقاري',
    COMMERCIAL: 'القانون التجاري',
    CORPORATE: 'قانون الشركات',
    TAX: 'القانون الضريبي',
    IP: 'الملكية الفكرية',
    DATA_PROTECTION: 'حماية البيانات',
    OTHER: 'أخرى',
  },
  formats: {
    CHAT: 'دردشة JURE',
    VIDEO: 'استشارة مرئية',
    PHONE: 'هاتف',
    IN_PERSON: 'حضوري',
  },
  events: {
    CREATED: 'تم إرسال الطلب',
    STATUS_CHANGED: 'تم تحديث الحالة',
    LAWYER_ASSIGNED: 'تم تعيين محامٍ',
    COMMENT_ADDED: 'تمت إضافة تعليق',
    DOCUMENT_UPLOADED: 'تم رفع مستند',
    CONFIRMED: 'تم تأكيد الاستشارة',
    DECLINED: 'تم رفض الطلب',
    CHAT_ACTIVATED: 'تم تفعيل المحادثة',
    INFORMATION_REQUESTED: 'طُلبت معلومات إضافية',
  },
  admin: {
    navLabel: 'طلبات الاستشارة',
    listTitle: 'طلبات الاستشارة',
    listSubtitle: 'مراجعة وتعيين وتأكيد طلبات العملاء.',
    columns: {
      client: 'العميل',
      subject: 'الموضوع',
      legalArea: 'المجال',
      submitted: 'تاريخ الإرسال',
      status: 'الحالة',
      lawyer: 'المحامي',
      priority: 'الأولوية',
      actions: 'إجراءات',
    },
    filters: {
      status: 'الحالة',
      allStatuses: 'كل الحالات',
      search: 'بحث…',
    },
    detailTitle: 'طلب استشارة',
    clientSection: 'العميل',
    requestSection: 'الطلب',
    actionPanel: 'إجراءات',
    assignLawyer: 'تعيين محامٍ',
    selectLawyer: 'اختر محامياً',
    assign: 'تعيين',
    confirm: 'تأكيد الاستشارة',
    decline: 'رفض',
    setStatus: 'تحديث الحالة',
    clientComment: 'تعليق للعميل',
    internalNote: 'ملاحظة داخلية',
    addComment: 'إضافة',
    priority: 'الأولوية',
    openChat: 'فتح المحادثة',
  },
};
