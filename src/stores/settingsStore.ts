import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvZustandStorage } from '../services/storage';
import type { AppSettings } from '../types';

/** Allowed discrete volume values. 0 = Off, 0.75 = Default, 1 = Max. */
export type VolumeLevel = 0 | 0.75 | 1;

interface SettingsState extends AppSettings {
  toggleHardMode: () => void;
  setBgmVolume: (v: VolumeLevel) => void;
  setSfxVolume: (v: VolumeLevel) => void;
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
      setBgmVolume: (v) => set({ bgmVolume: v }),
      setSfxVolume: (v) => set({ sfxVolume: v }),
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
      // v2 has `bgmVolume` and `sfxVolume` numeric fields. The migrate
      // function converts v1 → v2 so existing users keep their audio
      // preference instead of silently snapping to the default.
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
