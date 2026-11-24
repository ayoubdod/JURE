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
      resolvePrimaryCta(
        'ADMINISTRATIVE',
        { ...base, nextDeadlineDays: 3 },
        { canEdit: true }
      )
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
  it('join video wins first', () => {
    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, canJoinVideo: true, canConvert: true },
        { canEdit: true }
      )
    ).toMatchObject({ id: 'join_video' });
  });

  it('convert wins when join is not available', () => {
    expect(
      resolvePrimaryCta('CONSULTATION', { ...base, canConvert: true }, { canEdit: true })
    ).toMatchObject({ id: 'convert' });
  });

  it('completed or cancelled → add follow-up when allowed', () => {
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

  it('otherwise edit session', () => {
    expect(resolvePrimaryCta('CONSULTATION', base, { canEdit: true })).toMatchObject({
      id: 'edit_session',
    });
    expect(resolvePrimaryCta('CONSULTATION', base, { canEdit: false })).toMatchObject({
      id: 'edit_session',
    });
  });
});
