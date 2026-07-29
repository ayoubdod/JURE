declare namespace API {
    type DocumentCategory = 'law' | 'templates' | 'contracts' | 'research' | 'legal_forms' | 'training' | 'evidence';
    type Document = {
        id: number;
        title: string;
        category: DocumentCategory;
        tags: string[]; // Array of tag slugs
        description: string | null;
        file: string; // File URL or path
        size: number; // File size in bytes
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
    }

    type DocumentUpdateFormRemoteValidation = {
        [key in keyof DocumentUpdateForm]: string | undefined;
    }

}