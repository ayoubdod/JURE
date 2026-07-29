/**
 * Shared utilities for CaseCard components.
 */

/**
 * Returns the number of days from today to the given date.
 * Positive = future, negative = past, 0 = today.
 * Returns null if date is not set or invalid.
 */
export function getCountdownDays(date: string | Date | null | undefined): number | null {
  if (date == null || date === '') return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns a style token for countdown display:
 * - 'critical': days <= 3 (red)
 * - 'warning': days <= 14 (amber with icon)
 * - 'normal': otherwise
 */
export function getCountdownStyle(days: number): 'critical' | 'warning' | 'normal' {
  if (days <= 3) return 'critical';
  if (days <= 14) return 'warning';
  return 'normal';
}

/**
 * Truncates text and appends "..." if it exceeds max characters.
 */
export function truncateText(text: string | null | undefined, max: number): string {
  if (text == null) return '';
  const s = String(text).trim();
  if (s.length <= max) return s;
  return s.slice(0, max) + '...';
}

/**
 * Maps status values to color classes used in the project.
 * Uses existing design tokens (emerald, blue, slate, red, amber).
 */
export function getStatusColor(status: string): string {
  const statusMap: Record<string, string> = {
    OPEN: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
    IN_PROGRESS: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30',
    CLOSED: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30',
    CANCELLED: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30',
    PENDING: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30',
    ARCHIVED: 'bg-slate-500/15 text-slate-500 dark:text-slate-500 ring-slate-500/30',
    SCHEDULED: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30',
    COMPLETED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
    NO_SHOW: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30',
    CONVERTED_TO_CASE: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-purple-500/30',
    SUBMITTED: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-blue-500/30',
    APPROVED: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
    REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400 ring-red-500/30',
  };
  return statusMap[status] ?? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30';
}

/**
 * Returns a human-readable date/time string using the project locale.
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (date == null || date === '') return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Returns a human-readable date string (no time).
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (date == null || date === '') return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/**
 * Get value from case_specific_data (camelCase) or legacy top-level field.
 */
export function getCaseData(c: API.Case, key: string): unknown {
  const csd = c.case_specific_data as Record<string, unknown> | undefined;
  const camelKey = key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
  if (csd && camelKey in csd) return csd[camelKey];
  return (c as Record<string, unknown>)[key];
}

/**
 * Get the relevant date for filtering by case type:
 * - Consultation → consultationDate
 * - Litigation → nextHearingDate
 * - Administrative → dueDate
 * - Mixed/Unknown → whichever is present
 */
export function getCaseDateForFilter(c: API.Case): string | null {
  const caseType = (c.caseType ?? c.case_type) as string | undefined;
  if (caseType === 'CONSULTATION') {
    return (getCaseData(c, 'consultation_date') as string) || null;
  }
  if (caseType === 'LITIGATION') {
    return (getCaseData(c, 'next_hearing_date') as string) || null;
  }
  if (caseType === 'ADMINISTRATIVE_DUTY' || caseType === 'ADMINISTRATIVE') {
    return (getCaseData(c, 'due_date') as string) || null;
  }
  const consultation = getCaseData(c, 'consultation_date') as string | undefined;
  if (consultation) return consultation;
  const nextHearing = getCaseData(c, 'next_hearing_date') as string | undefined;
  if (nextHearing) return nextHearing;
  const due = getCaseData(c, 'due_date') as string | undefined;
  return due || null;
}
