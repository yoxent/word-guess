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

export function migrateSettings(persistedState: unknown, version: number): unknown {
  let state = persistedState as Record<string, unknown> & {
    soundEnabled?: boolean;
    hardModeEnabled?: boolean;
    bgmVolume?: number;
    sfxVolume?: number;
    keyboardLayout?: string;
    colorBlindMode?: boolean;
    hasCompletedOnboarding?: boolean;
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

  if (version < 4) {
    state = {
      ...state,
      keyboardLayout: state.keyboardLayout ?? 'qwerty',
    };
  }

  if (version < 5) {
    state = {
      ...state,
      hasCompletedOnboarding: false,
    };
  }

  if (version < 6) {
    const { colorBlindMode: _removed, ...rest } = state;
    state = rest;
  }

  return state;
}

interface SettingsState extends AppSettings {
  toggleHardMode: () => void;
  setBgmVolume: (v: number) => void;
  setSfxVolume: (v: number) => void;
  toggleHaptic: () => void;
  setPro: (value: boolean) => void;
  toggleReduceMotion: () => void;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  setKeyboardLayout: (layout: AppSettings['keyboardLayout']) => void;
  markOnboardingComplete: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hardModeEnabled: false,
      bgmVolume: 0.75,
      sfxVolume: 0.75,
      hapticEnabled: true,
      isPro: false,
      reduceMotion: false,
      themeMode: 'system',
      keyboardLayout: 'qwerty',
      hasCompletedOnboarding: false,
      toggleHardMode: () => set((s) => ({ hardModeEnabled: !s.hardModeEnabled })),
      setBgmVolume: (v) => set({ bgmVolume: snapVolume(v) }),
      setSfxVolume: (v) => set({ sfxVolume: snapVolume(v) }),
      toggleHaptic: () => set((s) => ({ hapticEnabled: !s.hapticEnabled })),
      setPro: (value) => {
        set({ isPro: value });
        // Sync active game board size when entitlement flips (purchase / restore / refund sync / sign-out).
        // Lazy require avoids a settings ↔ game store import cycle at module load.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useGameStore } = require('./gameStore') as typeof import('./gameStore');
        useGameStore.getState().syncMaxAttemptsForEntitlement();
      },
      toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),
      setThemeMode: (mode) => {
        applyNativeThemeMode(mode);
        set({ themeMode: mode });
      },
      setKeyboardLayout: (layout) => set({ keyboardLayout: layout }),
      markOnboardingComplete: () => set({ hasCompletedOnboarding: true }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvZustandStorage),
      // v6: drop colorBlindMode (feature removed)
      version: 6,
      partialize: (state): PersistedSettings => ({
        bgmVolume: state.bgmVolume,
        sfxVolume: state.sfxVolume,
        hapticEnabled: state.hapticEnabled,
        isPro: state.isPro,
        reduceMotion: state.reduceMotion,
        themeMode: state.themeMode,
        keyboardLayout: state.keyboardLayout,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      migrate: migrateSettings,
    }
  )
);

// Apply the persisted preference before the first themed render. This matters
// for "system": it clears any prior app-level light/dark override.
applyNativeThemeMode(useSettingsStore.getState().themeMode);
