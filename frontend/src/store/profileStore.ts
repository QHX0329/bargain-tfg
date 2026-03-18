/**
 * Store de perfil y preferencias del usuario con Zustand.
 *
 * Gestiona el perfil extendido (foto, preferencias de búsqueda) y
 * el estado de guardado.
 */

import { create } from "zustand";
import type { UserProfile, UserPreferences } from "@/types/domain";

interface ProfileState {
  /** Perfil completo del usuario (null si no se ha cargado) */
  profile: UserProfile | null;
  /** Carga del perfil en curso */
  isLoading: boolean;
  /** Guardado de preferencias en curso */
  isSaving: boolean;

  /** Reemplazar perfil completo */
  setProfile: (profile: UserProfile) => void;
  /** Actualizar preferencias dentro del perfil */
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,
  isSaving: false,

  setProfile: (profile) => set({ profile }),

  updatePreferences: (prefs) =>
    set((state) => {
      if (!state.profile) return {};
      return {
        profile: {
          ...state.profile,
          // Map backend snake_case prefs onto the camelCase UserProfile fields
          searchRadiusKm: prefs.max_search_radius_km ?? state.profile.searchRadiusKm,
          maxStops: prefs.max_stops ?? state.profile.maxStops,
          weightPrice: prefs.weight_price ?? state.profile.weightPrice,
          weightDistance: prefs.weight_distance ?? state.profile.weightDistance,
          weightTime: prefs.weight_time ?? state.profile.weightTime,
        },
      };
    }),
}));
