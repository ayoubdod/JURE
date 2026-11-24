import { getCountdownDays } from '@/utils/caseCardHelpers';
import { requiredDocumentsOf } from '@/components/case/workspace/litigation-detail/helpers';
import type { CaseSummary } from './types';

export type AdminNextCritical = {
  kind: 'due' | 'empty';
  iso: string | null;
  days: number | null;
};

/** Admin next critical = due date when present. */
export function selectAdminNextCritical(
  summary: Pick<CaseSummary, 'nextDeadlineIso' | 'nextDeadlineDays'>,
  dueIso: string | null
): AdminNextCritical {
  const iso = dueIso || summary.nextDeadlineIso;
  if (!iso) return { kind: 'empty', iso: null, days: null };
  return { kind: 'due', iso, days: dueIso ? getCountdownDays(dueIso) : summary.nextDeadlineDays };
}

export type ChecklistItem = { label: string; completed: boolean };

/** Existing required-documents only — no invented fields. */
export function selectAdminChecklist(caseItem: API.Case): ChecklistItem[] {
  return requiredDocumentsOf(caseItem);
}

export function selectMissingChecklist(caseItem: API.Case, limit = 5): ChecklistItem[] {
  return selectAdminChecklist(caseItem).filter((d) => !d.completed).slice(0, limit);
}
