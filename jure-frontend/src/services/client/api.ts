import axiosInstance from "@/utils/axiosInstance";

/** Map `fiscal_if` form field → API `if` (Morocco B2B). */
function clientWriteBody<T extends { fiscal_if?: string; ice?: string }>(data: T): Record<string, unknown> {
  const { fiscal_if, ice, ...rest } = data;
  const body: Record<string, unknown> = { ...rest };
  if (ice !== undefined) body.ice = ice;
  if (fiscal_if !== undefined) body.if = fiscal_if;
  return body;
}

export const apiGetClients = (params?: { page?: number; page_size?: number }) => {
    return axiosInstance.get<API.Paginated<API.Client>>('/clients/clients/', { params });
}

export const apiGetClient = (id: number)=>{
    return axiosInstance.get<API.Client>(`/clients/clients/${id}/`);
}

export const apiCreateClient = (data: API.ClientCreateForm)=>{
    return axiosInstance.post<API.Client>(`/clients/clients/`, clientWriteBody(data));
}

export const apiUpdateClient = (data: API.ClientUpdateForm)=>{
    const { id, ...updateData } = data;
    return axiosInstance.patch<API.Client>(`/clients/clients/${id}/`, clientWriteBody(updateData));
}

export const apiDeleteClient = (id: number)=>{
    return axiosInstance.delete<API.Client>(`/clients/clients/${id}/`);
}

