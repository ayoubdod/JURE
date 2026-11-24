import type { LucideIcon } from 'lucide-react';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';
import type { ResearchNote } from '@/services/research-notes/api';

/** Leaf tab ids written to `?tab=` (deep-link stable). */
export type CaseWorkspaceLeaf =
  | 'overview'
  | 'caseDetails'
  | 'parties'
  | 'tasks'
  | 'appointments'
  | 'hearings'
  | 'deadlines'
  | 'documents'
  | 'research'
  | 'notes'
  | 'finance'
  | 'juria'
  | 'activity'
  | 'administrative'
  | 'consultation';

export type CaseWorkspaceGroupId =
  | 'overview'
  | 'caseFile'
  | 'session'
  | 'dutyFile'
  | 'schedule'
  | 'work'
  | 'documents'
  | 'finance'
  | 'activity'
  | 'juria'
  /** Phase 1 flat nav: one entry per leaf */
  | CaseWorkspaceLeaf;

export type CaseWorkspaceType = 'LITIGATION' | 'ADMINISTRATIVE' | 'CONSULTATION' | 'UNKNOWN';

export type ParsedTab = {
  leaf: CaseWorkspaceLeaf;
  group: CaseWorkspaceGroupId;
};

export type CaseWorkspaceNavItem = {
  /** Sidebar / chip id (group in Phase 2+, leaf in Phase 1 flat mode). */
  id: CaseWorkspaceGroupId;
  label: string;
  icon: LucideIcon;
  /** Leaf to open when activating this nav item. */
  leaf: CaseWorkspaceLeaf;
  count?: number;
  urgent?: boolean;
  /** Screen-reader label including attention count, e.g. "Schedule, 3 need attention". */
  countAriaLabel?: string;
  /** Render in the nav footer (e.g. Juria). */
  footer?: boolean;
};

export type CaseSummaryPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  showFinance: boolean;
  juriaEnabled: boolean;
};

export type CaseSummaryInput = {
  caseItem: API.Case;
  type: CaseWorkspaceType;
  legalDeadlines?: CalculatedDeadline[] | null;
  researchNotes?: ResearchNote[] | null;
};

export type CaseSummary = {
  nextHearingIso: string | null;
  nextHearingDays: number | null;
  hasUpcomingHearing: boolean;
  nextDeadlineIso: string | null;
  nextDeadlineDays: number | null;
  overdueDeadlineCount: number;
  /** overdue + due within 7 days */
  scheduleBadge: number;
  workBadge: number;
  /** missing required docs, else attachment total */
  documentsBadge: number;
  missingRequiredDocCount: number;
  attachmentCount: number;
  openTaskCount: number;
  researchCount: number;
  followUpCount: number;
  /** Missing required docs — used for Admin Duty file / Documents attention. */
  dutyFileBadge: number;
  /** Consultation Session attention: pending follow-ups (else total). */
  sessionBadge: number;
  /** Phase 1 Lit parity badges (totals / upcoming, not attention). */
  leafCounts: Partial<Record<CaseWorkspaceLeaf, number>>;
};

export type PrimaryCtaId =
  | 'add_hearing'
  | 'prepare_hearing'
  | 'review_deadlines'
  | 'add_task'
  | 'join_video'
  | 'convert'
  | 'add_follow_up'
  | 'edit_session'
  | 'upload_document'
  | 'add_deadline'
  | 'mark_completed'
  | 'open_checklist';

export type PrimaryCtaReason =
  | 'none_scheduled'
  | 'hearing_soon'
  | 'missing_docs_for_hearing'
  | 'overdue_deadline'
  | 'default_add_task'
  | 'join_video'
  | 'can_convert'
  | 'add_follow_up'
  | 'edit_session'
  | 'missing_required_docs'
  | 'due_soon'
  | 'mark_completed';

export type PrimaryCta = {
  id: PrimaryCtaId;
  reason: PrimaryCtaReason;
  /** Opens Documents upload when prepare_hearing + missing docs */
  preferUpload?: boolean;
};

export type PrimaryCtaPermissions = {
  canEdit: boolean;
  canConvert?: boolean;
  caseClosed?: boolean;
};
