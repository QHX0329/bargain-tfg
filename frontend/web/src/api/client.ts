import axios from 'axios';

export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL as string | undefined) ||
  'http://localhost:8000/api/v1';

const LOGIN_URL =
  typeof import.meta !== 'undefined'
    ? `${import.meta.env.BASE_URL}login`
    : '/login';

// Create axios instance; axios.create may be undefined when fully mocked in tests
type AxiosInstanceLike = typeof axios & {
  interceptors?: typeof axios.interceptors;
};

let apiClientInstance: AxiosInstanceLike;
try {
  apiClientInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
  }) as AxiosInstanceLike;
} catch {
  // Fallback for test environments where axios is mocked
  apiClientInstance = axios as AxiosInstanceLike;
}
export const apiClient = apiClientInstance;

// Only add interceptors if they are available (real axios instance)
if (apiClient?.interceptors?.request) {
  // Request interceptor: attach Bearer token from localStorage
  apiClient.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: unknown) => Promise.reject(error),
  );
}

if (apiClient?.interceptors?.response) {
  // Response interceptor: unwrap {success, data} and handle 401
  apiClient.interceptors.response.use(
    (response) => {
      // Unwrap BarGAIN API envelope: { success: true, data: ... }
      if (
        response.data &&
        typeof response.data === 'object' &&
        'success' in response.data &&
        'data' in response.data
      ) {
        response.data = (response.data as { data: unknown }).data;
      }
      return response;
    },
    (error: unknown) => {
      if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 401
      ) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = LOGIN_URL;
      }
      return Promise.reject(error);
    },
  );
}
