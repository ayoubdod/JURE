import { useLanguage } from '@/hooks/useLanguage';
import { getMessages } from './messages';
import { interpolate } from './format';
import { translateEnum, translateKnownEnum, enumOptions } from './enums';
import { translateApiError, translateErrorCode } from './errors';
import type { Lang } from './types';
import type { AppMessages } from './messages/types';

export type { Lang, AppMessages };
export {
  LOCALES,
  DEFAULT_LANG,
  RTL_LANGS,
  LANG_STORAGE_KEY,
  LANG_NATIVE_LABELS,
  INTL_LOCALE,
  isLang,
  dirForLang,
} from './types';
export {
  detectInitialLanguage,
  applyDocumentLanguage,
  persistLanguage,
  readStoredLanguage,
} from './locale';
export {
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber,
  formatPercent,
  formatCurrency,
  formatRelativeTime,
  interpolate,
  intlLocale,
} from './format';
export { LEGAL_GLOSSARY, glossaryTerm } from './glossary';
export type { GlossaryKey } from './glossary';
export { translateEnum, translateKnownEnum, enumOptions } from './enums';
export { translateApiError, translateErrorCode } from './errors';
export { getMessages, messages } from './messages';

/**
 * Primary SaaS translation hook.
 * `t` remains a nested object for existing callers (t.sidebar.dashboard).
 * Helpers cover enums, API errors, and template interpolation.
 */
export const useAppTranslation = () => {
  const { lang, setLang, dir } = useLanguage();
  const t = getMessages(lang);

  return {
    lang,
    setLang,
    dir,
    t,
    /** Interpolate `{name}` placeholders in a message template. */
    tf: (template: string, vars: Record<string, string | number>) =>
      interpolate(template, vars),
    enumLabel: (group: Parameters<typeof translateEnum>[1], value: string | null | undefined) =>
      translateEnum(lang, group, value),
    /** Localized label for any known enum token (status, priority, type, role, …). */
    enumPretty: (value: string | null | undefined) => translateKnownEnum(lang, value),
    enumOptions: (group: Parameters<typeof enumOptions>[1]) => enumOptions(lang, group),
    apiError: (codeOrMessage: string | null | undefined, fallback?: string) =>
      translateApiError(lang, codeOrMessage, fallback),
    errorCode: (code: string, vars?: Record<string, string | number>) =>
      translateErrorCode(lang, code, vars),
  };
};

/** Non-hook access for utilities / scripts. */
export function tFor(lang: Lang): AppMessages {
  return getMessages(lang);
}
