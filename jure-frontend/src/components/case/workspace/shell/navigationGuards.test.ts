import { describe, expect, it } from 'vitest';
import {
  applyLeafToSearchParams,
  shouldRedirectFollowUpToParent,
  stripConvertSearchParam,
} from './navigationGuards';

describe('applyLeafToSearchParams (hotfix 77a0294 regression)', () => {
  it('returns the same URLSearchParams instance when leaf is already active', () => {
    const prev = new URLSearchParams('tab=consultation');
    const next = applyLeafToSearchParams(prev, 'CONSULTATION', 'consultation');
    expect(next).toBe(prev);
  });

  it('treats missing tab as overview and no-ops when requesting overview', () => {
    const prev = new URLSearchParams();
    expect(applyLeafToSearchParams(prev, 'LITIGATION', 'overview')).toBe(prev);
  });

  it('writes tab when leaf changes', () => {
    const prev = new URLSearchParams();
    const next = applyLeafToSearchParams(prev, 'LITIGATION', 'hearings');
    expect(next).not.toBe(prev);
    expect(next.get('tab')).toBe('hearings');
  });

  it('clears tab when switching to overview', () => {
    const prev = new URLSearchParams('tab=documents');
    const next = applyLeafToSearchParams(prev, 'ADMINISTRATIVE', 'overview');
    expect(next.get('tab')).toBeNull();
  });

  it('maps consultation administrative alias without rewriting when already on session', () => {
    const prev = new URLSearchParams('tab=administrative');
    // parseTab maps administrative → consultation; already on that leaf → no-op
    expect(applyLeafToSearchParams(prev, 'CONSULTATION', 'consultation')).toBe(prev);
  });
});

describe('stripConvertSearchParam', () => {
  it('no-ops when convert is absent', () => {
    const prev = new URLSearchParams('tab=overview');
    expect(stripConvertSearchParam(prev)).toBe(prev);
  });

  it('removes convert=1 once', () => {
    const prev = new URLSearchParams('convert=1&tab=consultation');
    const next = stripConvertSearchParam(prev);
    expect(next).not.toBe(prev);
    expect(next.get('convert')).toBeNull();
    expect(next.get('tab')).toBe('consultation');
  });
});

describe('shouldRedirectFollowUpToParent', () => {
  it('redirects consultation follow-ups only', () => {
    expect(
      shouldRedirectFollowUpToParent({
        id: 2,
        caseType: 'CONSULTATION',
        parentConsultation: { id: 1, title: 'Origin', reference: 'C-1' },
      })
    ).toBe(true);
  });

  it('skips lit/admin, self-links, and roots', () => {
    expect(
      shouldRedirectFollowUpToParent({
        id: 9,
        caseType: 'LITIGATION',
        parentConsultation: { id: 1 },
      })
    ).toBe(false);
    expect(
      shouldRedirectFollowUpToParent({
        id: 1,
        caseType: 'CONSULTATION',
        parentConsultation: { id: 1 },
      })
    ).toBe(false);
    expect(shouldRedirectFollowUpToParent({ id: 1, caseType: 'CONSULTATION' })).toBe(false);
  });
});
