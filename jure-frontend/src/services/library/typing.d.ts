declare namespace API {
    type DocumentCategory =
        | 'legislation_regulations'
        | 'case_law_jurisprudence'
        | 'contracts_agreements'
        | 'pleadings_proceedings'
        | 'forms_templates'
        | 'legal_research_opinions'
        | 'corporate_governance'
        | 'compliance_policies'
        | 'evidence_case_materials'
        | 'training_knowledge';

    type LegalArea =
        | 'corporate_commercial'
        | 'ma_private_equity'
        | 'contracts'
        | 'litigation_dispute_resolution'
        | 'employment_hr'
        | 'tax'
        | 'regulatory_compliance'
        | 'corporate_governance'
        | 'real_estate_construction'
        | 'banking_finance'
        | 'ip_technology_data'
        | 'public_administrative';

    type Document = {
        id: number;
        title: string;
        category: DocumentCategory | string;
        tags: string[]; // Array of tag slugs
        description: string | null;
        file: string; // File URL or path
        size: number; // File size in bytes
        is_shared?: boolean;
        status?: 'published' | 'archived' | string;
        created_by?: number | null;
        created_by_name?: string | null;
        updated_by?: number | null;
        updated_by_name?: string | null;
        created: string; // ISO date string
        modified: string; // ISO date string
    }

    type DocumentCreateForm = {
        title: string;
        category: DocumentCategory;
        tags: string[];
        description: string | null;
        file: File;
    }

    type DocumentCreateFormRemoteValidation = {
        [key in keyof DocumentCreateForm]: string | undefined;
    }

    type DocumentUpdateForm = {
        id: number;
        title?: string;
        category?: DocumentCategory;
        tags?: string[];
        description?: string | null;
        file?: File;
        status?: 'published' | 'archived';
    }

    type DocumentUpdateFormRemoteValidation = {
        [key in keyof DocumentUpdateForm]: string | undefined;
    }

}
