import { formatDate, type Lang } from '@/i18n';
import { getCaseData, getCountdownDays } from '@/utils/caseCardHelpers';
import { TaskStatus } from '@/utils/constants';
import {
  isCourtSpecialty,
  isJurisdictionLevel,
} from '@/services/case/litigationCourt';
import type { AppMessages } from '@/i18n/messages/types';

export type LitigationDetailSection =
  | 'overview'
  | 'caseDetails'
  | 'parties'
  | 'tasks'
  | 'appointments'
  | 'hearings'
  | 'deadlines'
  | 'documents'
  | 'research'
  | 'notes'
  | 'finance'
  | 'juria'
  | 'activity';

export const LITIGATION_DETAIL_SECTIONS: LitigationDetailSection[] = [
  'overview',
  'caseDetails',
  'parties',
  'tasks',
  'appointments',
  'hearings',
  'deadlines',
  'documents',
  'research',
  'notes',
  'finance',
  'juria',
  'activity',
];

export function parseLitigationSection(raw: string | null): LitigationDetailSection {
  if (raw === 'details') return 'caseDetails';
  if (raw && LITIGATION_DETAIL_SECTIONS.includes(raw as LitigationDetailSection)) {
    return raw as LitigationDetailSection;
  }
  return 'overview';
}

export function personName(u?: API.User | null) {
  if (!u) return '';
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || '';
}

export function initials(u?: API.User | null) {
  if (!u) return '?';
  const a = (u.first_name ?? '').trim().charAt(0);
  const b = (u.last_name ?? '').trim().charAt(0);
  return (`${a}${b}`.toUpperCase() || u.email?.charAt(0).toUpperCase() || '?');
}

export function attorneysOf(c: API.Case): API.User[] {
  if (c.assigned_attorneys?.length) return c.assigned_attorneys;
  return c.assigned_to ? [c.assigned_to] : [];
}

export function leadAttorney(c: API.Case): API.User | null {
  return (c.assigned_to as API.User | null | undefined) ?? attorneysOf(c)[0] ?? null;
}

export function collaboratorsOf(c: API.Case): API.User[] {
  const leadId = c.assigned_to?.id;
  return attorneysOf(c).filter((u) => u.id !== leadId);
}

export function thirdPartyLabels(c: API.Case): string[] {
  const raw = getCaseData(c, 'third_parties');
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === 'string' || typeof x === 'number' ? String(x) : ''))
      .filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  return [];
}

export type KeyDeadline = { label: string; date: string };

export function keyDeadlinesOf(c: API.Case): KeyDeadline[] {
  const raw = getCaseData(c, 'key_deadlines');
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as { label?: unknown; date?: unknown };
      const date = typeof row.date === 'string' ? row.date : '';
      if (!date) return null;
      return { label: String(row.label ?? ''), date };
    })
    .filter((x): x is KeyDeadline => Boolean(x));
}

export function requiredDocumentsOf(c: API.Case): { label: string; completed: boolean }[] {
  const raw = getCaseData(c, 'required_documents');
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (item && typeof item === 'object') {
      const row = item as { label?: unknown; completed?: unknown };
      return {
        label: String(row.label ?? `Document ${i + 1}`),
        completed: Boolean(row.completed),
      };
    }
    return { label: String(item ?? `Document ${i + 1}`), completed: false };
  });
}

export function tasksOf(c: API.Case): API.Task[] {
  return c._related?.tasks ?? [];
}

export function appointmentsOf(c: API.Case): import('@/services/appointment/api').Appointment[] {
  return (c._related?.appointments ?? []) as import('@/services/appointment/api').Appointment[];
}

export function incompleteTasks(c: API.Case): API.Task[] {
  return tasksOf(c).filter((t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELLED);
}

export function overdueTasks(c: API.Case): API.Task[] {
  return incompleteTasks(c).filter((t) => {
    const days = getCountdownDays(t.due_date);
    return days != null && days < 0;
  });
}

export function upcomingAppointments(c: API.Case) {
  const now = Date.now();
  return appointmentsOf(c)
    .filter((a) => a.status !== 'cancelled' && new Date(a.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
}

export function pastAppointments(c: API.Case) {
  const now = Date.now();
  return appointmentsOf(c)
    .filter((a) => new Date(a.start_at).getTime() < now)
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
}

export type CourtLabels = {
  specialty: string;
  jurisdiction: string;
  chamber: string;
  city: string;
  judge: string;
  courtName: string;
  courtCaseNumber: string;
  composed: string;
};

export function courtLabels(c: API.Case, t: AppMessages): CourtLabels {
  const options = t.cases.modal.options;
  const specialty = String(getCaseData(c, 'court_specialty') ?? '');
  const jurisdiction = String(getCaseData(c, 'jurisdiction') ?? '');
  const chamber =
    String(getCaseData(c, 'chamber_division') ?? getCaseData(c, 'chamber') ?? '');
  const city = String(getCaseData(c, 'city') ?? '');
  const judge = String(getCaseData(c, 'judge_name') ?? '');
  const courtName = String(getCaseData(c, 'court_name') ?? c.court ?? '');
  const courtCaseNumber = String(getCaseData(c, 'court_case_number') ?? '');

  const specialtyLabel = isCourtSpecialty(specialty)
    ? options.courtSpecialty[specialty]
    : specialty;
  const jurisdictionLabel = isJurisdictionLevel(jurisdiction)
    ? options.jurisdictionLevel[jurisdiction]
    : jurisdiction;

  let chamberLabel = chamber;
  if (jurisdiction === 'FIRST_INSTANCE' && chamber in options.chamberFirstInstance) {
    chamberLabel = options.chamberFirstInstance[chamber as keyof typeof options.chamberFirstInstance];
  } else if (jurisdiction === 'APPEAL' && chamber in options.chamberAppeal) {
    chamberLabel = options.chamberAppeal[chamber as keyof typeof options.chamberAppeal];
  } else if (jurisdiction === 'CASSATION' && chamber in options.chamberCassation) {
    chamberLabel = options.chamberCassation[chamber as keyof typeof options.chamberCassation];
  }

  const composedParts = [specialtyLabel || jurisdictionLabel, city || courtName].filter(Boolean);
  const composed = composedParts.length
    ? composedParts.join(' — ')
    : courtName || chamberLabel || '';

  return {
    specialty: specialtyLabel,
    jurisdiction: jurisdictionLabel,
    chamber: chamberLabel,
    city,
    judge,
    courtName,
    courtCaseNumber,
    composed,
  };
}

export function relativeDayLabel(
  iso: string | null | undefined,
  lang: Lang,
  copy: { today: string; tomorrow: string; overdue: string; inDays: string; daysAgo: string },
  tf: (template: string, vars: Record<string, string | number>) => string
): string {
  const days = getCountdownDays(iso);
  if (days == null) return '';
  if (days === 0) return copy.today;
  if (days === 1) return copy.tomorrow;
  if (days > 1) return tf(copy.inDays, { count: days });
  if (days === -1) return copy.overdue;
  return tf(copy.daysAgo, { count: Math.abs(days) });
}

export function formatShortDate(iso: string | null | undefined, lang: Lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return formatDate(d, lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function splitDateParts(iso: string | null | undefined, lang: Lang) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.getDate().toString().padStart(2, '0'),
    month: formatDate(d, lang, { month: 'short' }).toUpperCase(),
    year: String(d.getFullYear()),
    date: d,
  };
}

export function caseCsd(c: API.Case): Record<string, unknown> {
  return ((c.case_specific_data as Record<string, unknown>) ?? {});
}

export function notesText(c: API.Case) {
  return {
    facts: (c.description ?? '').trim(),
    arguments: String(getCaseData(c, 'legal_arguments') ?? '').trim(),
    internal: (c.summary ?? '').trim(),
  };
}
