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

/**
 * Timeout de las peticiones (ms).
 *
 * El backend público se aloja en el *free tier* de Render, que hiberna la
 * instancia tras unos minutos sin tráfico. La primera petición tras la
 * hibernación sufre un *cold start* de 30–60 s mientras el contenedor se
 * reactiva. Un timeout corto (p. ej. 15 s) abortaría esa primera petición y la
 * pantalla lo mostraría como un fallo de credenciales, cuando en realidad el
 * servidor solo estaba despertando. 60 s cubren el peor caso documentado.
 */
const REQUEST_TIMEOUT_MS = 60000;

function createBaseClient() {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}

/** Instancia de Axios con configuración base */
export const apiClient = createBaseClient();

/**
 * Despierta el backend de forma anticipada (fire-and-forget).
 *
 * Pensado para invocarse cuando el usuario llega a una pantalla previa a una
 * acción de red (p. ej. la de inicio de sesión): mientras teclea sus
 * credenciales, la instancia de Render sale de la hibernación, de modo que el
 * envío posterior encuentra el servidor ya activo. Ignora cualquier error: su
 * único propósito es reactivar el contenedor, no obtener datos.
 */
export function warmUpBackend(): void {
  publicApiClient.get("/health/").catch(() => {
    /* silencioso: solo pretende sacar la instancia de la hibernación */
  });
}

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
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Queue de refresh ────────────────────────────────────────────────────────

/** Indica si hay una petición de refresh en curso */
let isRefreshing = false;

/**
 * Entrada en la cola de peticiones que esperan a que termine un refresh en
 * curso. Guardamos ambos callbacks para poder reanudar la petición original si
 * el refresh tiene éxito, o rechazarla de forma explícita si falla (evita
 * promesas que nunca se resuelven y dejan la UI colgada en estado de carga).
 */
interface RefreshQueueEntry {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

/** Callbacks encolados mientras se espera el nuevo access token */
let refreshQueue: RefreshQueueEntry[] = [];

/**
 * Drena la cola de peticiones que esperaban un nuevo token.
 * Reanuda cada petición original con el nuevo access token.
 */
function drainRefreshQueue(newToken: string): void {
  refreshQueue.forEach((entry) => entry.resolve(newToken));
  refreshQueue = [];
}

/**
 * Rechaza todas las peticiones encoladas cuando el refresh falla de forma
 * definitiva, propagando el error para que el llamante lo gestione en lugar de
 * quedarse esperando indefinidamente.
 */
function rejectRefreshQueue(error: unknown): void {
  refreshQueue.forEach((entry) => entry.reject(error));
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
 * Extrae el par de tokens de la respuesta del endpoint de refresh.
 *
 * El backend envuelve la respuesta JWT en el envelope estándar
 * `{ success: true, data: { access, refresh } }` (ver `CustomTokenRefreshView`).
 * Como el refresh se realiza con una instancia de Axios SIN el interceptor de
 * unwrap (para evitar recursión), aquí desempaquetamos de forma defensiva,
 * soportando también la forma plana `{ access, refresh }`.
 *
 * Con `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` activos, el backend
 * rota el refresh token en cada llamada e invalida el anterior. Por eso es
 * imprescindible leer y persistir el `refresh` devuelto: si se sigue usando el
 * antiguo (ya en la blacklist), el siguiente refresh responde 401 y la sesión
 * se cierra de forma inesperada.
 */
export function extractRefreshedTokens(
  responseBody: unknown,
  currentRefreshToken: string,
): { access: string; refresh: string } {
  const isEnvelope =
    responseBody !== null &&
    typeof responseBody === "object" &&
    "success" in responseBody &&
    (responseBody as { success?: unknown }).success !== undefined;

  const payload = (
    isEnvelope ? (responseBody as { data?: unknown }).data : responseBody
  ) as { access?: string; refresh?: string } | null | undefined;

  const access = payload?.access;
  if (!access) {
    throw new Error("Respuesta de refresh sin access token");
  }

  return {
    access,
    refresh: payload?.refresh ?? currentRefreshToken,
  };
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
      // Hay un refresh en curso: esperamos a que termine. Si tiene éxito
      // reanudamos la petición original; si falla, la rechazamos para no
      // dejar la promesa pendiente para siempre.
      return new Promise<unknown>((resolve, reject) => {
        refreshQueue.push({
          resolve: (newToken: string) => {
            if (originalConfig.headers) {
              originalConfig.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(apiClient(originalConfig));
          },
          reject,
        });
      });
    }

    isRefreshing = true;

    try {
      const storedRefresh = await getStoredItem("refresh_token");
      if (!storedRefresh) {
        throw new Error("No refresh token stored");
      }

      // Use the separate axios instance — NOT apiClient — to avoid recursion.
      // Al no pasar por el interceptor de unwrap, la respuesta llega con el
      // envelope { success, data: { access, refresh } }; extractRefreshedTokens
      // lo desempaqueta de forma defensiva.
      const refreshResponse = await refreshAxios.post(
        "/auth/token/refresh/",
        { refresh: storedRefresh },
      );

      const { access: newAccessToken, refresh: newRefreshToken } =
        extractRefreshedTokens(refreshResponse.data, storedRefresh);

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
    } catch (refreshError) {
      rejectRefreshQueue(refreshError);
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
