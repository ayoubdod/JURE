import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Folder,
  LayoutDashboard,
  Sparkles,
  Wallet,
} from 'lucide-react';
import type { CaseWorkspaceGroupId, CaseWorkspaceLeaf } from '@/components/case/workspace/shell';

export const CONSULTATION_GROUP_SEGMENTS: Partial<Record<CaseWorkspaceGroupId, CaseWorkspaceLeaf[]>> = {
  schedule: ['appointments', 'deadlines'],
  work: ['tasks', 'notes'],
};

export type ConsultationNavGroupDef = {
  id: CaseWorkspaceGroupId;
  leaf: CaseWorkspaceLeaf;
  icon: LucideIcon;
  labelKey: 'overview' | 'session' | 'schedule' | 'work' | 'documents' | 'finance' | 'activity' | 'juria';
  badge?: 'session' | 'schedule' | 'work' | 'documents';
  footer?: boolean;
  financeGated?: boolean;
  juriaFlagged?: boolean;
};

export const CONSULTATION_NAV_GROUPS: ConsultationNavGroupDef[] = [
  { id: 'overview', leaf: 'overview', icon: LayoutDashboard, labelKey: 'overview' },
  { id: 'session', leaf: 'consultation', icon: ClipboardList, labelKey: 'session', badge: 'session' },
  { id: 'schedule', leaf: 'appointments', icon: CalendarClock, labelKey: 'schedule', badge: 'schedule' },
  { id: 'work', leaf: 'tasks', icon: CheckSquare, labelKey: 'work', badge: 'work' },
  { id: 'documents', leaf: 'documents', icon: Folder, labelKey: 'documents', badge: 'documents' },
  { id: 'finance', leaf: 'finance', icon: Wallet, labelKey: 'finance', financeGated: true },
  { id: 'activity', leaf: 'activity', icon: Activity, labelKey: 'activity' },
  { id: 'juria', leaf: 'juria', icon: Sparkles, labelKey: 'juria', footer: true, juriaFlagged: true },
];

export function getConsultationConfig() {
  return {
    groupSegments: CONSULTATION_GROUP_SEGMENTS,
    navGroups: CONSULTATION_NAV_GROUPS,
    primaryCtaType: 'CONSULTATION' as const,
  };
}
