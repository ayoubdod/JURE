import { useEffect, useState } from 'react';
import type { Lang } from '@/i18n/types';
import {
  applyDocumentLanguage,
  detectInitialLanguage,
  persistLanguage,
} from '@/i18n/locale';
import { dirForLang, isLang, LANG_STORAGE_KEY } from '@/i18n/types';

export type { Lang };

/**
 * Centralized language hook that:
 * - Initializes from localStorage or browser language
 * - Applies `lang` and `dir` to document.documentElement
 * - Listens to localStorage and custom events for cross-tab & in-tab sync
 */
export const useLanguage = () => {
  const [lang, setLangState] = useState<Lang>(detectInitialLanguage);

  useEffect(() => {
    const initial = detectInitialLanguage();
    setLangState(initial);
    applyDocumentLanguage(initial);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LANG_STORAGE_KEY && event.newValue && isLang(event.newValue)) {
        setLangState(event.newValue);
        applyDocumentLanguage(event.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ lang: Lang }>;
      const next = custom.detail?.lang;
      if (isLang(next)) {
        setLangState(next);
        applyDocumentLanguage(next);
      }
    };

    window.addEventListener('language-change', handler as EventListener);
    return () => window.removeEventListener('language-change', handler as EventListener);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    persistLanguage(next);
  };

  return { lang, setLang, dir: dirForLang(lang) };
};
