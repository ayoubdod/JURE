import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNotifications } from '@/context/NotificationContext';
import * as notificationApi from '@/services/notificationService';
import type { AppNotification } from '@/types/notification';
import type { NotificationFilterId } from '@/types/notification';
import { NotificationFilters } from '@/components/notifications/NotificationFilters';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { filterNotifications, groupNotificationsByDate } from '@/utils/notificationUtils';
import { devError } from '@/utils/devLog';
import { useAppTranslation } from '@/i18n';

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { t } = useAppTranslation();
  const {
    markAsRead,
    markAllAsRead,
    deleteNotification,
    subscribeNewNotification,
    setUnreadCount,
    fetchNotifications: refetchDropdown,
  } = useNotifications();

  const [filter, setFilter] = useState<NotificationFilterId>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const { results, next } = await notificationApi.getNotifications({
          page: nextPage,
          per_page: PAGE_SIZE,
          is_read: filter === 'unread' ? false : undefined,
          priority: filter === 'urgent' ? 'URGENT' : undefined,
        });
        let list = results;
        list = filterNotifications(list, filter);
        if (dateFrom || dateTo) {
          list = list.filter((n) => {
            const t = new Date(n.created_at).getTime();
            if (dateFrom) {
              const d = new Date(dateFrom);
              d.setHours(0, 0, 0, 0);
              if (t < d.getTime()) return false;
            }
            if (dateTo) {
              const d = new Date(dateTo);
              d.setHours(23, 59, 59, 999);
              if (t > d.getTime()) return false;
            }
            return true;
          });
        }
        setItems((prev) => (append ? [...prev, ...list] : list));
        setHasMore(Boolean(next));
        setPage(nextPage);
        const c = await notificationApi.getUnreadCount();
        if (c != null) setUnreadCount(c);
      } catch (e) {
        devError('NotificationsPage load', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, dateFrom, dateTo, setUnreadCount]
  );

  useEffect(() => {
    setPage(1);
    loadPage(1, false);
  }, [filter, dateFrom, dateTo, loadPage]);

  useEffect(() => {
    return subscribeNewNotification((n) => {
      setItems((prev) => {
        if (prev.some((x) => String(x.id) === String(n.id))) return prev;
        return [n, ...prev];
      });
      refetchDropdown();
    });
  }, [subscribeNewNotification, refetchDropdown]);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      devError('mark all read page', e);
    }
  };

  const handleDeleteRead = async () => {
    const read = items.filter((n) => n.is_read);
    try {
      await Promise.all(read.map((n) => deleteNotification(n.id)));
      setItems((prev) => prev.filter((n) => !n.is_read));
    } catch (e) {
      devError('delete read', e);
    }
  };

  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const groups = groupNotificationsByDate(sorted, t.notifications.groups);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t.notifications.title}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            {t.notifications.markAllRead}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDeleteRead}
          >
            {t.notifications.deleteRead}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <NotificationFilters variant="page" value={filter} onChange={setFilter} />
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">{t.notifications.dateFrom}</span>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">{t.notifications.dateTo}</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-500">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-20 text-center dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t.notifications.emptyTitle}
          </p>
          <p className="mt-1 text-sm text-slate-500">{t.notifications.emptySubtitle}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                {g.label}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                {g.items.map((n) => (
                  <NotificationItem
                    key={String(n.id)}
                    notification={n}
                    variant="page"
                    onRead={(id) => {
                      markAsRead(id);
                      setItems((prev) =>
                        prev.map((x) =>
                          String(x.id) === String(id) ? { ...x, is_read: true } : x
                        )
                      );
                    }}
                    onDelete={(id) => {
                      deleteNotification(id);
                      setItems((prev) => prev.filter((x) => String(x.id) !== String(id)));
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {hasMore && !loading ? (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={() => loadPage(page + 1, true)}
          >
            {loadingMore ? t.common.loading : t.notifications.loadMore}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
