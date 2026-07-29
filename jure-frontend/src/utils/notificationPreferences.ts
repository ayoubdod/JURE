import type { NotificationPrefs } from '@/types/notification';

export const NOTIFICATION_PREFS_STORAGE_KEY = 'jure-notification-preferences-v1';

export const defaultNotificationPrefs: NotificationPrefs = {
  tasks: true,
  cases: true,
  appointments: true,
  messages: true,
  finance: true,
  team: true,
  email: true,
};

export function loadNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!raw) return { ...defaultNotificationPrefs };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...defaultNotificationPrefs, ...parsed };
  } catch {
    return { ...defaultNotificationPrefs };
  }
}

export function saveNotificationPrefs(p: NotificationPrefs): void {
  localStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(p));
}

/** When false, still store WS payload but skip toast + badge increment for this category. */
export function shouldAlertForNotificationType(type: string, prefs: NotificationPrefs): boolean {
  const t = (type || '').toUpperCase();
  if (t.startsWith('TASK_')) return prefs.tasks;
  if (t.startsWith('CASE_')) return prefs.cases;
  if (t.startsWith('APPOINTMENT_')) return prefs.appointments;
  if (t === 'NEW_MESSAGE' || t === 'CALL_MISSED') return prefs.messages;
  if (
    t.startsWith('TVA_') ||
    t === 'TVA_THRESHOLD_CROSSED' ||
    t.startsWith('INVOICE_') ||
    t === 'INVOICE_OVERDUE' ||
    t.startsWith('PAYMENT_') ||
    t === 'PAYMENT_RECEIVED'
  ) {
    return prefs.finance;
  }
  if (t === 'PROFILE_UPDATED' || t === 'ROLE_CHANGED' || t === 'MEMBER_ADDED') return prefs.team;
  return true;
}
