import React from 'react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types/notification';
import {
  formatTimeAgo,
  getNotificationIcon,
  getPriorityBorderClass,
  itemOpacityClass,
  titleColorClass,
} from '@/utils/notificationUtils';

export interface NotificationItemProps {
  notification: AppNotification;
  variant: 'dropdown' | 'page';
  /** Highlight entrance (e.g. new WS item) */
  animateIn?: boolean;
  onRead?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
  onNavigate?: () => void;
}

export function NotificationItem({
  notification: n,
  variant,
  animateIn,
  onRead,
  onDelete,
  onNavigate,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const unread = !n.is_read;
  const priority = String(n.priority || '').toUpperCase();

  const handleClick = () => {
    if (n.action_url) {
      onNavigate?.();
      if (n.action_url.startsWith('http')) {
        window.location.href = n.action_url;
      } else {
        navigate(n.action_url);
      }
    }
    if (unread && onRead) void onRead(n.id);
  };

  const border = getPriorityBorderClass(n.priority);
  const ctx = n.context_label?.trim();

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        'flex gap-3 border-b border-slate-100 px-3 py-3 text-left transition-colors last:border-b-0 dark:border-slate-800',
        unread ? 'bg-[#fafbff]' : 'bg-white',
        'hover:bg-slate-50 dark:hover:bg-slate-900/50',
        'cursor-pointer',
        border,
        itemOpacityClass(n.priority),
        animateIn && 'animate-notification-row-in'
      )}
      onClick={handleClick}
    >
      <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        <span
          className={cn(
            'mt-1 h-2 w-2 rounded-full border',
            unread ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-transparent'
          )}
          aria-hidden
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  'text-[13px] font-semibold leading-snug',
                  titleColorClass(n.priority),
                  priority === 'URGENT' && 'text-red-600'
                )}
              >
                {n.title}
              </h4>
              <span className="shrink-0 text-[11px] text-slate-500">{formatTimeAgo(n.created_at)}</span>
            </div>
            <p
              className={cn(
                'mt-0.5 text-xs text-slate-600 dark:text-slate-400',
                variant === 'dropdown' && 'line-clamp-2'
              )}
            >
              {n.message}
            </p>
            {ctx ? (
              <div className="mt-1.5 inline-flex max-w-full rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <span className="truncate">{ctx}</span>
              </div>
            ) : null}
            {variant === 'page' && (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                {n.action_url ? (
                  <button
                    type="button"
                    className="text-sm font-medium text-indigo-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.();
                      if (n.action_url!.startsWith('http')) window.location.href = n.action_url!;
                      else navigate(n.action_url!);
                      if (unread && onRead) void onRead(n.id);
                    }}
                  >
                    Voir →
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    type="button"
                    className="text-sm text-red-600 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(n.id);
                    }}
                  >
                    🗑 Supprimer
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
