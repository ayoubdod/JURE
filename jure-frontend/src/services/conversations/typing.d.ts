declare namespace API {
  type ConversationType = 'direct' | 'group';

  type SuggestedIcon = {
    id: string;
    emoji: string;
    label: string;
  };

  type MessageType =
    | 'TEXT'
    | 'SHARED_CASE'
    | 'SHARED_TASK'
    | 'SHARED_APPOINTMENT'
    | 'CALL_VOICE'
    | 'CALL_VIDEO'
    | 'CALL_MISSED_VOICE'
    | 'CALL_MISSED_VIDEO';

  /**
   * Server-computed embed on shared messages (GET list/history/WS).
   * `id` is string in API schema; parse for numeric routes when needed.
   */
  type SharedItem = {
    type: 'CASE' | 'TASK' | 'APPOINTMENT' | 'CALL';
    id: string;
    title: string;
    status: string;
    priority: string | null;
    reference: string | null;
    dueDate: string | null;
    caseType: string | null;
    assignedTo: { id: number; name: string } | null;
    /** Optional extras (e.g. appointments) when backend includes them */
    date?: string | null;
    duration?: number | null;
    /** Call history extras */
    kind?: 'voice' | 'video' | string;
    outcome?: 'missed' | 'completed' | 'declined' | string;
    durationSeconds?: number | null;
    startedAt?: string | null;
    endedAt?: string | null;
  };

  /** Group conversation linked case (list/detail). */
  type LinkedCaseSummary = {
    id: number | string;
    reference?: string | null;
    title?: string;
    caseType?: string | null;
    case_type?: string | null;
    status?: string;
  };

  type Conversation = {
    id: number;
    type: ConversationType;
    title: string;
    display_name?: string;
    icon_url?: string | null;
    icon_preset_emoji?: string | null;
    archived?: boolean;
    is_pinned?: boolean;
    other_participant?: { full_name?: string; first_name?: string; last_name?: string; image?: string; [k: string]: unknown };
    memberships: ConversationMembership[];
    readonly latest_message: Message;
    readonly unread_count: number;
    created: string;
    linkedCase?: LinkedCaseSummary | null;
    linked_case?: LinkedCaseSummary | null;
  }

  type ConversationUpdateForm = {
    archived?: boolean;
    pinned?: boolean;
  }

  type ConversationMembership = {
    id: number;
    archived: boolean;
    is_admin: boolean;
    joined_at: string;
    user: User;
  }

  type MessageAttachmentKind = 'image' | 'video' | 'audio' | 'file';

  type MessageAttachment = {
    id: number;
    message: number;
    file: string;
    kind: MessageAttachmentKind;
    mime: string;
    size: number;
    duration_ms: number | null;
    thumbnail: string |  null;
    created: string;
  }

  type ForwardedFromDetail = {
    id: number;
    sender: number;
    body: string;
    sent_at: string;
  };

  type Message = {
    id: number;
    conversation: number;
    sender: number | { id: number; first_name?: string; last_name?: string; email?: string; full_name?: string; image?: string; [k: string]: unknown };
    body?: string;
    content?: string;
    reply_to?: number;
    forwarded_from?: number;
    edited_at?: string;
    sent_at?: string;
    created?: string;
    is_deleted?: boolean;
    is_own?: boolean;
    is_pinned?: boolean;
    delivered_count?: number;
    read_count?: number;
    attachments?: MessageAttachment[];
    forwarded_from_detail?: ForwardedFromDetail | null;
    message_type?: MessageType;
    messageType?: MessageType;
    shared_case_id?: number | null;
    sharedCaseId?: number | null;
    shared_task_id?: number | null;
    sharedTaskId?: number | null;
    shared_appointment_id?: number | null;
    sharedAppointmentId?: number | null;
    shared_item?: SharedItem | null;
    sharedItem?: SharedItem | null;
  }

  type CreateMessageForm = {
    conversation: number;
    body: string;
    attachments?: File[];
    messageType?: MessageType;
    sharedCaseId?: number;
    sharedTaskId?: number;
    sharedAppointmentId?: number;
  }

  type UserWorkspaceRelatedCase = {
    id?: number;
    reference?: string;
    title?: string;
  };

  type UserWorkspaceTask = {
    id: number;
    title: string;
    status: string;
    priority?: string | null;
    dueDate?: string | null;
    relatedCase?: UserWorkspaceRelatedCase | null;
    estimatedHours?: number | null;
  };

  type UserWorkspaceUpcomingEvent = {
    type: 'HEARING' | 'DEADLINE' | 'CONSULTATION' | 'TASK_DUE' | 'APPOINTMENT' | string;
    title: string;
    date: string;
    label: string;
    caseReference?: string | null;
  };

  type UserWorkspaceAvailability = {
    totalAssigned: number;
    inProgress: number;
    urgent: number;
    upcomingEvents: UserWorkspaceUpcomingEvent[];
    workloadLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };

  type UserWorkspace = {
    tasks: UserWorkspaceTask[];
    availability: UserWorkspaceAvailability;
  };
}
