import { formatDate, formatDateTime } from '@/i18n/format';
import { detectInitialLanguage } from '@/i18n/locale';
import { getMessages } from '@/i18n/messages';

/** Display date as "27 Mar 2026" (locale-aware month). */
export function formatDrawerDate(iso: string | Date | null | undefined): string {
  if (iso == null || iso === '') return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return formatDate(d, detectInitialLanguage(), { month: 'short' }) || '—';
}

/** Date + time for scheduling fields */
export function formatDrawerDateTime(iso: string | Date | null | undefined): string {
  if (iso == null || iso === '') return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return formatDateTime(d, detectInitialLanguage()) || '—';
}

/** Last updated line in footer */
export function formatDrawerMetaDate(iso: string | Date | null | undefined): string {
  return formatDrawerDateTime(iso);
}

export function formatUserDisplayName(u: API.User | null | undefined): string {
  if (u == null) return '—';
  const n = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  return n || u.email || '—';
}

/** ISO string for last update, or null if not provided */
export function getCaseUpdatedAtIso(c: API.Case): string | null {
  const r = c as Record<string, unknown>;
  const v = r.updated_at ?? r.updatedAt ?? r.updated ?? r.modified;
  if (typeof v === 'string' && v.trim() !== '') return v;
  return null;
}

export function getCaseUpdatedByUser(c: API.Case): API.User | null | undefined {
  const r = c as Record<string, unknown>;
  const u = r.updated_by ?? r.updatedBy;
  if (u != null && typeof u === 'object' && 'id' in (u as object)) return u as API.User;
  return undefined;
}

export const em = (v: unknown): string => {
  if (v == null || v === '') return '—';
  if (typeof v === 'string' && v.trim() === '') return '—';
  if (typeof v === 'boolean') {
    const c = getMessages(detectInitialLanguage()).common;
    return v ? c.yes : c.no;
  }
  return String(v);
};
