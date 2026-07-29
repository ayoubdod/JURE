import axiosInstance from "@/utils/axiosInstance";

export const apiGetCaseSessions = ()=>{
    return axiosInstance.get<API.Paginated<API.CaseSession>>('/cases/case-sessions/');
}

export const apiGetCaseSession = (id: number)=>{
    return axiosInstance.get<API.CaseSession>(`/cases/case-sessions/${id}/`);
}

export const apiCreateCaseSession = (data: API.CaseSessionCreateForm)=>{
    return axiosInstance.post<API.CaseSession>(`/cases/case-sessions/`,data);
}

export const apiUpdateCaseSession = (data: API.CaseSessionUpdateForm)=>{
    return axiosInstance.patch<API.CaseSession>(`/cases/case-sessions/${data.id}/`,data);
}

export const apiDeleteCaseSession = (id: number)=>{
    return axiosInstance.delete<API.CaseSession>(`/cases/case-sessions/${id}/`);
}

