import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvZustandStorage } from '@/services/storage';
import type { AppSettings } from '@/types';

interface SettingsState extends AppSettings {
  toggleHardMode: () => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
  setPro: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hardModeEnabled: true,
      soundEnabled: true,
      hapticEnabled: true,
      isPro: false,
      toggleHardMode: () => set((s) => ({ hardModeEnabled: !s.hardModeEnabled })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      toggleHaptic: () => set((s) => ({ hapticEnabled: !s.hapticEnabled })),
      setPro: (value) => set({ isPro: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvZustandStorage),
    }
  )
);
