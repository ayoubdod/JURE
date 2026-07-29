declare namespace API {
    type CaseStatus =
      | 'OPEN'
      | 'CLOSED'
      | 'IN_PROGRESS'
      | 'CANCELLED'
      | 'PENDING'
      | 'ARCHIVED'
      | 'CONVERTED_TO_CASE';
  
    type CaseCategory =
      | 'CRIMINAL'
      | 'CIVIL'
      | 'ECONOMIC'
      | 'ENVIRONMENTAL'
      | 'SOCIAL'
      | 'OTHER';

    /** Case type for 3-step flow: Consultation, Litigation, Administrative Duty */
    type CaseType = 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE_DUTY';

    /** Minimal case info for conversion / origin links (GET nested objects) */
    type CaseLinkSummary = {
      id: number;
      reference?: string;
      title?: string;
      caseType?: string;
      case_type?: string;
      status?: string;
      client?: User | null;
    };

    /** Optional aggregates from GET /cases and GET /cases/:id */
    type CaseRelatedCounts = {
      tasks?: number;
      appointments?: number;
    };

    type CaseRelatedPayload = {
      tasks?: API.Task[] | null;
      appointments?: import('../appointment/api').Appointment[] | null;
    };

    type Case = {
      id: number;
      /** Task / appointment counts (when provided by API) */
      _counts?: CaseRelatedCounts | null;
      /** Embedded related tasks and appointments (detail endpoint) */
      _related?: CaseRelatedPayload | null;
      /** Backend returns caseType (camelCase); we also support case_type for compatibility */
      caseType?: 'CONSULTATION' | 'LITIGATION' | 'ADMINISTRATIVE';
      case_type?: CaseType | null;
      case_specific_data?: Record<string, unknown>;
      category: CaseCategory;
      status: CaseStatus;
      summary: string;
      description: string;
      reference: string;
      title: string;
      court: string;
      cabinet: string;          // keep as you have it
      assigned_to?: API.User | null;  // <-- was required; make it optional/nullable
      client?: API.User | null;       // unchanged, but allow null for safety
      created_by?: API.User | null;
      created: string; // ISO datetime
      /** When the backend sends audit fields (snake_case or camelCase) */
      updated_at?: string | null;
      updated_by?: API.User | null;
      /** On CONSULTATION: derived case after conversion */
      convertedToCase?: CaseLinkSummary | null;
      converted_to_case?: CaseLinkSummary | null;
      /** On LITIGATION / ADMINISTRATIVE: source consultation when created via conversion */
      convertedFromCase?: CaseLinkSummary | null;
      converted_from_case?: CaseLinkSummary | null;
      [key: string]: unknown;         // Allow variant-specific fields
    };

    /** POST /cases/:id/convert/ success body (201) */
    type ConvertCaseResponse = {
      success: boolean;
      newCase: Case;
      originalConsultation: Case;
    };

    /** Base fields shared across all case types */
    type CaseCreateFormBase = {
      reference: string;
      title: string;
      assigned_to?: number | null;
      client?: number | null;
    };

    type CaseCreateForm = {
      category: CaseCategory;
      status: CaseStatus;
      summary: string;
      description: string;
      reference: string;
      title: string;
      court: string;
      assigned_to?: number; // you already had it optional – good
      client?: number | null; // Client assignment
    };

    /** Consultation case form fields */
    type ConsultationFormData = CaseCreateFormBase & {
      case_type: 'CONSULTATION';
      consultation_type: 'INITIAL' | 'FOLLOW_UP' | 'URGENT';
      consultation_date: string;   // ISO datetime
      duration: '30min' | '1h' | '2h' | 'CUSTOM';
      format: 'IN_PERSON' | 'PHONE' | 'VIDEO';
      legal_domain: 'FAMILY' | 'CRIMINAL' | 'CORPORATE' | 'LABOR' | 'REAL_ESTATE' | 'OTHER';
      legal_question: string;
      status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CONVERTED_TO_CASE';
      advice_summary?: string;
      follow_up_required?: boolean;
      follow_up_date?: string | null;
    };

    /** Litigation case form fields */
    type LitigationFormData = CaseCreateFormBase & {
      case_type: 'LITIGATION';
      litigation_type: 'CIVIL' | 'CRIMINAL' | 'COMMERCIAL' | 'ADMINISTRATIVE' | 'LABOR' | 'FAMILY';
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      client_role?: 'PLAINTIFF' | 'DEFENDANT' | null;
      opposing_party_name?: string;
      opposing_counsel?: string;
      third_parties?: string[];
      court_name: string;
      jurisdiction?: string;
      chamber_division?: string;
      judge_name?: string;
      court_case_number?: string;
      lead_attorney?: number | null;
      co_counsel?: number[];
      filing_date?: string | null;
      first_hearing_date?: string | null;
      next_hearing_date?: string | null;
      statute_of_limitations_date?: string | null;
      key_deadlines?: { label: string; date: string }[];
      description: string;
      legal_arguments?: string;
      status: 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'CLOSED' | 'ARCHIVED';
    };

    /** Administrative duty case form fields */
    type AdministrativeDutyFormData = CaseCreateFormBase & {
      case_type: 'ADMINISTRATIVE_DUTY';
      duty_type: 'CORPORATE_FILING' | 'PROPERTY_REGISTRATION' | 'NOTARIAL_ACT' | 'PERMIT' | 'COMPLIANCE' | 'INHERITANCE' | 'OTHER';
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      description: string;
      institution_authority?: string;
      institution_reference_number?: string;
      start_date: string;
      due_date: string;
      completion_date?: string | null;
      required_documents?: { label: string; completed: boolean }[];
      status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CLOSED';
    };

    /** Union for case create payload (variant by case_type) */
    type CaseCreatePayload = ConsultationFormData | LitigationFormData | AdministrativeDutyFormData;

    /** Union for case update payload (same as create + id) */
    type CaseUpdatePayload = (ConsultationFormData | LitigationFormData | AdministrativeDutyFormData) & { id: number };
  
    type CaseCreateFormRemoteValidation = {
      [KEY in keyof CaseCreateForm]?: string;
    };
  
    type CaseUpdateForm = {
      id: number;
      category: CaseCategory;
      status: CaseStatus;
      summary: string;
      description: string;
      reference: string;
      title: string;
      court: string;
      assigned_to?: number | null;
      client?: number | null; // Client assignment
    };
  
    type CaseUpdateFormRemoteValidation = {
      [KEY in keyof CaseUpdateForm]?: string;
    };
  }
  