// src/services/calendar/api.ts
import axiosInstance from '@/utils/axiosInstance';
import { devError } from '@/utils/devLog';

export const apiGetCalendarEvents = async (params: Record<string, any>) => {
  try {
    const response = await axiosInstance.get('/tasks/calendar/events', { params });

    const events = Array.isArray(response.data)
      ? response.data.map((event: any) => {
          if (event.type === 'task') {
            return { ...event, color: '#a690f4' };
          }
          if (event.type === 'appointment') {
            return { ...event, color: '#b9afd3' };
          }
          return { ...event, color: '#a690f4' };
        })
      : [];

    return { data: events };
  } catch (error) {
    devError('Error fetching calendar events:', error);
    return { data: [] };
  }
};

/** Case-linked dates (hearings, admin due dates, consultations) — additive to task/appointment feeds. */
export const apiGetCalendarCaseDateEvents = async (dateFrom: string, dateTo: string) => {
  try {
    const response = await axiosInstance.get('/calendar/events', {
      params: {
        types: 'case_deadline,case_due,consultation_date',
        dateFrom,
        dateTo,
      },
    });
    const raw = response.data;
    const arr = Array.isArray(raw) ? raw : raw?.results ?? raw?.data ?? [];
    return { data: Array.isArray(arr) ? arr : [] };
  } catch (error) {
    devError('Calendar case date events:', error);
    return { data: [] };
  }
};

