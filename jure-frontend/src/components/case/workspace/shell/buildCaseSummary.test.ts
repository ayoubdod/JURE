import { describe, expect, it } from 'vitest';
import { buildCaseSummary } from './buildCaseSummary';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function caseStub(partial: Partial<API.Case> & { case_specific_data?: Record<string, unknown> }): API.Case {
  return {
    id: 1,
    title: 'Test',
    reference: 'LIT-1',
    status: 'OPEN',
    case_specific_data: {},
    attachments: [],
    _related: { tasks: [], appointments: [] },
    ...partial,
  } as API.Case;
}

describe('buildCaseSummary', () => {
  it('computes next hearing and upcoming flag', () => {
    const summary = buildCaseSummary({
      type: 'LITIGATION',
      caseItem: caseStub({
        case_specific_data: { nextHearingDate: daysFromNow(5) },
      }),
    });
    expect(summary.hasUpcomingHearing).toBe(true);
    expect(summary.nextHearingDays).toBe(5);
    expect(summary.leafCounts.hearings).toBe(1);
  });

  it('scheduleBadge counts overdue + due within 7 days', () => {
    const legal: CalculatedDeadline[] = [
      {
        id: 1,
        status: 'pending',
        final_deadline: daysFromNow(-2),
        calculated_deadline: daysFromNow(-2),
      } as CalculatedDeadline,
      {
        id: 2,
        status: 'pending',
        final_deadline: daysFromNow(3),
        calculated_deadline: daysFromNow(3),
      } as CalculatedDeadline,
      {
        id: 3,
        status: 'pending',
        final_deadline: daysFromNow(20),
        calculated_deadline: daysFromNow(20),
      } as CalculatedDeadline,
    ];

    const summary = buildCaseSummary({
      type: 'LITIGATION',
      caseItem: caseStub({
        case_specific_data: {
          keyDeadlines: [{ label: 'Manual soon', date: daysFromNow(1) }],
        },
      }),
      legalDeadlines: legal,
    });

    expect(summary.overdueDeadlineCount).toBe(1);
    expect(summary.scheduleBadge).toBe(3); // -2, +3, +1 (not +20)
    expect(summary.nextDeadlineDays).toBe(1);
  });

  it('workBadge = open tasks; documentsBadge prefers missing required', () => {
    const summary = buildCaseSummary({
      type: 'LITIGATION',
      caseItem: caseStub({
        attachments: [{ id: 1 } as API.CaseAttachment, { id: 2 } as API.CaseAttachment],
        case_specific_data: {
          requiredDocuments: [
            { label: 'A', completed: false },
            { label: 'B', completed: true },
          ],
        },
        _related: {
          tasks: [
            { id: 1, status: 'todo', title: 't1' } as API.Task,
            { id: 2, status: 'done', title: 't2' } as API.Task,
          ],
          appointments: [],
        },
      }),
    });

    expect(summary.openTaskCount).toBe(1);
    expect(summary.workBadge).toBe(1);
    expect(summary.missingRequiredDocCount).toBe(1);
    expect(summary.documentsBadge).toBe(1);
    expect(summary.leafCounts.documents).toBe(2);
  });

  it('documentsBadge is 0 when required docs exist and none missing', () => {
    const summary = buildCaseSummary({
      type: 'LITIGATION',
      caseItem: caseStub({
        attachments: [{ id: 1 } as API.CaseAttachment],
        case_specific_data: {
          requiredDocuments: [{ label: 'A', completed: true }],
        },
      }),
    });
    expect(summary.documentsBadge).toBe(0);
  });

  it('documentsBadge falls back to attachment count when no required-docs list', () => {
    const summary = buildCaseSummary({
      type: 'LITIGATION',
      caseItem: caseStub({
        attachments: [{ id: 1 } as API.CaseAttachment, { id: 2 } as API.CaseAttachment],
        case_specific_data: {},
      }),
    });
    expect(summary.documentsBadge).toBe(2);
  });

  it('consultation sessionBadge prefers pending follow-ups', () => {
    const summary = buildCaseSummary({
      type: 'CONSULTATION',
      caseItem: caseStub({
        followUpCount: 5,
        followUps: [
          { id: 1, outcome: 'SCHEDULED' } as API.Case,
          { id: 2, outcome: 'COMPLETED' } as API.Case,
        ],
      }),
    });
    expect(summary.sessionBadge).toBe(1);
  });

  it('administrative dutyFileBadge + scheduleBadge include due date', () => {
    const summary = buildCaseSummary({
      type: 'ADMINISTRATIVE',
      caseItem: caseStub({
        case_specific_data: {
          dueDate: daysFromNow(2),
          requiredDocuments: [
            { label: 'A', completed: false },
            { label: 'B', completed: false },
          ],
        },
        _related: {
          tasks: [{ id: 1, status: 'todo', title: 't1' } as API.Task],
          appointments: [],
        },
      }),
    });
    expect(summary.dutyFileBadge).toBe(2);
    expect(summary.documentsBadge).toBe(2);
    expect(summary.workBadge).toBe(1);
    expect(summary.scheduleBadge).toBeGreaterThanOrEqual(1);
  });
});
