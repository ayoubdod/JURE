import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  convertedCaseDisplayLabel,
  isConsultationSessionDatePassed,
  selectConsultationNeedsAttention,
} from './helpers';

function consultation(partial: {
  outcome?: string;
  consultationDate?: string;
  title?: string;
}): API.Case {
  return {
    id: 1,
    title: partial.title ?? 'Consult',
    status: 'OPEN',
    caseType: 'CONSULTATION',
    case_specific_data: {
      outcome: partial.outcome ?? 'SCHEDULED',
      consultationDate: partial.consultationDate,
    },
  } as API.Case;
}

describe('isConsultationSessionDatePassed', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('true when SCHEDULED and date is in the past', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(
      isConsultationSessionDatePassed(
        consultation({ outcome: 'SCHEDULED', consultationDate: '2026-06-01T10:00:00Z' })
      )
    ).toBe(true);
  });

  it('false when upcoming, completed, or missing date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(
      isConsultationSessionDatePassed(
        consultation({ outcome: 'SCHEDULED', consultationDate: '2026-06-20T10:00:00Z' })
      )
    ).toBe(false);
    expect(
      isConsultationSessionDatePassed(
        consultation({ outcome: 'COMPLETED', consultationDate: '2026-06-01T10:00:00Z' })
      )
    ).toBe(false);
    expect(isConsultationSessionDatePassed(consultation({ outcome: 'SCHEDULED' }))).toBe(false);
  });
});

describe('selectConsultationNeedsAttention', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('includes date-passed row when scheduled session is overdue', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(
      selectConsultationNeedsAttention(
        consultation({ outcome: 'SCHEDULED', consultationDate: '2026-06-01T10:00:00Z' }),
        { datePassed: 'Date passed' }
      )
    ).toEqual([{ id: 'session-date-passed', title: 'Date passed', leaf: 'consultation' }]);
    expect(
      selectConsultationNeedsAttention(
        consultation({ outcome: 'SCHEDULED', consultationDate: '2026-06-20T10:00:00Z' }),
        { datePassed: 'Date passed' }
      )
    ).toEqual([]);
  });
});

describe('convertedCaseDisplayLabel', () => {
  it('prefers title · reference, falls back to reference, never bare id', () => {
    expect(convertedCaseDisplayLabel({ title: 'Matter', reference: 'LIT-1' })).toBe(
      'Matter · LIT-1'
    );
    expect(convertedCaseDisplayLabel({ title: '', reference: 'LIT-1' })).toBe('LIT-1');
    expect(convertedCaseDisplayLabel({ title: 'Matter', reference: null })).toBe('Matter');
    expect(convertedCaseDisplayLabel({ title: null, reference: null })).toBe('');
  });
});
