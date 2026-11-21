import useUserStore from '@/stores/userStore';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { API_BASE } from '@/config/api';
import { devError } from '@/utils/devLog';
import { handleSessionReplaced, isSessionReplacedError } from '@/utils/sessionReplaced';

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const baseURL = API_BASE;

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** After failed refresh or 401 without refresh: clear session and send user to login. */
function redirectToSignIn() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  if (path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/forgot-password')) {
    return;
  }
  window.location.assign('/signin');
}

let refreshPromise: Promise<void> | null = null;

function refreshViaCookie(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${baseURL}/dj-rest-auth/token/refresh/`,
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            ...(getCookie('csrftoken') ? { 'X-CSRFToken': getCookie('csrftoken')! } : {}),
          },
        }
      )
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const method = (config.method || 'get').toLowerCase();
    if (MUTATING_METHODS.has(method)) {
      const csrf = getCookie('csrftoken');
      if (csrf) {
        config.headers['X-CSRFToken'] = csrf;
      }
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

    if (isSessionReplacedError(error)) {
      handleSessionReplaced();
      return Promise.reject(error);
    }

    const originalRequest = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';
    const isRefreshCall = url.includes('/dj-rest-auth/token/refresh/');

    if (status === 401 && isRefreshCall) {
      useUserStore.getState().logout();
      redirectToSignIn();
      return Promise.reject(error);
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await refreshViaCookie();
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        devError('Refresh failed:', refreshError);
        if (isSessionReplacedError(refreshError)) {
          handleSessionReplaced();
        } else {
          useUserStore.getState().logout();
          redirectToSignIn();
        }
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
