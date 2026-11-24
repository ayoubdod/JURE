import { CaseStatus } from '@/utils/constants';
import { getConvertedFromCase } from '@/components/case/conversion/ConvertedCaseLink';
import { getCaseData } from '@/utils/caseCardHelpers';
import type { CaseSummary } from './types';

export type EmptyStateInput = {
  caseItem: API.Case;
  summary: Pick<CaseSummary, 'hasUpcomingHearing' | 'openTaskCount' | 'nextDeadlineIso'>;
  showFinance: boolean;
  finance?: API.FinanceCaseSummary | null;
  followUpCount?: number;
  hasDueDate?: boolean;
  expectOrigin?: boolean;
};

/** Pure empty/edge visibility for Overview + sections (table-driven tests). */
export function resolveEmptyStates(i: EmptyStateInput) {
  const status = String(i.caseItem.status || '');
  const required = getCaseData(i.caseItem, 'required_documents');
  return {
    noHearing: !i.summary.hasUpcomingHearing,
    noDueDate: i.hasDueDate === false,
    noRequiredDocuments: !Array.isArray(required) || required.length === 0,
    noClient: !i.caseItem.client,
    noFollowUps: (i.followUpCount ?? 0) === 0,
    noTasks: i.summary.openTaskCount === 0,
    noActivity: (i.caseItem.activity?.length ?? 0) === 0,
    noFinancePermission: !i.showFinance,
    noFinanceData: !!i.showFinance && i.finance == null,
    caseClosedOrArchived: status === CaseStatus.CLOSED || status === CaseStatus.ARCHIVED,
    missingOrigin: i.expectOrigin === true && !getConvertedFromCase(i.caseItem),
  };
}
