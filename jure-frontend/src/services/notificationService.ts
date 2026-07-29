import axiosInstance from '@/utils/axiosInstance';
import type { AppNotification } from '@/types/notification';
import { normalizeNotification } from '@/utils/notificationUtils';

const BASE = '/notifications';

export interface FetchNotificationsParams {
  page?: number;
  /** Backend default 20, max 100 */
  per_page?: number;
  /** Filter by read state */
  is_read?: boolean;
  type?: string;
  priority?: string;
}

export interface MarkReadResponse {
  id: number;
  is_read: boolean;
  read_at?: string | null;
}

export interface MarkAllReadResponse {
  marked_count: number;
}

function normalizeListResponse(data: unknown): {
  results: AppNotification[];
  count: number;
  next: string | null;
} {
  if (Array.isArray(data)) {
    const results = data.map((row) => normalizeNotification(row as Record<string, unknown>));
    return { results, count: results.length, next: null };
  }
  const o = data as Record<string, unknown>;
  const rawList = Array.isArray(o.results)
    ? o.results
    : Array.isArray(o.data)
      ? o.data
      : [];
  const results = rawList.map((row) => normalizeNotification(row as Record<string, unknown>));
  const count = typeof o.count === 'number' ? o.count : results.length;
  const next = (o.next as string | null | undefined) ?? null;
  return { results, count, next };
}

/**
 * Paginated list. Query: is_read, type, priority, page, per_page.
 * Base: {API_BASE}/api/v1/notifications/
 */
export async function getNotifications(params?: FetchNotificationsParams) {
  const res = await axiosInstance.get<unknown>(`${BASE}/`, {
    params: {
      page: params?.page,
      per_page: params?.per_page ?? 20,
      is_read: params?.is_read,
      type: params?.type,
      priority: params?.priority,
    },
  });
  return normalizeListResponse(res.data);
}

/** GET /api/v1/notifications/unread-count/ → { count } */
export async function getUnreadCount(): Promise<number | null> {
  try {
    const res = await axiosInstance.get<{ count?: number } | number>(`${BASE}/unread-count/`);
    const d = res.data;
    if (typeof d === 'number') return d;
    if (d && typeof d === 'object' && typeof d.count === 'number') return d.count;
    return null;
  } catch {
    return null;
  }
}

/** PATCH /api/v1/notifications/{id}/read/ */
export async function markAsRead(id: number | string) {
  const res = await axiosInstance.patch<MarkReadResponse>(`${BASE}/${id}/read/`, {});
  return res.data;
}

/** POST /api/v1/notifications/mark-all-read/ */
export async function markAllAsRead() {
  const res = await axiosInstance.post<MarkAllReadResponse>(`${BASE}/mark-all-read/`, {});
  return res.data;
}

export async function deleteNotification(id: number | string) {
  await axiosInstance.delete(`${BASE}/${id}/`);
}
