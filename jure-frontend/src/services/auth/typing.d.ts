declare namespace API {
    type User = {
        id:number;
        email: string
        first_name: string
        last_name: string
        phone: string
        bio: string
        image?: string
        trade_name?: string
        firm_name?: string
        logo?: string
        /** Timestamp when logo was last updated; used for cache-busting display */
        logo_version?: number
        structure_type?: string
        practice_type?: string
        cabinet_id?: number | null
        jurisdiction?: {
            id: number
            code: string
            name: string
            country_code: string
            legal_system: string
            default_language: string
            status: string
        } | null
        business_address?: string
        team_size?: string
        website?: string
    }

    type UserUpdateForm = {
        email?: string
        first_name?: string
        last_name?: string
        phone?: string
        bio?: string
    }

    type UserUpdateFormRemoteValidation = {
        [KEY in keyof UserUpdateForm]?: string
    }

    type CabinetUpdateForm = {
        trade_name?: string
        firm_name?: string
        logo?: File
        structure_type?: string
        business_address?: string
        team_size?: string
        website?: string
    }

    type CabinetUpdateFormRemoteValidation = {
        [KEY in keyof CabinetUpdateForm]?: string
    }

    /** Response from PATCH /api/v1/cabinets/me/ */
    type CabinetUpdateResponse = {
        logo?: string
        trade_name?: string
        firm_name?: string
        structure_type?: string
        business_address?: string
        team_size?: string | number
        website?: string
    }

    type ChangePasswordForm = {
        old_password: string
        new_password1: string
        new_password2: string
    }

    type ChangePasswordFormRemoteValidation = {
        [KEY in keyof ChangePasswordForm]?: string
    }

    type UserRegisterForm = {
        // Personal Info - Step 1
        first_name: string
        last_name: string
        country: string
        phone: string
        email: string
        password1: string
        password2: string

        // Profile - Step 4
        trade_name: string
        logo?: File
        business_address: string

        // Workspace
        practice_type: string
        jurisdiction: string

        // Organisation Details - Step 4
        team_size: string
        website?: string

        // Consent - Step 5
        accept_terms: boolean
        accept_data_processing: boolean
    }

    type ResetPasswordForm = {
        email: string
    }

    type ResetPasswordConfirmForm = {
        new_password1: string
        new_password2: string
        token: string
        uuid: string
    }
}