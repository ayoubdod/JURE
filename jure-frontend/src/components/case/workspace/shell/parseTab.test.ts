import { describe, expect, it } from 'vitest';
import { defaultLeafForGroup, parseTab } from './parseTab';

describe('parseTab', () => {
  it('defaults to overview when tab is missing', () => {
    expect(parseTab('LITIGATION', null)).toEqual({ leaf: 'overview', group: 'overview' });
    expect(parseTab('ADMINISTRATIVE', null)).toEqual({ leaf: 'overview', group: 'overview' });
    expect(parseTab('CONSULTATION', null)).toEqual({ leaf: 'overview', group: 'overview' });
  });

  it('maps litigation legacy details → caseDetails / caseFile', () => {
    expect(parseTab('LITIGATION', 'details')).toEqual({ leaf: 'caseDetails', group: 'caseFile' });
    expect(parseTab('LITIGATION', 'caseDetails')).toEqual({ leaf: 'caseDetails', group: 'caseFile' });
    expect(parseTab('LITIGATION', 'parties')).toEqual({ leaf: 'parties', group: 'caseFile' });
  });

  it('maps litigation schedule and work leaves to groups', () => {
    expect(parseTab('LITIGATION', 'hearings')).toEqual({ leaf: 'hearings', group: 'schedule' });
    expect(parseTab('LITIGATION', 'deadlines')).toEqual({ leaf: 'deadlines', group: 'schedule' });
    expect(parseTab('LITIGATION', 'appointments')).toEqual({ leaf: 'appointments', group: 'schedule' });
    expect(parseTab('LITIGATION', 'tasks')).toEqual({ leaf: 'tasks', group: 'work' });
    expect(parseTab('LITIGATION', 'notes')).toEqual({ leaf: 'notes', group: 'work' });
    expect(parseTab('LITIGATION', 'research')).toEqual({ leaf: 'research', group: 'work' });
  });

  it('maps administrative details aliases to dutyFile', () => {
    expect(parseTab('ADMINISTRATIVE', 'details')).toEqual({
      leaf: 'administrative',
      group: 'dutyFile',
    });
    expect(parseTab('ADMINISTRATIVE', 'caseDetails')).toEqual({
      leaf: 'administrative',
      group: 'dutyFile',
    });
    expect(parseTab('ADMINISTRATIVE', 'administrative')).toEqual({
      leaf: 'administrative',
      group: 'dutyFile',
    });
  });

  it('maps consultation administrative → consultation / session', () => {
    expect(parseTab('CONSULTATION', 'administrative')).toEqual({
      leaf: 'consultation',
      group: 'session',
    });
    expect(parseTab('CONSULTATION', 'consultation')).toEqual({
      leaf: 'consultation',
      group: 'session',
    });
  });

  it('falls back to overview for unknown leaves', () => {
    expect(parseTab('LITIGATION', 'nope')).toEqual({ leaf: 'overview', group: 'overview' });
  });

  it('defaultLeafForGroup uses fixed defaults', () => {
    expect(defaultLeafForGroup('LITIGATION', 'caseFile')).toBe('caseDetails');
    expect(defaultLeafForGroup('LITIGATION', 'schedule')).toBe('hearings');
    expect(defaultLeafForGroup('ADMINISTRATIVE', 'schedule')).toBe('deadlines');
    expect(defaultLeafForGroup('CONSULTATION', 'schedule')).toBe('appointments');
    expect(defaultLeafForGroup('CONSULTATION', 'session')).toBe('consultation');
    expect(defaultLeafForGroup('LITIGATION', 'work')).toBe('tasks');
  });

  it('maps every consultation legacy leaf to its group/segment', () => {
    const expected: Record<string, { group: string; leaf: string }> = {
      overview: { group: 'overview', leaf: 'overview' },
      administrative: { group: 'session', leaf: 'consultation' },
      consultation: { group: 'session', leaf: 'consultation' },
      appointments: { group: 'schedule', leaf: 'appointments' },
      deadlines: { group: 'schedule', leaf: 'deadlines' },
      tasks: { group: 'work', leaf: 'tasks' },
      notes: { group: 'work', leaf: 'notes' },
      documents: { group: 'documents', leaf: 'documents' },
      finance: { group: 'finance', leaf: 'finance' },
      activity: { group: 'activity', leaf: 'activity' },
      juria: { group: 'juria', leaf: 'juria' },
    };
    for (const [raw, want] of Object.entries(expected)) {
      expect(parseTab('CONSULTATION', raw)).toEqual(want);
    }
  });


  it('maps every administrative legacy leaf to its group/segment', () => {
    const expected: Record<string, { group: string; leaf: string }> = {
      overview: { group: 'overview', leaf: 'overview' },
      administrative: { group: 'dutyFile', leaf: 'administrative' },
      details: { group: 'dutyFile', leaf: 'administrative' },
      caseDetails: { group: 'dutyFile', leaf: 'administrative' },
      deadlines: { group: 'schedule', leaf: 'deadlines' },
      appointments: { group: 'schedule', leaf: 'appointments' },
      tasks: { group: 'work', leaf: 'tasks' },
      notes: { group: 'work', leaf: 'notes' },
      documents: { group: 'documents', leaf: 'documents' },
      finance: { group: 'finance', leaf: 'finance' },
      activity: { group: 'activity', leaf: 'activity' },
      juria: { group: 'juria', leaf: 'juria' },
    };
    for (const [raw, want] of Object.entries(expected)) {
      expect(parseTab('ADMINISTRATIVE', raw)).toEqual(want);
    }
  });

  it('maps every litigation legacy leaf to the Phase 2 group/segment', () => {
    const expected: Record<string, { group: string; leaf: string }> = {
      overview: { group: 'overview', leaf: 'overview' },
      caseDetails: { group: 'caseFile', leaf: 'caseDetails' },
      details: { group: 'caseFile', leaf: 'caseDetails' },
      parties: { group: 'caseFile', leaf: 'parties' },
      hearings: { group: 'schedule', leaf: 'hearings' },
      deadlines: { group: 'schedule', leaf: 'deadlines' },
      appointments: { group: 'schedule', leaf: 'appointments' },
      tasks: { group: 'work', leaf: 'tasks' },
      notes: { group: 'work', leaf: 'notes' },
      research: { group: 'work', leaf: 'research' },
      documents: { group: 'documents', leaf: 'documents' },
      finance: { group: 'finance', leaf: 'finance' },
      activity: { group: 'activity', leaf: 'activity' },
      juria: { group: 'juria', leaf: 'juria' },
    };
    for (const [raw, want] of Object.entries(expected)) {
      expect(parseTab('LITIGATION', raw)).toEqual(want);
    }
  });
});
