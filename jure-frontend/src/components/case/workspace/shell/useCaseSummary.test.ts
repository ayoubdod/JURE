import { describe, expect, it } from 'vitest';
import { buildCaseSummary } from './buildCaseSummary';
import { useCaseSummary } from './useCaseSummary';

/**
 * `useCaseSummary` is a thin `useMemo` around `buildCaseSummary`.
 * Nav counts / next hearing / next deadline behavior is covered in buildCaseSummary.test.ts.
 */
describe('useCaseSummary', () => {
  it('exposes the same pure builder used by the hook', () => {
    expect(typeof useCaseSummary).toBe('function');
    const summary = buildCaseSummary({
      type: 'LITIGATION',
      caseItem: {
        id: 1,
        title: 'x',
        case_specific_data: {},
        attachments: [],
        _related: { tasks: [], appointments: [] },
      } as API.Case,
    });
    expect(summary.scheduleBadge).toBe(0);
    expect(summary.workBadge).toBe(0);
    expect(summary.leafCounts.tasks).toBe(0);
  });
});
