/**
 * Formats a number as Moroccan Dirham currency.
 * Uses space as thousands separator, comma as decimal separator.
 */
export const formatMAD = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  return (
    new Intl.NumberFormat('fr-MA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' MAD'
  );
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
