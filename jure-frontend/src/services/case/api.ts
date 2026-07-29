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
    /** Optional Django-style ordering, e.g. `-created` */
    ordering?: string;
};

export const apiGetCases = (params?: GetCasesParams) =>
    axiosInstance.get<API.Paginated<API.Case>>(CASES_BASE, { params });

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

