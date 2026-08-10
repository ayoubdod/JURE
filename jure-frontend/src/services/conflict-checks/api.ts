import axiosInstance from '@/utils/axiosInstance';

export type ConflictMatchType = 'EXACT' | 'HIGH' | 'POSSIBLE';

export type ConflictRole =
  | 'CLIENT'
  | 'FORMER_CLIENT'
  | 'OPPOSING_PARTY'
  | 'OPPOSING_COUNSEL'
  | 'THIRD_PARTY'
  | 'RELATED_PARTY'
  | 'PLAINTIFF'
  | 'DEFENDANT'
  | 'OTHER';

export type ConflictCheckStatus =
  | 'PENDING_REVIEW'
  | 'REVIEWED_NO_CONFLICT'
  | 'CONFLICT_IDENTIFIED'
  | 'WAIVER_REQUIRED'
  | 'DISMISSED';

export type PotentialMatchReviewStatus =
  | 'PENDING'
  | 'NO_CONFLICT'
  | 'CONFLICT'
  | 'WAIVER'
  | 'DISMISSED';

export type ConflictPotentialMatch = {
  id: number;
  entity_type: string;
  entity_id: number | null;
  entity_name: string;
  matter: number;
  matter_reference: string;
  matter_title: string;
  matter_status: string;
  role: ConflictRole | string;
  role_label: string;
  match_type: ConflictMatchType | string;
  match_type_label: string;
  confidence: number;
  match_reason: string;
  review_status: PotentialMatchReviewStatus | string;
  review_status_label: string;
  notes: string;
};

export type ConflictCheckResult = {
  id: number;
  search_query: string;
  result_count: number;
  status: ConflictCheckStatus | string;
  status_label: string;
  notes: string;
  matter: number | null;
  matter_reference: string | null;
  initiated_by: number | null;
  initiated_by_name: string | null;
  matches: ConflictPotentialMatch[];
  exact_matches: ConflictPotentialMatch[];
  potential_matches: ConflictPotentialMatch[];
  disclaimer: string;
  created: string;
};

export type ConflictSearchPayload = {
  query: string;
  matter_id?: number | null;
  exclude_matter_id?: number | null;
};

const BASE = '/conflict-checks';

export const apiRunConflictCheck = (payload: ConflictSearchPayload, signal?: AbortSignal) =>
  axiosInstance.post<ConflictCheckResult>(`${BASE}/search/`, payload, { signal });

export const apiGetConflictCheck = (id: number) =>
  axiosInstance.get<ConflictCheckResult>(`${BASE}/${id}/`);

export const apiReviewConflictCheck = (
  id: number,
  data: { status: ConflictCheckStatus; notes?: string }
) => axiosInstance.patch<ConflictCheckResult>(`${BASE}/${id}/review/`, data);

export const apiReviewPotentialMatch = (
  checkId: number,
  matchId: number,
  data: { review_status: PotentialMatchReviewStatus; notes?: string }
) =>
  axiosInstance.patch<ConflictPotentialMatch>(
    `${BASE}/${checkId}/matches/${matchId}/review/`,
    data
  );
