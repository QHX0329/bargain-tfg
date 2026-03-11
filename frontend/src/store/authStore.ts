/**
 * Store de autenticación con Zustand.
 *
 * Gestiona el estado de autenticación del usuario:
 * token JWT, datos del usuario, y acciones de login/logout.
 */

import { create } from 'zustand';

/** Información básica del usuario autenticado */
export interface User {
  id: string;
  email: string;
  name: string;
}

/** Estado del store de autenticación */
interface AuthState {
  /** Si el usuario está autenticado */
  isAuthenticated: boolean;
  /** Datos del usuario (null si no está autenticado) */
  user: User | null;
  /** Token JWT de acceso */
  token: string | null;
  /** Iniciar sesión con token y datos de usuario */
  login: (token: string, user: User) => void;
  /** Cerrar sesión y limpiar estado */
  logout: () => void;
  /** Actualizar token (para refresh) */
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,

  login: (token: string, user: User) =>
    set({
      isAuthenticated: true,
      token,
      user,
    }),

  logout: () =>
    set({
      isAuthenticated: false,
      token: null,
      user: null,
    }),

  setToken: (token: string) => set({ token }),
}));
