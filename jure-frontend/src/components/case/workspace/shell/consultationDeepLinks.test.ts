import { describe, expect, it } from 'vitest';
import { resolveConsultationHash, shouldOpenConvertFromQuery } from './consultationDeepLinks';

describe('resolveConsultationHash', () => {
  it('maps #follow-ups to Session leaf + scroll', () => {
    expect(resolveConsultationHash('#follow-ups')).toEqual({
      leaf: 'consultation',
      scrollToFollowUps: true,
    });
    expect(resolveConsultationHash('follow-ups')).toEqual({
      leaf: 'consultation',
      scrollToFollowUps: true,
    });
  });

  it('ignores other hashes', () => {
    expect(resolveConsultationHash('#other')).toEqual({ leaf: null, scrollToFollowUps: false });
    expect(resolveConsultationHash(null)).toEqual({ leaf: null, scrollToFollowUps: false });
  });
});

describe('shouldOpenConvertFromQuery', () => {
  it('opens only when convert=1 and canConvert', () => {
    expect(shouldOpenConvertFromQuery('1', true)).toBe(true);
    expect(shouldOpenConvertFromQuery('1', false)).toBe(false);
    expect(shouldOpenConvertFromQuery(null, true)).toBe(false);
    expect(shouldOpenConvertFromQuery('0', true)).toBe(false);
  });
});
