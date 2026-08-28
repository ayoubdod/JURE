import axiosInstance from "@/utils/axiosInstance";

/** Backend API path: /cases/ (POST/GET /api/v1/cases/) */
const CASES_BASE = '/cases/';

export type GetCasesParams = {
    /** CONSULTATION | LITIGATION | ADMINISTRATIVE */
    caseType?: 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE';
    /** Comma-separated accepted by backend, e.g. OPEN,IN_PROGRESS */
    status?: string;
    search?: string;
    assignedTo?: number;
    page?: number;
    page_size?: number;
    client?: number;
    dateFrom?: string;  // yyyy-mm-dd
    dateTo?: string;   // yyyy-mm-dd
    ordering?: string;
    outcome?: string;
    consultationType?: string;
    format?: string;
    legalDomain?: string;
    followUpRequired?: boolean | string;
    clientRole?: string;
    priority?: string;
    dutyType?: string;
    litigationType?: string;
    overdue?: boolean | string;
    today?: boolean | string;
    dueThisWeek?: boolean | string;
    upcomingHearing?: boolean | string;
    priorityIn?: string;
    institution?: string;
    courtName?: string;
    courtSpecialty?: string;
    jurisdiction?: string;
    chamber?: string;
    city?: string;
    opposingParty?: string;
    dateField?: string;
    category?: string;
    /** When true, include follow-up rows (C-YEAR-NNNN-F01). Default API excludes them. */
    includeFollowUps?: boolean | string;
    upcoming?: boolean | string;
    thisMonth?: boolean | string;
    converted?: boolean | string | number;
    followUpFilter?: 'required' | 'has' | 'none' | string;
    assignedToIn?: string;
};

export const apiGetCases = (params?: GetCasesParams) =>
    axiosInstance.get<API.Paginated<API.Case>>(CASES_BASE, { params });

/** Count matching cases without downloading the full page (uses pagination `count`). */
export async function apiCountCases(params?: GetCasesParams): Promise<number> {
  const res = await apiGetCases({ ...params, page: 1, page_size: 1 });
  return res.data?.count ?? 0;
}

/** Fetches every page of cases (for team workload / aggregates). */
export async function apiGetAllCasesFlattened(pageSize = 500): Promise<API.Case[]> {
  const acc: API.Case[] = [];
  let page = 1;
  while (true) {
    const res = await apiGetCases({ page, page_size: pageSize });
    const data = res.data;
    acc.push(...(data?.results ?? []));
    const lastPage = data?.last_page ?? 1;
    if (page >= lastPage) break;
    page += 1;
  }
  return acc;
}

export const apiGetCase = (id: number) =>
    axiosInstance.get<API.Case>(`${CASES_BASE}${id}/`);

export const apiCreateCase = (data: API.CaseCreateForm | API.CaseCreatePayload | Record<string, unknown>) =>
    axiosInstance.post<API.Case>(CASES_BASE, data);

export const apiUpdateCase = (data: API.CaseUpdateForm | API.CaseUpdatePayload | (Record<string, unknown> & { id: number })) =>
    axiosInstance.patch<API.Case>(`${CASES_BASE}${data.id}/`, data);

export const apiDeleteCase = (id: number) =>
    axiosInstance.delete<API.Case>(`${CASES_BASE}${id}/`);

/** Convert a consultation into LITIGATION or ADMINISTRATIVE (201: { success, newCase, originalConsultation }) */
export const apiConvertCase = (consultationId: number, body: Record<string, unknown>) =>
    axiosInstance.post<API.ConvertCaseResponse>(`${CASES_BASE}${consultationId}/convert/`, body);

export type CloseCasePayload = {
    outcome?: string;
    lessons?: string;
    precedents?: string;
};

export type CloseCaseResponse = {
    success: boolean;
    already_closed: boolean;
    previous_status: API.CaseStatus;
    case: API.Case;
};

/** Persist matter closure: POST /api/v1/cases/:id/close/ */
export const apiCloseCase = (id: number, body?: CloseCasePayload) =>
    axiosInstance.post<CloseCaseResponse>(`${CASES_BASE}${id}/close/`, body ?? {});

export const apiCreateFollowUpConsultation = (parentId: number, body: Record<string, unknown>) =>
    axiosInstance.post<API.Case>(`${CASES_BASE}${parentId}/follow-ups/`, body);

export const apiRetryConsultationEmail = (id: number) =>
    axiosInstance.post<{ success: boolean; emailConfirmation?: API.Case['emailConfirmation'] }>(
      `${CASES_BASE}${id}/send-confirmation/`,
      {}
    );

export const apiGetCaseAttachments = (id: number) =>
    axiosInstance.get<API.CaseAttachment[]>(`${CASES_BASE}${id}/attachments/`);

export const apiUploadCaseAttachment = (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosInstance.post<API.CaseAttachment>(`${CASES_BASE}${id}/attachments/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const apiDeleteCaseAttachment = (caseId: number, attachmentId: number) =>
    axiosInstance.delete(`${CASES_BASE}${caseId}/attachments/${attachmentId}/`);

