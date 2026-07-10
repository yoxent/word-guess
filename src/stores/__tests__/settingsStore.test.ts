// Mock MMKV storage before import
jest.mock('../../services/storage', () => ({
  mmkvZustandStorage: {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
  createJSONStorage: () => ({
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  }),
}));

import { useSettingsStore } from '../settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      hardModeEnabled: true,
      bgmVolume: 0.75,
      sfxVolume: 0.75,
      hapticEnabled: true,
      isPro: false,
      colorBlindMode: false,
      reduceMotion: false,
      themeMode: 'system',
    });
  });

  describe('toggleHardMode', () => {
    it('toggles from true to false', () => {
      useSettingsStore.getState().toggleHardMode();
      expect(useSettingsStore.getState().hardModeEnabled).toBe(false);
    });

    it('toggles from false to true', () => {
      useSettingsStore.setState({ hardModeEnabled: false });
      useSettingsStore.getState().toggleHardMode();
      expect(useSettingsStore.getState().hardModeEnabled).toBe(true);
    });
  });

  describe('setBgmVolume', () => {
    it('sets volume', () => {
      useSettingsStore.getState().setBgmVolume(0.5);
      expect(useSettingsStore.getState().bgmVolume).toBe(0.5);
    });

    it('clamps to 0-1 range', () => {
      useSettingsStore.getState().setBgmVolume(-0.5);
      expect(useSettingsStore.getState().bgmVolume).toBe(0);

      useSettingsStore.getState().setBgmVolume(1.5);
      expect(useSettingsStore.getState().bgmVolume).toBe(1);
    });

    it('handles NaN', () => {
      useSettingsStore.getState().setBgmVolume(NaN);
      expect(useSettingsStore.getState().bgmVolume).toBe(0);
    });
  });

  describe('setSfxVolume', () => {
    it('sets volume', () => {
      useSettingsStore.getState().setSfxVolume(0.25);
      expect(useSettingsStore.getState().sfxVolume).toBe(0.25);
    });

    it('clamps to 0-1 range', () => {
      useSettingsStore.getState().setSfxVolume(-1);
      expect(useSettingsStore.getState().sfxVolume).toBe(0);
    });
  });

  describe('toggleHaptic', () => {
    it('toggles haptic setting', () => {
      useSettingsStore.getState().toggleHaptic();
      expect(useSettingsStore.getState().hapticEnabled).toBe(false);
      useSettingsStore.getState().toggleHaptic();
      expect(useSettingsStore.getState().hapticEnabled).toBe(true);
    });
  });

  describe('setPro', () => {
    it('sets pro status', () => {
      useSettingsStore.getState().setPro(true);
      expect(useSettingsStore.getState().isPro).toBe(true);
    });
  });

  describe('toggleColorBlindMode', () => {
    it('toggles color blind mode', () => {
      useSettingsStore.getState().toggleColorBlindMode();
      expect(useSettingsStore.getState().colorBlindMode).toBe(true);
    });
  });

  describe('toggleReduceMotion', () => {
    it('toggles reduce motion', () => {
      useSettingsStore.getState().toggleReduceMotion();
      expect(useSettingsStore.getState().reduceMotion).toBe(true);
    });
  });

  describe('setThemeMode', () => {
    it('sets theme mode', () => {
      useSettingsStore.getState().setThemeMode('dark');
      expect(useSettingsStore.getState().themeMode).toBe('dark');
    });
  });
});
