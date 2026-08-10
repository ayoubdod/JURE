import axiosInstance from "@/utils/axiosInstance";

export type LegalDomain = {
  value: string;
  label: string;
  available: boolean;
  message: string;
};

export type DeadlineRule = {
  id: number;
  code: string;
  name: string;
  jurisdiction: string;
  legal_domain: string;
  legal_domain_label: string;
  procedure_type: string;
  procedure_type_label: string;
  event_type: string;
  event_type_label: string;
  duration_value: number;
  duration_unit: string;
  computation_method: string;
  computation_method_label: string;
  article_reference: string;
  version: string;
  effective_from: string;
  effective_until: string | null;
  verification_status: string;
  notes: string;
  special_conditions: string;
  source?: {
    id: number;
    law_number: string;
    title: string;
    official_reference: string;
  } | null;
};

export type CalculationExplanation = {
  starting_event_date: string;
  starting_event_type: string;
  applicable_rule: string;
  rule_code: string;
  rule_version: string;
  legal_duration: string;
  computation_method: string;
  computation_method_label: string;
  non_working_day_adjustment: {
    original: string;
    adjusted_to: string;
    reason: string;
  } | null;
  final_deadline: string;
  legal_source: string | null;
  article_reference: string;
  uncertainty?: boolean;
  uncertainty_message?: string | null;
  disclaimer: string;
  special_conditions?: string | null;
};

export type CalculateResponse = {
  rule: DeadlineRule;
  calculated_deadline: string;
  explanation: CalculationExplanation;
};

export type CalculatedDeadline = {
  id: number;
  case: number;
  case_title: string;
  case_reference: string;
  triggering_event_type: string;
  triggering_date: string;
  calculated_deadline: string;
  final_deadline: string;
  is_manual_override: boolean;
  original_calculated_deadline: string | null;
  override_reason: string;
  status: string;
  calculation_explanation: CalculationExplanation;
  notes: string;
  linked_task: number | null;
  rule: DeadlineRule;
  reminders: { id: number; days_before: number }[];
  created: string;
};

export const apiGetLegalDomains = () =>
  axiosInstance.get<LegalDomain[]>("/legal-deadlines/domains/");

export const apiGetDeadlineRules = (params?: { domain?: string; as_of?: string }) =>
  axiosInstance.get<DeadlineRule[]>("/legal-deadlines/rules/", { params });

export const apiCalculateDeadline = (data: {
  rule_id?: number;
  legal_domain?: string;
  procedure_type?: string;
  event_type?: string;
  triggering_date: string;
  contextual_parameters?: Record<string, unknown>;
}) => axiosInstance.post<CalculateResponse>("/legal-deadlines/calculate/", data);

export const apiSaveLegalDeadline = (data: {
  case: number;
  rule_id?: number;
  legal_domain?: string;
  procedure_type?: string;
  event_type?: string;
  triggering_date: string;
  notes?: string;
  manual_deadline?: string | null;
  override_reason?: string;
  reminder_offsets?: number[];
  contextual_parameters?: Record<string, unknown>;
}) => axiosInstance.post<CalculatedDeadline>("/legal-deadlines/deadlines/", data);

export const apiGetLegalDeadlines = (params?: { case?: number; status?: string }) =>
  axiosInstance.get<API.Paginated<CalculatedDeadline> | CalculatedDeadline[]>(
    "/legal-deadlines/deadlines/",
    { params }
  );

export const apiCreateTaskFromDeadline = (
  id: number,
  data?: { title?: string; description?: string; assigned_to?: number | null; priority?: string }
) => axiosInstance.post(`/legal-deadlines/deadlines/${id}/create-task/`, data || {});

export const apiUpdateLegalDeadline = (
  id: number,
  data: Partial<{
    notes: string;
    status: string;
    manual_deadline: string;
    override_reason: string;
    reminder_offsets: number[];
  }>
) => axiosInstance.patch<CalculatedDeadline>(`/legal-deadlines/deadlines/${id}/`, data);
