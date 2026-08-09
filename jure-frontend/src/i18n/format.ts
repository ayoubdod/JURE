import { INTL_LOCALE, type Lang } from './types';

export function intlLocale(lang: Lang): string {
  return INTL_LOCALE[lang] ?? INTL_LOCALE.en;
}

export function formatDate(
  value: Date | string | number,
  lang: Lang,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(date);
}

export function formatDateTime(
  value: Date | string | number,
  lang: Lang,
  options?: Intl.DateTimeFormatOptions,
): string {
  return formatDate(value, lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function formatTime(
  value: Date | string | number,
  lang: Lang,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(date);
}

export function formatNumber(
  value: number,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(intlLocale(lang), options).format(value);
}

export function formatPercent(
  value: number,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
): string {
  return formatNumber(value, lang, {
    style: 'percent',
    maximumFractionDigits: 1,
    ...options,
  });
}

/**
 * Locale-aware currency formatting. Does not change the numeric value —
 * only presentation. Defaults to MAD (JURE Morocco).
 */
export function formatCurrency(
  amount: number | null | undefined,
  lang: Lang,
  currency = 'MAD',
  options?: Intl.NumberFormatOptions,
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return '—';
  }
  return new Intl.NumberFormat(intlLocale(lang), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

export function formatRelativeTime(
  value: Date | string | number,
  lang: Lang,
  now: Date = new Date(),
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(lang), { numeric: 'auto' });

  if (abs < 60) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, 'month');
  return rtf.format(Math.round(diffMonth / 12), 'year');
}

/** Simple `{name}` / `{{name}}` interpolation for message templates. */
export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (_, a, b) => {
    const key = (a || b) as string;
    const val = vars[key];
    return val === undefined || val === null ? '' : String(val);
  });
}
