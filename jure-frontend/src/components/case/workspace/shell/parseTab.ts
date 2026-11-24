import type { CaseWorkspaceGroupId, CaseWorkspaceLeaf, CaseWorkspaceType, ParsedTab } from './types';

const LITIGATION_LEAVES: CaseWorkspaceLeaf[] = [
  'overview',
  'caseDetails',
  'parties',
  'tasks',
  'appointments',
  'hearings',
  'deadlines',
  'documents',
  'research',
  'notes',
  'finance',
  'juria',
  'activity',
];

const ADMINISTRATIVE_LEAVES: CaseWorkspaceLeaf[] = [
  'overview',
  'administrative',
  'tasks',
  'appointments',
  'deadlines',
  'documents',
  'notes',
  'finance',
  'juria',
  'activity',
];

const CONSULTATION_LEAVES: CaseWorkspaceLeaf[] = [
  'overview',
  'consultation',
  'tasks',
  'appointments',
  'deadlines',
  'documents',
  'notes',
  'finance',
  'juria',
  'activity',
];

function groupForLeaf(type: CaseWorkspaceType, leaf: CaseWorkspaceLeaf): CaseWorkspaceGroupId {
  if (leaf === 'overview') return 'overview';
  if (leaf === 'finance') return 'finance';
  if (leaf === 'juria') return 'juria';
  if (leaf === 'activity') return 'activity';
  if (leaf === 'documents') return 'documents';

  if (type === 'LITIGATION') {
    if (leaf === 'caseDetails' || leaf === 'parties') return 'caseFile';
    if (leaf === 'hearings' || leaf === 'deadlines' || leaf === 'appointments') return 'schedule';
    if (leaf === 'tasks' || leaf === 'notes' || leaf === 'research') return 'work';
  }

  if (type === 'ADMINISTRATIVE') {
    if (leaf === 'administrative') return 'dutyFile';
    if (leaf === 'deadlines' || leaf === 'appointments') return 'schedule';
    if (leaf === 'tasks' || leaf === 'notes') return 'work';
  }

  if (type === 'CONSULTATION') {
    if (leaf === 'consultation') return 'session';
    if (leaf === 'appointments' || leaf === 'deadlines') return 'schedule';
    if (leaf === 'tasks' || leaf === 'notes') return 'work';
  }

  return leaf;
}

function normalizeLeaf(type: CaseWorkspaceType, raw: string | null): CaseWorkspaceLeaf {
  if (!raw) return 'overview';

  if (type === 'LITIGATION') {
    if (raw === 'details') return 'caseDetails';
    if (LITIGATION_LEAVES.includes(raw as CaseWorkspaceLeaf)) return raw as CaseWorkspaceLeaf;
    return 'overview';
  }

  if (type === 'ADMINISTRATIVE') {
    if (raw === 'details' || raw === 'caseDetails') return 'administrative';
    if (ADMINISTRATIVE_LEAVES.includes(raw as CaseWorkspaceLeaf)) return raw as CaseWorkspaceLeaf;
    return 'overview';
  }

  if (type === 'CONSULTATION') {
    // Canonical: consultation. Legacy: administrative (and prior alias consultation→administrative).
    if (raw === 'administrative' || raw === 'consultation') return 'consultation';
    if (CONSULTATION_LEAVES.includes(raw as CaseWorkspaceLeaf)) return raw as CaseWorkspaceLeaf;
    return 'overview';
  }

  // UNKNOWN / generic
  if (raw === 'documents' || raw === 'activity' || raw === 'overview') return raw;
  return 'overview';
}

/** Pure alias table: legacy / current `?tab=` → { group, leaf }. */
export function parseTab(type: CaseWorkspaceType, raw: string | null): ParsedTab {
  const leaf = normalizeLeaf(type, raw);
  return { leaf, group: groupForLeaf(type, leaf) };
}

export function defaultLeafForGroup(type: CaseWorkspaceType, group: CaseWorkspaceGroupId): CaseWorkspaceLeaf {
  if (group === 'overview') return 'overview';
  if (group === 'caseFile') return 'caseDetails';
  if (group === 'session') return 'consultation';
  if (group === 'dutyFile') return 'administrative';
  if (group === 'schedule') {
    if (type === 'LITIGATION') return 'hearings';
    return 'deadlines';
  }
  if (group === 'work') return 'tasks';
  if (group === 'documents') return 'documents';
  if (group === 'finance') return 'finance';
  if (group === 'juria') return 'juria';
  if (group === 'activity') return 'activity';
  return group as CaseWorkspaceLeaf;
}
