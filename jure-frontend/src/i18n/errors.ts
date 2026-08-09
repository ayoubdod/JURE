import { getMessages } from './messages';
import type { Lang } from './types';
import { interpolate } from './format';

/**
 * Map backend error codes / known English messages to localized copy.
 * Falls back to generic error — never shows raw translation keys.
 */
export function translateApiError(
  lang: Lang,
  codeOrMessage: string | null | undefined,
  fallback?: string,
): string {
  const t = getMessages(lang);
  if (!codeOrMessage) return fallback ?? t.errors.generic;

  const normalized = codeOrMessage.trim();
  const fromCode = t.errors.codes[normalized] ?? t.errors.codes[normalized.toUpperCase()];
  if (fromCode) return fromCode;

  // Known English backend phrases → codes
  const phraseMap: Record<string, string> = {
    'unable to log in with provided credentials.': 'INVALID_CREDENTIALS',
    'unable to log in with provided credentials': 'INVALID_CREDENTIALS',
    'email not verified': 'EMAIL_NOT_VERIFIED',
    'account disabled': 'ACCOUNT_DISABLED',
  };
  const mapped = phraseMap[normalized.toLowerCase()];
  if (mapped && t.errors.codes[mapped]) return t.errors.codes[mapped];

  return fallback ?? t.errors.generic;
}

export function translateErrorCode(
  lang: Lang,
  code: string,
  vars?: Record<string, string | number>,
): string {
  const t = getMessages(lang);
  const raw = t.errors.codes[code] ?? t.errors.generic;
  return vars ? interpolate(raw, vars) : raw;
}
