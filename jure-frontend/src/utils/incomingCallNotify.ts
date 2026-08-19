/**
 * WhatsApp / Messenger-style incoming call alerts for in-app / PWA mode:
 * - Browser Notification (works when tab is backgrounded if permission granted)
 * - Vibration on supported phones
 * - Document title flash while ringing
 * - Service worker actions: Accept / Decline
 */

import { useCallSessionStore } from '@/stores/callSessionStore';
import { unlockRemoteAudioPlayback } from '@/utils/webrtc';

export const CALL_NOTIFICATION_TAG = 'jure-incoming-call';
const PERM_KEY = 'jure.callNotify.permissionAsked';
const ENABLED_KEY = 'jure.callNotify.enabled';

let titleFlashTimer: ReturnType<typeof setInterval> | null = null;
let originalTitle: string | null = null;
let swRegistered = false;
let actionListenerBound = false;

export function isCallNotifyEnabled(): boolean {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (raw === null) return true; // default on once permission granted
    return raw === '1';
  } catch {
    return true;
  }
}

export function setCallNotifyEnabled(on: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** Request OS notification permission (call from a user gesture). */
export async function requestCallNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    localStorage.setItem(PERM_KEY, '1');
  } catch {
    /* ignore */
  }
  if (Notification.permission === 'granted') {
    setCallNotifyEnabled(true);
    await ensureCallServiceWorker();
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';
  try {
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      setCallNotifyEnabled(true);
      await ensureCallServiceWorker();
    }
    return result;
  } catch {
    return Notification.permission;
  }
}

/** Soft-prompt once after login / first dashboard visit. */
export async function ensureCallNotificationPermissionSoft(): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'default') {
    if (Notification.permission === 'granted') await ensureCallServiceWorker();
    return;
  }
  try {
    if (localStorage.getItem(PERM_KEY) === '1') return;
  } catch {
    /* ignore */
  }
  // Don't auto-prompt — Settings / first incoming ring will request.
}

export async function ensureCallServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw-call.js', { scope: '/' });
    swRegistered = true;
    bindCallNotificationActions();
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

function bindCallNotificationActions() {
  if (actionListenerBound || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  actionListenerBound = true;
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.type !== 'jure-call-notification-action') return;
    const store = useCallSessionStore.getState();
    const action = String(data.action || '');
    if (action === 'accept') {
      void unlockRemoteAudioPlayback();
      store.acceptIncoming();
      void clearIncomingCallNotification();
    } else if (action === 'decline') {
      store.rejectIncoming();
      void clearIncomingCallNotification();
    } else if (action === 'open' || action === 'dismiss') {
      // Focusing the client is enough; keep ringing until user acts in UI.
      if (typeof window !== 'undefined') window.focus();
    }
  });
}

function startTitleFlash(callerName: string, kind: 'voice' | 'video') {
  if (typeof document === 'undefined') return;
  stopTitleFlash();
  originalTitle = document.title;
  let tick = false;
  const label = kind === 'video' ? 'Video call' : 'Incoming call';
  titleFlashTimer = setInterval(() => {
    tick = !tick;
    document.title = tick ? `📞 ${callerName}` : `${label}…`;
  }, 900);
}

function stopTitleFlash() {
  if (titleFlashTimer != null) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }
  if (originalTitle != null && typeof document !== 'undefined') {
    document.title = originalTitle;
    originalTitle = null;
  }
}

function vibrateRing() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    // Pattern similar to phone ring: buzz-pause-buzz
    navigator.vibrate([400, 200, 400, 200, 400, 800, 400, 200, 400, 200, 400, 800]);
  } catch {
    /* ignore */
  }
}

function stopVibrate() {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(0);
  } catch {
    /* ignore */
  }
}

export type IncomingCallNotifyOpts = {
  callerName: string;
  kind?: 'voice' | 'video';
  groupName?: string | null;
  conversationId?: number | null;
  avatarUrl?: string | null;
};

/** Show a persistent system notification + vibrate + title flash while ringing. */
export async function showIncomingCallNotification(opts: IncomingCallNotifyOpts): Promise<void> {
  const kind = opts.kind === 'video' ? 'video' : 'voice';
  const title = kind === 'video' ? 'Incoming video call' : 'Incoming call';
  const body = `${opts.callerName} is calling…`;

  startTitleFlash(opts.callerName, kind);
  vibrateRing();

  if (!isCallNotifyEnabled()) return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'default') {
    // Best-effort: may fail without gesture on some browsers.
    try {
      await requestCallNotificationPermission();
    } catch {
      /* ignore */
    }
  }
  if (Notification.permission !== 'granted') return;

  const icon = opts.avatarUrl || '/favicon.png';
  const data = {
    groupName: opts.groupName ?? null,
    kind,
    conversationId: opts.conversationId ?? null,
    url: opts.conversationId
      ? `/dashboard/conversations?c=${opts.conversationId}`
      : '/dashboard/conversations',
  };

  try {
    const reg = (await ensureCallServiceWorker()) || (await navigator.serviceWorker?.ready);
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        body,
        icon,
        badge: '/favicon.png',
        tag: CALL_NOTIFICATION_TAG,
        renotify: true,
        requireInteraction: true,
        vibrate: [400, 200, 400, 200, 400],
        data,
        actions: [
          { action: 'accept', title: 'Accept' },
          { action: 'decline', title: 'Decline' },
        ],
      } as NotificationOptions);
      return;
    }
  } catch {
    /* fall through to page Notification */
  }

  try {
    const n = new Notification(title, {
      body,
      icon,
      tag: CALL_NOTIFICATION_TAG,
      requireInteraction: true,
      data,
    } as NotificationOptions);
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}

export async function clearIncomingCallNotification(): Promise<void> {
  stopTitleFlash();
  stopVibrate();
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      const list = await reg.getNotifications({ tag: CALL_NOTIFICATION_TAG });
      list.forEach((n) => n.close());
      navigator.serviceWorker.controller?.postMessage({ type: 'jure-clear-call-notification' });
    } catch {
      /* ignore */
    }
  }
}

/** Register SW early and listen for notification actions. */
export function bootstrapIncomingCallNotify(): void {
  if (typeof window === 'undefined') return;
  void ensureCallServiceWorker();
  bindCallNotificationActions();
  if (getNotificationPermission() === 'granted') {
    setCallNotifyEnabled(isCallNotifyEnabled());
  }
}
