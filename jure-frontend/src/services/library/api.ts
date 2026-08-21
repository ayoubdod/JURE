import axiosInstance from "@/utils/axiosInstance";
import { getFormDataFromObject } from "@/utils/functions";

export const apiGetDocuments = (params?: { all?: boolean })=>{
    return axiosInstance.get<API.Document[] | API.Paginated<API.Document>>('/library/documents/', { params });
}

export const apiGetDocument = (id: number)=>{
    return axiosInstance.get<API.Document>(`/library/documents/${id}/`);
}

export const apiCreateDocument = (data: API.DocumentCreateForm)=>{
    return axiosInstance.post<API.Document>(`/library/documents/`, getFormDataFromObject(data));
}

export const apiUpdateDocument = (data: API.DocumentUpdateForm & { id: number })=>{
    const { id, ...updateFields } = data;
    // Safer file check - avoid instanceof errors
    const hasFile = updateFields.file && 
                    typeof File !== 'undefined' && 
                    updateFields.file instanceof File;
    
    // Remove id from payload if it exists (it's in the URL)
    const payloadData = { ...updateFields };
    
    const payload = hasFile ? getFormDataFromObject(payloadData) : payloadData;

    // For FormData, let axios set Content-Type automatically (with boundary)
    // For JSON, axios will set application/json automatically
    return axiosInstance.patch<API.Document>(`/library/documents/${id}/`, payload);
}

export const apiDeleteDocument = (id: number)=>{
    return axiosInstance.delete<API.Document>(`/library/documents/${id}/`);
}

export const apiCopySharedDocument = (id: number)=>{
    return axiosInstance.post<API.Document>(`/library/documents/${id}/copy-to-cabinet/`);
}
