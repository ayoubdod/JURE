import { getCaseType } from '@/services/case/caseType';
import { parseTab } from './parseTab';
import type { CaseWorkspaceLeaf, CaseWorkspaceType } from './types';

/**
 * Hotfix 77a0294 root cause: setLeaf always wrote new URLSearchParams even when
 * the resolved leaf was unchanged (e.g. hash effect calling setLeaf('consultation')
 * while already on consultation). That churned searchParams → remounts/reloads.
 * Return the same `prev` instance when the leaf is already active.
 */
export function applyLeafToSearchParams(
  prev: URLSearchParams,
  type: CaseWorkspaceType,
  next: CaseWorkspaceLeaf
): URLSearchParams {
  const nextLeaf = parseTab(type, next).leaf;
  const currentLeaf = parseTab(type, prev.get('tab')).leaf;
  if (currentLeaf === nextLeaf) return prev;
  const params = new URLSearchParams(prev);
  if (nextLeaf === 'overview') params.delete('tab');
  else params.set('tab', nextLeaf);
  return params;
}

/** Strip ?convert=1 once; no-op when absent (avoids convert-effect loops). */
export function stripConvertSearchParam(prev: URLSearchParams): URLSearchParams {
  if (prev.get('convert') !== '1') return prev;
  const params = new URLSearchParams(prev);
  params.delete('convert');
  return params;
}

/**
 * Follow-up consultations redirect to their origin. Lit/admin and self-links must not,
 * or Outlet remounts (pathname key) look like an infinite reload.
 */
export function shouldRedirectFollowUpToParent(
  caseItem: Pick<API.Case, 'id' | 'caseType' | 'case_type' | 'parentConsultation'>
): boolean {
  const parentId = caseItem.parentConsultation?.id;
  return (
    getCaseType(caseItem) === 'CONSULTATION' &&
    parentId != null &&
    parentId !== caseItem.id
  );
}
