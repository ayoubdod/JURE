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

export const apiGetAppointments = (params?: Record<string, any>) => {
  return axiosInstance.get<API.Paginated<Appointment>>('/tasks/appointments/', { params });
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
