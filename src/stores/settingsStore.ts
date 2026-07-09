import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvZustandStorage } from '../services/storage';
import type { AppSettings } from '../types';

/**
 * Valid volume range. Values outside this are clamped when applied to
 * audio players (the slider UI never produces them, but the persisted
 * state from older schemas could in theory).
 */
export const MIN_VOLUME = 0;
export const MAX_VOLUME = 1;

interface SettingsState extends AppSettings {
  toggleHardMode: () => void;
  setBgmVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
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
      bgmVolume: 0.75,
      sfxVolume: 0.75,
      hapticEnabled: true,
      isPro: false,
      colorBlindMode: false,
      reduceMotion: false,
      themeMode: 'system',
      toggleHardMode: () => set((s) => ({ hardModeEnabled: !s.hardModeEnabled })),
      setBgmVolume: (v) => set({ bgmVolume: clamp(v) }),
      setSfxVolume: (v) => set({ sfxVolume: clamp(v) }),
      toggleHaptic: () => set((s) => ({ hapticEnabled: !s.hapticEnabled })),
      setPro: (value) => set({ isPro: value }),
      toggleColorBlindMode: () => set((s) => ({ colorBlindMode: !s.colorBlindMode })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      setThemeMode: (mode) => set({ themeMode: mode }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvZustandStorage),
      // 2026-07-09: bumped from 1 to 2. v1 had `soundEnabled: boolean`;
      // v2 had `bgmVolume` and `sfxVolume` as 3-position values (0 | 0.75 | 1).
      // 2026-07-09: NOT bumped again for the slider change — old values
      // (0, 0.75, 1) are still valid numbers in the continuous [0, 1] range.
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          const old = persistedState as { soundEnabled?: boolean } & Record<string, unknown>;
          const wasEnabled = old.soundEnabled !== false; // default true
          const { soundEnabled: _omit, ...rest } = old;
          return {
            ...rest,
            bgmVolume: wasEnabled ? 0.75 : 0,
            sfxVolume: wasEnabled ? 0.75 : 0,
          } as typeof persistedState;
        }
        return persistedState;
      },
    }
  )
);

function clamp(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, v));
}
