import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Archive, Check, ExternalLink, Pin, PinOff, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types/notification';
import { notificationHasTarget, openNotification } from '@/utils/notificationNav';
import { translateNotification } from '@/utils/notificationI18n';
import { formatRelativeTime, useAppTranslation } from '@/i18n';
import {
  getNotificationIcon,
  getPriorityBorderClass,
  itemOpacityClass,
  titleColorClass,
} from '@/utils/notificationUtils';

export interface NotificationItemProps {
  notification: AppNotification;
  variant: 'dropdown' | 'page';
  animateIn?: boolean;
  pinned?: boolean;
  onRead?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
  onNavigate?: () => void;
  onPin?: (id: number | string) => void;
}

function matterLabel(n: AppNotification, matterRef: string, interpolate: (tpl: string, vars: Record<string, string>) => string): string | null {
  if (n.related_case?.reference) {
    return interpolate(matterRef, { ref: `\u2068${n.related_case.reference}\u2069` });
  }
  if (n.related_case?.title) return n.related_case.title;
  return n.context_label?.trim() || null;
}

export function NotificationItem({
  notification: n,
  variant,
  animateIn,
  pinned,
  onRead,
  onDelete,
  onNavigate,
  onPin,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const { t, tf, lang, dir } = useAppTranslation();
  const copy = translateNotification(n, t.notifications.items);
  const unread = !n.is_read;
  const matter = matterLabel(n, t.notifications.matterRef, tf);
  const p = String(n.priority || '').toUpperCase();
  const priority =
    p === 'URGENT' ? t.notifications.priorityUrgent : p === 'HIGH' ? t.notifications.priorityHigh : null;
  const touchX = useRef<number | null>(null);
  const [swipe, setSwipe] = useState(0);

  const open = () => {
    if (notificationHasTarget(n)) {
      onNavigate?.();
      void openNotification(navigate, n);
    }
    if (unread && onRead) void onRead(n.id);
  };

  const markRead = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (unread && onRead) void onRead(n.id);
  };

  const archive = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (onDelete) void onDelete(n.id);
  };

  const dismiss = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (unread && onRead) void onRead(n.id);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const physical = (e.touches[0]?.clientX ?? touchX.current) - touchX.current;
    const dx = dir === 'rtl' ? -physical : physical;
    setSwipe(Math.max(-96, Math.min(96, dx)));
  };
  const onTouchEnd = () => {
    if (swipe <= -64) archive();
    else if (swipe >= 64) markRead();
    touchX.current = null;
    setSwipe(0);
  };

  return (
    <div className="relative overflow-hidden border-b border-slate-100 last:border-b-0 dark:border-slate-800">
      <div
        className="pointer-events-none absolute inset-y-0 start-0 flex w-24 items-center justify-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
        aria-hidden
      >
        <Check className="h-4 w-4" />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 end-0 flex w-24 items-center justify-center bg-rose-500/15 text-rose-700 dark:text-rose-400"
        aria-hidden
      >
        <Archive className="h-4 w-4" />
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={`${copy.title}${unread ? `, ${t.notifications.unreadSuffix}` : ''}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
          }
        }}
        onClick={open}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: swipe ? `translateX(${dir === 'rtl' ? -swipe : swipe}px)` : undefined }}
        className={cn(
          'group relative z-[1] flex gap-3 bg-white px-3 py-3 text-start transition-colors duration-150 dark:bg-slate-950',
          unread ? 'bg-[#f8fafc] dark:bg-slate-900/60' : '',
          'hover:bg-slate-50 dark:hover:bg-slate-900/50',
          getPriorityBorderClass(n.priority),
          itemOpacityClass(n.priority),
          animateIn && 'animate-notification-row-in'
        )}
      >
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          <span
            className={cn(
              'mt-1 h-2 w-2 rounded-full',
              unread ? 'bg-indigo-600' : 'bg-transparent ring-1 ring-slate-300'
            )}
            aria-hidden
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900">
              {getNotificationIcon(n.type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h4 className={cn('min-w-0 flex-1 break-words text-[13px] font-semibold leading-snug', titleColorClass(n.priority))}>
                  {copy.title}
                </h4>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-500 dark:text-slate-400" dir="ltr">
                  {formatRelativeTime(n.created_at, lang)}
                </span>
              </div>
              <p className={cn('mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400', variant === 'dropdown' && 'line-clamp-2')}>
                {copy.message}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {matter ? (
                  <span className="inline-flex max-w-full truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {matter}
                  </span>
                ) : null}
                {priority ? (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 text-[10px] font-semibold ltr:uppercase ltr:tracking-wide',
                      priority === t.notifications.priorityUrgent ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    )}
                  >
                    {priority}
                  </span>
                ) : null}
                {pinned ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-600">
                    <Pin className="h-3 w-3" /> {t.notifications.pinned}
                  </span>
                ) : null}
              </div>

              <div
                className={cn(
                  'mt-2 flex flex-wrap items-center gap-1',
                  variant === 'dropdown' && 'opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                )}
              >
                {notificationHasTarget(n) ? (
                  <button
                    type="button"
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      open();
                    }}
                  >
                    <ExternalLink className="h-3 w-3" /> {t.notifications.open}
                  </button>
                ) : null}
                {unread ? (
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={markRead}>
                    <Check className="h-3 w-3" /> {t.notifications.markRead}
                  </button>
                ) : null}
                {onPin ? (
                  <button
                    type="button"
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin(n.id);
                    }}
                  >
                    {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    {pinned ? t.notifications.unpin : t.notifications.pin}
                  </button>
                ) : null}
                {onDelete ? (
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={archive}>
                    <Archive className="h-3 w-3" /> {t.notifications.archive}
                  </button>
                ) : (
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={dismiss}>
                    <X className="h-3 w-3" /> {t.notifications.dismiss}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
