import axiosInstance from '@/utils/axiosInstance';

const BASE = '/privacy/';

export type CabinetPrivacyPolicy = {
  default_mode: 'STANDARD' | 'PSEUDONYMIZED' | 'PRIVATE';
  require_pseudonymization_for_documents: boolean;
  reidentification_requires_authorization: boolean;
  created?: string;
  modified?: string;
};

export async function apiPrivacyGetPolicy() {
  const { data } = await axiosInstance.get<CabinetPrivacyPolicy>(`${BASE}policies/`);
  return data;
}

export async function apiPrivacyPatchPolicy(body: Partial<CabinetPrivacyPolicy>) {
  const { data } = await axiosInstance.patch<CabinetPrivacyPolicy>(`${BASE}policies/`, body);
  return data;
}

export async function apiPrivacyReidentify(sessionId: string, text: string) {
  const { data } = await axiosInstance.post<{ session_id: string; text: string }>(
    `${BASE}reidentify/`,
    { session_id: sessionId, text }
  );
  return data;
}
