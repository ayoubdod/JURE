import React from 'react';
import { useNotifications } from '@/context/NotificationContext';
import { NotificationToast } from '@/components/notifications/NotificationToast';

export function NotificationToastStack() {
  const { incomingToasts, dismissToast } = useNotifications();

  return (
    <div
      className="pointer-events-none fixed bottom-6 end-6 z-[95] flex flex-col items-end gap-2 p-0"
      aria-live="polite"
    >
      {incomingToasts.map((t, i) => (
        <div key={`${String(t.notification.id)}-${i}`} className="pointer-events-auto">
          <NotificationToast
            notification={t.notification}
            urgentManualClose={t.urgentManualClose}
            onDismiss={() => dismissToast(t.notification.id)}
          />
        </div>
      ))}
    </div>
  );
}
