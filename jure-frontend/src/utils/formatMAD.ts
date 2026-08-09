import { detectInitialLanguage } from '@/i18n/locale';
import { formatCurrency } from '@/i18n/format';
import type { Lang } from '@/i18n/types';

/**
 * Formats a number as Moroccan Dirham currency, using the active UI locale when available.
 */
export const formatMAD = (
  amount: number | null | undefined,
  lang?: Lang,
): string => {
  const locale = lang ?? (typeof window !== 'undefined' ? detectInitialLanguage() : 'fr');
  return formatCurrency(amount, locale, 'MAD');
};

/** Parses backend / fr-MA formatted amounts such as "500 000,00 MAD" into a number. */
export function parseFormattedMADString(input: unknown): number | null {
  if (input == null) return null;
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input !== 'string') return null;
  const cleaned = input
    .replace(/\u00a0/g, ' ')
    .replace(/\s/g, '')
    .replace(/MAD/gi, '')
    .replace(',', '.')
    .trim();
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}
