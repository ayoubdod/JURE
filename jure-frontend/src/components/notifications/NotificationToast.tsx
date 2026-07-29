import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { AppNotification } from '@/types/notification';
import { getNotificationIcon, getToastBorderColor } from '@/utils/notificationUtils';
import { cn } from '@/lib/utils';

export interface NotificationToastProps {
  notification: AppNotification;
  urgentManualClose: boolean;
  onDismiss: () => void;
}

export function NotificationToast({ notification: n, urgentManualClose, onDismiss }: NotificationToastProps) {
  const navigate = useNavigate();
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
  const msg = n.message?.trim() || '';
  const line = msg.length > 120 ? `${msg.slice(0, 117)}…` : msg;

  const go = () => {
    if (n.action_url) {
      if (n.action_url.startsWith('http')) window.location.href = n.action_url;
      else navigate(n.action_url);
    }
    dismiss();
  };

  return (
    <button
      type="button"
      onClick={go}
      className={cn(
        'flex w-[320px] max-w-[calc(100vw-2rem)] cursor-pointer rounded-xl border border-slate-200 bg-white text-left shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.12)] dark:border-slate-700 dark:bg-slate-900',
        exiting ? 'animate-notification-toast-out' : 'animate-notification-toast-in'
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: border }}
    >
      <div className="flex w-full gap-3 p-3">
        <div className="shrink-0 pt-0.5">{getNotificationIcon(n.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{n.title}</span>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Fermer"
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
