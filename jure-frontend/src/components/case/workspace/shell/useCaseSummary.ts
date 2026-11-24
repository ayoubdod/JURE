import { useMemo } from 'react';
import { buildCaseSummary } from './buildCaseSummary';
import type { CaseSummary, CaseSummaryInput } from './types';

/** Single source of truth for derived case workspace metrics. */
export function useCaseSummary(input: CaseSummaryInput): CaseSummary {
  const { caseItem, type, legalDeadlines, researchNotes } = input;
  return useMemo(
    () => buildCaseSummary({ caseItem, type, legalDeadlines, researchNotes }),
    [caseItem, type, legalDeadlines, researchNotes]
  );
}
