export type NotificationPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RelatedCase {
  id: number;
  reference?: string | null;
  title?: string | null;
  case_type?: string | null;
  caseType?: string | null;
}

export interface RelatedTask {
  id: number;
  title?: string | null;
}

export interface RelatedAppointment {
  id: number;
  title?: string | null;
}

export interface RelatedUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  /** Django / snake_case */
  first_name?: string | null;
  last_name?: string | null;
}

/** Normalized from GET /api/v1/notifications/ and WebSocket payloads. */
export interface AppNotification {
  id: number | string;
  type: string;
  title: string;
  message: string;
  priority?: NotificationPriority | string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  expires_at?: string | null;
  email_sent?: boolean;
  push_sent?: boolean;
  /** Relative path e.g. /dashboard/cases?case=ABC123 */
  action_url?: string | null;
  related_case?: RelatedCase | null;
  related_task?: RelatedTask | null;
  related_appointment?: RelatedAppointment | null;
  related_user?: RelatedUser | null;
  /** Derived label for UI chips */
  context_label?: string | null;
  /** Legacy flat fields (still supported if API omits nested) */
  case_reference?: string | null;
  case_title?: string | null;
  task_title?: string | null;
}

export type NotificationFilterId =
  | 'all'
  | 'unread'
  | 'urgent'
  | 'cases'
  | 'tasks'
  | 'appointments'
  | 'finance'
  | 'team'
  | 'messages';

/** localStorage preferences (V2: backend). */
export interface NotificationPrefs {
  tasks: boolean;
  cases: boolean;
  appointments: boolean;
  messages: boolean;
  finance: boolean;
  team: boolean;
  email: boolean;
}
