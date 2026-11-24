import type { AppMessages } from '@/i18n/messages/types';
import type { PrimaryCta } from './types';

export function primaryCtaLabel(cta: PrimaryCta, shell: AppMessages['cases']['workspaces']['shell']): string {
  const labels = shell.primaryCta;
  switch (cta.reason) {
    case 'none_scheduled':
      return labels.addHearingNone;
    case 'hearing_soon':
      return labels.prepareHearing;
    case 'missing_docs_for_hearing':
      return labels.prepareHearingUpload;
    case 'overdue_deadline':
      return labels.reviewDeadlines;
    case 'default_add_task':
      return labels.addTask;
    case 'join_video':
      return labels.joinVideo;
    case 'can_convert':
      return labels.convert;
    case 'add_follow_up':
      return labels.addFollowUp;
    case 'edit_session':
      return labels.editSession;
    case 'missing_required_docs':
      return labels.openChecklist;
    case 'due_soon':
      return labels.addDeadline;
    case 'mark_completed':
      return labels.markCompleted;
    default:
      return labels.addTask;
  }
}
