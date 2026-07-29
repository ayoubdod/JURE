import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/hooks/useLanguage';

interface AppMessages {
  sidebar: {
    dashboard: string;
    team: string;
    library: string;
    cases: string;
    clients: string;
    calendar: string;
    conversations: string;
    settings: string;
    legalAi: string;
    profile: string;
    myProfile: string;
    notifications: string;
    help: string;
    contactSupport: string;
    upgradeTitle: string;
    upgradeSubtitle: string;
    upgradeCta: string;
    logout: string;
  };
  header: {
    searchPlaceholder: string;
    searchSearching: string;
    searchTypeMore: string;
    searchNoResults: string;
    searchNoResultsHint: string;
    searchCasesLabel: string;
    searchClientsLabel: string;
    searchTasksLabel: string;
    searchNoDescription: string;
    messagesTitle: string;
    messagesUnreadSuffix: string;
    messagesViewAll: string;
    messagesOpenConversations: string;
    notificationsTitle: string;
    notificationsEmptyTitle: string;
    notificationsEmptySubtitle: string;
    notificationsViewAll: string;
  };
  auth: {
    signInTitle: string;
    signInSubtitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    emailOrPhoneLabel: string;
    emailOrPhonePlaceholder: string;
    emailRequired: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    signInButton: string;
    forgotPassword: string;
    noAccount: string;
    signUp: string;
    or: string;
    backToHome: string;
    footerRights: string;
    emailVerifiedTitle: string;
    emailVerifiedDescription: string;
    loginSuccessTitle: string;
    loginSuccessDescription: string;
    loginErrorTitle: string;
    loginErrorDescription: string;
    loginUnverifiedTitle: string;
    loginUnverifiedDescription: string;
    loginPhoneUnverifiedDescription: string;
    loginAccountDisabledDescription: string;
    loginInvalidCredentialsDescription: string;
  };
  document: {
    videoNotSupported: string;
    pdfErrorMessage: string;
    openInNewWindow: string;
    download: string;
    noPreviewTitle: string;
    openFile: string;
  };
  settings: {
    languageSectionTitle: string;
    languageSectionDescription: string;
    languageCurrentLabel: (langName: string) => string;
    languageHint: string;
  };
  common: {
    languageNames: Record<Lang, string>;
  };
}

const messages: Record<Lang, AppMessages> = {
  en: {
    sidebar: {
      dashboard: 'Dashboard',
      team: 'Team management',
      library: 'Library',
      cases: 'My Cases',
      clients: 'Clients',
      calendar: 'Calendar',
      conversations: 'Conversations',
      settings: 'Settings',
      legalAi: 'Juria',
      profile: 'Profile',
      myProfile: 'My Profile',
      notifications: 'Notifications',
      help: 'Help',
      contactSupport: 'Contact Support',
      upgradeTitle: 'Upgrade',
      upgradeSubtitle: 'Premium features',
      upgradeCta: 'Learn more →',
      logout: 'Logout',
    },
    header: {
      searchPlaceholder: 'Search cases, clients, tasks...',
      searchSearching: 'Searching...',
      searchTypeMore: 'Type at least 2 characters to search',
      searchNoResults: 'No results found',
      searchNoResultsHint: 'Try different keywords',
      searchCasesLabel: 'Cases',
      searchClientsLabel: 'Clients',
      searchTasksLabel: 'Tasks',
      searchNoDescription: 'No description',
      messagesTitle: 'Messages',
      messagesUnreadSuffix: 'unread',
      messagesViewAll: 'View All',
      messagesOpenConversations: 'Open Conversations',
      notificationsTitle: 'Notifications',
      notificationsEmptyTitle: 'No notifications',
      notificationsEmptySubtitle: "You're all caught up!",
      notificationsViewAll: 'View all notifications',
    },
    auth: {
      signInTitle: 'Sign in',
      signInSubtitle: 'Access your Jure account',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      emailOrPhoneLabel: 'Email or phone',
      emailOrPhonePlaceholder: 'you@example.com or +212612345678',
      emailRequired: 'Email or phone is required',
      passwordLabel: 'Password',
      passwordPlaceholder: '••••••••',
      signInButton: 'Sign in',
      forgotPassword: 'Forgot password?',
      noAccount: "Don’t have an account yet?",
      signUp: 'Sign up',
      or: 'or',
      backToHome: 'Back to home',
      footerRights: 'All rights reserved.',
      emailVerifiedTitle: 'Email successfully verified',
      emailVerifiedDescription: 'You can now sign in.',
      loginSuccessTitle: 'Login successful',
      loginSuccessDescription: 'Welcome to Jure!',
      loginErrorTitle: 'Login error',
      loginErrorDescription: 'Check your credentials.',
      loginUnverifiedTitle: 'Email not verified',
      loginUnverifiedDescription: 'Please verify your email to access your account.',
      loginPhoneUnverifiedDescription: 'Please verify your phone number to access your account.',
      loginAccountDisabledDescription: 'Your account has been disabled. Please contact support.',
      loginInvalidCredentialsDescription: 'Unable to log in with provided credentials.',
    },
    document: {
      videoNotSupported: 'Your browser does not support the video tag.',
      pdfErrorMessage: 'Unable to display PDF in preview. Please open it in a new window.',
      openInNewWindow: 'Open in New Window',
      download: 'Download',
      noPreviewTitle: 'No preview available for this file type.',
      openFile: 'Open File',
    },
    settings: {
      languageSectionTitle: 'Language & region',
      languageSectionDescription: 'Choose the language used across Jure.',
      languageCurrentLabel: (langName: string) => `Current language: ${langName}`,
      languageHint: 'Language applies to menus, navigation and main actions.',
    },
    common: {
      languageNames: {
        en: 'English',
        fr: 'French',
        ar: 'Arabic',
      },
    },
  },
  fr: {
    sidebar: {
      dashboard: 'Tableau de bord',
      team: 'Gestion de l’équipe',
      library: 'Bibliothèque',
      cases: 'Mes dossiers',
      clients: 'Clients',
      calendar: 'Calendrier',
      conversations: 'Conversations',
      settings: 'Paramètres',
      legalAi: 'Juria',
      profile: 'Profil',
      myProfile: 'Mon profil',
      notifications: 'Notifications',
      help: 'Aide',
      contactSupport: 'Contacter le support',
      upgradeTitle: 'Mise à niveau',
      upgradeSubtitle: 'Fonctionnalités premium',
      upgradeCta: 'En savoir plus →',
      logout: 'Déconnexion',
    },
    header: {
      searchPlaceholder: 'Rechercher dossiers, clients, tâches...',
      searchSearching: 'Recherche...',
      searchTypeMore: 'Saisissez au moins 2 caractères pour rechercher',
      searchNoResults: 'Aucun résultat trouvé',
      searchNoResultsHint: 'Essayez avec d’autres mots-clés',
      searchCasesLabel: 'Dossiers',
      searchClientsLabel: 'Clients',
      searchTasksLabel: 'Tâches',
      searchNoDescription: 'Pas de description',
      messagesTitle: 'Messages',
      messagesUnreadSuffix: 'non lus',
      messagesViewAll: 'Tout voir',
      messagesOpenConversations: 'Ouvrir les conversations',
      notificationsTitle: 'Notifications',
      notificationsEmptyTitle: 'Aucune notification',
      notificationsEmptySubtitle: 'Vous êtes à jour !',
      notificationsViewAll: 'Voir toutes les notifications',
    },
    auth: {
      signInTitle: 'Connexion',
      signInSubtitle: 'Accédez à votre compte Jure',
      emailLabel: 'Email',
      emailPlaceholder: 'exemple@email.com',
      emailOrPhoneLabel: 'Email ou téléphone',
      emailOrPhonePlaceholder: 'exemple@email.com ou +212612345678',
      emailRequired: "L'email ou le téléphone est requis",
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: '••••••••',
      signInButton: 'Connexion',
      forgotPassword: 'Mot de passe oublié ?',
      noAccount: 'Pas encore de compte ?',
      signUp: "S'inscrire",
      or: 'ou',
      backToHome: "Retour à l’accueil",
      footerRights: 'Tous droits réservés.',
      emailVerifiedTitle: 'Email vérifié avec succès',
      emailVerifiedDescription: 'Vous pouvez maintenant vous connecter.',
      loginSuccessTitle: 'Connexion réussie',
      loginSuccessDescription: 'Bienvenue dans Jure !',
      loginErrorTitle: 'Erreur de connexion',
      loginErrorDescription: 'Vérifiez vos identifiants.',
      loginUnverifiedTitle: 'Email non vérifié',
      loginUnverifiedDescription: 'Veuillez vérifier votre email pour accéder à votre compte.',
      loginPhoneUnverifiedDescription: 'Veuillez vérifier votre numéro de téléphone pour accéder à votre compte.',
      loginAccountDisabledDescription: 'Votre compte a été désactivé. Veuillez contacter le support.',
      loginInvalidCredentialsDescription: 'Impossible de se connecter avec les identifiants fournis.',
    },
    document: {
      videoNotSupported: 'Votre navigateur ne prend pas en charge la balise vidéo.',
      pdfErrorMessage: 'Impossible d’afficher le PDF dans l’aperçu. Veuillez l’ouvrir dans une nouvelle fenêtre.',
      openInNewWindow: 'Ouvrir dans une nouvelle fenêtre',
      download: 'Télécharger',
      noPreviewTitle: "Aucun aperçu disponible pour ce type de fichier.",
      openFile: 'Ouvrir le fichier',
    },
    settings: {
      languageSectionTitle: 'Langue et région',
      languageSectionDescription: 'Choisissez la langue utilisée dans Jure.',
      languageCurrentLabel: (langName: string) => `Langue actuelle : ${langName}`,
      languageHint: 'La langue s’applique aux menus, à la navigation et aux actions principales.',
    },
    common: {
      languageNames: {
        en: 'Anglais',
        fr: 'Français',
        ar: 'Arabe',
      },
    },
  },
  ar: {
    sidebar: {
      dashboard: 'لوحة التحكم',
      team: 'إدارة الفريق',
      library: 'المكتبة',
      cases: 'القضايا الخاصة بي',
      clients: 'العملاء',
      calendar: 'التقويم',
      conversations: 'المحادثات',
      settings: 'الإعدادات',
      legalAi: 'جوريا',
      profile: 'الملف الشخصي',
      myProfile: 'ملفي الشخصي',
      notifications: 'الإشعارات',
      help: 'المساعدة',
      contactSupport: 'الاتصال بالدعم',
      upgradeTitle: 'الترقية',
      upgradeSubtitle: 'ميزات احترافية',
      upgradeCta: 'اعرف المزيد →',
      logout: 'تسجيل الخروج',
    },
    header: {
      searchPlaceholder: 'ابحث في القضايا والعملاء والمهام...',
      searchSearching: 'جارٍ البحث...',
      searchTypeMore: 'اكتب على الأقل حرفين للبحث',
      searchNoResults: 'لا توجد نتائج',
      searchNoResultsHint: 'جرّب كلمات مفتاحية أخرى',
      searchCasesLabel: 'القضايا',
      searchClientsLabel: 'العملاء',
      searchTasksLabel: 'المهام',
      searchNoDescription: 'لا يوجد وصف',
      messagesTitle: 'الرسائل',
      messagesUnreadSuffix: 'غير مقروءة',
      messagesViewAll: 'عرض الكل',
      messagesOpenConversations: 'فتح المحادثات',
      notificationsTitle: 'الإشعارات',
      notificationsEmptyTitle: 'لا توجد إشعارات',
      notificationsEmptySubtitle: 'أنت على اطلاع كامل!',
      notificationsViewAll: 'عرض كل الإشعارات',
    },
    auth: {
      signInTitle: 'تسجيل الدخول',
      signInSubtitle: 'ادخل إلى حسابك على Jure',
      emailLabel: 'البريد الإلكتروني',
      emailPlaceholder: 'you@example.com',
      emailOrPhoneLabel: 'البريد الإلكتروني أو الهاتف',
      emailOrPhonePlaceholder: 'you@example.com أو +212612345678',
      emailRequired: 'البريد الإلكتروني أو رقم الهاتف مطلوب',
      passwordLabel: 'كلمة المرور',
      passwordPlaceholder: '••••••••',
      signInButton: 'تسجيل الدخول',
      forgotPassword: 'نسيت كلمة المرور؟',
      noAccount: 'ليس لديك حساب بعد؟',
      signUp: 'إنشاء حساب',
      or: 'أو',
      backToHome: 'العودة إلى الصفحة الرئيسية',
      footerRights: 'جميع الحقوق محفوظة.',
      emailVerifiedTitle: 'تم التحقق من البريد الإلكتروني بنجاح',
      emailVerifiedDescription: 'يمكنك الآن تسجيل الدخول.',
      loginSuccessTitle: 'تم تسجيل الدخول بنجاح',
      loginSuccessDescription: 'مرحبًا بك في Jure!',
      loginErrorTitle: 'خطأ في تسجيل الدخول',
      loginErrorDescription: 'يرجى التحقق من بيانات الدخول.',
      loginUnverifiedTitle: 'لم يتم التحقق من البريد الإلكتروني',
      loginUnverifiedDescription: 'يرجى التحقق من بريدك الإلكتروني للوصول إلى حسابك.',
      loginPhoneUnverifiedDescription: 'يرجى التحقق من رقم هاتفك للوصول إلى حسابك.',
      loginAccountDisabledDescription: 'تم تعطيل حسابك. يرجى الاتصال بالدعم.',
      loginInvalidCredentialsDescription: 'تعذر تسجيل الدخول باستخدام بيانات الاعتماد المقدمة.',
    },
    document: {
      videoNotSupported: 'متصفحك لا يدعم تشغيل الفيديو.',
      pdfErrorMessage: 'تعذر عرض ملف PDF في المعاينة. يرجى فتحه في نافذة جديدة.',
      openInNewWindow: 'فتح في نافذة جديدة',
      download: 'تحميل',
      noPreviewTitle: 'لا تتوفر معاينة لهذا النوع من الملفات.',
      openFile: 'فتح الملف',
    },
    settings: {
      languageSectionTitle: 'اللغة والمنطقة',
      languageSectionDescription: 'اختر اللغة المستخدمة في Jure.',
      languageCurrentLabel: (langName: string) => `اللغة الحالية: ${langName}`,
      languageHint: 'تنطبق اللغة على القوائم والتنقل والإجراءات الرئيسية.',
    },
    common: {
      languageNames: {
        en: 'الإنجليزية',
        fr: 'الفرنسية',
        ar: 'العربية',
      },
    },
  },
};

export const useAppTranslation = () => {
  const { lang, setLang, dir } = useLanguage();
  const t = messages[lang];

  return {
    lang,
    setLang,
    dir,
    t,
  };
};







