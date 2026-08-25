import axiosInstance from '@/utils/axiosInstance';

export type AppointmentMeetingType = 'in_person' | 'video';
export type AppointmentParticipantScope = 'team' | 'with_client';
export type AppointmentConversationMode = 'existing' | 'create_permanent' | 'create_temporary';

export type AppointmentAttachment = {
  id: number;
  name: string;
  original_name?: string;
  mime?: string;
  size: number;
  url?: string;
  preview_url?: string;
  uploaded_by?: number | null;
  uploaded_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  } | null;
  created?: string;
};

export interface AppointmentCreateForm {
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  status?: 'scheduled' | 'done' | 'cancelled';
  meeting_type?: AppointmentMeetingType;
  participant_scope?: AppointmentParticipantScope;
  location?: string;
  conversation?: number | null;
  conversation_mode?: AppointmentConversationMode | null;
  conversation_title?: string;
  client?: number | null;
  case?: number | null;
  attendee_ids?: number[];
}

export interface Appointment {
  id: number;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  status: 'scheduled' | 'done' | 'cancelled';
  meeting_type?: AppointmentMeetingType;
  participant_scope?: AppointmentParticipantScope;
  location: string;
  conversation?: number | null;
  jure_conversation?: {
    id: number;
    type: string;
    title: string;
    display_name?: string;
  } | null;
  conference_url?: string | null;
  client: number | null;
  client_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  case: number | null;
  case_title?: string;
  created_by: number;
  created_by_details?: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  attendee_ids?: number[];
  attendees?: Array<{
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    image?: string;
  }>;
  attachments?: AppointmentAttachment[];
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
  meeting_type?: AppointmentMeetingType | 'all' | string;
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

export type AppointmentUpdateForm = Partial<AppointmentCreateForm> & { id: number };

export const apiGetAppointments = (params?: AppointmentListParams) => {
  return axiosInstance.get<API.Paginated<Appointment>>('/tasks/appointments/', { params });
};

export const apiGetAppointmentStats = () => {
  return axiosInstance.get<AppointmentStats>('/tasks/appointments/stats/');
};

export const apiGetAppointment = (id: number) => {
  return axiosInstance.get<Appointment>(`/tasks/appointments/${id}/`);
};

export const apiUpdateAppointment = (data: AppointmentUpdateForm) => {
  return axiosInstance.patch<Appointment>(`/tasks/appointments/${data.id}/`, data);
};

export const apiDeleteAppointment = (id: number) => {
  return axiosInstance.delete(`/tasks/appointments/${id}/`);
};

export const apiUploadAppointmentAttachments = (id: number, files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return axiosInstance.post<AppointmentAttachment[]>(`/tasks/appointments/${id}/attachments/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const apiDeleteAppointmentAttachment = (appointmentId: number, attachmentId: number) => {
  return axiosInstance.delete(`/tasks/appointments/${appointmentId}/attachments/${attachmentId}/`);
};
