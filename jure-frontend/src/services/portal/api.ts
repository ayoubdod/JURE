import axiosInstance from '@/utils/axiosInstance';

const BASE = '/portal/';

export type PortalDashboard = {
  clientName: string;
  activeCasesCount: number;
  pendingConsultationsCount: number;
  unreadMessagesCount: number;
  upcomingConsultations: Array<Record<string, unknown>>;
  recentCases: Array<{
    id: number;
    title: string;
    reference: string;
    status: string;
    caseType: string;
    updatedAt: string;
    assignedLawyer: string | null;
  }>;
  pendingConsultations: Array<Record<string, unknown>>;
};

export type PortalCaseListItem = {
  id: number;
  title: string;
  reference: string;
  caseType: string;
  status: string;
  category: string;
  summary: string | null;
  openedAt: string;
  updatedAt: string;
  lawFirm: string | null;
  assignedLawyer: {
    id: number;
    fullName: string;
    email: string;
  } | null;
};

export type PortalCaseDetail = PortalCaseListItem & {
  description: string | null;
  documents: Array<{
    id: number;
    name: string;
    type: string;
    date: string;
    uploadedBy: string;
    url: string | null;
  }>;
  timeline: Array<{
    id: string | number;
    kind: string;
    message: string;
    created: string;
  }>;
  updates: Array<{
    id: number;
    content: string;
    authorName: string;
    created: string;
  }>;
  requiredActions: Array<unknown>;
};

export const apiGetPortalDashboard = () =>
  axiosInstance.get<PortalDashboard>(`${BASE}dashboard/`);

export const apiListPortalCases = () =>
  axiosInstance.get<PortalCaseListItem[]>(`${BASE}cases/`);

export const apiGetPortalCase = (id: number | string) =>
  axiosInstance.get<PortalCaseDetail>(`${BASE}cases/${id}/`);
