import { describe, expect, it } from 'vitest';
import { resolveWorkspaceKind } from './resolveWorkspaceKind';

describe('resolveWorkspaceKind', () => {
  it('maps known backend types to workspace kinds', () => {
    expect(resolveWorkspaceKind({ caseType: 'CONSULTATION' })).toBe('CONSULTATION');
    expect(resolveWorkspaceKind({ caseType: 'LITIGATION' })).toBe('LITIGATION');
    expect(resolveWorkspaceKind({ caseType: 'ADMINISTRATIVE' })).toBe('ADMINISTRATIVE');
    expect(resolveWorkspaceKind({ case_type: 'ADMINISTRATIVE_DUTY' })).toBe('ADMINISTRATIVE');
  });

  it('falls back to UNKNOWN without soft-locking', () => {
    expect(resolveWorkspaceKind({})).toBe('UNKNOWN');
    expect(resolveWorkspaceKind({ caseType: 'SOMETHING_ELSE' })).toBe('UNKNOWN');
    expect(resolveWorkspaceKind({ case_type: null })).toBe('UNKNOWN');
  });
});
