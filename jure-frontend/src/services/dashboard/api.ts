import axiosInstance from '@/utils/axiosInstance';
import { devError } from '@/utils/devLog';

export type DashboardChangeState = 'up' | 'down' | 'flat' | 'no_previous_data';

export type AnnouncementType =
  | 'INFO'
  | 'PRODUCT_UPDATE'
  | 'FEATURE'
  | 'MAINTENANCE'
  | 'WARNING'
  | 'IMPORTANT'
  | 'SUCCESS';
export type AnnouncementMediaKind = 'IMAGE' | 'VIDEO';

export interface DashboardAnnouncement {
  id: number;
  title: string;
  message: string;
  type: AnnouncementType;
  status?: 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  priority?: number;
  link_url?: string | null;
  link_label?: string | null;
  media_url: string | null;
  media_kind: AnnouncementMediaKind | null;
  start_date: string | null;
  end_date: string | null;
}

export interface DashboardStat {
  title: string;
  value: string;
  change: string | null;
  change_state?: DashboardChangeState;
  icon: string;
  color: string;
  current?: number;
  previous?: number;
  growth?: number | null;
  period_current?: number;
  period_previous?: number;
}

export interface DashboardOverview {
  stats: DashboardStat[];
  /** Null when no active announcement targets this cabinet. */
  announcement: DashboardAnnouncement | null;
  recent_cases: Array<{
    id: number;
    title: string;
    client: string;
    status: string;
    priority: string;
    date: string;
  }>;
  today_tasks: Array<{
    id: number;
    title: string;
    time: string;
    priority: string;
  }>;
  recent_activity: Array<{
    icon: string;
    message: string;
    ago: string;
  }>;
}

/**
 * Cabinet dashboard overview — server-side MoM KPI growth included.
 * GET /api/v1/dashboard/dashboard/overview/
 */
export async function apiGetCabinetStats() {
  try {
    const response = await axiosInstance.get<DashboardOverview>(
      '/dashboard/dashboard/overview/'
    );
    return response;
  } catch (error) {
    devError('Error fetching dashboard stats:', error);
    throw error;
  }
}

/**
 * Hide an announcement for the current connection/session only.
 * POST /api/v1/dashboard/announcements/:id/dismiss/
 */
export async function apiDismissAnnouncement(announcementId: number) {
  try {
    const response = await axiosInstance.post(
      `/dashboard/announcements/${announcementId}/dismiss/`
    );
    return response;
  } catch (error) {
    devError('Error dismissing announcement:', error);
    throw error;
  }
}
