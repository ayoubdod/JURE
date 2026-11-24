import type { CaseSummary, CaseWorkspaceType, PrimaryCta, PrimaryCtaPermissions } from './types';

export type PrimaryCtaSummary = Pick<
  CaseSummary,
  | 'hasUpcomingHearing'
  | 'nextHearingDays'
  | 'overdueDeadlineCount'
  | 'missingRequiredDocCount'
  | 'nextDeadlineDays'
  | 'openTaskCount'
> & {
  canJoinVideo?: boolean;
  canConvert?: boolean;
  consultationCancelled?: boolean;
  consultationCompleted?: boolean;
  sessionDatePassed?: boolean;
  convertedCase?: { id: number; reference?: string | null; title?: string | null } | null;
};

/** Pure primary CTA resolver — first match wins per type. */
export function resolvePrimaryCta(
  type: CaseWorkspaceType,
  summary: PrimaryCtaSummary,
  permissions: PrimaryCtaPermissions
): PrimaryCta | null {
  if (type === 'LITIGATION') {
    if (!summary.hasUpcomingHearing) {
      return { id: 'add_hearing', reason: 'none_scheduled' };
    }
    if (summary.nextHearingDays != null && summary.nextHearingDays <= 7) {
      if (summary.missingRequiredDocCount > 0) {
        return { id: 'prepare_hearing', reason: 'missing_docs_for_hearing', preferUpload: true };
      }
      return { id: 'prepare_hearing', reason: 'hearing_soon' };
    }
    if (summary.overdueDeadlineCount > 0) {
      return { id: 'review_deadlines', reason: 'overdue_deadline' };
    }
    return { id: 'add_task', reason: 'default_add_task' };
  }

  if (type === 'ADMINISTRATIVE') {
    if (summary.missingRequiredDocCount > 0) {
      return { id: 'open_checklist', reason: 'missing_required_docs' };
    }
    if (
      summary.overdueDeadlineCount > 0 ||
      (summary.nextDeadlineDays != null && summary.nextDeadlineDays <= 7)
    ) {
      return { id: 'add_deadline', reason: 'due_soon' };
    }
    if (summary.openTaskCount > 0) {
      return { id: 'add_task', reason: 'default_add_task' };
    }
    if (permissions.canEdit && !permissions.caseClosed) {
      return { id: 'mark_completed', reason: 'mark_completed' };
    }
    return { id: 'add_task', reason: 'default_add_task' };
  }

  if (type === 'CONSULTATION') {
    if (summary.canJoinVideo) {
      return { id: 'join_video', reason: 'join_video' };
    }
    if (summary.sessionDatePassed && permissions.canEdit) {
      return { id: 'mark_completed', reason: 'session_date_passed' };
    }
    if (summary.canConvert ?? permissions.canConvert) {
      return { id: 'convert', reason: 'can_convert' };
    }
    if (summary.convertedCase?.id) {
      const ref = summary.convertedCase.reference?.trim();
      const title = summary.convertedCase.title?.trim();
      return {
        id: 'open_case',
        reason: 'converted',
        detail: ref || title || undefined,
      };
    }
    const terminal = Boolean(summary.consultationCompleted || summary.consultationCancelled);
    if (terminal) {
      if (permissions.canEdit) {
        return { id: 'add_follow_up', reason: 'add_follow_up' };
      }
      return { id: 'edit_session', reason: 'edit_session' };
    }
    return { id: 'edit_session', reason: 'edit_session' };
  }

  return null;
}
