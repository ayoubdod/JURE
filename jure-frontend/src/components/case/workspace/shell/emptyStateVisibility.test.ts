import { describe, expect, it } from 'vitest';
import { CaseStatus } from '@/utils/constants';
import { resolveEmptyStates, type EmptyStateInput } from './emptyStateVisibility';

const baseSummary = {
  hasUpcomingHearing: false,
  openTaskCount: 0,
  missingRequiredDocCount: 0,
  nextDeadlineIso: null as string | null,
};

function input(partial: Partial<EmptyStateInput> & { caseItem?: API.Case }): EmptyStateInput {
  return {
    caseItem: partial.caseItem ?? ({ id: 1, status: CaseStatus.OPEN, title: 'T' } as API.Case),
    summary: partial.summary ?? baseSummary,
    showFinance: partial.showFinance ?? false,
    finance: partial.finance,
    followUpCount: partial.followUpCount,
    hasDueDate: partial.hasDueDate,
    expectOrigin: partial.expectOrigin,
  };
}

describe('resolveEmptyStates', () => {
  it.each([
    {
      name: 'no hearing / tasks / activity / client',
      in: input({}),
      expectTrue: ['noHearing', 'noTasks', 'noActivity', 'noClient', 'noFinancePermission'] as const,
    },
    {
      name: 'no due date when flagged',
      in: input({ hasDueDate: false }),
      expectTrue: ['noDueDate'] as const,
    },
    {
      name: 'no required documents when checklist empty',
      in: input({}),
      expectTrue: ['noRequiredDocuments'] as const,
    },
    {
      name: 'no follow-ups',
      in: input({ followUpCount: 0 }),
      expectTrue: ['noFollowUps'] as const,
    },
    {
      name: 'no finance permission hides finance empty',
      in: input({ showFinance: false, finance: null }),
      expectTrue: ['noFinancePermission'] as const,
      expectFalse: ['noFinanceData'] as const,
    },
    {
      name: 'finance allowed but no data',
      in: input({ showFinance: true, finance: null }),
      expectTrue: ['noFinanceData'] as const,
      expectFalse: ['noFinancePermission'] as const,
    },
    {
      name: 'closed case',
      in: input({ caseItem: { id: 1, status: CaseStatus.CLOSED, title: 'X' } as API.Case }),
      expectTrue: ['caseClosedOrArchived'] as const,
    },
    {
      name: 'missing origin when expected',
      in: input({ expectOrigin: true }),
      expectTrue: ['missingOrigin'] as const,
    },
    {
      name: 'origin present when expected',
      in: input({
        expectOrigin: true,
        caseItem: {
          id: 2,
          status: CaseStatus.OPEN,
          title: 'Lit',
          convertedFromCase: { id: 9, title: 'C', reference: 'C-9', caseType: 'CONSULTATION' },
        } as API.Case,
      }),
      expectFalse: ['missingOrigin'] as const,
    },
  ])('$name', ({ in: inp, expectTrue = [], expectFalse = [] }) => {
    const out = resolveEmptyStates(inp);
    for (const k of expectTrue) expect(out[k]).toBe(true);
    for (const k of expectFalse) expect(out[k]).toBe(false);
  });
});
