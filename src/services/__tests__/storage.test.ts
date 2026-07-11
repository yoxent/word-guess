// Mock all native dependencies
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockReturnValue({
    getString: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    getNumber: jest.fn(),
  }),
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn(),
    getAllAsync: jest.fn().mockResolvedValue([]),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    runAsync: jest.fn(),
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

import {
  getSettings,
  saveSettings,
  getActiveGame,
  saveActiveGame,
  clearActiveGame,
  getDailyCompletedLengths,
  markDailyCompleted,
  getEndlessStreak,
  setEndlessStreak,
  getEndlessTotalWords,
  incrementEndlessTotalWords,
  getAuthToken,
  setAuthToken,
} from '../storage';

// Get the mocked MMKV instance
const mockMmkv = require('react-native-mmkv').createMMKV();
const mockAsyncStorage = require('@react-native-async-storage/async-storage').default;

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MMKV operations', () => {
    describe('getSettings', () => {
      it('returns null when no settings saved', () => {
        mockMmkv.getString.mockReturnValue(null);
        expect(getSettings()).toBeNull();
      });

      it('parses saved settings', () => {
        const settings = { hardModeEnabled: true, bgmVolume: 0.75 };
        mockMmkv.getString.mockReturnValue(JSON.stringify(settings));
        expect(getSettings()).toEqual(settings);
      });
    });

    describe('saveSettings', () => {
      it('saves settings as JSON', () => {
        const settings = { hardModeEnabled: false, sfxVolume: 0.5 };
        saveSettings(settings as any);
        expect(mockMmkv.set).toHaveBeenCalledWith(
          'wordguess.settings',
          JSON.stringify(settings)
        );
      });
    });

    describe('getActiveGame', () => {
      it('returns null when no game saved', () => {
        mockMmkv.getString.mockReturnValue(null);
        expect(getActiveGame(false)).toBeNull();
        expect(getActiveGame(true)).toBeNull();
      });

      it('reads from key based on hardMode flag', () => {
        mockMmkv.getString.mockReturnValue(JSON.stringify({ hardMode: true }));
        expect(getActiveGame(true)).toEqual({ hardMode: true });
        expect(mockMmkv.getString).toHaveBeenCalledWith('wordguess.activeGame_hard');

        mockMmkv.getString.mockReturnValue(JSON.stringify({ hardMode: false }));
        expect(getActiveGame(false)).toEqual({ hardMode: false });
        expect(mockMmkv.getString).toHaveBeenCalledWith('wordguess.activeGame_normal');
      });
    });

    describe('saveActiveGame', () => {
      it('saves to _hard key when game.hardMode is true', () => {
        const game = { id: 'test', word: 'APPLE', hardMode: true };
        saveActiveGame(game as any);
        expect(mockMmkv.set).toHaveBeenCalledWith(
          'wordguess.activeGame_hard',
          JSON.stringify(game)
        );
      });

      it('saves to _normal key when game.hardMode is false', () => {
        const game = { id: 'test', word: 'APPLE', hardMode: false };
        saveActiveGame(game as any);
        expect(mockMmkv.set).toHaveBeenCalledWith(
          'wordguess.activeGame_normal',
          JSON.stringify(game)
        );
      });
    });

    describe('clearActiveGame', () => {
      it('removes _hard key when hardMode is true', () => {
        clearActiveGame(true);
        expect(mockMmkv.remove).toHaveBeenCalledWith('wordguess.activeGame_hard');
      });

      it('removes _normal key when hardMode is false', () => {
        clearActiveGame(false);
        expect(mockMmkv.remove).toHaveBeenCalledWith('wordguess.activeGame_normal');
      });
    });

    describe('getDailyCompletedLengths', () => {
      it('returns empty array when none saved', () => {
        mockMmkv.getString.mockReturnValue(null);
        expect(getDailyCompletedLengths('2026-07-10')).toEqual([]);
      });

      it('returns saved lengths', () => {
        mockMmkv.getString.mockReturnValue(JSON.stringify([5, 6]));
        expect(getDailyCompletedLengths('2026-07-10')).toEqual([5, 6]);
      });
    });

    describe('markDailyCompleted', () => {
      it('adds length to completed list', () => {
        mockMmkv.getString.mockReturnValue(null);
        markDailyCompleted('2026-07-10', 5);
        expect(mockMmkv.set).toHaveBeenCalledWith(
          'daily_completed_2026-07-10',
          JSON.stringify([5])
        );
      });

      it('does not duplicate length', () => {
        mockMmkv.getString.mockReturnValue(JSON.stringify([5]));
        markDailyCompleted('2026-07-10', 5);
        expect(mockMmkv.set).not.toHaveBeenCalled();
      });
    });

    describe('getEndlessStreak', () => {
      it('returns 0 when not set', () => {
        mockMmkv.getNumber.mockReturnValue(undefined);
        expect(getEndlessStreak(false)).toBe(0);
        expect(getEndlessStreak(true)).toBe(0);
      });

      it('reads from key based on hardMode flag', () => {
        mockMmkv.getNumber.mockReturnValue(3);
        expect(getEndlessStreak(false)).toBe(3);
        expect(mockMmkv.getNumber).toHaveBeenCalledWith('endless_streak_normal');

        mockMmkv.getNumber.mockReturnValue(7);
        expect(getEndlessStreak(true)).toBe(7);
        expect(mockMmkv.getNumber).toHaveBeenCalledWith('endless_streak_hard');
      });
    });

    describe('setEndlessStreak', () => {
      it('saves to _normal key when hardMode is false', () => {
        setEndlessStreak(5, false);
        expect(mockMmkv.set).toHaveBeenCalledWith('endless_streak_normal', 5);
      });

      it('saves to _hard key when hardMode is true', () => {
        setEndlessStreak(3, true);
        expect(mockMmkv.set).toHaveBeenCalledWith('endless_streak_hard', 3);
      });
    });

    describe('getEndlessTotalWords', () => {
      it('returns 0 when not set', () => {
        mockMmkv.getNumber.mockReturnValue(undefined);
        expect(getEndlessTotalWords()).toBe(0);
      });

      it('returns saved total', () => {
        mockMmkv.getNumber.mockReturnValue(42);
        expect(getEndlessTotalWords()).toBe(42);
      });
    });

    describe('incrementEndlessTotalWords', () => {
      it('increments from 0', () => {
        mockMmkv.getNumber.mockReturnValue(undefined);
        const result = incrementEndlessTotalWords();
        expect(result).toBe(1);
        expect(mockMmkv.set).toHaveBeenCalledWith('endless_total_words', 1);
      });

      it('increments from existing', () => {
        mockMmkv.getNumber.mockReturnValue(42);
        const result = incrementEndlessTotalWords();
        expect(result).toBe(43);
      });
    });
  });

  describe('AsyncStorage operations', () => {
    describe('getAuthToken', () => {
      it('returns null when no token', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);
        const token = await getAuthToken();
        expect(token).toBeNull();
      });

      it('returns saved token', async () => {
        mockAsyncStorage.getItem.mockResolvedValue('test-token');
        const token = await getAuthToken();
        expect(token).toBe('test-token');
      });
    });

    describe('setAuthToken', () => {
      it('saves token', async () => {
        await setAuthToken('test-token');
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
          'wordguess.authToken',
          'test-token'
        );
      });

      it('removes token when null', async () => {
        await setAuthToken(null);
        expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
          'wordguess.authToken'
        );
      });
    });
  });
});
