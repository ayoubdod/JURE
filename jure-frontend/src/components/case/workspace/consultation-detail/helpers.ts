import { formatDate, formatTime, type Lang } from '@/i18n';
import { consultationOutcome } from '@/services/case/caseType';
import { getCaseData } from '@/utils/caseCardHelpers';
import { consultationStatusOf, type ConsultationStatusKey } from '../consultationStatus';

export type ConsultationDetailSection =
  | 'overview'
  | 'administrative'
  | 'tasks'
  | 'appointments'
  | 'deadlines'
  | 'documents'
  | 'notes'
  | 'finance'
  | 'juria'
  | 'activity';

export const CONSULTATION_DETAIL_SECTIONS: ConsultationDetailSection[] = [
  'overview',
  'administrative',
  'tasks',
  'appointments',
  'deadlines',
  'documents',
  'notes',
  'finance',
  'juria',
  'activity',
];

export function parseConsultationSection(raw: string | null): ConsultationDetailSection {
  if (raw === 'consultation') return 'administrative';
  if (raw && CONSULTATION_DETAIL_SECTIONS.includes(raw as ConsultationDetailSection)) {
    return raw as ConsultationDetailSection;
  }
  return 'overview';
}

export function attorneysOf(c: API.Case): API.User[] {
  if (c.assigned_attorneys?.length) return c.assigned_attorneys;
  return c.assigned_to ? [c.assigned_to] : [];
}

export function personName(u?: API.User | null) {
  if (!u) return '';
  return `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || '';
}

export function consultationTypeBadge(c: API.Case): 'PREVENTIVE' | 'REACTIVE' | null {
  const raw = String(getCaseData(c, 'consultation_type') || '').toUpperCase();
  if (raw === 'PREVENTIVE' || raw === 'REACTIVE') return raw;
  return null;
}

export function outcomeOf(c: API.Case): ConsultationStatusKey {
  return consultationStatusOf(c);
}

export function isCancelled(c: API.Case) {
  return outcomeOf(c) === 'CANCELLED' || String(consultationOutcome(c) || '').toUpperCase() === 'CANCELLED';
}

export function consultationWhen(iso: string | undefined, lang: Lang) {
  if (!iso) return { date: '', time: '', raw: null as Date | null };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '', raw: null as Date | null };
  return {
    date: formatDate(d, lang, { day: 'numeric', month: 'short', year: 'numeric' }),
    time: formatTime(d, lang, { hour: '2-digit', minute: '2-digit' }),
    raw: d,
  };
}

export function hoursUntil(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (d.getTime() - Date.now()) / 36e5;
}
