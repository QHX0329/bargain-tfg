import axios from 'axios';

const DEFAULT_API_BASE_URL = 'https://localhost:8000/api/v1';

export const API_BASE_URL: string =
  ((typeof import.meta !== 'undefined'
    ? (import.meta.env?.VITE_API_URL as string | undefined)
    : undefined)
    ?.trim()) || DEFAULT_API_BASE_URL;

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
  // Refresh token state management
  let isRefreshing = false;
  let failedQueue: {
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }[] = [];

  const processQueue = (error: unknown, token: string | null) => {
    failedQueue.forEach((prom) => {
      if (token) {
        prom.resolve(token);
      } else {
        prom.reject(error);
      }
    });
    failedQueue = [];
  };

  // Response interceptor: unwrap {success, data} and handle 401 with token refresh
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
    async (error: unknown) => {
      const axiosError = error as {
        config?: { headers?: Record<string, string>; _retry?: boolean };
        response?: { status?: number };
      };

      if (axiosError.response?.status !== 401 || axiosError.config?._retry) {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('access_token');
        window.location.href = LOGIN_URL;
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          if (axiosError.config) {
            axiosError.config.headers = axiosError.config.headers || {};
            axiosError.config.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(axiosError.config as Parameters<typeof apiClient>[0]);
          }
          return Promise.reject(error);
        });
      }

      isRefreshing = true;
      axiosError.config!._retry = true;

      try {
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken: string =
          refreshResponse.data?.data?.access ||
          refreshResponse.data?.access ||
          '';

        if (newAccessToken) {
          localStorage.setItem('access_token', newAccessToken);
          processQueue(null, newAccessToken);

          if (axiosError.config) {
            axiosError.config.headers = axiosError.config.headers || {};
            axiosError.config.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(axiosError.config as Parameters<typeof apiClient>[0]);
          }
        }

        // Refresh succeeded but no token in response – redirect
        throw new Error('No access token in refresh response');
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = LOGIN_URL;
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );
}
