/**
 * Store de autenticación con Zustand.
 *
 * Gestiona el estado de autenticación del usuario:
 * tokens JWT (acceso y refresh), datos del usuario, y acciones de
 * login/logout con persistencia manual en expo-secure-store.
 *
 * NOTE: Zustand 5 does NOT support built-in persist middleware with SecureStore.
 * Hydration is done manually via the `hydrate()` action called on app mount.
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

/** Información básica del usuario autenticado */
export interface User {
  id: string;
  email: string;
  name: string;
  /** Fecha de registro (ISO 8601, from backend date_joined) */
  memberSince?: string | null;
}

/** Estado del store de autenticación */
interface AuthState {
  /** Si el usuario está autenticado */
  isAuthenticated: boolean;
  /** Datos del usuario (null si no está autenticado) */
  user: User | null;
  /** Token JWT de acceso */
  token: string | null;
  /** Token JWT de refresh */
  refreshToken: string | null;
  /** Fecha desde la que es miembro (populated from backend user.date_joined) */
  memberSince: string | null;

  /** Iniciar sesión — escribe ambos tokens en SecureStore */
  login: (token: string, refreshToken: string, user: User) => Promise<void>;
  /** Cerrar sesión y limpiar estado + SecureStore */
  logout: () => Promise<void>;
  /** Actualizar token de acceso (usado por el interceptor de refresh) */
  setToken: (token: string) => void;
  /** Actualizar token de refresh */
  setRefreshToken: (token: string) => void;
  /**
   * Restaurar la sesión desde SecureStore al arrancar la app.
   * Llamar en App.tsx useEffect (o equivalente).
   */
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  memberSince: null,

  login: async (token: string, refreshToken: string, user: User) => {
    await SecureStore.setItemAsync("access_token", token);
    await SecureStore.setItemAsync("refresh_token", refreshToken);
    await SecureStore.setItemAsync("auth_user", JSON.stringify(user));
    set({
      isAuthenticated: true,
      token,
      refreshToken,
      user,
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("auth_user");
    set({
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      user: null,
      memberSince: null,
    });
  },

  setToken: (token: string) => set({ token }),

  setRefreshToken: (token: string) => set({ refreshToken: token }),

  hydrate: async () => {
    const [accessToken, refreshToken, userJson] = await Promise.all([
      SecureStore.getItemAsync("access_token"),
      SecureStore.getItemAsync("refresh_token"),
      SecureStore.getItemAsync("auth_user"),
    ]);

    if (accessToken && refreshToken) {
      let user: User | null = null;
      if (userJson) {
        try {
          user = JSON.parse(userJson) as User;
        } catch {
          // Corrupted data — ignore
        }
      }
      set({
        token: accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
      });
    }
  },
}));
