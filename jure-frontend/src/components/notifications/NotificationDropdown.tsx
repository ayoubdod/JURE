import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useNotifications } from '@/context/NotificationContext';
import { filterNotifications } from '@/utils/notificationUtils';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { cn } from '@/lib/utils';

export interface NotificationDropdownProps {
  phase: 'in' | 'out';
}

export function NotificationDropdown({ phase }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    activeFilter,
    setActiveFilter,
    markAsRead,
    markAllAsRead,
    closeDropdown,
    highlightNotificationId,
  } = useNotifications();

  const navigate = useNavigate();
  const [prefsOpen, setPrefsOpen] = useState(false);

  const filtered = filterNotifications(notifications, activeFilter);
  const allRead = unreadCount === 0;

  const emptyPrimary =
    activeFilter === 'unread'
      ? 'Aucune notification non lue'
      : 'Aucune notification';
  const emptySub = 'Vous êtes à jour !';

  return (
    <>
      <div
        className={cn(
          'absolute right-0 top-full z-[100] flex max-h-[min(520px,80dvh)] w-[min(100vw-1rem,420px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_40px_rgba(0,0,0,0.12),0_20px_60px_rgba(0,0,0,0.08)] dark:border-slate-700 dark:bg-slate-950',
          phase === 'in' && 'animate-notification-dropdown-in',
          phase === 'out' && 'animate-notification-dropdown-out'
        )}
      >
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Notifications</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  [{unreadCount}]
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setPrefsOpen(true)}
                className="text-xs font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-400"
              >
                Préférences
              </button>
              <button
                type="button"
                disabled={allRead}
                onClick={() => markAllAsRead()}
                className={cn(
                  'text-xs font-medium',
                  allRead ? 'cursor-not-allowed text-slate-400' : 'text-indigo-600 hover:underline'
                )}
              >
                Tout lire
              </button>
            </div>
          </div>
        </div>

        <NotificationFilters
          variant="dropdown"
          value={activeFilter}
          onChange={(f) => setActiveFilter(f)}
        />

        <div className="max-h-[380px] flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-slate-500">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Bell className="mb-3 h-14 w-14 text-slate-300" strokeWidth={1.25} />
              <p className="text-sm font-medium text-slate-600">{emptyPrimary}</p>
              <p className="mt-1 text-xs text-slate-500">{emptySub}</p>
            </div>
          ) : (
            filtered.map((n) => (
              <NotificationItem
                key={String(n.id)}
                notification={n}
                variant="dropdown"
                animateIn={highlightNotificationId === String(n.id)}
                onRead={(id) => markAsRead(id)}
                onNavigate={() => closeDropdown()}
              />
            ))
          )}
        </div>

        <div className="sticky bottom-0 border-t border-slate-100 bg-white px-4 py-3 text-center dark:border-slate-800 dark:bg-slate-950">
          <button
            type="button"
            className="text-sm font-medium text-indigo-600 hover:underline"
            onClick={() => {
              closeDropdown();
              navigate('/dashboard/notifications');
            }}
          >
            Voir toutes les notifications →
          </button>
        </div>
      </div>

      <NotificationPreferences open={prefsOpen} onOpenChange={setPrefsOpen} />
    </>
  );
}
