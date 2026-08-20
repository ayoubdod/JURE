import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useUserStore from '@/stores/userStore';
import { getNotificationsWsUrl } from '@/config/api';
import * as notificationApi from '@/services/notificationService';
import type { AppNotification } from '@/types/notification';
import type { NotificationFilterId } from '@/types/notification';
import type { NotificationPrefs } from '@/types/notification';
import { loadNotificationPrefs, saveNotificationPrefs, shouldAlertForNotificationType } from '@/utils/notificationPreferences';
import { filterNotifications, normalizeNotification } from '@/utils/notificationUtils';
import { isChatMessageNotification } from '@/utils/notificationNav';
import { devError } from '@/utils/devLog';

const DROPDOWN_MAX = 80;

export type { NotificationPrefs };

type IncomingToastPayload = {
  notification: AppNotification;
  urgentManualClose: boolean;
};

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isDropdownOpen: boolean;
  isLoading: boolean;
  activeFilter: NotificationFilterId;
  wsConnected: boolean;
  preferences: NotificationPrefs;
  setPreferences: (p: NotificationPrefs) => void;
  animationTick: number;
  fetchNotifications: (filter?: NotificationFilterId) => Promise<void>;
  markAsRead: (id: number | string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number | string) => Promise<void>;
  prependNotification: (n: AppNotification, opts?: { skipToast?: boolean; skipBadge?: boolean }) => void;
  setUnreadCount: (n: number) => void;
  toggleDropdown: () => void;
  closeDropdown: () => void;
  setActiveFilter: (f: NotificationFilterId) => void;
  incomingToasts: IncomingToastPayload[];
  dismissToast: (id: number | string) => void;
  subscribeNewNotification: (cb: (n: AppNotification) => void) => () => void;
  /** Row entrance highlight for WS prepend */
  highlightNotificationId: string | null;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const newNotificationSubscribers = new Set<(n: AppNotification) => void>();

function parseWsPayload(data: Record<string, unknown>): AppNotification | null {
  const nested = data.notification ?? data.payload;
  const raw =
    nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>)
      : data.id != null || data.type != null
        ? data
        : null;
  if (!raw) return null;
  if (raw.is_message) return null;
  const n = normalizeNotification(raw);
  if (isChatMessageNotification(n.type) || n.id == null || n.id === '') return null;
  return n;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useUserStore((s) => s.isLoggedIn);
  const accessToken = useUserStore((s) => s.accessToken);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotificationFilterId>('all');
  const [wsConnected, setWsConnected] = useState(false);
  const [preferences, setPreferencesState] = useState<NotificationPrefs>(() => loadNotificationPrefs());
  const [animationTick, setAnimationTick] = useState(0);
  const [incomingToasts, setIncomingToasts] = useState<IncomingToastPayload[]>([]);
  const [highlightNotificationId, setHighlightNotificationId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualCloseRef = useRef(false);

  const setPreferences = useCallback((p: NotificationPrefs) => {
    setPreferencesState(p);
    saveNotificationPrefs(p);
  }, []);

  const subscribeNewNotification = useCallback((cb: (n: AppNotification) => void) => {
    newNotificationSubscribers.add(cb);
    return () => {
      newNotificationSubscribers.delete(cb);
    };
  }, []);

  const dismissToast = useCallback((id: number | string) => {
    setIncomingToasts((prev) => prev.filter((t) => String(t.notification.id) !== String(id)));
  }, []);

  const fetchNotifications = useCallback(async (filter?: NotificationFilterId) => {
    setIsLoading(true);
    try {
      const f = filter ?? activeFilter;
      const params: notificationApi.FetchNotificationsParams = {
        page: 1,
        per_page: DROPDOWN_MAX,
        is_read: f === 'unread' ? false : undefined,
        priority: f === 'urgent' ? 'URGENT' : undefined,
      };

      const { results } = await notificationApi.getNotifications(params);
      setNotifications(filterNotifications(results, f).filter((n) => !isChatMessageNotification(n.type)));
      const count = await notificationApi.getUnreadCount();
      if (count != null) setUnreadCount(count);
    } catch (e) {
      devError('fetchNotifications', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  const prependNotification = useCallback(
    (n: AppNotification, opts?: { skipToast?: boolean; skipBadge?: boolean }) => {
      if (isChatMessageNotification(n.type)) return;
      setNotifications((prev) => {
        const id = n.id;
        const without = prev.filter((x) => String(x.id) !== String(id));
        return [n, ...without].slice(0, DROPDOWN_MAX);
      });
      const prefs = loadNotificationPrefs();
      const alert = shouldAlertForNotificationType(n.type, prefs);
      if (!opts?.skipBadge && alert && !n.is_read) {
        setUnreadCount((c) => c + 1);
      }
      if (!opts?.skipToast && alert) {
        const urgent = String(n.priority || '').toUpperCase() === 'URGENT';
        setIncomingToasts((prev) => {
          const next: IncomingToastPayload[] = [
            ...prev,
            { notification: n, urgentManualClose: urgent },
          ];
          return next.slice(-3);
        });
        setAnimationTick((t) => t + 1);
      }
      setHighlightNotificationId(String(n.id));
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => setHighlightNotificationId(null), 600);
      newNotificationSubscribers.forEach((fn) => {
        try {
          fn(n);
        } catch (e) {
          devError('notification subscriber', e);
        }
      });
    },
    []
  );

  const markAsRead = useCallback(async (id: number | string) => {
    let shouldDecrement = false;
    setNotifications((prev) => {
      const target = prev.find((n) => String(n.id) === String(id));
      if (!target) {
        shouldDecrement = true;
        return prev;
      }
      if (!target.is_read) shouldDecrement = true;
      return prev.map((n) =>
        String(n.id) === String(id) ? { ...n, is_read: true, read_at: n.read_at } : n
      );
    });
    if (shouldDecrement) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const data = await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          String(n.id) === String(id)
            ? { ...n, is_read: true, read_at: data.read_at ?? n.read_at }
            : n
        )
      );
      const count = await notificationApi.getUnreadCount();
      if (count != null) setUnreadCount(count);
    } catch (e) {
      devError('markAsRead', e);
      const count = await notificationApi.getUnreadCount();
      if (count != null) setUnreadCount(count);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      devError('markAllAsRead', e);
    }
  }, []);

  const deleteNotification = useCallback(async (id: number | string) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications((prev) => {
        const n = prev.find((x) => String(x.id) === String(id));
        const next = prev.filter((x) => String(x.id) !== String(id));
        if (n && !n.is_read) setUnreadCount((c) => Math.max(0, c - 1));
        return next;
      });
    } catch (e) {
      devError('deleteNotification', e);
    }
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((o) => !o);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const connectWs = useCallback(() => {
    if (!accessToken || !isLoggedIn) return;
    manualCloseRef.current = false;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getNotificationsWsUrl(accessToken));
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as Record<string, unknown>;
          const type = String(data.type || '');

          if (type === 'notification.new') {
            const n = parseWsPayload(data);
            if (!n) return;
            prependNotification(n);
            return;
          }

          if (type === 'notification.unread_count') {
            const c =
              typeof data.count === 'number'
                ? data.count
                : typeof (data.payload as { count?: number } | undefined)?.count === 'number'
                  ? (data.payload as { count: number }).count
                  : null;
            if (typeof c === 'number') setUnreadCount(c);
            return;
          }

          if (type === 'notification.read_confirmed') {
            const nid =
              (data as { notification_id?: number }).notification_id ??
              (data as { id?: unknown }).id;
            const uc = (data as { unread_count?: number }).unread_count;
            if (nid != null) {
              setNotifications((prev) =>
                prev.map((n) =>
                  String(n.id) === String(nid) ? { ...n, is_read: true } : n
                )
              );
            }
            if (typeof uc === 'number') setUnreadCount(uc);
            return;
          }

          if (type === 'notification.all_read_confirmed') {
            const uc = data.unread_count;
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            if (typeof uc === 'number') setUnreadCount(uc);
            else setUnreadCount(0);
            return;
          }
        } catch (e) {
          devError('notifications ws message', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        if (manualCloseRef.current || !isLoggedIn || !accessToken) return;
        const attempt = reconnectAttemptRef.current;
        const delay = Math.min(30000, 1000 * Math.pow(2, attempt));
        reconnectAttemptRef.current = attempt + 1;
        reconnectTimerRef.current = setTimeout(() => {
          connectWs();
        }, delay);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    } catch (e) {
      devError('notifications ws connect', e);
    }
  }, [accessToken, isLoggedIn, prependNotification]);

  const disconnectWs = useCallback(() => {
    manualCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    wsRef.current?.close();
    wsRef.current = null;
    setWsConnected(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !accessToken) {
      disconnectWs();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const c = await notificationApi.getUnreadCount();
        if (!cancelled && c != null) setUnreadCount(c);
        const { results } = await notificationApi.getNotifications({ page: 1, per_page: DROPDOWN_MAX });
        if (!cancelled) setNotifications(results.filter((n) => !isChatMessageNotification(n.type)));
      } catch (e) {
        devError('initial notifications load', e);
      }
    })();
    connectWs();
    return () => {
      cancelled = true;
      disconnectWs();
    };
  }, [isLoggedIn, accessToken, connectWs, disconnectWs]);

  useEffect(() => {
    if (isDropdownOpen) {
      fetchNotifications(activeFilter);
    }
  }, [isDropdownOpen, activeFilter, fetchNotifications]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isDropdownOpen,
      isLoading,
      activeFilter,
      wsConnected,
      preferences,
      setPreferences,
      animationTick,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      prependNotification,
      setUnreadCount,
      toggleDropdown,
      closeDropdown,
      setActiveFilter,
      incomingToasts,
      dismissToast,
      subscribeNewNotification,
      highlightNotificationId,
    }),
    [
      notifications,
      unreadCount,
      isDropdownOpen,
      isLoading,
      activeFilter,
      wsConnected,
      preferences,
      setPreferences,
      animationTick,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      prependNotification,
      incomingToasts,
      dismissToast,
      subscribeNewNotification,
      highlightNotificationId,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

export function useNotificationsOptional(): NotificationContextValue | null {
  return useContext(NotificationContext);
}
