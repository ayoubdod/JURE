import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useNotifications } from '@/context/NotificationContext';
import { filterNotifications, groupNotificationsByDate } from '@/utils/notificationUtils';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { cn } from '@/lib/utils';

const PIN_KEY = 'jure.activity.pins';

function loadPins(): Set<string> {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function savePins(pins: Set<string>) {
  localStorage.setItem(PIN_KEY, JSON.stringify([...pins]));
}

export interface NotificationDropdownProps {
  phase: 'in' | 'out';
  onRequestClose?: () => void;
}

export function NotificationDropdown({ phase, onRequestClose }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    activeFilter,
    setActiveFilter,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    closeDropdown,
    highlightNotificationId,
    wsConnected,
  } = useNotifications();

  const navigate = useNavigate();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [pins, setPins] = useState<Set<string>>(() => loadPins());
  const [updatedAt, setUpdatedAt] = useState(() => new Date());

  useEffect(() => {
    savePins(pins);
  }, [pins]);

  useEffect(() => {
    setUpdatedAt(new Date());
  }, [notifications]);

  const filtered = useMemo(
    () => filterNotifications(notifications, activeFilter),
    [notifications, activeFilter]
  );

  const groups = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const pinnedItems = sorted.filter((n) => pins.has(String(n.id)));
    const rest = sorted.filter((n) => !pins.has(String(n.id)));
    const dateGroups = groupNotificationsByDate(rest);
    return { pinnedItems, dateGroups };
  }, [filtered, pins]);

  const allRead = unreadCount === 0;
  const lastUpdated = updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const togglePin = (id: number | string) => {
    setPins((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const close = () => {
    closeDropdown();
    onRequestClose?.();
  };

  return (
    <>
      <div
        className={cn(
          'absolute right-0 top-full z-[100] mt-2 flex max-h-[min(560px,75dvh)] w-[min(100vw-1.25rem,400px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950',
          'shadow-[0_4px_6px_rgba(0,0,0,0.04),0_12px_40px_rgba(15,23,42,0.12)]',
          // Keep panel inside the viewport on narrow screens (floating card, not full-screen)
          'max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-14 max-sm:mt-0 max-sm:w-auto',
          phase === 'in' && 'animate-notification-dropdown-in',
          phase === 'out' && 'animate-notification-dropdown-out'
        )}
        role="dialog"
        aria-label="Activity center"
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Notifications
                </h2>
                {unreadCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Updated {lastUpdated}
                {wsConnected ? ' · Live' : ''}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setPrefsOpen(true)}
                aria-label="Notification settings"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:hover:bg-slate-800"
              >
                <Settings2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={allRead}
                onClick={() => markAllAsRead()}
                aria-label="Mark all as read"
                className={cn(
                  'inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400',
                  allRead ? 'cursor-not-allowed text-slate-400' : 'text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                )}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </div>
          </div>
          <div className="mt-3">
            <NotificationFilters variant="dropdown" value={activeFilter} onChange={setActiveFilter} />
          </div>
        </div>

        <div className="max-h-[min(380px,55dvh)] flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900">
                <Bell className="h-7 w-7 text-slate-300" strokeWidth={1.5} aria-hidden />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">You&apos;re all caught up.</p>
              <p className="mt-1 max-w-[220px] text-xs text-slate-500">
                {activeFilter === 'unread'
                  ? 'No unread activity right now.'
                  : 'New case, message, and calendar updates will appear here.'}
              </p>
            </div>
          ) : (
            <div>
              {groups.pinnedItems.length > 0 ? (
                <section>
                  <h3 className="sticky top-0 z-[1] bg-slate-50/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-900/95">
                    Pinned
                  </h3>
                  {groups.pinnedItems.map((n) => (
                    <NotificationItem
                      key={`pin-${n.id}`}
                      notification={n}
                      variant="dropdown"
                      pinned
                      animateIn={highlightNotificationId === String(n.id)}
                      onRead={(id) => markAsRead(id)}
                      onDelete={(id) => deleteNotification(id)}
                      onPin={togglePin}
                      onNavigate={close}
                    />
                  ))}
                </section>
              ) : null}
              {groups.dateGroups.map((g) => (
                <section key={g.key}>
                  <h3 className="sticky top-0 z-[1] bg-slate-50/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 backdrop-blur-sm dark:bg-slate-900/95">
                    {g.label}
                  </h3>
                  {g.items.map((n) => (
                    <NotificationItem
                      key={String(n.id)}
                      notification={n}
                      variant="dropdown"
                      pinned={pins.has(String(n.id))}
                      animateIn={highlightNotificationId === String(n.id)}
                      onRead={(id) => markAsRead(id)}
                      onDelete={(id) => deleteNotification(id)}
                      onPin={togglePin}
                      onNavigate={close}
                    />
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-slate-100 bg-white px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            className="text-sm font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            onClick={() => {
              close();
              navigate('/dashboard/notifications');
            }}
          >
            View all activity
          </button>
        </div>
      </div>

      <NotificationPreferences open={prefsOpen} onOpenChange={setPrefsOpen} />
    </>
  );
}
