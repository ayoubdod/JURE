import axiosInstance from "@/utils/axiosInstance";
import { getFormDataFromObject } from "@/utils/functions";

export type LibraryTab = 'my' | 'local' | 'international' | 'favorites';

export type LibraryQuery = {
    all?: boolean;
    search?: string;
    category?: string;
    resource_type?: string;
    language?: string;
    country?: string;
    source?: string;
    tags?: string;
    jurisdiction?: number | string;
    page?: number;
    page_size?: number;
    ordering?: string;
    recent?: boolean;
};

export const apiGetDocuments = (params?: LibraryQuery) => {
    return axiosInstance.get<API.Document[] | API.Paginated<API.Document>>('/library/documents/', { params });
};

export const apiGetLibrary = (tab: LibraryTab, params?: LibraryQuery) => {
    return axiosInstance.get<API.LibraryListResponse>(`/library/${tab}/`, { params });
};

export const apiGetDocument = (id: number) => {
    return axiosInstance.get<API.Document>(`/library/documents/${id}/`);
};

export const apiCreateDocument = (data: API.DocumentCreateForm) => {
    return axiosInstance.post<API.Document>(`/library/my/`, getFormDataFromObject(data));
};

export const apiPublishLocalResource = (data: API.DocumentCreateForm) => {
    return axiosInstance.post<API.Document>(`/library/admin/local/`, getFormDataFromObject(data));
};

export const apiPublishInternationalResource = (data: API.DocumentCreateForm) => {
    return axiosInstance.post<API.Document>(`/library/admin/international/`, getFormDataFromObject(data));
};

export const apiUpdateDocument = (data: API.DocumentUpdateForm & { id: number }) => {
    const { id, ...updateFields } = data;
    const hasFile = updateFields.file &&
                    typeof File !== 'undefined' &&
                    updateFields.file instanceof File;
    const payloadData = { ...updateFields };
    const payload = hasFile ? getFormDataFromObject(payloadData) : payloadData;
    return axiosInstance.patch<API.Document>(`/library/documents/${id}/`, payload);
};

export const apiDeleteDocument = (id: number) => {
    return axiosInstance.delete(`/library/documents/${id}/`);
};

export const apiCopySharedDocument = (id: number) => {
    return axiosInstance.post<API.Document>(`/library/documents/${id}/add-to-my-library/`);
};

export const apiAddToMyLibrary = (id: number) => {
    return axiosInstance.post<API.Document>(`/library/documents/${id}/add-to-my-library/`);
};

export const apiFavoriteDocument = (id: number) => {
    return axiosInstance.post<API.Document>(`/library/documents/${id}/favorite/`);
};

export const apiUnfavoriteDocument = (id: number) => {
    return axiosInstance.delete<API.Document>(`/library/documents/${id}/favorite/`);
};
