import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/storage';
import type { AuthState } from '../types';

interface AuthStoreState extends AuthState {
  setPlayer: (playerId: string, playerName: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      playerId: null,
      playerName: null,
      authToken: null,
      setPlayer: async (playerId, playerName, token) => {
        await setAuthToken(token);
        set({ isLoggedIn: true, playerId, playerName, authToken: token });
      },
      signOut: async () => {
        await setAuthToken(null);
        set({ isLoggedIn: false, playerId: null, playerName: null, authToken: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
