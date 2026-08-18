import { getCaseData, formatDate, getCountdownDays } from '@/utils/caseCardHelpers';

export type BackendCaseType = 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE';

export function normalizeCaseType(
  value: string | null | undefined
): BackendCaseType | 'UNKNOWN' {
  if (value === 'CONSULTATION' || value === 'LITIGATION') return value;
  if (value === 'ADMINISTRATIVE' || value === 'ADMINISTRATIVE_DUTY') return 'ADMINISTRATIVE';
  return 'UNKNOWN';
}

export function getCaseType(c: API.Case): BackendCaseType | 'UNKNOWN' {
  return normalizeCaseType(c.caseType ?? c.case_type ?? undefined);
}

export function clientDisplayName(c?: API.User | null): string {
  if (!c) return '';
  return [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.email || '';
}

export function assignedDisplayName(c: API.Case): string {
  const u = c.assigned_to as API.User | undefined;
  if (!u) return '';
  return [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || '';
}

export function missing(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'string' && value.trim() === '') return '';
  return String(value);
}

export function prettyEnum(value: unknown): string {
  if (value == null || value === '') return '';
  return String(value).replace(/_/g, ' ');
}

export function consultationOutcome(c: API.Case): string | undefined {
  return (
    (getCaseData(c, 'outcome') as string) ||
    (getCaseData(c, 'status') as string) ||
    undefined
  );
}

export function isIsoToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function dueIso(c: API.Case): string | undefined {
  return getCaseData(c, 'due_date') as string | undefined;
}

export function isOverdue(iso: string | null | undefined): boolean {
  const days = getCountdownDays(iso ?? null);
  return days != null && days < 0;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return formatDate(iso) || '';
}

export function formatDuration(value: unknown): string {
  if (value == null || value === '') return '';
  const s = String(value);
  if (s === '30min') return '30 min';
  if (s === '1h') return '60 min';
  if (s === '2h') return '120 min';
  return s;
}

export function courtDisplay(c: API.Case): string {
  const name = (getCaseData(c, 'court_name') as string | undefined) || c.court;
  if (!name || name === 'N/A') return '';
  return name;
}

export function nextLitigationDeadline(c: API.Case): string | undefined {
  const hearing = getCaseData(c, 'next_hearing_date') as string | undefined;
  const keys = getCaseData(c, 'key_deadlines') as { label?: string; date?: string }[] | undefined;
  const dates = [hearing, ...(keys ?? []).map((k) => k.date)].filter(
    (d): d is string => Boolean(d)
  );
  if (!dates.length) return undefined;
  dates.sort();
  return dates[0];
}
