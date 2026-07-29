declare namespace API {
    
    export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'LAWYER' | 'ASSISTANT' | 'VIEWER';

    export type Permission = 
        | 'cases.view'
        | 'cases.create'
        | 'cases.edit'
        | 'cases.delete'
        | 'clients.view'
        | 'clients.create'
        | 'clients.edit'
        | 'clients.delete'
        | 'team.view'
        | 'team.create'
        | 'team.edit'
        | 'team.delete'
        | 'team.manage_roles'
        | 'library.view'
        | 'library.create'
        | 'library.edit'
        | 'library.delete'
        | 'settings.view'
        | 'settings.edit'
        | 'conversations.view'
        | 'conversations.create'
        | 'conversations.edit'
        | 'conversations.delete'
        | 'tasks.view'
        | 'tasks.create'
        | 'tasks.edit'
        | 'tasks.delete';

    export type RolePermissions = {
        role: Role;
        permissions: Permission[];
    };

    export type CabinetMember = {
        id: number;
        first_name:string;
        last_name:string;
        email:string;
        phone:string;
        country?: string;
        user?: number | API.User;
        date_joined:string;
        is_active:boolean;
        assigned_in_progress_cases_count:number;
        assigned_open_cases_count?: number;
        assigned_cases_count?: number;
        address:string;
        role?: Role;
        permissions?: Permission[];
        assigned_cases?:API.Case[];
        documents?:API.Document[];
        /** True when invitation was sent but member has not completed setup */
        invitation_sent?: boolean;
    }

    export type CabinetMemberCreateForm = {
        first_name:string;
        last_name:string;
        email:string;
        phone:string;
        is_active:boolean;
        address:string;
        role?: Role;
    }

    export type CabinetMemberCreateFormRemoteValidation = {
        [KEY in keyof CabinetMemberCreateForm]?: string
    }

    export type CabinetMemberUpdateForm = {
        id: number;
        first_name?:string;
        last_name?:string;
        email?:string;
        is_active?:boolean;
        phone?:string;
        address?:string;
        country?: string;
        image?: string;
        role?: Role;
    }

    export type CabinetMemberRoleUpdateForm = {
        id: number;
        role: Role;
    }

    export type CabinetMemberUpdateFormRemoteValidation = {
        [KEY in keyof CabinetMemberUpdateForm]?: string
    }

    
}