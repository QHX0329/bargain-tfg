/**
 * Cliente HTTP base con Axios.
 *
 * Configurado con:
 * - Base URL configurable por entorno
 * - Interceptor de request para inyectar Bearer token JWT
 * - Interceptor de response para manejar 401 y refresh automático
 */

import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '@/store/authStore';

/** URL base de la API — en desarrollo apunta al backend local */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/** Instancia de Axios con configuración base */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Interceptor de request: inyecta el token JWT en cada petición.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

/**
 * Interceptor de response: detecta 401 y cierra sesión.
 *
 * TODO (F3-02): implementar refresh token automático antes de logout.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido → cerrar sesión
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);
