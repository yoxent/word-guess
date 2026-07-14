jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  initializeFirestore: jest.fn(),
  collection: jest.fn(() => ({})),
  doc: jest.fn((_collectionRef: unknown, id: string) => ({ id })),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  where: jest.fn(),
  getCountFromServer: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

jest.mock('../storage', () => ({
  getEndlessTotalWords: jest.fn(),
  getEndlessStreak: jest.fn(),
}));

import { setDoc, getDoc } from '@react-native-firebase/firestore';
import { getEndlessStreak, getEndlessTotalWords } from '../storage';
import {
  updatePlayerStats,
  getPlayerStats,
  getPlayerStatsResult,
} from '../firestoreService';
import type { PlayerStats } from '../../types';

const mockedSetDoc = setDoc as jest.Mock;
const mockedGetDoc = getDoc as jest.Mock;
const mockedGetEndlessTotalWords = getEndlessTotalWords as jest.Mock;
const mockedGetEndlessStreak = getEndlessStreak as jest.Mock;

function emptyStats(over: Partial<PlayerStats> = {}): PlayerStats {
  return {
    totalGames: 0,
    wins: 0,
    winRate: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [],
    gamesByLength: {},
    lastGameDate: '',
    perModeStreaks: {},
    ...over,
  };
}

describe('firestoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetEndlessTotalWords.mockReturnValue(3);
    mockedGetEndlessStreak.mockImplementation((hardMode: boolean) => (hardMode ? 1 : 2));
  });

  describe('updatePlayerStats', () => {
    it('mirrors current MMKV endless counters when endless arg omitted', async () => {
      mockedSetDoc.mockResolvedValue(undefined);
      const stats = emptyStats({ totalGames: 5, wins: 4 });

      const ok = await updatePlayerStats('p1', 'Player One', stats);

      expect(ok).toBe(true);
      expect(mockedGetEndlessTotalWords).toHaveBeenCalled();
      expect(mockedGetEndlessStreak).toHaveBeenCalledWith(false);
      expect(mockedGetEndlessStreak).toHaveBeenCalledWith(true);
      expect(mockedSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          playerId: 'p1',
          playerName: 'Player One',
          totalGames: 5,
          wins: 4,
          endlessTotalWords: 3,
          endlessStreakNormal: 2,
          endlessStreakHard: 1,
          updatedAt: 'SERVER_TIMESTAMP',
        }),
        { merge: true },
      );
    });

    it('uses the explicit endless payload when provided and skips MMKV reads', async () => {
      mockedSetDoc.mockResolvedValue(undefined);
      const stats = emptyStats();

      await updatePlayerStats('p1', 'Player One', stats, {
        endlessTotalWords: 99,
        endlessStreakNormal: 7,
        endlessStreakHard: 0,
      });

      expect(mockedGetEndlessTotalWords).not.toHaveBeenCalled();
      expect(mockedGetEndlessStreak).not.toHaveBeenCalled();
      expect(mockedSetDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          endlessTotalWords: 99,
          endlessStreakNormal: 7,
          endlessStreakHard: 0,
        }),
        { merge: true },
      );
    });

    it('returns false when the write fails', async () => {
      mockedSetDoc.mockRejectedValue(new Error('offline'));

      const ok = await updatePlayerStats('p1', 'Player One', emptyStats());

      expect(ok).toBe(false);
    });
  });

  describe('getPlayerStatsResult', () => {
    it('returns missing when the doc does not exist', async () => {
      mockedGetDoc.mockResolvedValue({ exists: false, data: () => undefined });

      const result = await getPlayerStatsResult('p1');

      expect(result).toEqual({ kind: 'missing' });
    });

    it('returns error when the read throws', async () => {
      mockedGetDoc.mockRejectedValue(new Error('network down'));

      const result = await getPlayerStatsResult('p1');

      expect(result).toEqual({ kind: 'error' });
    });

    it('parses stats, endless counters, and updatedAtMs from a found doc', async () => {
      mockedGetDoc.mockResolvedValue({
        exists: true,
        data: () => ({
          playerId: 'p1',
          playerName: 'Player One',
          totalGames: 10,
          wins: 7,
          winRate: 70,
          currentStreak: 2,
          maxStreak: 4,
          guessDistribution: [],
          gamesByLength: {},
          lastGameDate: '2026-07-01',
          perModeStreaks: {},
          endlessTotalWords: 42,
          endlessStreakNormal: 3,
          endlessStreakHard: 1,
          updatedAt: { toMillis: () => 123456 },
        }),
      });

      const result = await getPlayerStatsResult('p1');

      expect(result.kind).toBe('found');
      if (result.kind !== 'found') throw new Error('expected found');
      expect(result.profile.stats.totalGames).toBe(10);
      expect(result.profile.stats.wins).toBe(7);
      expect(result.profile.endless).toEqual({
        endlessTotalWords: 42,
        endlessStreakNormal: 3,
        endlessStreakHard: 1,
      });
      expect(result.profile.updatedAtMs).toBe(123456);
      expect(result.profile.playerName).toBe('Player One');
    });

    it('defaults missing endless fields and updatedAtMs to 0', async () => {
      mockedGetDoc.mockResolvedValue({
        exists: true,
        data: () => ({
          playerId: 'p1',
          totalGames: 1,
          wins: 1,
          winRate: 100,
          currentStreak: 1,
          maxStreak: 1,
          guessDistribution: [],
          gamesByLength: {},
          lastGameDate: '2026-07-01',
          perModeStreaks: {},
        }),
      });

      const result = await getPlayerStatsResult('p1');

      expect(result.kind).toBe('found');
      if (result.kind !== 'found') throw new Error('expected found');
      expect(result.profile.endless).toEqual({
        endlessTotalWords: 0,
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
      });
      expect(result.profile.updatedAtMs).toBe(0);
    });
  });

  describe('getPlayerStats (compat wrapper)', () => {
    it('returns stats when found', async () => {
      mockedGetDoc.mockResolvedValue({
        exists: true,
        data: () => ({
          totalGames: 3,
          wins: 2,
          winRate: 67,
          currentStreak: 1,
          maxStreak: 1,
          guessDistribution: [],
          gamesByLength: {},
          lastGameDate: '2026-07-01',
          perModeStreaks: {},
        }),
      });

      const stats = await getPlayerStats('p1');

      expect(stats?.totalGames).toBe(3);
    });

    it('returns null when missing or on error', async () => {
      mockedGetDoc.mockResolvedValue({ exists: false, data: () => undefined });
      expect(await getPlayerStats('p1')).toBeNull();

      mockedGetDoc.mockRejectedValue(new Error('down'));
      expect(await getPlayerStats('p1')).toBeNull();
    });
  });
});
