import type {
  ShareableApiType,
  ShareableSearchAppointmentHit,
  ShareableSearchCaseHit,
  ShareableSearchResponse,
  ShareableSearchTaskHit,
} from '@/services/search/api';

export type SharePickResult =
  | { kind: 'case'; row: ShareableSearchCaseHit }
  | { kind: 'task'; row: ShareableSearchTaskHit }
  | { kind: 'appointment'; row: ShareableSearchAppointmentHit };

export function normalizeShareableResults(
  raw: ShareableSearchResponse | undefined,
  tab: Exclude<ShareableApiType, 'all'>
): ShareableSearchCaseHit[] | ShareableSearchTaskHit[] | ShareableSearchAppointmentHit[] {
  if (!raw || typeof raw !== 'object') {
    return [];
  }
  if (tab === 'case') return Array.isArray(raw.cases) ? raw.cases : [];
  if (tab === 'task') return Array.isArray(raw.tasks) ? raw.tasks : [];
  return Array.isArray(raw.appointments) ? raw.appointments : [];
}
