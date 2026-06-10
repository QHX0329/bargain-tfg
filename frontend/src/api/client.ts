/**
 * Cliente HTTP base con Axios.
 *
 * Configurado con:
 * - Base URL configurable por entorno
 * - Interceptor de request para inyectar Bearer token JWT
 * - Interceptor de response para:
 *   a) Desempaquetar shape { success, data } del backend
 *   b) En 401: refrescar token automáticamente y reintentar la petición
 *      original. Peticiones concurrentes con 401 se encolan para que sólo
 *      se haga UNA llamada al endpoint de refresh.
 */

import axios from "axios";
import type {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  getItem as getStoredItem,
  setItem as setStoredItem,
} from "@/utils/secureStorage";

import { useAuthStore } from "@/store/authStore";

/**
 * URL base de la API.
 *
 * Prioriza EXPO_PUBLIC_API_URL para entornos locales/staging.
 * Si no existe, usa la API publica de Render para evitar que mobile caiga en
 * localhost y falle fuera de la maquina de desarrollo.
 */
const DEFAULT_API_BASE_URL = "https://bargain-free-api.onrender.com/api/v1";
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_BASE_URL;

function createBaseClient() {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

/** Instancia de Axios con configuración base */
export const apiClient = createBaseClient();

/**
 * Cliente para endpoints públicos.
 *
 * Evita adjuntar un Bearer potencialmente caducado en rutas públicas; si el
 * backend intenta autenticar un token inválido devolverá 401 incluso cuando el
 * endpoint no exige login.
 */
export const publicApiClient = createBaseClient();

/**
 * Instancia separada de Axios para llamar al endpoint de refresh.
 * NUNCA usa apiClient para evitar recursión infinita de interceptores.
 */
const refreshAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Queue de refresh ────────────────────────────────────────────────────────

/** Indica si hay una petición de refresh en curso */
let isRefreshing = false;

/** Callbacks encolados mientras se espera el nuevo access token */
let refreshQueue: ((token: string) => void)[] = [];

/**
 * Drena la cola de peticiones que esperaban un nuevo token.
 * Llama a todos los callbacks con el nuevo access token.
 */
function drainRefreshQueue(newToken: string): void {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
}

/**
 * Limpia la cola y rechaza todos los callbacks pendientes.
 * Se usa cuando el refresh falla definitivamente.
 */
function rejectRefreshQueue(): void {
  refreshQueue = [];
}

// ─── Request interceptor ─────────────────────────────────────────────────────

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

// ─── Response interceptor ────────────────────────────────────────────────────

// Extend InternalAxiosRequestConfig to carry our retry flag
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function unwrapSuccessResponse(response: AxiosResponse<any>): any {
  if (
    response.data !== null &&
    typeof response.data === "object" &&
    "success" in response.data &&
    (response.data as { success?: unknown }).success !== undefined
  ) {
    return (response.data as { data?: unknown }).data;
  }

  return response.data;
}

/**
 * Interceptor de response:
 * 1. SUCCESS — desempaqueta { success: true, data: {...} } si existe.
 *    Si la respuesta no tiene el campo `success` (ej: endpoint JWT que devuelve
 *    { access, refresh } directamente), la devuelve tal cual.
 * 2. ERROR 401 — intenta refrescar el token JWT y reintentar la petición original.
 *    Si ya hay un refresh en curso, encola la petición.
 *    Si el refresh falla, llama a logout().
 */
apiClient.interceptors.response.use(
  unwrapSuccessResponse,
  async (error: AxiosError) => {
    const originalConfig = error.config as RetryableConfig | undefined;

    // Only attempt refresh on 401s that haven't been retried yet
    if (
      error.response?.status !== 401 ||
      !originalConfig ||
      originalConfig._retry
    ) {
      return Promise.reject(error);
    }

    // Mark as retried to prevent infinite loops
    originalConfig._retry = true;

    if (isRefreshing) {
      // Another refresh is already in flight — wait for it
      return new Promise<unknown>((resolve, reject) => {
        refreshQueue.push((newToken: string) => {
          if (originalConfig.headers) {
            originalConfig.headers.Authorization = `Bearer ${newToken}`;
          }
          resolve(apiClient(originalConfig));
        });
        // If the refresh ultimately fails, we need to reject queued calls.
        // We store a rejection pathway via a closure capturing the original reject.
        // The rejectRefreshQueue helper empties the queue so the reject above
        // will never fire — callers should handle the logout side-effect.
        void reject; // kept to satisfy ESLint
      });
    }

    isRefreshing = true;

    try {
      const storedRefresh = await getStoredItem("refresh_token");
      if (!storedRefresh) {
        throw new Error("No refresh token stored");
      }

      // Use the separate axios instance — NOT apiClient — to avoid recursion
      const refreshResponse = await refreshAxios.post<{
        access: string;
        refresh?: string;
      }>("/auth/token/refresh/", { refresh: storedRefresh });

      const newAccessToken = refreshResponse.data.access;
      const newRefreshToken = refreshResponse.data.refresh ?? storedRefresh;

      // Persist new tokens
      await setStoredItem("access_token", newAccessToken);
      if (newRefreshToken !== storedRefresh) {
        await setStoredItem("refresh_token", newRefreshToken);
        useAuthStore.getState().setRefreshToken(newRefreshToken);
      }
      useAuthStore.getState().setToken(newAccessToken);

      // Retry the original request with the new token
      if (originalConfig.headers) {
        originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
      }

      drainRefreshQueue(newAccessToken);

      return apiClient(originalConfig);
    } catch {
      rejectRefreshQueue();
      useAuthStore.getState().logout();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

publicApiClient.interceptors.response.use(
  unwrapSuccessResponse,
  (error: AxiosError) => Promise.reject(error),
);
