import { Appearance } from 'react-native';
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

/** Snap volume to nearest 10% step (0, 0.1, …, 1). */
export function snapVolume(v: number): number {
  if (Number.isNaN(v)) return 0;
  const clamped = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, v));
  return Math.round(clamped * 10) / 10;
}

export function applyNativeThemeMode(mode: AppSettings['themeMode']): void {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
}

type PersistedSettings = Omit<
  AppSettings,
  'hardModeEnabled'
>;

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
      hardModeEnabled: false,
      bgmVolume: 0.75,
      sfxVolume: 0.75,
      hapticEnabled: true,
      isPro: false,
      colorBlindMode: false,
      reduceMotion: false,
      themeMode: 'system',
      toggleHardMode: () => set((s) => ({ hardModeEnabled: !s.hardModeEnabled })),
      setBgmVolume: (v) => set({ bgmVolume: snapVolume(v) }),
      setSfxVolume: (v) => set({ sfxVolume: snapVolume(v) }),
      toggleHaptic: () => set((s) => ({ hapticEnabled: !s.hapticEnabled })),
      setPro: (value) => set({ isPro: value }),
      toggleColorBlindMode: () => set((s) => ({ colorBlindMode: !s.colorBlindMode })),
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      setThemeMode: (mode) => {
        applyNativeThemeMode(mode);
        set({ themeMode: mode });
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvZustandStorage),
      // v3: hardModeEnabled is session-only (not persisted); volumes snap to 10%.
      version: 3,
      partialize: (state): PersistedSettings => ({
        bgmVolume: state.bgmVolume,
        sfxVolume: state.sfxVolume,
        hapticEnabled: state.hapticEnabled,
        isPro: state.isPro,
        colorBlindMode: state.colorBlindMode,
        reduceMotion: state.reduceMotion,
        themeMode: state.themeMode,
      }),
      migrate: (persistedState, version) => {
        let state = persistedState as Record<string, unknown> & {
          soundEnabled?: boolean;
          hardModeEnabled?: boolean;
          bgmVolume?: number;
          sfxVolume?: number;
        };

        if (version < 2) {
          const wasEnabled = state.soundEnabled !== false;
          const { soundEnabled: _omit, ...rest } = state;
          state = {
            ...rest,
            bgmVolume: wasEnabled ? 0.75 : 0,
            sfxVolume: wasEnabled ? 0.75 : 0,
          };
        }

        if (version < 3) {
          const { hardModeEnabled: _hard, ...rest } = state;
          state = { ...rest };
          if (typeof state.bgmVolume === 'number') {
            state.bgmVolume = snapVolume(state.bgmVolume);
          }
          if (typeof state.sfxVolume === 'number') {
            state.sfxVolume = snapVolume(state.sfxVolume);
          }
        }

        return state as typeof persistedState;
      },
    }
  )
);

// Apply the persisted preference before the first themed render. This matters
// for "system": it clears any prior app-level light/dark override.
applyNativeThemeMode(useSettingsStore.getState().themeMode);
