/**
 * Transforms form data to backend API format.
 * - toLegacyCaseCreatePayload: for existing backend (category, status, court, assigned_to, etc.)
 * - toBackendCaseCreatePayload: for new backend (caseType + case_specific_data)
 */

/** Backend case type - ADMINISTRATIVE not ADMINISTRATIVE_DUTY */
export type BackendCaseType = 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE';

/**
 * Maps type-specific form data to legacy API.CaseCreateForm format.
 * Use when backend does not yet support caseType/case_specific_data.
 */
export function toLegacyCaseCreatePayload(
  data: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): API.CaseCreateForm {
  const category = getCategory(data) as API.CaseCategory;
  const status = getBaseStatus(data) as API.CaseStatus;
  const assignedToId = getAssignedToId(data);
  return {
    title: data.title,
    description: getDescription(data),
    court: getCourt(data),
    reference: data.reference || '',
    summary: getSummary(data),
    status,
    category,
    assigned_to: assignedToId ?? undefined,
    client: data.client ?? undefined,
  };
}

export function toLegacyCaseUpdatePayload(
  data: (API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData) & { id: number }
): API.CaseUpdateForm {
  const base = toLegacyCaseCreatePayload(data);
  return { ...base, id: data.id };
}

function getSummary(
  d: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): string {
  if ('advice_summary' in d && (d as API.ConsultationFormData).advice_summary)
    return (d as API.ConsultationFormData).advice_summary;
  if ('legal_arguments' in d && (d as API.LitigationFormData).legal_arguments)
    return ((d as API.LitigationFormData).legal_arguments ?? '').slice(0, 200);
  return '';
}

export function toBackendCaseCreatePayload(
  data: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): Record<string, unknown> {
  const caseType = data.case_type === 'ADMINISTRATIVE_DUTY' ? 'ADMINISTRATIVE' : data.case_type;
  const assignedId = getAssignedToId(data);
  const base: Record<string, unknown> = {
    title: data.title,
    description: getDescription(data),
    court: getCourt(data),
    reference: data.reference || undefined,
    summary: '',
    status: getBaseStatus(data),
    category: getCategory(data),
    client: data.client ?? null,
    assigned_to_id: assignedId,
    caseType,
    case_type: caseType, // backend may expect snake_case
  };
  if (assignedId != null) base.assigned_to = assignedId;

  base.case_specific_data = buildCaseSpecificData(data);
  return base;
}

export function toBackendCaseUpdatePayload(
  data: (API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData) & {
    id: number;
  }
): Record<string, unknown> {
  const payload = toBackendCaseCreatePayload(data);
  (payload as Record<string, unknown>).id = data.id;
  return payload;
}

function getDescription(
  d: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): string {
  if ('description' in d && typeof d.description === 'string') return d.description;
  if ('legal_question' in d) return (d as API.ConsultationFormData).legal_question || '';
  return '';
}

function getCourt(
  d: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): string {
  if ('court_name' in d) return (d as API.LitigationFormData).court_name || 'N/A';
  return 'N/A';
}

function getBaseStatus(
  d: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): string {
  if (d.case_type === 'CONSULTATION') {
    const outcome = (d as API.ConsultationFormData).status;
    const map: Record<string, string> = {
      SCHEDULED: 'OPEN',
      COMPLETED: 'CLOSED',
      NO_SHOW: 'CANCELLED',
      /** Must match API.CaseStatus — convert endpoint checks source case status */
      CONVERTED_TO_CASE: 'CONVERTED_TO_CASE',
    };
    return map[outcome] ?? 'OPEN';
  }
  if (d.case_type === 'ADMINISTRATIVE_DUTY') {
    const s = (d as API.AdministrativeDutyFormData).status;
    const map: Record<string, string> = {
      PENDING: 'PENDING',
      IN_PROGRESS: 'IN_PROGRESS',
      SUBMITTED: 'IN_PROGRESS',
      APPROVED: 'CLOSED',
      REJECTED: 'CANCELLED',
      CLOSED: 'CLOSED',
    };
    return map[s] ?? 'OPEN';
  }
  return (d as API.LitigationFormData).status;
}

/** Map type-specific category to legacy API.CaseCategory */
const LEGAL_DOMAIN_TO_CATEGORY: Record<string, API.CaseCategory> = {
  FAMILY: 'SOCIAL',
  CRIMINAL: 'CRIMINAL',
  CORPORATE: 'ECONOMIC',
  LABOR: 'SOCIAL',
  REAL_ESTATE: 'ECONOMIC',
  OTHER: 'OTHER',
};
const LITIGATION_TYPE_TO_CATEGORY: Record<string, API.CaseCategory> = {
  CIVIL: 'CIVIL',
  CRIMINAL: 'CRIMINAL',
  COMMERCIAL: 'ECONOMIC',
  ADMINISTRATIVE: 'OTHER',
  LABOR: 'OTHER',
  FAMILY: 'SOCIAL',
};

function getCategory(
  d: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): API.CaseCategory {
  if (d.case_type === 'CONSULTATION')
    return LEGAL_DOMAIN_TO_CATEGORY[(d as API.ConsultationFormData).legal_domain] ?? 'OTHER';
  if (d.case_type === 'LITIGATION')
    return LITIGATION_TYPE_TO_CATEGORY[(d as API.LitigationFormData).litigation_type] ?? 'OTHER';
  return 'OTHER';
}

function getAssignedToId(
  d: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): number | null {
  const id = d.assigned_to ?? (d as API.LitigationFormData).lead_attorney;
  return id != null ? Number(id) : null;
}

function buildCaseSpecificData(
  d: API.ConsultationFormData | API.LitigationFormData | API.AdministrativeDutyFormData
): Record<string, unknown> {
  if (d.case_type === 'CONSULTATION') {
    const c = d as API.ConsultationFormData;
    return {
      consultationType: c.consultation_type,
      legalDomain: c.legal_domain,
      consultationDate: c.consultation_date,
      duration: c.duration,
      format: c.format,
      legalQuestion: c.legal_question,
      adviceSummary: c.advice_summary ?? '',
      followUpRequired: c.follow_up_required ?? false,
      followUpDate: c.follow_up_required ? (c.follow_up_date ?? null) : null,
      outcome: c.status,
    };
  }
  if (d.case_type === 'LITIGATION') {
    const l = d as API.LitigationFormData;
    return {
      litigationType: l.litigation_type,
      clientRole: l.client_role ?? undefined,
      opposingParty: l.opposing_party_name ?? '',
      opposingCounsel: l.opposing_counsel ?? '',
      thirdParties: l.third_parties ?? [],
      courtName: l.court_name,
      jurisdiction: l.jurisdiction ?? '',
      chamber: l.chamber_division ?? '',
      judgeName: l.judge_name ?? '',
      courtCaseNumber: l.court_case_number ?? '',
      coCounsel: Array.isArray(l.co_counsel) ? l.co_counsel : [],
      filingDate: l.filing_date ?? null,
      firstHearingDate: l.first_hearing_date ?? null,
      nextHearingDate: l.next_hearing_date ?? null,
      statuteOfLimitationsDate: l.statute_of_limitations_date ?? null,
      keyDeadlines: l.key_deadlines ?? [],
      legalArguments: l.legal_arguments ?? '',
      priority: l.priority,
    };
  }
  if (d.case_type === 'ADMINISTRATIVE_DUTY') {
    const a = d as API.AdministrativeDutyFormData;
    return {
      dutyType: a.duty_type,
      institution: a.institution_authority ?? '',
      institutionRefNumber: a.institution_reference_number ?? '',
      startDate: a.start_date,
      dueDate: a.due_date,
      completionDate: a.completion_date ?? null,
      requiredDocuments: a.required_documents ?? [],
      priority: a.priority,
    };
  }
  return {};
}
