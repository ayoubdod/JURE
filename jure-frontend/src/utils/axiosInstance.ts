import useUserStore from '@/stores/userStore';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_BASE } from '@/config/api';
import { devError } from '@/utils/devLog';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const baseURL = API_BASE;

/** After failed refresh or 401 without refresh: clear session and send user to login. */
function redirectToSignIn() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  if (path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/forgot-password')) {
    return;
  }
  window.location.assign('/signin');
}

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const accessToken = useUserStore.getState().accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    config.headers['Accept-Language'] = document.documentElement.lang;
    return config;
  },
  (error) => Promise.reject(error instanceof Error ? error : new Error(String(error)))
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    devError('API error:', error.config?.url, error.response?.status, error.response?.data, error.message);

    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const refreshToken = useUserStore.getState().refreshToken;
    const url = originalRequest?.url ?? '';
    const isRefreshCall = url.includes('/dj-rest-auth/token/refresh/');

    if (status === 401 && isRefreshCall) {
      useUserStore.getState().logout();
      redirectToSignIn();
      return Promise.reject(error);
    }

    if (status === 401 && refreshToken && !originalRequest?._retry) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axiosInstance.post<{ access: string }>('/dj-rest-auth/token/refresh/', {
          refresh: refreshToken,
        });
        useUserStore.setState({
          accessToken: refreshResponse.data.access,
        });
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        devError('Refresh failed:', refreshError);
        useUserStore.getState().logout();
        redirectToSignIn();
        return Promise.reject(refreshError);
      }
    }

    if (status === 401) {
      useUserStore.getState().logout();
      redirectToSignIn();
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
