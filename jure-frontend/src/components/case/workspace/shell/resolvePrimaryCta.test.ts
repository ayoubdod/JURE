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
  it('add hearing when none scheduled', () => {
    expect(resolvePrimaryCta('LITIGATION', base, { canEdit: true })).toEqual({
      id: 'add_hearing',
      reason: 'none_scheduled',
    });
  });

  it('prepare hearing when ≤7 days and prefer upload if docs missing', () => {
    expect(
      resolvePrimaryCta(
        'LITIGATION',
        { ...base, hasUpcomingHearing: true, nextHearingDays: 3, missingRequiredDocCount: 2 },
        { canEdit: true }
      )
    ).toEqual({
      id: 'prepare_hearing',
      reason: 'missing_docs_for_hearing',
      preferUpload: true,
    });

    expect(
      resolvePrimaryCta(
        'LITIGATION',
        { ...base, hasUpcomingHearing: true, nextHearingDays: 7, missingRequiredDocCount: 0 },
        { canEdit: true }
      )
    ).toEqual({ id: 'prepare_hearing', reason: 'hearing_soon' });
  });

  it('review deadlines when overdue and hearing not soon', () => {
    expect(
      resolvePrimaryCta(
        'LITIGATION',
        {
          ...base,
          hasUpcomingHearing: true,
          nextHearingDays: 30,
          overdueDeadlineCount: 1,
        },
        { canEdit: true }
      )
    ).toEqual({ id: 'review_deadlines', reason: 'overdue_deadline' });
  });

  it('falls back to add task', () => {
    expect(
      resolvePrimaryCta(
        'LITIGATION',
        { ...base, hasUpcomingHearing: true, nextHearingDays: 30 },
        { canEdit: true }
      )
    ).toEqual({ id: 'add_task', reason: 'default_add_task' });
  });
});

describe('resolvePrimaryCta · administrative', () => {
  it('prefers checklist, then deadline, then task, then mark completed', () => {
    expect(
      resolvePrimaryCta('ADMINISTRATIVE', { ...base, missingRequiredDocCount: 1 }, { canEdit: true })
    ).toMatchObject({ id: 'open_checklist' });

    expect(
      resolvePrimaryCta(
        'ADMINISTRATIVE',
        { ...base, overdueDeadlineCount: 1 },
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
  it('join video → convert → follow-up → edit', () => {
    expect(
      resolvePrimaryCta('CONSULTATION', { ...base, canJoinVideo: true }, { canEdit: true })
    ).toMatchObject({ id: 'join_video' });

    expect(
      resolvePrimaryCta('CONSULTATION', { ...base, canConvert: true }, { canEdit: true })
    ).toMatchObject({ id: 'convert' });

    expect(resolvePrimaryCta('CONSULTATION', base, { canEdit: true })).toMatchObject({
      id: 'add_follow_up',
    });

    expect(
      resolvePrimaryCta(
        'CONSULTATION',
        { ...base, consultationCancelled: true },
        { canEdit: true }
      )
    ).toBeNull();

    expect(resolvePrimaryCta('CONSULTATION', base, { canEdit: false })).toMatchObject({
      id: 'edit_session',
    });
  });
});
