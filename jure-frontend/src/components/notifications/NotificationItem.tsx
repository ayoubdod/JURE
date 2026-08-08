import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Archive, Check, ExternalLink, Pin, PinOff, X } from 'lucide-react';
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
  animateIn?: boolean;
  pinned?: boolean;
  onRead?: (id: number | string) => void;
  onDelete?: (id: number | string) => void;
  onNavigate?: () => void;
  onPin?: (id: number | string) => void;
}

function matterLabel(n: AppNotification): string | null {
  if (n.related_case?.reference) return `Matter #${n.related_case.reference}`;
  if (n.related_case?.title) return n.related_case.title;
  return n.context_label?.trim() || null;
}

function priorityLabel(priority?: string): string | null {
  const p = String(priority || '').toUpperCase();
  if (p === 'URGENT' || p === 'HIGH') return p.charAt(0) + p.slice(1).toLowerCase();
  return null;
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
  const unread = !n.is_read;
  const matter = matterLabel(n);
  const priority = priorityLabel(n.priority);
  const touchX = useRef<number | null>(null);
  const [swipe, setSwipe] = useState(0);

  const open = () => {
    if (n.action_url) {
      onNavigate?.();
      if (n.action_url.startsWith('http')) window.location.href = n.action_url;
      else navigate(n.action_url);
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
    const dx = (e.touches[0]?.clientX ?? touchX.current) - touchX.current;
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
        className="pointer-events-none absolute inset-y-0 left-0 flex w-24 items-center justify-center bg-emerald-500/15 text-emerald-700"
        aria-hidden
      >
        <Check className="h-4 w-4" />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-rose-500/15 text-rose-700"
        aria-hidden
      >
        <Archive className="h-4 w-4" />
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={`${n.title}${unread ? ', unread' : ''}`}
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
        style={{ transform: swipe ? `translateX(${swipe}px)` : undefined }}
        className={cn(
          'group relative z-[1] flex gap-3 bg-white px-3 py-3 text-left transition-colors duration-150 dark:bg-slate-950',
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
                <h4 className={cn('text-[13px] font-semibold leading-snug', titleColorClass(n.priority))}>
                  {n.title}
                </h4>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-500">{formatTimeAgo(n.created_at)}</span>
              </div>
              <p className={cn('mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400', variant === 'dropdown' && 'line-clamp-2')}>
                {n.message}
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
                      'rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      priority === 'Urgent' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                    )}
                  >
                    {priority}
                  </span>
                ) : null}
                {pinned ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-600">
                    <Pin className="h-3 w-3" /> Pinned
                  </span>
                ) : null}
              </div>

              <div
                className={cn(
                  'mt-2 flex flex-wrap items-center gap-1',
                  variant === 'dropdown' && 'opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                )}
              >
                {n.action_url ? (
                  <button
                    type="button"
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      open();
                    }}
                  >
                    <ExternalLink className="h-3 w-3" /> Open
                  </button>
                ) : null}
                {unread ? (
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={markRead}>
                    <Check className="h-3 w-3" /> Mark read
                  </button>
                ) : null}
                {onPin ? (
                  <button
                    type="button"
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin(n.id);
                    }}
                  >
                    {pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                    {pinned ? 'Unpin' : 'Pin'}
                  </button>
                ) : null}
                {onDelete ? (
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={archive}>
                    <Archive className="h-3 w-3" /> Archive
                  </button>
                ) : (
                  <button type="button" className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" onClick={dismiss}>
                    <X className="h-3 w-3" /> Dismiss
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
