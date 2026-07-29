import axiosInstance from "@/utils/axiosInstance";

/** Writable on PATCH /members/{id}/ per API contract — do not send read-only aggregates here. */
const PATCHABLE_MEMBER_FIELDS = [
  "email",
  "first_name",
  "last_name",
  "phone",
  "country",
  "address",
  "is_active",
  "image",
] as const;

function buildMemberPatchBody(data: Omit<API.CabinetMemberUpdateForm, "id" | "role">): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of PATCHABLE_MEMBER_FIELDS) {
    const v = data[key as keyof typeof data];
    if (v !== undefined) body[key] = v;
  }
  return body;
}

export const apiGetCabinetMembers = (params?: { expand?: string }) =>
  axiosInstance.get<API.CabinetMember[]>('/cabinets/members/', { params });

export const apiGetAllCabinetMembers = (params?: { expand?: string }) =>
  axiosInstance.get<API.CabinetMember[]>('/cabinets/members/all/', { params });

export const apiGetCabinetMember = (id: number, params?: { expand?: string }) =>
  axiosInstance.get<API.CabinetMember>(`/cabinets/members/${id}/`,{
    params
  });

export const apiGetMyCabinetMember = (params?:{expand?:string})=>{
    return axiosInstance.get<API.CabinetMember>(`/cabinets/members/get_my_cabinet_member/`,{
        params
    });
}

export const apiCreateCabinetMember = (data: API.CabinetMemberCreateForm)=>{
    return axiosInstance.post<API.CabinetMember>(`/cabinets/members/`,data);
}

/** Profile PATCH — writable fields only; use `apiUpdateCabinetMemberRole` for role changes. */
export const apiUpdateCabinetMember = (data: API.CabinetMemberUpdateForm)=>{
    const { id, role: _role, ...rest } = data;
    const body = buildMemberPatchBody(rest);
    return axiosInstance.patch<API.CabinetMember>(`/cabinets/members/${id}/`, body);
};

export const apiDeleteCabinetMember = (id: number)=>{
    return axiosInstance.delete<API.CabinetMember>(`/cabinets/members/${id}/`);
}

/** Role-only update — body `{ role }` per contract; RBAC errors (403/400) come from this endpoint. */
export const apiUpdateCabinetMemberRole = (data: API.CabinetMemberRoleUpdateForm)=>{
    return axiosInstance.patch<API.CabinetMember>(`/cabinets/members/${data.id}/role/`, {
        role: data.role,
    });
}

export const apiResendInvitation = (memberId: number) => {
    return axiosInstance.post<{ detail: string }>(`/cabinets/members/${memberId}/resend-invitation/`);
}

export const apiGetRolePermissions = ()=>{
    return axiosInstance.get<API.RolePermissions[]>('/cabinets/roles/permissions/');
}
