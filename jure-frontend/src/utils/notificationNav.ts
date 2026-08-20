import type { NavigateFunction } from 'react-router';
import { apiGetCase, apiGetCases } from '@/services/case/api';
import { navigateToCase, navigateToCaseById } from '@/lib/caseRoutes';
import type { AppNotification } from '@/types/notification';

const CHAT_MESSAGE_TYPES = new Set(['NEW_MESSAGE', 'NEW_MESSAGE_DAILY_REMINDER']);

export function isChatMessageNotification(type: string | undefined | null): boolean {
  return CHAT_MESSAGE_TYPES.has(String(type || '').toUpperCase());
}

function parseAppUrl(raw: string): URL | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) return new URL(value);
    return new URL(value, 'https://jure.local');
  } catch {
    return null;
  }
}

/** Map stored / legacy action URLs onto current dashboard routes. */
export function rewriteNotificationUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const parsed = parseAppUrl(raw);
  if (!parsed) return raw.trim();

  const path = parsed.pathname.replace(/\/+$/, '') || '/';
  const params = parsed.searchParams;

  if (path === '/dashboard/chat' || path.startsWith('/dashboard/chat/')) {
    const conv = params.get('selected') || params.get('conversation') || params.get('c');
    return conv ? `/dashboard/conversations?selected=${conv}` : '/dashboard/conversations';
  }
  if (path === '/dashboard/messages' || path.startsWith('/dashboard/messages/')) {
    const conv = params.get('selected') || params.get('conversation') || params.get('c');
    return conv ? `/dashboard/conversations?selected=${conv}` : '/dashboard/conversations';
  }
  if (path === '/dashboard/me') return '/dashboard/profile';
  if (path === '/dashboard/appointment') return '/dashboard/appointments' + parsed.search;

  if (/^https?:\/\//i.test(raw.trim())) return raw.trim();
  return `${path}${parsed.search}${parsed.hash}`;
}

export function notificationHasTarget(n: AppNotification): boolean {
  return Boolean(
    n.related_task?.id ||
      n.related_appointment?.id ||
      n.related_case?.id ||
      n.related_user?.id ||
      n.action_url
  );
}

async function openCaseTarget(navigate: NavigateFunction, n: AppNotification, fallbackUrl?: string | null) {
  if (n.related_case?.id) {
    await navigateToCase(navigate, {
      id: n.related_case.id,
      title: n.related_case.title,
      reference: n.related_case.reference,
      case_type: n.related_case.case_type ?? n.related_case.caseType,
    });
    return;
  }
  const parsed = fallbackUrl ? parseAppUrl(fallbackUrl) : null;
  const ref = parsed?.searchParams.get('case');
  if (ref) {
    await openCaseFromQuery(navigate, ref);
    return;
  }
  if (fallbackUrl) navigate(fallbackUrl);
  else navigate('/dashboard/cases');
}

async function openCaseFromQuery(navigate: NavigateFunction, raw: string) {
  const asId = Number(raw);
  if (Number.isInteger(asId) && String(asId) === raw) {
    try {
      await navigateToCaseById(navigate, asId);
      return;
    } catch {
      /* search by reference */
    }
  }
  const res = await apiGetCases({ search: raw, page: 1, page_size: 50 });
  const match = (res.data?.results ?? []).find((c) => c.reference === raw || String(c.id) === raw);
  if (match) {
    navigateToCase(navigate, match);
    return;
  }
  try {
    const detail = await apiGetCase(asId);
    if (detail.data) navigateToCase(navigate, detail.data);
    else navigate('/dashboard/cases');
  } catch {
    navigate('/dashboard/cases');
  }
}

export async function openNotification(navigate: NavigateFunction, n: AppNotification): Promise<void> {
  const t = String(n.type || '').toUpperCase();
  const actionUrl = rewriteNotificationUrl(n.action_url);

  if (t.startsWith('TASK_') && n.related_task?.id) {
    navigate(`/dashboard/tasks?task=${n.related_task.id}`);
    return;
  }
  if (t.startsWith('APPOINTMENT_') && n.related_appointment?.id) {
    navigate(`/dashboard/appointments?appointment=${n.related_appointment.id}`);
    return;
  }
  if (t.startsWith('CASE_')) {
    await openCaseTarget(navigate, n, actionUrl);
    return;
  }
  if (t === 'CALL_MISSED' || isChatMessageNotification(t)) {
    navigate(actionUrl || '/dashboard/conversations');
    return;
  }
  if (
    t.startsWith('INVOICE_') ||
    t.startsWith('PAYMENT_') ||
    t.startsWith('TVA_') ||
    t === 'INVOICE_OVERDUE' ||
    t === 'PAYMENT_RECEIVED' ||
    t === 'TVA_THRESHOLD_CROSSED'
  ) {
    navigate('/dashboard/finance');
    return;
  }
  if (t === 'MEMBER_ADDED' || t === 'INVITATION_ACCEPTED') {
    navigate(n.related_user?.id ? `/dashboard/profile/${n.related_user.id}` : '/dashboard/team');
    return;
  }
  if (t === 'PROFILE_UPDATED' || t === 'ROLE_CHANGED') {
    navigate('/dashboard/profile');
    return;
  }

  if (n.related_task?.id) {
    navigate(`/dashboard/tasks?task=${n.related_task.id}`);
    return;
  }
  if (n.related_appointment?.id) {
    navigate(`/dashboard/appointments?appointment=${n.related_appointment.id}`);
    return;
  }
  if (n.related_case?.id) {
    await openCaseTarget(navigate, n, actionUrl);
    return;
  }
  if (n.related_user?.id) {
    navigate(`/dashboard/profile/${n.related_user.id}`);
    return;
  }
  if (actionUrl) {
    const parsed = parseAppUrl(actionUrl);
    if (parsed?.searchParams.get('case')) {
      await openCaseFromQuery(navigate, parsed.searchParams.get('case') as string);
      return;
    }
    if (/^https?:\/\//i.test(actionUrl)) {
      window.location.href = actionUrl;
      return;
    }
    navigate(actionUrl);
  }
}
