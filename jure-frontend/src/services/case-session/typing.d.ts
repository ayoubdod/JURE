declare namespace API {

    type CaseSessionType = 'OPENING' |'HEARING' | 'CLOSING';
    
    type  CaseSession = {
        id: number;
        case:API.Case;
        type:CaseSessionType;
        summary:string;
        date:string;
        created:string;
    }

    type CaseSessionCreateForm = {
        case:number;
        type:CaseSessionType;
        summary:string;
        date:string;
    }

    type CaseSessionCreateFormRemoteValidation = {
        [KEY in keyof CaseSessionCreateForm]?: string
    }

    type CaseSessionUpdateForm = {
        id: number;
        case:number;
        type:CaseSessionType;
        summary:string;
        date:string;
    }

    type CaseSessionUpdateFormRemoteValidation = {
        [KEY in keyof CaseSessionUpdateForm]?: string
    }

    
}