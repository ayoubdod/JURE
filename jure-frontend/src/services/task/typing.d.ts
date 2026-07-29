declare namespace API {
  type TaskPriority = 'low' | 'medium' | 'high';
  type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';

  type Task = {
    id: number;
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    due_date: string | null;
    estimated_hours: string | null;
    assigned_to: API.User | null;
    assigned_to_details: API.User | null;
    client: API.User | null;
    client_details: API.Client | null;
    
  };

  type TaskCreateForm = {
    title: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
    due_date?: string | null;
    estimated_hours?: string | null;
    assigned_to?: number | null;
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
