import { getCaseType } from '@/services/case/caseType';
import type { CaseWorkspaceType } from './types';

/** Which detail workspace to mount for a case. Unknown never soft-locks. */
export function resolveWorkspaceKind(
  caseItem: Pick<API.Case, 'caseType' | 'case_type'>
): CaseWorkspaceType {
  return getCaseType(caseItem);
}
