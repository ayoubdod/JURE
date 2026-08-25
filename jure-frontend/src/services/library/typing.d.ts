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

    type LibraryScope = 'PERSONAL' | 'LOCAL' | 'INTERNATIONAL';
    type LibraryTab = 'my' | 'local' | 'international';
    type LibraryResourceType =
        | 'law'
        | 'code'
        | 'regulation'
        | 'decree'
        | 'circular'
        | 'case_law'
        | 'court_decision'
        | 'administrative_decision'
        | 'treaty'
        | 'convention'
        | 'directive'
        | 'legal_commentary'
        | 'legal_article'
        | 'legal_guide'
        | 'template'
        | 'legal_form'
        | 'report'
        | 'research_paper'
        | 'regulatory_update'
        | 'other';

    type Document = {
        id: number;
        resource_uid?: string;
        title: string;
        category: DocumentCategory | string;
        resource_type?: LibraryResourceType | string;
        legal_area?: string | null;
        tags: string[];
        description: string | null;
        file: string | null;
        external_url?: string | null;
        size: number;
        is_shared?: boolean;
        visibility_scope?: 'GLOBAL' | 'JURISDICTION' | 'CABINET' | string;
        scope?: LibraryScope | string;
        jurisdiction?: number | null;
        jurisdiction_code?: string | null;
        jurisdiction_name?: string | null;
        country?: string | null;
        language?: string | null;
        source?: string | null;
        author?: string | null;
        issuing_authority?: string | null;
        publication_date?: string | null;
        effective_date?: string | null;
        reference_number?: string | null;
        keywords?: string | null;
        status?: 'published' | 'archived' | string;
        created_by?: number | null;
        created_by_name?: string | null;
        updated_by?: number | null;
        updated_by_name?: string | null;
        created: string;
        created_at?: string | null;
        modified: string;
        is_recent?: boolean;
        days_since_added?: number | null;
        days_remaining_as_new?: number;
        is_favorited?: boolean;
        is_in_my_library?: boolean;
        is_owned?: boolean;
        source_library?: string | null;
    }

    type LibraryListResponse = {
        results: Document[];
        recent?: Document[];
        recent_window_days?: number;
        count: number;
        last_page?: number;
        page?: number;
        page_size?: number;
    }

    type DocumentCreateForm = {
        title: string;
        category: DocumentCategory;
        resource_type?: LibraryResourceType | string;
        legal_area?: string;
        tags: string[];
        description: string | null;
        file?: File | null;
        external_url?: string;
        language?: string;
        country?: string;
        author?: string;
        issuing_authority?: string;
        source?: string;
        reference_number?: string;
        keywords?: string;
        publication_date?: string;
        effective_date?: string;
        jurisdiction?: number | string;
    }

    type DocumentCreateFormRemoteValidation = {
        [key in keyof DocumentCreateForm]: string | undefined;
    }

    type DocumentUpdateForm = {
        id: number;
        title?: string;
        category?: DocumentCategory;
        resource_type?: LibraryResourceType | string;
        tags?: string[];
        description?: string | null;
        file?: File;
        status?: 'published' | 'archived';
        language?: string;
        country?: string;
        author?: string;
        source?: string;
    }

    type DocumentUpdateFormRemoteValidation = {
        [key in keyof DocumentUpdateForm]: string | undefined;
    }

}
