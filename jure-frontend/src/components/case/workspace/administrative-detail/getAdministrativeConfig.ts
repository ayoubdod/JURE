import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CheckSquare,
  ClipboardList,
  Clock,
  Folder,
  LayoutDashboard,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { CaseWorkspaceGroupId, CaseWorkspaceLeaf } from '@/components/case/workspace/shell';

/** Fixed segment leaves per grouped nav parent. */
export const ADMIN_GROUP_SEGMENTS: Partial<Record<CaseWorkspaceGroupId, CaseWorkspaceLeaf[]>> = {
  schedule: ['deadlines', 'appointments'],
  work: ['tasks', 'notes'],
};

export type AdminNavGroupDef = {
  id: CaseWorkspaceGroupId;
  leaf: CaseWorkspaceLeaf;
  icon: LucideIcon;
  labelKey: 'overview' | 'dutyFile' | 'schedule' | 'work' | 'documents' | 'finance' | 'activity' | 'juria';
  badge?: 'dutyFile' | 'schedule' | 'work' | 'documents';
  footer?: boolean;
  financeGated?: boolean;
  juriaFlagged?: boolean;
};

/** Top-level nav (≤7 + optional finance / Juria). */
export const ADMIN_NAV_GROUPS: AdminNavGroupDef[] = [
  { id: 'overview', leaf: 'overview', icon: LayoutDashboard, labelKey: 'overview' },
  { id: 'dutyFile', leaf: 'administrative', icon: ClipboardList, labelKey: 'dutyFile', badge: 'dutyFile' },
  { id: 'schedule', leaf: 'deadlines', icon: Clock, labelKey: 'schedule', badge: 'schedule' },
  { id: 'work', leaf: 'tasks', icon: CheckSquare, labelKey: 'work', badge: 'work' },
  { id: 'documents', leaf: 'documents', icon: Folder, labelKey: 'documents', badge: 'documents' },
  { id: 'finance', leaf: 'finance', icon: Wallet, labelKey: 'finance', financeGated: true },
  { id: 'activity', leaf: 'activity', icon: Activity, labelKey: 'activity' },
  { id: 'juria', leaf: 'juria', icon: Sparkles, labelKey: 'juria', footer: true, juriaFlagged: true },
];

/** Leaf → section id for the Admin workspace body. */
export const ADMIN_SECTION_MAP = {
  overview: 'overview',
  administrative: 'dutyFile',
  deadlines: 'deadlines',
  appointments: 'appointments',
  tasks: 'tasks',
  notes: 'notes',
  documents: 'documents',
  finance: 'finance',
  activity: 'activity',
  juria: 'juria',
} as const satisfies Partial<Record<CaseWorkspaceLeaf, string>>;

export function getAdministrativeConfig() {
  return {
    groupSegments: ADMIN_GROUP_SEGMENTS,
    navGroups: ADMIN_NAV_GROUPS,
    sectionMap: ADMIN_SECTION_MAP,
    /** Primary CTA order is owned by resolvePrimaryCta('ADMINISTRATIVE', …). */
    primaryCtaType: 'ADMINISTRATIVE' as const,
  };
}
