import axiosInstance from "@/utils/axiosInstance";

export const apiGetTasks = ()=>{
    return axiosInstance.get<API.Paginated<API.Task>>('/tasks/tasks/');
}

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

