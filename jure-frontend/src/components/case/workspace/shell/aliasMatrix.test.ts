import { describe, expect, it } from 'vitest';
import { parseTab } from './parseTab';
import {
  resolveConsultationHash,
  shouldOpenConvertFromQuery,
} from './consultationDeepLinks';
import type { CaseWorkspaceType } from './types';

type AliasRow = {
  type: CaseWorkspaceType;
  tab: string | null;
  leaf: string;
  group: string;
};

/** Full legacy `?tab=` alias matrix across all three types + unknown fallbacks. */
const ALIAS_MATRIX: AliasRow[] = [
  // Litigation
  { type: 'LITIGATION', tab: null, leaf: 'overview', group: 'overview' },
  { type: 'LITIGATION', tab: 'overview', leaf: 'overview', group: 'overview' },
  { type: 'LITIGATION', tab: 'details', leaf: 'caseDetails', group: 'caseFile' },
  { type: 'LITIGATION', tab: 'caseDetails', leaf: 'caseDetails', group: 'caseFile' },
  { type: 'LITIGATION', tab: 'parties', leaf: 'parties', group: 'caseFile' },
  { type: 'LITIGATION', tab: 'hearings', leaf: 'hearings', group: 'schedule' },
  { type: 'LITIGATION', tab: 'deadlines', leaf: 'deadlines', group: 'schedule' },
  { type: 'LITIGATION', tab: 'appointments', leaf: 'appointments', group: 'schedule' },
  { type: 'LITIGATION', tab: 'tasks', leaf: 'tasks', group: 'work' },
  { type: 'LITIGATION', tab: 'notes', leaf: 'notes', group: 'work' },
  { type: 'LITIGATION', tab: 'research', leaf: 'research', group: 'work' },
  { type: 'LITIGATION', tab: 'documents', leaf: 'documents', group: 'documents' },
  { type: 'LITIGATION', tab: 'finance', leaf: 'finance', group: 'finance' },
  { type: 'LITIGATION', tab: 'activity', leaf: 'activity', group: 'activity' },
  { type: 'LITIGATION', tab: 'juria', leaf: 'juria', group: 'juria' },
  { type: 'LITIGATION', tab: 'nope', leaf: 'overview', group: 'overview' },
  // Administrative
  { type: 'ADMINISTRATIVE', tab: null, leaf: 'overview', group: 'overview' },
  { type: 'ADMINISTRATIVE', tab: 'administrative', leaf: 'administrative', group: 'dutyFile' },
  { type: 'ADMINISTRATIVE', tab: 'details', leaf: 'administrative', group: 'dutyFile' },
  { type: 'ADMINISTRATIVE', tab: 'caseDetails', leaf: 'administrative', group: 'dutyFile' },
  { type: 'ADMINISTRATIVE', tab: 'deadlines', leaf: 'deadlines', group: 'schedule' },
  { type: 'ADMINISTRATIVE', tab: 'appointments', leaf: 'appointments', group: 'schedule' },
  { type: 'ADMINISTRATIVE', tab: 'tasks', leaf: 'tasks', group: 'work' },
  { type: 'ADMINISTRATIVE', tab: 'notes', leaf: 'notes', group: 'work' },
  { type: 'ADMINISTRATIVE', tab: 'documents', leaf: 'documents', group: 'documents' },
  { type: 'ADMINISTRATIVE', tab: 'finance', leaf: 'finance', group: 'finance' },
  { type: 'ADMINISTRATIVE', tab: 'activity', leaf: 'activity', group: 'activity' },
  { type: 'ADMINISTRATIVE', tab: 'juria', leaf: 'juria', group: 'juria' },
  { type: 'ADMINISTRATIVE', tab: 'garbage', leaf: 'overview', group: 'overview' },
  // Consultation
  { type: 'CONSULTATION', tab: null, leaf: 'overview', group: 'overview' },
  { type: 'CONSULTATION', tab: 'consultation', leaf: 'consultation', group: 'session' },
  { type: 'CONSULTATION', tab: 'administrative', leaf: 'consultation', group: 'session' },
  { type: 'CONSULTATION', tab: 'appointments', leaf: 'appointments', group: 'schedule' },
  { type: 'CONSULTATION', tab: 'deadlines', leaf: 'deadlines', group: 'schedule' },
  { type: 'CONSULTATION', tab: 'tasks', leaf: 'tasks', group: 'work' },
  { type: 'CONSULTATION', tab: 'notes', leaf: 'notes', group: 'work' },
  { type: 'CONSULTATION', tab: 'documents', leaf: 'documents', group: 'documents' },
  { type: 'CONSULTATION', tab: 'finance', leaf: 'finance', group: 'finance' },
  { type: 'CONSULTATION', tab: 'activity', leaf: 'activity', group: 'activity' },
  { type: 'CONSULTATION', tab: 'juria', leaf: 'juria', group: 'juria' },
  { type: 'CONSULTATION', tab: '??', leaf: 'overview', group: 'overview' },
  // Unknown type: only overview / documents / activity; everything else → overview
  { type: 'UNKNOWN', tab: null, leaf: 'overview', group: 'overview' },
  { type: 'UNKNOWN', tab: 'documents', leaf: 'documents', group: 'documents' },
  { type: 'UNKNOWN', tab: 'activity', leaf: 'activity', group: 'activity' },
  { type: 'UNKNOWN', tab: 'hearings', leaf: 'overview', group: 'overview' },
  { type: 'UNKNOWN', tab: 'consultation', leaf: 'overview', group: 'overview' },
];

describe('workspace deep-link alias matrix', () => {
  it.each(ALIAS_MATRIX)('$type ?tab=$tab → $group/$leaf', ({ type, tab, leaf, group }) => {
    expect(parseTab(type, tab)).toEqual({ leaf, group });
  });

  it('resolves #follow-ups to Session + scroll', () => {
    expect(resolveConsultationHash('#follow-ups')).toEqual({
      leaf: 'consultation',
      scrollToFollowUps: true,
    });
    expect(resolveConsultationHash('follow-ups')).toEqual({
      leaf: 'consultation',
      scrollToFollowUps: true,
    });
    expect(resolveConsultationHash('#other')).toEqual({ leaf: null, scrollToFollowUps: false });
  });

  it('opens convert only for ?convert=1 when allowed', () => {
    expect(shouldOpenConvertFromQuery('1', true)).toBe(true);
    expect(shouldOpenConvertFromQuery('1', false)).toBe(false);
    expect(shouldOpenConvertFromQuery(null, true)).toBe(false);
    expect(shouldOpenConvertFromQuery('0', true)).toBe(false);
  });
});
