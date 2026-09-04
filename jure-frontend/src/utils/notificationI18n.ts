import { interpolate } from '@/i18n/format';
import type { AppMessages } from '@/i18n';
import type { AppNotification } from '@/types/notification';

type ItemCopy = { title: string; message: string };

function relatedUserName(n: AppNotification): string {
  const u = n.related_user;
  if (!u) return '';
  return `${u.firstName ?? u.first_name ?? ''} ${u.lastName ?? u.last_name ?? ''}`.trim();
}

function isolateEmbedded(value: string): string {
  if (!value) return '';
  return `\u2068${value}\u2069`;
}

function projectNameFromNotification(n: AppNotification): string {
  const title = n.title?.trim() || '';
  const sep = title.indexOf('·');
  if (sep >= 0) return title.slice(sep + 1).trim();
  return title;
}

export function translateNotification(
  n: AppNotification,
  items: AppMessages['notifications']['items']
): { title: string; message: string } {
  const type = String(n.type || '').toUpperCase();
  const videoMissed = type === 'CALL_MISSED' && /vid[eé]o/i.test(`${n.title} ${n.message}`);
  const catalog = items as Record<string, ItemCopy>;
  const tpl = videoMissed ? items.CALL_MISSED_VIDEO : catalog[type] ?? items.DEFAULT;

  const vars: Record<string, string> = {
    taskTitle: isolateEmbedded(n.related_task?.title?.trim() || n.task_title?.trim() || ''),
    caseTitle: isolateEmbedded(n.related_case?.title?.trim() || n.case_title?.trim() || ''),
    caseRef: isolateEmbedded(n.related_case?.reference?.trim() || n.case_reference?.trim() || ''),
    appointmentTitle: isolateEmbedded(n.related_appointment?.title?.trim() || ''),
    userName: isolateEmbedded(relatedUserName(n)),
    projectName: isolateEmbedded(projectNameFromNotification(n)),
  };

  const title = interpolate(tpl.title, vars).trim();
  const message = interpolate(tpl.message, vars).trim();
  return {
    title: title || n.title,
    message: message || n.message,
  };
}
