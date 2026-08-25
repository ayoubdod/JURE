declare namespace API {
  type TaskPriority = 'low' | 'medium' | 'high';
  type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

  type TaskAttachment = {
    id: number;
    name: string;
    original_name?: string;
    mime?: string;
    size: number;
    url?: string;
    preview_url?: string;
    uploaded_by?: number | null;
    uploaded_by_details?: API.User | null;
    created?: string;
  };

  type Task = {
    id: number;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    due_date: string | null;
    estimated_hours: string | null;
    assigned_to: number | API.User | null;
    assigned_to_details: API.User | null;
    assignee_ids?: number[];
    assignees?: API.User[];
    attachments?: TaskAttachment[];
    client: number | API.User | null;
    client_details: API.User | API.Client | null;
    case?: number | null;
    case_title?: string;
    created?: string;
    created_by?: number | null;
    created_by_details?: API.User | null;
  };

  type TaskCreateForm = {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    due_date?: string | null;
    estimated_hours?: string | null;
    assigned_to?: number | null;
    assignee_ids?: number[];
    client?: number | null;
    case?: string | number;
  };

  type TaskCreateFormRemoteValidation = {
    [K in keyof TaskCreateForm]?: string;
  };

  type TaskUpdateForm = {
    id: number;
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    due_date?: string | null;
    estimated_hours?: string | null;
    assigned_to?: number | null;
    assignee_ids?: number[];
    client?: number | null;
    case?: string | number;
  };

  type TaskUpdateFormRemoteValidation = {
    [K in keyof TaskUpdateForm]?: string;
  };
  interface TaskUpdateForm extends TaskCreateForm {
    id: number | string;
  }
}
