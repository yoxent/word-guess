// Mock storage dependencies
jest.mock('../../services/storage', () => ({
  initDatabase: jest.fn().mockResolvedValue(undefined),
  getStats: jest.fn().mockResolvedValue(null),
  saveGameResult: jest.fn().mockResolvedValue(undefined),
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
    it('saves game result and updates stats', async () => {
      const mockStats = {
        totalGames: 11,
        wins: 8,
        winRate: 73,
        currentStreak: 4,
        maxStreak: 5,
        guessDistribution: [0, 0, 2, 4, 2],
        gamesByLength: { 5: { played: 11, won: 8 } },
        lastGameDate: '2026-07-10',
        perModeStreaks: {
          daily: { current: 2, max: 3 },
          endless: { current: 2, max: 2 },
          'non-daily': { current: 0, max: 4 },
        },
      };
      (storage.getStats as jest.Mock).mockResolvedValue(mockStats);

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

      expect(storage.saveGameResult).toHaveBeenCalledWith(gameResult);
      expect(state.stats).toEqual(mockStats);
      expect(state.lastGameResult?.word).toBe('APPLE');
      expect(state.lastGameResult?.won).toBe(true);
    });
  });
});
