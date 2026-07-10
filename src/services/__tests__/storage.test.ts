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
        expect(getActiveGame()).toBeNull();
      });

      it('parses saved game', () => {
        const game = { id: 'test', word: 'APPLE' };
        mockMmkv.getString.mockReturnValue(JSON.stringify(game));
        expect(getActiveGame()).toEqual(game);
      });
    });

    describe('saveActiveGame', () => {
      it('saves game as JSON', () => {
        const game = { id: 'test', word: 'APPLE' };
        saveActiveGame(game as any);
        expect(mockMmkv.set).toHaveBeenCalledWith(
          'wordguess.activeGame',
          JSON.stringify(game)
        );
      });
    });

    describe('clearActiveGame', () => {
      it('removes active game', () => {
        clearActiveGame();
        expect(mockMmkv.remove).toHaveBeenCalledWith('wordguess.activeGame');
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
        expect(getEndlessStreak()).toBe(0);
      });

      it('returns saved streak', () => {
        mockMmkv.getNumber.mockReturnValue(5);
        expect(getEndlessStreak()).toBe(5);
      });
    });

    describe('setEndlessStreak', () => {
      it('saves streak', () => {
        setEndlessStreak(5);
        expect(mockMmkv.set).toHaveBeenCalledWith('endless_streak', 5);
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
