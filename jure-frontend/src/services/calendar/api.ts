import axiosInstance from '@/utils/axiosInstance';
import { devError } from '@/utils/devLog';
import type { CalendarEvent } from '@/lib/calendarEvents';

/** Query for GET /tasks/calendar/events */
export type CalendarEventsQuery = {
  start: string;
  end: string;
  types?: string;
  status?: string;
  priority?: string;
  assigned_to?: string | number;
  case?: string | number;
  client?: string | number;
  search?: string;
};

type FeedEvent = CalendarEvent & { color?: string };

function colorizeRow(value: unknown): FeedEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as FeedEvent;
  return {
    ...event,
    color: event.type === 'appointment' ? '#b9afd3' : '#a690f4',
  };
}

export const apiGetCalendarEvents = async (params: CalendarEventsQuery) => {
  try {
    const response = await axiosInstance.get<unknown>('/tasks/calendar/events', { params });
    const rows = Array.isArray(response.data)
      ? response.data.map(colorizeRow).filter((row): row is FeedEvent => row != null)
      : [];
    return { data: rows };
  } catch (error) {
    devError('Error fetching calendar events:', error);
    return { data: [] as FeedEvent[] };
  }
};

/** Case-linked dates (hearings, admin due dates, consultations) — additive to task/appointment feeds. */
export const apiGetCalendarCaseDateEvents = async (dateFrom: string, dateTo: string) => {
  try {
    const response = await axiosInstance.get<unknown>('/calendar/events', {
      params: {
        types: 'case_deadline,case_due,consultation_date',
        dateFrom,
        dateTo,
      },
    });
    const raw = response.data;
    if (Array.isArray(raw)) return { data: raw as Record<string, unknown>[] };
    if (raw && typeof raw === 'object') {
      const obj = raw as { results?: unknown; data?: unknown };
      const arr = obj.results ?? obj.data;
      return { data: Array.isArray(arr) ? (arr as Record<string, unknown>[]) : [] };
    }
    return { data: [] as Record<string, unknown>[] };
  } catch (error) {
    devError('Calendar case date events:', error);
    return { data: [] as Record<string, unknown>[] };
  }
};
