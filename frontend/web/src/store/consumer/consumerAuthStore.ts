/**
 * Zustand store para el perfil y preferencias del usuario consumidor.
 */

import { create } from 'zustand';
import type { UserProfile } from '../../types/consumer';

interface ConsumerAuthState {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  clearProfile: () => void;
}

export const useConsumerAuthStore = create<ConsumerAuthState>((set) => ({
  profile: null,
  setProfile: (p) => set({ profile: p }),
  clearProfile: () => set({ profile: null }),
}));
