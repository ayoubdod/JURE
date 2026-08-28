import { getCaseData } from '@/utils/caseCardHelpers';

export type AdministrativeDetailSection =
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

export const ADMINISTRATIVE_DETAIL_SECTIONS: AdministrativeDetailSection[] = [
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

export function parseAdministrativeSection(raw: string | null): AdministrativeDetailSection {
  if (raw === 'details' || raw === 'caseDetails') return 'administrative';
  if (raw && ADMINISTRATIVE_DETAIL_SECTIONS.includes(raw as AdministrativeDetailSection)) {
    return raw as AdministrativeDetailSection;
  }
  return 'overview';
}

export function institutionOf(c: API.Case): string {
  return String(getCaseData(c, 'institution') ?? getCaseData(c, 'institution_authority') ?? '');
}

export function dutyTypeOf(c: API.Case): string {
  return String(getCaseData(c, 'duty_type') ?? '');
}

export function dueDateOf(c: API.Case): string {
  return String(getCaseData(c, 'due_date') ?? '');
}

export function startDateOf(c: API.Case): string {
  return String(getCaseData(c, 'start_date') ?? '');
}

export function completionDateOf(c: API.Case): string {
  return String(getCaseData(c, 'completion_date') ?? '');
}

export function institutionRefOf(c: API.Case): string {
  return String(getCaseData(c, 'institution_reference_number') ?? '');
}

export function adminStatusOf(c: API.Case): string {
  return String((getCaseData(c, 'status') as string) ?? c.status ?? '');
}
