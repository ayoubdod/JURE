/**
 * Service worker for JURE incoming-call system notifications (WhatsApp-style when app is backgrounded).
 * Scope: site root. Keep lean — no offline caching required for calls.
 */
/* eslint-disable no-restricted-globals */

const CALL_TAG = 'jure-incoming-call';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification?.data || {};
  const action = event.action || 'open';
  event.notification.close();

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const payload = {
        type: 'jure-call-notification-action',
        action,
        groupName: data.groupName || null,
        kind: data.kind || 'voice',
        conversationId: data.conversationId ?? null,
      };

      let focused = null;
      for (const client of all) {
        try {
          client.postMessage(payload);
          if ('focus' in client) focused = client;
        } catch {
          /* ignore */
        }
      }
      if (focused) {
        await focused.focus();
        return;
      }
      const url = data.url || '/dashboard/conversations';
      await self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('notificationclose', (event) => {
  const data = event.notification?.data || {};
  if (event.notification?.tag !== CALL_TAG) return;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        try {
          client.postMessage({
            type: 'jure-call-notification-action',
            action: 'dismiss',
            groupName: data.groupName || null,
          });
        } catch {
          /* ignore */
        }
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'jure-clear-call-notification') {
    event.waitUntil(
      self.registration.getNotifications({ tag: CALL_TAG }).then((list) => {
        list.forEach((n) => n.close());
      })
    );
  }
});
