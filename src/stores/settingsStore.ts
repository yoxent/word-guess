import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvZustandStorage } from '../services/storage';
import type { AppSettings } from '../types';

interface SettingsState extends AppSettings {
  toggleHardMode: () => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
  setPro: (value: boolean) => void;
  toggleColorBlindMode: () => void;
  toggleReduceMotion: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hardModeEnabled: true,
      soundEnabled: true,
      hapticEnabled: true,
      isPro: false,
      colorBlindMode: false,
      reduceMotion: false,
      themeMode: 'system',
      toggleHardMode: () => set((s) => ({ hardModeEnabled: !s.hardModeEnabled })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleHaptic: () => set((s) => ({ hapticEnabled: !s.hapticEnabled })),
      setPro: (value) => set({ isPro: value }),
      toggleColorBlindMode: () => set((s) => ({ colorBlindMode: !s.colorBlindMode })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvZustandStorage),
    }
  )
);
