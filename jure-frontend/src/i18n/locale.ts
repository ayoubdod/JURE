import {
  DEFAULT_LANG,
  LANG_STORAGE_KEY,
  dirForLang,
  isLang,
  type Lang,
} from './types';

/** Read persisted locale, then browser, then English. Never overrides an explicit choice. */
export function detectInitialLanguage(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG;

  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // privacy / SSR
  }

  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  if (nav.startsWith('fr')) return 'fr';
  if (nav.startsWith('ar')) return 'ar';
  return DEFAULT_LANG;
}

export function applyDocumentLanguage(lang: Lang): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', dirForLang(lang));
}

export function persistLanguage(lang: Lang): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyDocumentLanguage(lang);
  window.dispatchEvent(
    new CustomEvent('language-change', {
      detail: { lang },
    }),
  );
}

export function readStoredLanguage(): Lang | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(stored) ? stored : null;
  } catch {
    return null;
  }
}
