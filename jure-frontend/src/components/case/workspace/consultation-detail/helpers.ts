import { formatDate, formatTime, type Lang } from '@/i18n';
import { consultationOutcome } from '@/services/case/caseType';
import { getCaseData } from '@/utils/caseCardHelpers';
import { consultationStatusOf, type ConsultationStatusKey } from '../consultationStatus';

export { attorneysOf, personName } from '../litigation-detail/helpers';

export function outcomeOf(c: API.Case): ConsultationStatusKey {
  return consultationStatusOf(c);
}

export function isCancelled(c: API.Case) {
  return outcomeOf(c) === 'CANCELLED' || String(consultationOutcome(c) || '').toUpperCase() === 'CANCELLED';
}

export function consultationWhen(iso: string | undefined, lang: Lang) {
  if (!iso) return { date: '', time: '', raw: null as Date | null };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '', raw: null as Date | null };
  return {
    date: formatDate(d, lang, { day: 'numeric', month: 'short', year: 'numeric' }),
    time: formatTime(d, lang, { hour: '2-digit', minute: '2-digit' }),
    raw: d,
  };
}

export function hoursUntil(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (d.getTime() - Date.now()) / 36e5;
}

/** Video format + link + session upcoming or in progress. */
export function consultationCanJoinVideo(c: API.Case): boolean {
  const format = String(getCaseData(c, 'format') || '').toUpperCase();
  const videoLink = String(getCaseData(c, 'video_link') || '');
  if (format !== 'VIDEO' || !videoLink) return false;
  const status = outcomeOf(c);
  if (status === 'CANCELLED' || status === 'COMPLETED') return false;
  const dt = getCaseData(c, 'consultation_date') as string | undefined;
  const hours = hoursUntil(dt);
  // Upcoming (future) or in progress (started within last duration / same day window).
  if (hours == null) return Boolean(videoLink);
  if (hours >= 0) return true;
  // Started recently: treat as in progress for up to 4 hours past start.
  return hours > -4;
}

export function pendingFollowUpCount(c: API.Case): number {
  const followUps = c.followUps ?? [];
  const pending = followUps.filter((item) => {
    const outcome = String(item.outcome || item.status || '').toUpperCase();
    return outcome !== 'COMPLETED' && outcome !== 'CANCELLED' && outcome !== 'DONE';
  });
  if (pending.length) return pending.length;
  return c.followUpCount ?? followUps.length;
}

export function isConsultationTerminal(c: API.Case): boolean {
  const status = outcomeOf(c);
  return status === 'COMPLETED' || status === 'CANCELLED';
}

export function isConsultationSessionDatePassed(c: API.Case): boolean {
  if (outcomeOf(c) !== 'SCHEDULED') return false;
  const hours = hoursUntil(getCaseData(c, 'consultation_date') as string | undefined);
  return hours != null && hours < 0;
}

export function convertedCaseDisplayLabel(link: { title?: string | null; reference?: string | null }): string {
  const title = link.title?.trim() || '';
  const ref = link.reference?.trim() || '';
  return title && ref ? `${title} · ${ref}` : title || ref;
}

export function formatRelativeSession(iso: string | undefined, lang: Lang): string {
  if (!iso) return '';
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return '';
  const days = Math.round((target.getTime() - Date.now()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  if (Math.abs(days) < 45) return rtf.format(days, 'day');
  const months = Math.round(days / 30);
  return Math.abs(months) < 18 ? rtf.format(months, 'month') : rtf.format(Math.round(days / 365), 'year');
}

export type ConsultationAttentionItem = { id: string; title: string; leaf: 'consultation' };

export function selectConsultationNeedsAttention(
  caseItem: API.Case,
  copy: { datePassed: string }
): ConsultationAttentionItem[] {
  return isConsultationSessionDatePassed(caseItem)
    ? [{ id: 'session-date-passed', title: copy.datePassed, leaf: 'consultation' }]
    : [];
}
