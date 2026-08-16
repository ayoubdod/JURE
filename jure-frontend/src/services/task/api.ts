import axiosInstance from "@/utils/axiosInstance";

export type TaskListParams = {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  priority?: string;
  assigned_to?: string | number;
  case?: string | number;
  client?: string | number;
  due?: string;
  overdue?: boolean;
  ordering?: string;
};

export type TaskStats = {
  total: number;
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
};

export const apiGetTasks = (params?: TaskListParams) => {
  return axiosInstance.get<API.Paginated<API.Task>>('/tasks/tasks/', { params });
};

export const apiGetTaskStats = () => {
  return axiosInstance.get<TaskStats>('/tasks/tasks/stats/');
};

export const apiGetTask = (id: number)=>{
    return axiosInstance.get<API.Task>(`/tasks/tasks/${id}/`);
}

export const apiCreateTask = (data: API.TaskCreateForm)=>{
    return axiosInstance.post<API.Task>(`/tasks/tasks/`,data);
}

export const apiUpdateTask = (data: API.TaskUpdateForm)=>{
    return axiosInstance.patch<API.Task>(`/tasks/tasks/${data.id}/`,data);
}

export const apiDeleteTask = (id: number)=>{
    return axiosInstance.delete<API.Task>(`/tasks/tasks/${id}/`);
}

