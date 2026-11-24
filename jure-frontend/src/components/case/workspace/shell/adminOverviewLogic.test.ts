import { describe, expect, it } from 'vitest';
import {
  selectAdminChecklist,
  selectAdminNextCritical,
  selectMissingChecklist,
} from './adminOverviewLogic';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('selectAdminNextCritical', () => {
  it('uses due date when present', () => {
    const due = daysFromNow(5);
    expect(
      selectAdminNextCritical(
        { nextDeadlineIso: daysFromNow(1), nextDeadlineDays: 1 },
        due
      )
    ).toMatchObject({ kind: 'due', iso: due, days: 5 });
  });

  it('falls back to summary deadline, then empty', () => {
    expect(
      selectAdminNextCritical(
        { nextDeadlineIso: daysFromNow(2), nextDeadlineDays: 2 },
        null
      ).kind
    ).toBe('due');
    expect(
      selectAdminNextCritical({ nextDeadlineIso: null, nextDeadlineDays: null }, null).kind
    ).toBe('empty');
  });
});

describe('selectAdminChecklist / selectMissingChecklist', () => {
  it('reads only requiredDocuments and filters missing', () => {
    const caseItem = {
      id: 1,
      case_specific_data: {
        requiredDocuments: [
          { label: 'A', completed: false },
          { label: 'B', completed: true },
          { label: 'C', completed: false },
        ],
      },
    } as unknown as API.Case;
    expect(selectAdminChecklist(caseItem)).toHaveLength(3);
    expect(selectMissingChecklist(caseItem, 2).map((d) => d.label)).toEqual(['A', 'C']);
  });
});
