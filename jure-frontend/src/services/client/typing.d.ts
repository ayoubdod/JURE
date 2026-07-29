

declare namespace API {

    type ClientCase = {
        reference: string;
        title: string;
        category: CaseCategory;
        status: CaseStatus;
    };

    type Client = {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        date_joined: string;
        address: string; 
        is_active: boolean;
        cases_count: number;
        cases: ClientCase[];
        /** ICE (Morocco B2B) */
        ice?: string | null;
        /** Identifiant fiscal (IF) — backend field may be `if` */
        fiscal_if?: string | null;
    };

    type ClientCreateForm = {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        address: string;
        ice?: string;
        fiscal_if?: string;
    };

    type ClientFormCreateValidation = {
        [KEY in keyof ClientCreateForm]?: string;
    };

    type ClientUpdateForm = {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        address?: string;
        ice?: string;
        fiscal_if?: string;
    };

    type ClientFormUpdateValidation = {
        [KEY in keyof ClientUpdateForm]?: string;
    };

}
