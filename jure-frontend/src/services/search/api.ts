import axiosInstance from '@/utils/axiosInstance';

/** Query param for GET /search/shareable/ */
export type ShareableApiType = 'all' | 'case' | 'task' | 'appointment';

export type ShareableSearchCaseHit = {
  id: number;
  reference?: string;
  title?: string;
  status?: string;
  caseType?: string;
  priority?: string | null;
};

export type ShareableSearchTaskHit = {
  id: number;
  title?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  relatedCase?: { reference?: string; title?: string } | null;
};

export type ShareableSearchAppointmentHit = {
  id: number;
  title?: string;
  status?: string;
  date?: string;
  duration?: number | null;
  relatedCase?: { reference?: string; title?: string } | null;
};

export type ShareableSearchResponse = {
  cases: ShareableSearchCaseHit[];
  tasks: ShareableSearchTaskHit[];
  appointments: ShareableSearchAppointmentHit[];
};

export const apiSearchShareable = (q: string, type: ShareableApiType, signal?: AbortSignal) =>
  axiosInstance.get<ShareableSearchResponse>('/search/shareable/', { params: { q, type }, signal });
