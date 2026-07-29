import { AxiosError } from 'axios';

/** Maps backend field names to form field names for display */
const BACKEND_TO_FORM: Record<string, string> = {
  caseType: 'case_type',
  case_specific_data: 'case_specific_data',
  assigned_to_id: 'assigned_to',
  consultationType: 'consultation_type',
  legalDomain: 'legal_domain',
  consultationDate: 'consultation_date',
  legalQuestion: 'legal_question',
  adviceSummary: 'advice_summary',
  followUpRequired: 'follow_up_required',
  followUpDate: 'follow_up_date',
  litigationType: 'litigation_type',
  clientRole: 'client_role',
  opposingParty: 'opposing_party_name',
  opposingCounsel: 'opposing_counsel',
  thirdParties: 'third_parties',
  courtName: 'court_name',
  chamber: 'chamber_division',
  judgeName: 'judge_name',
  courtCaseNumber: 'court_case_number',
  coCounsel: 'co_counsel',
  filingDate: 'filing_date',
  firstHearingDate: 'first_hearing_date',
  nextHearingDate: 'next_hearing_date',
  statuteOfLimitationsDate: 'statute_of_limitations_date',
  keyDeadlines: 'key_deadlines',
  legalArguments: 'legal_arguments',
  dutyType: 'duty_type',
  institution: 'institution_authority',
  institutionRefNumber: 'institution_reference_number',
  startDate: 'start_date',
  dueDate: 'due_date',
  completionDate: 'completion_date',
  requiredDocuments: 'required_documents',
};

function extractMessage(v: unknown): string | undefined {
  if (Array.isArray(v) && v[0]) return String(v[0]);
  if (typeof v === 'string') return v;
  return undefined;
}

/**
 * Extracts validation errors from 400 response and maps backend keys to form field names.
 * Handles nested case_specific_data errors.
 */
export function getCaseValidationErrors(error: AxiosError): Record<string, string> {
  if (error.response?.status !== 400 || typeof error.response?.data !== 'object') {
    return {};
  }
  const data = error.response.data as Record<string, unknown>;
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    const msg = extractMessage(value);
    if (!msg) continue;

    if (key === 'case_specific_data') {
      if (Array.isArray(value) && value[0]) {
        result['case_specific_data'] = String(value[0]);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = value as Record<string, unknown>;
        for (const [nestedKey, nestedVal] of Object.entries(nested)) {
          const nestedMsg = extractMessage(nestedVal);
          const formKey = BACKEND_TO_FORM[nestedKey] ?? nestedKey;
          if (nestedMsg) result[formKey] = nestedMsg;
        }
      }
    } else {
      const formKey = BACKEND_TO_FORM[key] ?? key;
      result[formKey] = msg;
    }
  }
  return result;
}
