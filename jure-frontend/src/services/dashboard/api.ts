import axiosInstance from '@/utils/axiosInstance';
import { devError } from '@/utils/devLog';

export type DashboardChangeState = 'up' | 'down' | 'flat' | 'no_previous_data';

export type DashboardRole =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'LAWYER'
  | 'ASSISTANT'
  | 'VIEWER'
  | string;

export type DashboardScope = 'cabinet' | 'personal';

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

export interface DashboardKpiEntry {
  value: number;
  change: string | null;
  change_state: DashboardChangeState | string;
  previous?: number | null;
  growth?: number | null;
  period_current?: number;
  period_previous?: number;
}

export interface DashboardAttentionItem {
  id: string;
  kind: 'task_overdue' | 'task_due_today' | 'appointment_today' | 'deadline_upcoming' | string;
  title: string;
  due_date?: string | null;
  entity?: {
    type?: string;
    id?: number | string | null;
    source_type?: string;
  };
  href_hint?: string;
}

export interface DashboardTaskItem {
  id: number;
  title: string;
  time: string;
  priority: string;
  status?: string;
  due_date?: string | null;
}

export interface DashboardAppointmentItem {
  id: number;
  title: string;
  start_at?: string | null;
  end_at?: string | null;
  status?: string;
  meeting_type?: string;
  case_id?: number | null;
}

export interface DashboardDeadlineItem {
  id?: string | number | null;
  source_type?: string | null;
  source_id?: string | number | null;
  title: string;
  label?: string;
  date?: string | null;
  status?: string | null;
  case_id?: number | null;
  case_reference?: string | null;
}

export interface DashboardCaseItem {
  id: number;
  title: string;
  client: string;
  status: string;
  /** @deprecated Removed in P0 — session-type was never a real matter priority. */
  priority?: string;
  date: string;
}

export interface DashboardActivityItem {
  icon: string;
  message: string;
  ago: string;
  kind?: 'log' | 'task_completed' | 'client_added' | 'document_uploaded' | 'notification' | string;
  title?: string;
  at?: string | null;
  notification_type?: string;
  is_read?: boolean;
  action_url?: string | null;
  entity?: {
    case_id?: number | null;
    task_id?: number | null;
    appointment_id?: number | null;
  };
}

export interface DashboardPortfolioBucket {
  key: string;
  count: number;
  href_hint?: string;
}

export interface DashboardPortfolioLawyer {
  user_id: number;
  name: string;
  count: number;
  href_hint?: string;
}

export interface DashboardPortfolio {
  by_status: DashboardPortfolioBucket[];
  by_type: DashboardPortfolioBucket[];
  by_lawyer: DashboardPortfolioLawyer[];
  total: number;
  active_total: number;
}

export interface DashboardCrmMatter {
  id: number;
  title: string;
  status: string;
  case_type?: string;
  client?: string | null;
  modified?: string | null;
  days_idle?: number | null;
  href_hint?: string;
}

export interface DashboardCrmFollowUp {
  id: number;
  name: string;
  last_activity?: string | null;
  days_idle: number;
  href_hint?: string;
}

export interface DashboardCrm {
  rules: {
    stale_matter_days: number;
    client_follow_up_days: number;
    aging_gt_60_days: number;
  };
  stale_matters: DashboardCrmMatter[];
  stale_matters_count: number;
  client_follow_ups: DashboardCrmFollowUp[];
  client_follow_ups_count: number;
  aging_gt_60_count: number;
}

export interface DashboardTeamAssignee {
  user_id: number;
  name: string;
  count: number;
  href_hint?: string;
}

export interface DashboardTeamOverdue {
  by_assignee: DashboardTeamAssignee[];
  unassigned: number;
  total: number;
}

export interface DashboardConflictReviewItem {
  id: number;
  search_query: string;
  result_count: number;
  status: string;
  matter_id?: number | null;
  matter_reference?: string | null;
  initiated_by_id?: number | null;
  created?: string | null;
  href_hint?: string;
}

export interface DashboardFinanceSnapshot {
  period: string;
  year: number;
  invoiced: number | string;
  collected: number | string;
  outstanding: number | string;
  overdue: number | string;
  currency: string;
}

export interface DashboardToolsHints {
  juria_enabled?: boolean;
  juria_path?: string;
  juria_briefing?: boolean;
  juria_ask?: boolean;
  deadline_calculator?: boolean;
  conflict_check?: boolean;
  research_notes_path?: string;
}

export interface DashboardAssistSource {
  kind: string;
  id?: number | string | null;
  title: string;
  text?: string;
}

export interface DashboardAssistResponse {
  kind: 'briefing' | 'answer' | string;
  text: string;
  question?: string;
  caveats: string[];
  retrieval: {
    method: string;
    description: string;
  };
  sources: DashboardAssistSource[];
  facts?: Record<string, unknown>;
  meta?: {
    role?: string;
    scope?: string;
    as_of?: string;
    language?: string;
    tokens_used?: number;
  };
}

export interface DashboardOverview {
  meta?: {
    role: DashboardRole;
    scope: DashboardScope;
    cabinet_id: number;
    as_of?: string;
    period?: {
      month_start?: string;
      month_end?: string;
    };
  };
  stats: DashboardStat[];
  /** Null when no active announcement targets this cabinet. */
  announcement: DashboardAnnouncement | null;
  recent_cases: DashboardCaseItem[];
  today_tasks: DashboardTaskItem[];
  recent_activity: DashboardActivityItem[];
  kpis?: {
    active_cases?: DashboardKpiEntry;
    cases_opened_mtd?: DashboardKpiEntry;
    cases_closed_mtd?: DashboardKpiEntry;
    tasks_due_today?: DashboardKpiEntry;
    tasks_overdue?: DashboardKpiEntry;
    upcoming_deadlines_7d?: DashboardKpiEntry;
    active_clients?: DashboardKpiEntry;
    /** P2: active cases idle > 60 days. */
    wip_aging_gt_60?: DashboardKpiEntry | null;
    open_high_risk_matters?: null;
    realization_rate?: null;
  };
  attention?: DashboardAttentionItem[];
  my_day?: {
    appointments_today: DashboardAppointmentItem[];
    tasks_due_today: DashboardTaskItem[];
    tasks_overdue: DashboardTaskItem[];
    upcoming_deadlines: DashboardDeadlineItem[];
  };
  /** Null unless backend authorizes OWNER/ADMIN finance snapshot. */
  finance?: DashboardFinanceSnapshot | null;
  tools?: DashboardToolsHints;
  /** P2 portfolio aggregates (scope-aware). */
  portfolio?: DashboardPortfolio;
  /** P2 CRM heuristics (stale matters / follow-ups). */
  crm?: DashboardCrm;
  /** P2 team overdue — null without team.view. */
  team?: DashboardTeamOverdue | null;
  /** P2 pending conflict-review rows — null without cases+clients view. */
  conflict_review_queue?: DashboardConflictReviewItem[] | null;
  definitions?: {
    active_clients?: string;
    upcoming_deadlines_7d?: string;
    mtd?: string;
    active_cases_mom?: string;
    stale_matters?: string;
    client_follow_ups?: string;
    wip_aging_gt_60?: string;
    activity?: string;
  };
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
 * P3 read-only JURIA daily briefing over authorized dashboard queues.
 * GET /api/v1/dashboard/dashboard/briefing/
 */
export async function apiGetDashboardBriefing(language?: string) {
  try {
    const response = await axiosInstance.get<DashboardAssistResponse>(
      '/dashboard/dashboard/briefing/',
      { params: language ? { language } : undefined }
    );
    return response;
  } catch (error) {
    devError('Error fetching dashboard briefing:', error);
    throw error;
  }
}

/**
 * P3 NL ask over authorized dashboard facts (keyword-ranked, not vector RAG).
 * POST /api/v1/dashboard/dashboard/ask/
 */
export async function apiAskDashboard(question: string, language?: string) {
  try {
    const response = await axiosInstance.post<DashboardAssistResponse>(
      '/dashboard/dashboard/ask/',
      { question, language }
    );
    return response;
  } catch (error) {
    devError('Error asking dashboard:', error);
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
