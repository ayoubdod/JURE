/** Supported UI locales — single source of truth for SaaS + marketing. */
export const LOCALES = ['en', 'fr', 'ar'] as const;
export type Lang = (typeof LOCALES)[number];

export const DEFAULT_LANG: Lang = 'en';
export const RTL_LANGS: readonly Lang[] = ['ar'];

export const LANG_STORAGE_KEY = 'lang';

export function isLang(value: string | null | undefined): value is Lang {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function dirForLang(lang: Lang): 'ltr' | 'rtl' {
  return RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}

/** Native endonym labels for language switchers. */
export const LANG_NATIVE_LABELS: Record<Lang, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
};

/** BCP 47 tags for Intl date/number formatting (Morocco-aware). */
export const INTL_LOCALE: Record<Lang, string> = {
  en: 'en-MA',
  fr: 'fr-MA',
  ar: 'ar-MA',
};
