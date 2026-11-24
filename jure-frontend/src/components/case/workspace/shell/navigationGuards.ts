import { getCaseType } from '@/services/case/caseType';
import { parseTab } from './parseTab';
import type { CaseWorkspaceLeaf, CaseWorkspaceType } from './types';

/** Hotfix 77a0294: no-op when resolved leaf already matches (avoids setSearchParams churn). */
export function applyLeafToSearchParams(
  prev: URLSearchParams,
  type: CaseWorkspaceType,
  next: CaseWorkspaceLeaf
): URLSearchParams {
  const nextLeaf = parseTab(type, next).leaf;
  if (parseTab(type, prev.get('tab')).leaf === nextLeaf) return prev;
  const params = new URLSearchParams(prev);
  if (nextLeaf === 'overview') params.delete('tab');
  else params.set('tab', nextLeaf);
  return params;
}

export function stripConvertSearchParam(prev: URLSearchParams): URLSearchParams {
  if (prev.get('convert') !== '1') return prev;
  const params = new URLSearchParams(prev);
  params.delete('convert');
  return params;
}

/** Consultation follow-ups only; never remount-loop lit/admin or self-links. */
export function shouldRedirectFollowUpToParent(
  caseItem: Pick<API.Case, 'id' | 'caseType' | 'case_type' | 'parentConsultation'>
): boolean {
  const parentId = caseItem.parentConsultation?.id;
  return getCaseType(caseItem) === 'CONSULTATION' && parentId != null && parentId !== caseItem.id;
}
