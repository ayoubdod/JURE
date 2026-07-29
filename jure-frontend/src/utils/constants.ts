import { API_ORIGIN } from '@/config/api';

export type Option = {
    label:string;
    value:string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

export class Languages {
    static readonly FR = 'fr';
    static readonly EN = 'en';
    static readonly AR = 'ar';

    static readonly options: Option[] = [
        { label: 'French', value: Languages.FR, country: 'FR' },
        { label: 'English', value: Languages.EN, country: 'US' },
        { label: 'Arabic', value: Languages.AR, country: 'MA' },
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

    static getLabel(value: string): string {
        return this.options.find(option => option.value === value)?.label || '';
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
        return this.options.find(option => option.value === value)?.label || '';
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
    return this.options.find(option => option.value === value)?.label || '';
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
    { label: 'Done', value: TaskStatus.DONE },
    { label: 'Cancelled', value: TaskStatus.CANCELLED },
  ];

  static getLabel(value: string): string {
    return this.options.find(option => option.value === value)?.label || '';
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
        return this.options.find(option => option.value === value)?.label || '';
    }
}

export class DocumentCategory {
    static readonly LAW = 'law';
    static readonly TEMPLATES = 'templates';
    static readonly CONTRACTS = 'contracts';
    static readonly RESEARCH = 'research';
    static readonly LEGAL_FORMS = 'legal_forms';
    static readonly TRAINING = 'training';
    static readonly EVIDENCE = 'evidence';

    static readonly options: Option[] = [
        { label: 'Law', value: DocumentCategory.LAW },
        { label: 'Templates', value: DocumentCategory.TEMPLATES },
        { label: 'Contracts', value: DocumentCategory.CONTRACTS },
        { label: 'Research', value: DocumentCategory.RESEARCH },
        { label: 'Legal Forms', value: DocumentCategory.LEGAL_FORMS },
        { label: 'Training', value: DocumentCategory.TRAINING },
        { label: 'Evidence', value: DocumentCategory.EVIDENCE },
    ];

    static getLabel(value: string): string {
        return this.options.find(option => option.value === value)?.label || '';
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
export const COMPANY_EMAIL = import.meta.env.NEXT_PUBLIC_COMPANY_EMAIL || "contact@casavalley.ma";
export const COMPANY_ADDRESS = import.meta.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Casablanca, Maroc Lotissement Zoubeir, Avenue Mostafa salmane N° 235 E El Oulfa";

/** Same host as Django; use for media URLs and absolute file paths (not under /api/v1). */
export const BACKEND_BASE_URL = API_ORIGIN;