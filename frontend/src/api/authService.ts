/**
 * Servicio de autenticación — wrapper tipado sobre apiClient.
 *
 * Todas las peticiones relacionadas con auth, perfil y preferencias
 * del usuario pasan por este módulo. Las pantallas nunca llaman a
 * apiClient directamente.
 */

import { apiClient } from "./client";
import type { UserProfile, UserPreferences } from "@/types/domain";
import type { User } from "@/store/authStore";

// ─── Tipos de respuesta ────────────────────────────────────────────────────────

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
}

// ─── Helpers de normalización ─────────────────────────────────────────────────

/**
 * Normaliza la respuesta del backend (/auth/profile/me/) al tipo UserProfile.
 * El backend devuelve first_name + last_name y campos snake_case; añadimos
 * los campos camelCase de conveniencia que usa el store local.
 */
function normalizeProfile(raw: UserProfile): UserProfile {
  const name = [raw.first_name, raw.last_name].filter(Boolean).join(" ").trim() || raw.username;
  return {
    ...raw,
    name,
    // Alias camelCase — los pesos ahora vienen del backend (persistidos en BD)
    searchRadiusKm: raw.max_search_radius_km,
    maxStops: raw.max_stops,
    weightPrice: raw.weight_price ?? 34,
    weightDistance: raw.weight_distance ?? 33,
    weightTime: raw.weight_time ?? 33,
  };
}

// ─── authService ──────────────────────────────────────────────────────────────

export const authService = {
  /** POST /auth/token/ — obtener par de tokens JWT */
  login: (username: string, password: string): Promise<LoginResponse> =>
    apiClient.post<never, LoginResponse>("/auth/token/", {
      username,
      password,
    }),

  /** POST /auth/register/ — crear nueva cuenta */
  register: (data: RegisterData): Promise<LoginResponse> =>
    apiClient.post<never, LoginResponse>("/auth/register/", data),

  /**
   * POST /auth/token/refresh/ — renovar access token.
   * Sólo usado internamente por el interceptor de client.ts.
   */
  refreshToken: (refresh: string): Promise<{ access: string; refresh?: string }> =>
    apiClient.post<never, { access: string; refresh?: string }>(
      "/auth/token/refresh/",
      { refresh },
    ),

  /** GET /auth/profile/me/ — obtener perfil del usuario autenticado */
  getProfile: async (): Promise<UserProfile> => {
    const raw = await apiClient.get<never, UserProfile>("/auth/profile/me/");
    return normalizeProfile(raw);
  },

  /**
   * GET /auth/profile/me/ usando un access token explicito.
   * Se usa en el bootstrap inmediatamente despues del login/register,
   * antes de que el token este en el store/interceptor global.
   */
  getProfileWithToken: async (accessToken: string): Promise<UserProfile> => {
    const raw = await apiClient.get<never, UserProfile>("/auth/profile/me/", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return normalizeProfile(raw);
  },

  /** PATCH /auth/profile/me/ — actualizar datos del perfil */
  updateProfile: (data: Partial<UserProfile> | FormData): Promise<UserProfile> => {
    const isFormData = data instanceof FormData;
    return apiClient.patch<never, UserProfile>("/auth/profile/me/", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
  },

  /** PATCH /auth/profile/me/ — actualizar preferencias del usuario */
  updatePreferences: (prefs: Partial<UserPreferences>): Promise<UserPreferences> =>
    apiClient.patch<never, UserPreferences>(
      "/auth/profile/me/",
      prefs,
    ),

  /** PATCH /auth/profile/me/ con old_password + new_password */
  changePassword: (oldPassword: string, newPassword: string): Promise<void> =>
    apiClient.patch<never, void>("/auth/profile/me/", {
      old_password: oldPassword,
      new_password: newPassword,
    }),

  /** POST /auth/password-reset/ — solicitar enlace de reset de contraseña */
  requestPasswordReset: (email: string): Promise<void> =>
    apiClient.post<never, void>("/auth/password-reset/", { email }),
};
