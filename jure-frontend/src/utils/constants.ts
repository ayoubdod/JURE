import { API_ORIGIN } from '@/config/api';
import { translateEnum } from '@/i18n/enums';
import { detectInitialLanguage } from '@/i18n/locale';
import { normalizeDocumentCategory } from '@/lib/libraryTaxonomy';

export type Option = {
    label: string;
    value: string;
    country?: string;
    nativeLabel?: string;
}

export class Languages {
    static readonly FR = 'fr';
    static readonly EN = 'en';
    static readonly AR = 'ar';

    /** Native endonyms — keep labels language-neutral for the switcher. */
    static readonly options: Option[] = [
        { label: 'Français', value: Languages.FR, country: 'FR', nativeLabel: 'Français' },
        { label: 'English', value: Languages.EN, country: 'US', nativeLabel: 'English' },
        { label: 'العربية', value: Languages.AR, country: 'MA', nativeLabel: 'العربية' },
    ];

    static getLabel(value: string): string {
        return this.options.find(option => option.value === value)?.label || '';
    }

    static getCountry(value: string): string {
        return this.options.find(option => option.value === value)?.country || '';
    }
}

export class CaseStatus {
    static readonly OPEN = 'OPEN';
    static readonly CLOSED = 'CLOSED';
    static readonly IN_PROGRESS = 'IN_PROGRESS';
    static readonly CANCELLED = 'CANCELLED';
    static readonly PENDING = 'PENDING';
    static readonly ARCHIVED = 'ARCHIVED';
    static readonly CONVERTED_TO_CASE = 'CONVERTED_TO_CASE';

    static readonly options: Option[] = [
        { label: 'OPEN', value: CaseStatus.OPEN },
        { label: 'CLOSED', value: CaseStatus.CLOSED },
        { label: 'IN_PROGRESS', value: CaseStatus.IN_PROGRESS },
        { label: 'CANCELLED', value: CaseStatus.CANCELLED },
        { label: 'PENDING', value: CaseStatus.PENDING },
        { label: 'ARCHIVED', value: CaseStatus.ARCHIVED },
        { label: 'CONVERTED TO CASE', value: CaseStatus.CONVERTED_TO_CASE },
    ];

    /** Presentation label — stable IDs stay in `value`; never store the result. */
    static getLabel(value: string): string {
        return translateEnum(detectInitialLanguage(), 'caseStatus', value) || value;
    }
}

export class CaseCategory {
    static readonly CRIMINAL = 'CRIMINAL';
    static readonly CIVIL = 'CIVIL';
    static readonly ECONOMIC = 'ECONOMIC';
    static readonly ENVIRONMENTAL = 'ENVIRONMENTAL';
    static readonly SOCIAL = 'SOCIAL';
    static readonly OTHER = 'OTHER';

    static readonly options: Option[] = [
        { label: 'CRIMINAL', value: CaseCategory.CRIMINAL },
        { label: 'CIVIL', value: CaseCategory.CIVIL },
        { label: 'ECONOMIC', value: CaseCategory.ECONOMIC },
        { label: 'ENVIRONMENTAL', value: CaseCategory.ENVIRONMENTAL },
        { label: 'SOCIAL', value: CaseCategory.SOCIAL },
        { label: 'OTHER', value: CaseCategory.OTHER },
    ];

    static getLabel(value: string): string {
        return translateEnum(detectInitialLanguage(), 'caseCategory', value) || value;
    }
}
export class TaskPriority {
  static readonly LOW = 'low';
  static readonly MEDIUM = 'medium';
  static readonly HIGH = 'high';

  static readonly options: Option[] = [
    { label: 'Low', value: TaskPriority.LOW },
    { label: 'Medium', value: TaskPriority.MEDIUM },
    { label: 'High', value: TaskPriority.HIGH },
  ];

  static getLabel(value: string): string {
    return translateEnum(detectInitialLanguage(), 'taskPriority', value) || value;
  }
}

export class TaskStatus {
  static readonly TODO = 'todo';
  static readonly IN_PROGRESS = 'in_progress';
  static readonly DONE = 'done';
  static readonly CANCELLED = 'cancelled';

  static readonly options: Option[] = [
    { label: 'To Do', value: TaskStatus.TODO },
    { label: 'In Progress', value: TaskStatus.IN_PROGRESS },
    { label: 'Completed', value: TaskStatus.DONE },
    { label: 'Cancelled', value: TaskStatus.CANCELLED },
  ];

  static getLabel(value: string): string {
    return translateEnum(detectInitialLanguage(), 'taskStatus', value) || value;
  }
}


export class AddressTypes {
    static readonly HOME = 'home';
    static readonly WORK = 'work';
    static readonly COMPANY = 'company';
    static readonly OTHER = 'other';

    static readonly options: Option[] = [
        { label: 'Home', value: AddressTypes.HOME },
        { label: 'Work', value: AddressTypes.WORK },
        { label: 'Company', value: AddressTypes.COMPANY },
        { label: 'Other', value: AddressTypes.OTHER },
    ];

    static getLabel(value: string): string {
        return translateEnum(detectInitialLanguage(), 'addressType', value) || value;
    }
}

export class DocumentCategory {
    static readonly LEGISLATION_REGULATIONS = 'legislation_regulations';
    static readonly CASE_LAW_JURISPRUDENCE = 'case_law_jurisprudence';
    static readonly CONTRACTS_AGREEMENTS = 'contracts_agreements';
    static readonly PLEADINGS_PROCEEDINGS = 'pleadings_proceedings';
    static readonly FORMS_TEMPLATES = 'forms_templates';
    static readonly LEGAL_RESEARCH_OPINIONS = 'legal_research_opinions';
    static readonly CORPORATE_GOVERNANCE = 'corporate_governance';
    static readonly COMPLIANCE_POLICIES = 'compliance_policies';
    static readonly EVIDENCE_CASE_MATERIALS = 'evidence_case_materials';
    static readonly TRAINING_KNOWLEDGE = 'training_knowledge';

    static readonly options: Option[] = [
        { label: 'Legislation & Regulations', value: DocumentCategory.LEGISLATION_REGULATIONS },
        { label: 'Case Law & Jurisprudence', value: DocumentCategory.CASE_LAW_JURISPRUDENCE },
        { label: 'Contracts & Agreements', value: DocumentCategory.CONTRACTS_AGREEMENTS },
        { label: 'Pleadings & Proceedings', value: DocumentCategory.PLEADINGS_PROCEEDINGS },
        { label: 'Forms & Templates', value: DocumentCategory.FORMS_TEMPLATES },
        { label: 'Legal Research & Opinions', value: DocumentCategory.LEGAL_RESEARCH_OPINIONS },
        { label: 'Corporate & Governance', value: DocumentCategory.CORPORATE_GOVERNANCE },
        { label: 'Compliance & Policies', value: DocumentCategory.COMPLIANCE_POLICIES },
        { label: 'Evidence & Case Materials', value: DocumentCategory.EVIDENCE_CASE_MATERIALS },
        { label: 'Training & Knowledge', value: DocumentCategory.TRAINING_KNOWLEDGE },
    ];

    static getLabel(value: string): string {
        const normalized = normalizeDocumentCategory(value) || value;
        return translateEnum(detectInitialLanguage(), 'documentCategory', normalized) || normalized;
    }
}

export class LegalArea {
    static readonly CORPORATE_COMMERCIAL = 'corporate_commercial';
    static readonly MA_PRIVATE_EQUITY = 'ma_private_equity';
    static readonly CONTRACTS = 'contracts';
    static readonly LITIGATION_DISPUTE_RESOLUTION = 'litigation_dispute_resolution';
    static readonly EMPLOYMENT_HR = 'employment_hr';
    static readonly TAX = 'tax';
    static readonly REGULATORY_COMPLIANCE = 'regulatory_compliance';
    static readonly CORPORATE_GOVERNANCE = 'corporate_governance';
    static readonly REAL_ESTATE_CONSTRUCTION = 'real_estate_construction';
    static readonly BANKING_FINANCE = 'banking_finance';
    static readonly IP_TECHNOLOGY_DATA = 'ip_technology_data';
    static readonly PUBLIC_ADMINISTRATIVE = 'public_administrative';

    static readonly options: Option[] = [
        { label: 'Corporate & Commercial', value: LegalArea.CORPORATE_COMMERCIAL },
        { label: 'M&A & Private Equity', value: LegalArea.MA_PRIVATE_EQUITY },
        { label: 'Contracts', value: LegalArea.CONTRACTS },
        { label: 'Litigation & Dispute Resolution', value: LegalArea.LITIGATION_DISPUTE_RESOLUTION },
        { label: 'Employment & HR', value: LegalArea.EMPLOYMENT_HR },
        { label: 'Tax', value: LegalArea.TAX },
        { label: 'Regulatory & Compliance', value: LegalArea.REGULATORY_COMPLIANCE },
        { label: 'Corporate Governance', value: LegalArea.CORPORATE_GOVERNANCE },
        { label: 'Real Estate & Construction', value: LegalArea.REAL_ESTATE_CONSTRUCTION },
        { label: 'Banking & Finance', value: LegalArea.BANKING_FINANCE },
        { label: 'Intellectual Property, Technology & Data', value: LegalArea.IP_TECHNOLOGY_DATA },
        { label: 'Public & Administrative', value: LegalArea.PUBLIC_ADMINISTRATIVE },
    ];

    static getLabel(value: string): string {
        return translateEnum(detectInitialLanguage(), 'documentLegalArea', value) || value;
    }
}

export class MessageAttachmentKind {
    static readonly IMAGE = 'image';
    static readonly VIDEO = 'video';
    static readonly AUDIO = 'audio';
    static readonly FILE = 'file';

    static readonly options: Option[] = [
        { label: 'Image', value: MessageAttachmentKind.IMAGE },
        { label: 'Video', value: MessageAttachmentKind.VIDEO },
        { label: 'Audio', value: MessageAttachmentKind.AUDIO },
        { label: 'File', value: MessageAttachmentKind.FILE },
    ];

    static getLabel(value: string): string {
        return this.options.find(option => option.value === value)?.label || '';
    }
}

export const COMPANY_NAME = import.meta.env.NEXT_PUBLIC_COMPANY_NAME || "Bativalley";
export const COMPANY_PHONE = import.meta.env.NEXT_PUBLIC_COMPANY_PHONE || "+212 661 000 000";
export const COMPANY_EMAIL = import.meta.env.NEXT_PUBLIC_COMPANY_EMAIL || "contact@jure.ma";
export const COMPANY_ADDRESS = import.meta.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Casablanca, Maroc Lotissement Zoubeir, Avenue Mostafa salmane N° 235 E El Oulfa";

/** Same host as Django; use for media URLs and absolute file paths (not under /api/v1). */
export const BACKEND_BASE_URL = API_ORIGIN;
