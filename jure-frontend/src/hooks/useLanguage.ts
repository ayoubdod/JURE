import { useEffect, useState } from 'react';

export type Lang = 'en' | 'fr' | 'ar';

const STORAGE_KEY = 'lang';

const detectInitialLanguage = (): Lang => {
  if (typeof window === 'undefined') return 'en';

  const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
  if (stored === 'en' || stored === 'fr' || stored === 'ar') {
    return stored;
  }

  const nav = (window.navigator.language || 'en').toLowerCase();
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('ar')) return 'ar';
  return 'en';
};

const applyLanguage = (lang: Lang) => {
  if (typeof document === 'undefined') return;

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const htmlLang = lang;

  document.documentElement.setAttribute('lang', htmlLang);
  document.documentElement.setAttribute('dir', dir);
};

/**
 * Centralized language hook that:
 * - Initializes from localStorage or browser language
 * - Applies `lang` and `dir` to document.documentElement
 * - Listens to localStorage and custom events for cross-tab & in-tab sync
 */
export const useLanguage = () => {
  const [lang, setLangState] = useState<Lang>(detectInitialLanguage);

  // Initialize on mount
  useEffect(() => {
    const initial = detectInitialLanguage();
    setLangState(initial);
    applyLanguage(initial);
  }, []);

  // Listen to localStorage changes (other tabs)
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        const next = event.newValue as Lang;
        if (next === 'en' || next === 'fr' || next === 'ar') {
          setLangState(next);
          applyLanguage(next);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Listen to custom language-change events (same tab)
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ lang: Lang }>;
      const next = custom.detail?.lang;
      if (next === 'en' || next === 'fr' || next === 'ar') {
        setLangState(next);
        applyLanguage(next);
      }
    };

    window.addEventListener('language-change', handler as EventListener);
    return () => window.removeEventListener('language-change', handler as EventListener);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
      applyLanguage(next);
      window.dispatchEvent(
        new CustomEvent('language-change', {
          detail: { lang: next },
        }),
      );
    }
  };

  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

  return { lang, setLang, dir };
};







