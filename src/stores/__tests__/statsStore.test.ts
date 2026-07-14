// Mock storage dependencies. `recordGame` now goes through statsProfile.ts's
// profile-aware path (readStatsProfile / writeStatsProfile / computeStatsFromHistory)
// instead of re-reading storage.getStats(), so those need mocking too.
jest.mock('../../services/storage', () => ({
  initDatabase: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue(null),
  saveGameResult: jest.fn().mockResolvedValue(undefined),
  readStatsProfile: jest.fn().mockReturnValue(null),
  writeStatsProfile: jest.fn(),
  computeStatsFromHistory: jest.fn().mockResolvedValue(null),
}));

import { useStatsStore } from '../statsStore';
import * as storage from '../../services/storage';

describe('statsStore', () => {
  beforeEach(() => {
    useStatsStore.setState({
      stats: null,
      isLoading: true,
      lastGameResult: null,
    });
    jest.clearAllMocks();
  });

  describe('loadStats', () => {
    it('loads stats from database', async () => {
      const mockStats = {
        totalGames: 10,
        wins: 7,
        winRate: 70,
        currentStreak: 3,
        maxStreak: 5,
        guessDistribution: [0, 0, 2, 3, 2],
        gamesByLength: { 5: { played: 10, won: 7 } },
        lastGameDate: '2026-07-10',
        perModeStreaks: {
          daily: { current: 2, max: 3 },
          endless: { current: 1, max: 2 },
          'non-daily': { current: 0, max: 4 },
        },
      };
      (storage.getStats as jest.Mock).mockResolvedValue(mockStats);

      await useStatsStore.getState().loadStats();
      const state = useStatsStore.getState();

      expect(state.stats).toEqual(mockStats);
      expect(state.isLoading).toBe(false);
    });

    it('handles null stats', async () => {
      (storage.getStats as jest.Mock).mockResolvedValue(null);
      await useStatsStore.getState().loadStats();
      expect(useStatsStore.getState().stats).toBeNull();
      expect(useStatsStore.getState().isLoading).toBe(false);
    });

    it('handles database errors', async () => {
      (storage.getStats as jest.Mock).mockRejectedValue(new Error('DB error'));
      await useStatsStore.getState().loadStats();
      expect(useStatsStore.getState().isLoading).toBe(false);
    });
  });

  describe('recordGame', () => {
    it('saves game result and applies it on the (profile-backed) stats aggregate', async () => {
      const gameResult = {
        id: 'test123',
        mode: 'random',
        word: 'APPLE',
        letterCount: 5,
        guesses: 4,
        won: true,
        hardMode: false,
        extraGuessesUsed: 0,
        completedAt: '2026-07-10T15:30:00Z',
        feedback: [],
      };

      await useStatsStore.getState().recordGame(gameResult);
      const state = useStatsStore.getState();

      expect(storage.saveGameResult).toHaveBeenCalledWith({
        id: 'test123',
        mode: 'random',
        word: 'APPLE',
        letterCount: 5,
        guesses: 4,
        won: true,
        hardMode: false,
        extraGuessesUsed: 0,
        completedAt: '2026-07-10T15:30:00Z',
      });
      // No profile and no history (both mocked to null) → started from empty stats.
      expect(state.stats?.totalGames).toBe(1);
      expect(state.stats?.wins).toBe(1);
      expect(storage.writeStatsProfile).toHaveBeenCalledWith(
        expect.objectContaining({ stats: expect.objectContaining({ totalGames: 1, wins: 1 }) })
      );
      expect(state.lastGameResult?.word).toBe('APPLE');
      expect(state.lastGameResult?.won).toBe(true);
    });

    it('applies on top of an existing profile without recomputing from history (restore-safe)', async () => {
      (storage.readStatsProfile as jest.Mock).mockReturnValue({
        stats: {
          totalGames: 50,
          wins: 40,
          winRate: 80,
          currentStreak: 0,
          maxStreak: 5,
          guessDistribution: [],
          gamesByLength: {},
          lastGameDate: '2026-07-09',
          perModeStreaks: {},
        },
        updatedAtMs: 1000,
      });

      const gameResult = {
        id: 'test456',
        mode: 'daily',
        word: 'BRAVE',
        letterCount: 5,
        guesses: 3,
        won: true,
        hardMode: false,
        extraGuessesUsed: 0,
        completedAt: '2026-07-11T00:00:00Z',
        feedback: [],
      };

      await useStatsStore.getState().recordGame(gameResult);
      const state = useStatsStore.getState();

      expect(state.stats?.totalGames).toBe(51);
      expect(state.stats?.wins).toBe(41);
      expect(storage.computeStatsFromHistory).not.toHaveBeenCalled();
    });

    it('recordGameIfNeeded is idempotent for the same session id', async () => {
      const gameResult = {
        id: 'once-only',
        mode: 'endless',
        word: 'BRAVE',
        letterCount: 5,
        guesses: 3,
        won: true,
        hardMode: false,
        extraGuessesUsed: 0,
        completedAt: '2026-07-10T15:30:00Z',
        feedback: [],
      };

      await useStatsStore.getState().recordGameIfNeeded(gameResult);
      await useStatsStore.getState().recordGameIfNeeded(gameResult);

      expect(storage.saveGameResult).toHaveBeenCalledTimes(1);
    });
  });
});
