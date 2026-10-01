import axiosInstance from '@/utils/axiosInstance';

const BASE = '/consultations/';

export type ConsultationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_INFORMATION'
  | 'ASSIGNED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DECLINED';

export type LegalArea =
  | 'BUSINESS'
  | 'LABOR'
  | 'REAL_ESTATE'
  | 'COMMERCIAL'
  | 'CORPORATE'
  | 'TAX'
  | 'IP'
  | 'DATA_PROTECTION'
  | 'OTHER';

export type PreferredFormat = 'CHAT' | 'VIDEO' | 'PHONE' | 'IN_PERSON';

export type ConsultationListItem = {
  id: number;
  reference: string;
  subject: string;
  legalArea: LegalArea;
  status: ConsultationStatus;
  priority: string;
  clientName: string;
  assignedLawyerName: string;
  preferredFormat: PreferredFormat;
  createdAt: string;
  chatAvailable: boolean;
  conversationId: number | null;
};

export type ConsultationDetail = ConsultationListItem & {
  description: string;
  preferredDatetime: string;
  relatedCaseId: number | null;
  relatedCaseTitle: string | null;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  };
  assignedLawyer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  } | null;
  comments: Array<{
    id: number;
    content: string;
    visibility: 'CLIENT' | 'INTERNAL';
    author: number | null;
    authorName: string;
    created: string;
  }>;
  events: Array<{
    id: number;
    event_type: string;
    actor: number | null;
    actorName: string;
    metadata: Record<string, unknown>;
    client_visible: boolean;
    created: string;
  }>;
  attachments: Array<{
    id: number;
    name: string;
    original_name: string;
    url: string | null;
    uploaded_by: number | null;
    uploadedByName: string;
    created: string;
  }>;
  confirmedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type ConsultationCreatePayload = {
  subject: string;
  legalArea: LegalArea;
  description: string;
  preferredFormat?: PreferredFormat;
  preferredDatetime?: string;
  relatedCaseId?: number | null;
};

export type ConsultationListParams = {
  status?: string;
  lawyer?: number | string;
  legalArea?: string;
  client?: number | string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export const apiListConsultations = (params?: ConsultationListParams) =>
  axiosInstance.get(BASE, {
    params: {
      status: params?.status,
      lawyer: params?.lawyer,
      legal_area: params?.legalArea,
      client: params?.client,
      date_from: params?.dateFrom,
      date_to: params?.dateTo,
      search: params?.search,
    },
  });

export const apiGetConsultation = (id: number | string) =>
  axiosInstance.get(`${BASE}${id}/`);

export const apiCreateConsultation = (payload: ConsultationCreatePayload) =>
  axiosInstance.post(BASE, payload);

export const apiAssignConsultationLawyer = (id: number | string, lawyerId: number) =>
  axiosInstance.post(`${BASE}${id}/assign/`, { lawyerId });

export const apiConfirmConsultation = (id: number | string) =>
  axiosInstance.post(`${BASE}${id}/confirm/`, {});

export const apiDeclineConsultation = (id: number | string, reason = '') =>
  axiosInstance.post(`${BASE}${id}/decline/`, { reason });

export const apiSetConsultationStatus = (
  id: number | string,
  status: ConsultationStatus,
  reason = '',
) => axiosInstance.post(`${BASE}${id}/set-status/`, { status, reason });

export const apiAddConsultationComment = (
  id: number | string,
  content: string,
  visibility: 'CLIENT' | 'INTERNAL' = 'CLIENT',
) => axiosInstance.post(`${BASE}${id}/comments/`, { content, visibility });

export const apiUploadConsultationAttachment = (id: number | string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return axiosInstance.post(`${BASE}${id}/attachments/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const apiUpdateConsultationPriority = (id: number | string, priority: string) =>
  axiosInstance.patch(`${BASE}${id}/`, { priority });
