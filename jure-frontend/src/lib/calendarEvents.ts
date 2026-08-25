import { TaskPriority, TaskStatus } from '@/utils/constants';
import type { AppMessages } from '@/i18n';

export type CaseDateSourceType = 'CASE_DEADLINE' | 'CASE_DUE_DATE' | 'CONSULTATION_DATE';

export type RelatedCaseRef = {
  id: number;
  reference?: string;
  title?: string;
};

export type CalendarEvent = {
  id: string;
  instance?: unknown;
  type: 'task' | 'appointment' | 'case_date';
  sourceType?: CaseDateSourceType;
  title: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  status?: string;
  priority?: string;
  assigned_to?: { id: number; email: string; first_name: string; last_name: string; image?: string } | null;
  assigned_to_details?: { id: number; email: string; first_name: string; last_name: string; image?: string } | null;
  assignees?: Array<{ id: number; email: string; first_name: string; last_name: string; image?: string }>;
  created_by_details?: { id: number; email: string; first_name: string; last_name: string; image?: string } | null;
  created_by?: number;
  case_id?: number | null;
  case_title?: string;
  relatedCase?: RelatedCaseRef;
  client?: string | { id: number; email: string; first_name: string; last_name: string };
  meeting_type?: 'in_person' | 'video' | string | null;
  location?: string | null;
  conversation_id?: number | null;
  conversation_title?: string | null;
  attachment_count?: number;
  raw?: Record<string, unknown>;
};

export type CalendarEventTypeFilter =
  | 'all'
  | 'tasks'
  | 'appointments'
  | 'hearings'
  | 'deadlines'
  | 'consultations';

export function normalizeSourceType(s: string): CaseDateSourceType | null {
  const u = s.toUpperCase().replace(/-/g, '_');
  if (u.includes('DEADLINE') || u === 'CASE_DEADLINE') return 'CASE_DEADLINE';
  if (u.includes('CONSULTATION')) return 'CONSULTATION_DATE';
  if (u.includes('DUE') || u === 'CASE_DUE' || u === 'CASE_DUE_DATE') return 'CASE_DUE_DATE';
  return null;
}

export function normalizeCaseDateRaw(raw: Record<string, unknown>, index: number): CalendarEvent | null {
  const stRaw = String(raw.sourceType ?? raw.source_type ?? raw.type ?? '');
  const st = normalizeSourceType(stRaw);
  if (!st) return null;
  const start = (raw.start ?? raw.start_at ?? raw.date ?? raw.datetime) as string | undefined;
  if (!start) return null;
  const rc = (raw.relatedCase ?? raw.related_case) as Record<string, unknown> | undefined;
  const caseId = (raw.case_id ?? raw.caseId ?? rc?.id) as number | undefined;
  const idBase = raw.id != null ? String(raw.id) : `idx-${index}`;
  return {
    id: `case-date-${idBase}-${start}`,
    type: 'case_date',
    sourceType: st,
    title: String(raw.title ?? raw.label ?? 'Case date'),
    start,
    end: (raw.end ?? raw.end_at) as string | undefined,
    status: undefined,
    priority: undefined,
    case_id: caseId ?? null,
    relatedCase:
      rc && rc.id != null
        ? {
            id: Number(rc.id),
            reference: rc.reference as string | undefined,
            title: rc.title as string | undefined,
          }
        : caseId
          ? { id: caseId }
          : undefined,
    raw,
  };
}

export function calendarListMember(
  event: CalendarEvent
): { id?: number; first_name?: string; last_name?: string; email?: string } | null {
  const e = event as CalendarEvent & { created_by?: number };
  if (e.type === 'appointment' && e.created_by_details) return { ...e.created_by_details, id: e.created_by_details.id };
  if (e.type === 'appointment' && typeof e.created_by === 'number') return { id: e.created_by };
  const d = e.assigned_to_details;
  if (d && typeof d === 'object') return d;
  const a = e.assigned_to;
  if (a && typeof a === 'object' && 'email' in a)
    return a as { id?: number; first_name?: string; last_name?: string; email?: string };
  if (typeof a === 'number') return { id: a };
  return null;
}

export function eventMemberFilterId(event: CalendarEvent): number | undefined {
  const e = event as CalendarEvent & { created_by?: number };
  if (Array.isArray(e.assignees) && e.assignees[0]?.id != null) return e.assignees[0].id;
  if (e.assigned_to_details?.id != null) return e.assigned_to_details.id;
  if (typeof e.assigned_to === 'object' && e.assigned_to?.id != null) return e.assigned_to.id;
  if (typeof e.assigned_to === 'number') return e.assigned_to;
  if (e.type === 'appointment' && e.created_by_details?.id != null) return e.created_by_details.id;
  if (e.type === 'appointment' && typeof e.created_by === 'number') return e.created_by;
  return undefined;
}

export function eventAssignees(
  event: CalendarEvent
): Array<{ id?: number; first_name?: string; last_name?: string; email?: string }> {
  if (Array.isArray(event.assignees) && event.assignees.length) return event.assignees;
  const one = calendarListMember(event);
  return one ? [one] : [];
}

export function getCountdownDays(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const e = new Date(d);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - t.getTime()) / 86400000);
}

export function countdownTone(days: number | null, overdue: boolean): 'critical' | 'warning' | 'normal' {
  if (overdue || (days != null && days < 0)) return 'critical';
  if (days != null && days <= 3) return 'critical';
  if (days != null && days <= 14) return 'warning';
  return 'normal';
}

export function isTaskAppointmentOverdue(e: CalendarEvent): boolean {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const s = new Date(e.start);
  s.setHours(0, 0, 0, 0);
  if (s.getTime() >= t.getTime()) return false;
  if (e.type === 'task') return e.status !== TaskStatus.DONE;
  if (e.type === 'appointment') return e.status !== 'done' && e.status !== 'cancelled';
  return false;
}

export function sourceTypeLabel(st: CaseDateSourceType | undefined, cal: AppMessages['calendar']): string {
  if (st === 'CASE_DEADLINE') return cal.sourceTypes.nextHearing;
  if (st === 'CASE_DUE_DATE') return cal.sourceTypes.dueDate;
  if (st === 'CONSULTATION_DATE') return cal.sourceTypes.consultation;
  return cal.sourceTypes.caseDate;
}

export function caseDateTypeBadgeClass(st?: CaseDateSourceType): string {
  if (st === 'CASE_DEADLINE') return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/25';
  if (st === 'CASE_DUE_DATE') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-amber-500/25';
  if (st === 'CONSULTATION_DATE') return 'bg-blue-500/15 text-blue-800 dark:text-blue-400 ring-blue-500/25';
  return 'bg-slate-500/15 text-slate-700 dark:text-slate-400';
}

export function pillColorForCalendarEvent(e: CalendarEvent): { bg: string; fg: string } {
  if (e.type === 'case_date') {
    if (e.sourceType === 'CASE_DEADLINE') return { bg: '#e11d48', fg: '#fff' };
    if (e.sourceType === 'CASE_DUE_DATE') return { bg: '#d97706', fg: '#fff' };
    if (e.sourceType === 'CONSULTATION_DATE') return { bg: '#2563eb', fg: '#fff' };
  }
  if (e.type === 'appointment') return { bg: '#059669', fg: '#fff' };
  return { bg: '#4f46e5', fg: '#fff' };
}

export function calendarTypesParam(filter: CalendarEventTypeFilter): string | null {
  if (filter === 'all') return 'tasks,appointments';
  if (filter === 'tasks') return 'tasks';
  if (filter === 'appointments') return 'appointments';
  return null;
}

export function matchesEventTypeFilter(event: CalendarEvent, filter: CalendarEventTypeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'tasks') return event.type === 'task';
  if (filter === 'appointments') return event.type === 'appointment';
  if (filter === 'hearings') return event.type === 'case_date' && event.sourceType === 'CASE_DEADLINE';
  if (filter === 'deadlines') return event.type === 'case_date' && event.sourceType === 'CASE_DUE_DATE';
  if (filter === 'consultations') return event.type === 'case_date' && event.sourceType === 'CONSULTATION_DATE';
  return true;
}

export function parseEntityId(eventId: string, prefix: 'task-' | 'appt-'): number | null {
  const n = parseInt(String(eventId).replace(prefix, ''), 10);
  return Number.isFinite(n) ? n : null;
}

export function taskPriorityBadgeClass(p?: string): string {
  if (p === TaskPriority.HIGH) return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30';
  if (p === TaskPriority.MEDIUM) return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-amber-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25';
}

export function taskStatusBadgeClass(s?: string): string {
  if (s === TaskStatus.DONE) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30';
  if (s === TaskStatus.IN_PROGRESS) return 'bg-amber-500/15 text-amber-800 dark:text-amber-400 ring-amber-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/25';
}

export function appointmentStatusBadgeClass(s?: string): string {
  if (s === 'scheduled') return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 ring-blue-500/30';
  if (s === 'done') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30';
  if (s === 'cancelled') return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30';
  return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 ring-slate-500/30';
}

export function startOfLocalDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfLocalWeek(d = new Date()): Date {
  const x = startOfLocalDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function endOfLocalWeek(d = new Date()): Date {
  const x = startOfLocalWeek(d);
  x.setDate(x.getDate() + 7);
  return x;
}
