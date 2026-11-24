import { describe, expect, it } from 'vitest';
import { selectNeedsAttention, selectNextCritical } from './overviewLogic';
import type { CaseSummary } from './types';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('selectNextCritical', () => {
  it('prefers upcoming hearing over deadline', () => {
    const summary = {
      hasUpcomingHearing: true,
      nextHearingIso: daysFromNow(4),
      nextHearingDays: 4,
      nextDeadlineIso: daysFromNow(1),
      nextDeadlineDays: 1,
    } as Pick<
      CaseSummary,
      'hasUpcomingHearing' | 'nextHearingIso' | 'nextHearingDays' | 'nextDeadlineIso' | 'nextDeadlineDays'
    >;
    expect(selectNextCritical(summary).kind).toBe('hearing');
  });

  it('falls back to next deadline when no hearing', () => {
    const summary = {
      hasUpcomingHearing: false,
      nextHearingIso: null,
      nextHearingDays: null,
      nextDeadlineIso: daysFromNow(2),
      nextDeadlineDays: 2,
    } as Pick<
      CaseSummary,
      'hasUpcomingHearing' | 'nextHearingIso' | 'nextHearingDays' | 'nextDeadlineIso' | 'nextDeadlineDays'
    >;
    expect(selectNextCritical(summary)).toMatchObject({ kind: 'deadline' });
  });

  it('returns empty when neither exists', () => {
    expect(
      selectNextCritical({
        hasUpcomingHearing: false,
        nextHearingIso: null,
        nextHearingDays: null,
        nextDeadlineIso: null,
        nextDeadlineDays: null,
      }).kind
    ).toBe('empty');
  });
});

describe('selectNeedsAttention', () => {
  it('includes overdue tasks, deadlines ≤3 days, and missing docs', () => {
    const caseItem = {
      id: 1,
      case_specific_data: {
        keyDeadlines: [
          { label: 'Soon', date: daysFromNow(2) },
          { label: 'Later', date: daysFromNow(10) },
        ],
        requiredDocuments: [
          { label: 'A', completed: false },
          { label: 'B', completed: true },
        ],
      },
      _related: {
        tasks: [
          {
            id: 9,
            title: 'Overdue task',
            status: 'todo',
            due_date: daysFromNow(-1),
          },
        ],
        appointments: [],
      },
    } as unknown as API.Case;

    const legal = [
      {
        id: 3,
        status: 'pending',
        final_deadline: daysFromNow(1),
        calculated_deadline: daysFromNow(1),
        rule: { name: 'Legal soon', code: 'R1' },
        triggering_event_type: 'X',
      },
    ] as CalculatedDeadline[];

    const items = selectNeedsAttention(caseItem, legal, { missingDocuments: 'Missing documents' });
    expect(items.some((i) => i.kind === 'task')).toBe(true);
    expect(items.some((i) => i.title === 'Soon')).toBe(true);
    expect(items.some((i) => i.title === 'Later')).toBe(false);
    expect(items.some((i) => i.kind === 'document')).toBe(true);
    expect(items.some((i) => i.title.includes('Legal soon'))).toBe(true);
  });
});
