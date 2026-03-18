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
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

// ─── authService ──────────────────────────────────────────────────────────────

export const authService = {
  /** POST /auth/token/ — obtener par de tokens JWT */
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiClient.post<never, LoginResponse>("/auth/token/", { email, password }),

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
  getProfile: (): Promise<UserProfile> =>
    apiClient.get<never, UserProfile>("/auth/profile/me/"),

  /** PATCH /auth/profile/me/ — actualizar datos del perfil */
  updateProfile: (data: Partial<UserProfile>): Promise<UserProfile> =>
    apiClient.patch<never, UserProfile>("/auth/profile/me/", data),

  /** PATCH /auth/profile/me/preferences/ — actualizar preferencias */
  updatePreferences: (prefs: Partial<UserPreferences>): Promise<UserPreferences> =>
    apiClient.patch<never, UserPreferences>(
      "/auth/profile/me/preferences/",
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
