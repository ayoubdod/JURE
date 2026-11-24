import { describe, expect, it } from 'vitest';
import { resolvePrimaryCta, type PrimaryCtaSummary } from './resolvePrimaryCta';

const base: PrimaryCtaSummary = {
  hasUpcomingHearing: false,
  nextHearingDays: null,
  overdueDeadlineCount: 0,
  missingRequiredDocCount: 0,
  nextDeadlineDays: null,
  openTaskCount: 0,
};

describe('resolvePrimaryCta · litigation', () => {
  it('defaults to add hearing when none scheduled', () => {
    expect(resolvePrimaryCta('LITIGATION', base, { canEdit: true })).toEqual({
      id: 'add_hearing',
      reason: 'none_scheduled',
    });
  });

  it('prepare hearing within 7 days, prefer upload when docs missing', () => {
    expect(
      resolvePrimaryCta(
        'LITIGATION',
        { ...base, hasUpcomingHearing: true, nextHearingDays: 3 },
        { canEdit: true }
      )
    ).toEqual({ id: 'prepare_hearing', reason: 'hearing_soon' });

    expect(
      resolvePrimaryCta(
        'LITIGATION',
        { ...base, hasUpcomingHearing: true, nextHearingDays: 2, missingRequiredDocCount: 1 },
        { canEdit: true }
      )
    ).toEqual({ id: 'prepare_hearing', reason: 'missing_docs_for_hearing', preferUpload: true });
  });

  it('reviews overdue deadlines then falls back to add task', () => {
    expect(
      resolvePrimaryCta(
        'LITIGATION',
        { ...base, hasUpcomingHearing: true, nextHearingDays: 14, overdueDeadlineCount: 1 },
        { canEdit: true }
      )
    ).toEqual({ id: 'review_deadlines', reason: 'overdue_deadline' });

    expect(
      resolvePrimaryCta(
        'LITIGATION',
        { ...base, hasUpcomingHearing: true, nextHearingDays: 14 },
        { canEdit: true }
      )
    ).toEqual({ id: 'add_task', reason: 'default_add_task' });
  });
});

describe('resolvePrimaryCta · administrative', () => {
  it('checklist → deadline → tasks → mark completed / add task', () => {
    expect(
      resolvePrimaryCta('ADMINISTRATIVE', { ...base, missingRequiredDocCount: 1 }, { canEdit: true })
    ).toMatchObject({ id: 'open_checklist' });
    expect(
      resolvePrimaryCta('ADMINISTRATIVE', { ...base, nextDeadlineDays: 3 }, { canEdit: true })
    ).toMatchObject({ id: 'add_deadline' });
    expect(
      resolvePrimaryCta('ADMINISTRATIVE', { ...base, openTaskCount: 2 }, { canEdit: true })
    ).toMatchObject({ id: 'add_task' });
    expect(resolvePrimaryCta('ADMINISTRATIVE', base, { canEdit: true, caseClosed: false })).toEqual({
      id: 'mark_completed',
      reason: 'mark_completed',
    });
    expect(resolvePrimaryCta('ADMINISTRATIVE', base, { canEdit: true, caseClosed: true })).toEqual({
      id: 'add_task',
      reason: 'default_add_task',
    });
    expect(resolvePrimaryCta('ADMINISTRATIVE', base, { canEdit: false })).toEqual({
      id: 'add_task',
      reason: 'default_add_task',
    });
  });
});

describe('resolvePrimaryCta · consultation', () => {
  it('1. join video wins first', () => {
    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        {
          ...base,
          canJoinVideo: true,
          sessionDatePassed: true,
          canConvert: true,
          convertedCase: { id: 9, reference: 'L-9' },
        },
        { canEdit: true }
      )
    ).toMatchObject({ id: 'join_video', reason: 'join_video' });
  });

  it('2. session date passed + can edit → mark completed', () => {
    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, sessionDatePassed: true, canConvert: true },
        { canEdit: true }
      )
    ).toEqual({ id: 'mark_completed', reason: 'session_date_passed' });
    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, sessionDatePassed: true },
        { canEdit: false }
      )
    ).toMatchObject({ id: 'edit_session' });
  });

  it('3. canConvert → convert', () => {
    expect(
      resolvePrimaryCta('CONSULTATION', { ...base, canConvert: true }, { canEdit: true })
    ).toMatchObject({ id: 'convert', reason: 'can_convert' });
  });

  it('4. already converted → open case with reference (fallback title)', () => {
    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, convertedCase: { id: 42, reference: 'LIT-42', title: 'Matter' } },
        { canEdit: true }
      )
    ).toEqual({ id: 'open_case', reason: 'converted', detail: 'LIT-42' });

    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, convertedCase: { id: 42, reference: null, title: 'Matter only' } },
        { canEdit: true }
      )
    ).toEqual({ id: 'open_case', reason: 'converted', detail: 'Matter only' });
  });

  it('5. completed or cancelled → add follow-up when allowed', () => {
    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, consultationCompleted: true },
        { canEdit: true }
      )
    ).toMatchObject({ id: 'add_follow_up' });
    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, consultationCancelled: true },
        { canEdit: true }
      )
    ).toMatchObject({ id: 'add_follow_up' });
    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, consultationCompleted: true },
        { canEdit: false }
      )
    ).toMatchObject({ id: 'edit_session' });
  });

  it('6. otherwise edit session', () => {
    expect(resolvePrimaryCta('CONSULTATION', base, { canEdit: true })).toMatchObject({
      id: 'edit_session',
    });
  });
});
