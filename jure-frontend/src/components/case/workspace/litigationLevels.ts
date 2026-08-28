import { getCaseData } from '@/utils/caseCardHelpers';
import { CHAMBERS_BY_JURISDICTION, isJurisdictionLevel } from '@/services/case/litigationCourt';
import type { AppMessages } from '@/i18n/messages/types';

export const LITIGATION_LEVEL_KEYS = ['FIRST_INSTANCE', 'APPEAL', 'CASSATION', 'OTHER'] as const;
export type LitigationLevelKey = (typeof LITIGATION_LEVEL_KEYS)[number];

export const LITIGATION_LEVEL_SECTIONS: Array<{
  key: LitigationLevelKey;
  accent: string;
  header: string;
  count: string;
}> = [
  {
    key: 'FIRST_INSTANCE',
    accent: 'border-l-blue-500 bg-blue-50/70 dark:bg-blue-950/25',
    header: 'text-blue-800 dark:text-blue-200',
    count: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  },
  {
    key: 'APPEAL',
    accent: 'border-l-violet-500 bg-violet-50/70 dark:bg-violet-950/25',
    header: 'text-violet-800 dark:text-violet-200',
    count: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  },
  {
    key: 'CASSATION',
    accent: 'border-l-slate-500 bg-slate-50/80 dark:bg-slate-900/40',
    header: 'text-slate-800 dark:text-slate-200',
    count: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
  {
    key: 'OTHER',
    accent: 'border-l-amber-500 bg-amber-50/70 dark:bg-amber-950/25',
    header: 'text-amber-800 dark:text-amber-200',
    count: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
];

export function litigationLevelOf(c: API.Case): LitigationLevelKey {
  const raw = String(getCaseData(c, 'jurisdiction') ?? '').trim();
  if (isJurisdictionLevel(raw)) return raw;
  return 'OTHER';
}

export function uniqueChamberCodes(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const level of ['FIRST_INSTANCE', 'APPEAL', 'CASSATION'] as const) {
    for (const code of CHAMBERS_BY_JURISDICTION[level]) {
      if (seen.has(code)) continue;
      seen.add(code);
      out.push(code);
    }
  }
  return out;
}

export function chamberFilterLabel(
  chamber: string,
  options: AppMessages['cases']['modal']['options']
): string {
  if (chamber in options.chamberFirstInstance) {
    return options.chamberFirstInstance[chamber as keyof typeof options.chamberFirstInstance];
  }
  if (chamber in options.chamberAppeal) {
    return options.chamberAppeal[chamber as keyof typeof options.chamberAppeal];
  }
  if (chamber in options.chamberCassation) {
    return options.chamberCassation[chamber as keyof typeof options.chamberCassation];
  }
  return chamber;
}
