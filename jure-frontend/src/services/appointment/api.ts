import axiosInstance from '@/utils/axiosInstance';

// Define Appointment types based on backend model
export interface AppointmentCreateForm {
  title: string;
  description?: string;
  start_at: string; // ISO datetime string
  end_at: string;   // ISO datetime string
  status?: 'scheduled' | 'done' | 'cancelled';
  location?: string;
  client?: number; // User ID
  case?: number;   // Case ID
  attendee_ids?: number[]; // Array of User IDs
}

export interface Appointment {
  id: number;
  title: string;
  description: string;
  start_at: string; // ISO datetime string
  end_at: string;   // ISO datetime string
  status: 'scheduled' | 'done' | 'cancelled';
  location: string;
  client: number | null; // User ID
  client_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  case: number | null; // Case ID
  case_title?: string;
  created_by: number;
  created_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  attendee_ids: number[];
  cabinet: number;
  created: string;
  modified: string;
}

export const apiCreateAppointment = (data: AppointmentCreateForm) => {
  return axiosInstance.post<Appointment>('/tasks/appointments/', data);
};

export type AppointmentListParams = {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  case?: string | number;
  client?: string | number;
  assigned_to?: string | number;
  period?: 'today' | 'week' | 'month' | 'upcoming' | 'all' | string;
  ordering?: string;
};

export type AppointmentStats = {
  total: number;
  today: number;
  upcoming: number;
  completed: number;
  cancelled: number;
};

export const apiGetAppointments = (params?: AppointmentListParams) => {
  return axiosInstance.get<API.Paginated<Appointment>>('/tasks/appointments/', { params });
};

export const apiGetAppointmentStats = () => {
  return axiosInstance.get<AppointmentStats>('/tasks/appointments/stats/');
};

export const apiGetAppointment = (id: number) => {
  return axiosInstance.get<Appointment>(`/tasks/appointments/${id}/`);
};

export const apiUpdateAppointment = (data: Partial<Appointment> & { id: number }) => {
  return axiosInstance.patch<Appointment>(`/tasks/appointments/${data.id}/`, data);
};

export const apiDeleteAppointment = (id: number) => {
  return axiosInstance.delete(`/tasks/appointments/${id}/`);
};
