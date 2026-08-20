import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { AppNotification } from '@/types/notification';
import { openNotification } from '@/utils/notificationNav';
import { translateNotification } from '@/utils/notificationI18n';
import { getNotificationIcon, getToastBorderColor } from '@/utils/notificationUtils';
import { cn } from '@/lib/utils';
import { useAppTranslation } from '@/i18n';

export interface NotificationToastProps {
  notification: AppNotification;
  urgentManualClose: boolean;
  onDismiss: () => void;
  onRead?: (id: number | string) => void;
}

export function NotificationToast({ notification: n, urgentManualClose, onDismiss, onRead }: NotificationToastProps) {
  const navigate = useNavigate();
  const { t, dir } = useAppTranslation();
  const copy = translateNotification(n, t.notifications.items);
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  const dismiss = () => {
    setExiting(true);
    window.setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, 280);
  };

  useEffect(() => {
    if (urgentManualClose) return undefined;
    const t = window.setTimeout(() => dismiss(), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismiss only on mount
  }, []);

  if (!visible) return null;

  const border = getToastBorderColor(n.priority);
  const msg = copy.message?.trim() || '';
  const line = msg.length > 120 ? `${msg.slice(0, 117)}…` : msg;

  const go = () => {
    if (!n.is_read && onRead) void onRead(n.id);
    void openNotification(navigate, n);
    dismiss();
  };

  return (
    <button
      type="button"
      onClick={go}
      className={cn(
        'flex w-[320px] max-w-[calc(100vw-2rem)] cursor-pointer rounded-xl border border-slate-200 bg-white text-start shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.12)] dark:border-slate-700 dark:bg-slate-900',
        dir === 'rtl'
          ? exiting
            ? 'animate-notification-toast-out-rtl'
            : 'animate-notification-toast-in-rtl'
          : exiting
            ? 'animate-notification-toast-out'
            : 'animate-notification-toast-in'
      )}
      style={{ borderInlineStartWidth: 3, borderInlineStartColor: border }}
    >
      <div className="flex w-full gap-3 p-3">
        <div className="shrink-0 pt-0.5">{getNotificationIcon(n.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="break-words text-sm font-semibold text-slate-900 dark:text-slate-100">{copy.title}</span>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={t.notifications.close}
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-slate-600 dark:text-slate-400">{line}</p>
        </div>
      </div>
    </button>
  );
}
