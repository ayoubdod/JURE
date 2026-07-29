import axiosInstance from '@/utils/axiosInstance';

export const apiGetUserWorkspace = (userId: number) =>
  axiosInstance.get<unknown>(`/users/${userId}/workspace/`);
