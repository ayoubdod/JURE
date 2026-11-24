import { getCaseData, getCountdownDays } from '@/utils/caseCardHelpers';
import {
  incompleteTasks,
  keyDeadlinesOf,
  requiredDocumentsOf,
  upcomingAppointments,
} from '@/components/case/workspace/litigation-detail/helpers';
import { pendingFollowUpCount } from '@/components/case/workspace/consultation-detail/helpers';
import type { CalculatedDeadline } from '@/services/legal-deadlines/api';
import type { CaseSummary, CaseSummaryInput, CaseWorkspaceLeaf } from './types';

function isSameLocalDay(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function deadlineIsoList(
  caseItem: API.Case,
  legalDeadlines: CalculatedDeadline[] | null | undefined
): string[] {
  const manuals = keyDeadlinesOf(caseItem).map((d) => d.date);
  const legal = (legalDeadlines ?? [])
    .filter((d) => d.status !== 'cancelled' && d.status !== 'completed')
    .map((d) => d.final_deadline || d.calculated_deadline)
    .filter(Boolean);
  return [...manuals, ...legal];
}

function daysOf(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return getCountdownDays(iso);
}

/** Pure case summary used by header, nav badges, overview, and primary CTA. */
export function buildCaseSummary(input: CaseSummaryInput): CaseSummary {
  const { caseItem, type, legalDeadlines, researchNotes } = input;

  const nextHearingIso =
    type === 'LITIGATION'
      ? String(getCaseData(caseItem, 'next_hearing_date') ?? '') || null
      : null;
  const nextHearingDays = daysOf(nextHearingIso);
  const hasUpcomingHearing = Boolean(nextHearingIso && (nextHearingDays ?? -1) >= 0);

  const dueIso =
    type === 'ADMINISTRATIVE'
      ? String(getCaseData(caseItem, 'due_date') ?? '') || null
      : null;
  const deadlineDates = [
    ...deadlineIsoList(caseItem, legalDeadlines),
    ...(dueIso ? [dueIso] : []),
  ];
  const deadlineRows = deadlineDates
    .map((iso) => ({ iso, days: daysOf(iso) }))
    .filter((d) => d.days != null) as { iso: string; days: number }[];

  const overdueDeadlineCount = deadlineRows.filter((d) => d.days < 0).length;
  let scheduleBadge = deadlineRows.filter((d) => d.days < 0 || d.days <= 7).length;
  if (type === 'CONSULTATION') {
    const apptToday = (caseItem._related?.appointments ?? []).some((a) => {
      const start = a.start_at;
      return start && a.status !== 'cancelled' ? isSameLocalDay(String(start)) : false;
    });
    const sessionIso = String(getCaseData(caseItem, 'consultation_date') ?? '') || '';
    const sessionToday = sessionIso ? isSameLocalDay(sessionIso) : false;
    if (apptToday || sessionToday) scheduleBadge += 1;
  }

  const upcomingDeadlines = deadlineRows
    .filter((d) => d.days >= 0)
    .sort((a, b) => a.days - b.days);
  const nextDeadline = upcomingDeadlines[0] ?? null;

  const openTaskCount = incompleteTasks(caseItem).length;
  const workBadge = openTaskCount;

  const required = requiredDocumentsOf(caseItem);
  const missingRequiredDocCount = required.filter((d) => !d.completed).length;
  const attachmentCount = caseItem.attachments?.length ?? 0;
  // Attention badge: missing required docs; fall back to attachment total only when no required-docs list exists.
  const documentsBadge = required.length > 0 ? missingRequiredDocCount : attachmentCount;

  const researchCount = researchNotes?.length ?? 0;
  const followUpCount = caseItem.followUpCount ?? caseItem.followUps?.length ?? 0;
  const sessionBadge = type === 'CONSULTATION' ? pendingFollowUpCount(caseItem) : 0;

  const leafCounts: Partial<Record<CaseWorkspaceLeaf, number>> = {
    tasks: openTaskCount,
    appointments: upcomingAppointments(caseItem).length,
    hearings: hasUpcomingHearing ? 1 : 0,
    deadlines:
      keyDeadlinesOf(caseItem).filter((d) => (getCountdownDays(d.date) ?? 0) >= 0).length +
      (legalDeadlines ?? []).filter((d) => d.status !== 'cancelled' && d.status !== 'completed').length,
    documents: type === 'ADMINISTRATIVE' ? attachmentCount + required.length : attachmentCount,
    research: researchCount,
  };

  return {
    nextHearingIso,
    nextHearingDays,
    hasUpcomingHearing,
    nextDeadlineIso: nextDeadline?.iso ?? null,
    nextDeadlineDays: nextDeadline?.days ?? null,
    overdueDeadlineCount,
    scheduleBadge,
    workBadge,
    documentsBadge,
    missingRequiredDocCount,
    attachmentCount,
    openTaskCount,
    researchCount,
    followUpCount,
    dutyFileBadge: missingRequiredDocCount,
    sessionBadge,
    leafCounts,
  };
}
