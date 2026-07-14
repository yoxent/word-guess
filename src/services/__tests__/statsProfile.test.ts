// Mock all native dependencies the same way storage.test.ts does, but with a
// stateful MMKV store so profile read/write round-trips can be asserted.
jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    createMMKV: jest.fn().mockReturnValue({
      getString: jest.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, String(value));
      }),
      remove: jest.fn((key: string) => {
        store.delete(key);
      }),
      getNumber: jest.fn((key: string) => (store.has(key) ? Number(store.get(key)) : undefined)),
    }),
  };
});

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

// Global test setup (src/__tests__/testSetup.ts) stubs storage.ts with only a
// handful of exports for component tests. Unmock it here so the real module
// (using the native-dependency mocks above) is exercised.
jest.unmock('../storage');

import { applyGameToStats, emptyStats, getStats, recordGameToProfile } from '../statsProfile';
import { readStatsProfile, writeStatsProfile, saveGameResult } from '../storage';
import type { PlayerStats } from '../../types';

const mmkvModule = require('react-native-mmkv');
mmkvModule.createMMKV();
const mmkvStore: Map<string, string> = mmkvModule.__store;

const sqliteModule = require('expo-sqlite');
let mockDb: {
  execAsync: jest.Mock;
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
};

beforeAll(async () => {
  mockDb = await sqliteModule.openDatabaseAsync();
});

/** No `game_history` rows at all. */
function mockEmptyHistory(): void {
  mockDb.getFirstAsync.mockImplementation(() => Promise.resolve(null));
  mockDb.getAllAsync.mockImplementation(() => Promise.resolve([]));
}

/** One completed game in `game_history`, enough for computeStatsFromHistory to return non-null. */
function mockNonEmptyHistory(): void {
  mockDb.getFirstAsync.mockImplementation((sql: string) => {
    if (sql.includes('total_games')) {
      return Promise.resolve({ total_games: 2, total_wins: 1, last_date: '2026-01-02T00:00:00.000Z' });
    }
    if (sql.includes('ORDER BY completed_at DESC LIMIT 1')) {
      return Promise.resolve({ mode: 'daily', hard_mode: 0 });
    }
    return Promise.resolve(null);
  });
  mockDb.getAllAsync.mockImplementation(() => Promise.resolve([]));
}

describe('statsProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mmkvStore.clear();
    mockEmptyHistory();
  });

  describe('applyGameToStats', () => {
    const baseGame = {
      mode: 'daily',
      letterCount: 5,
      guesses: 3,
      won: true,
      hardMode: false,
      completedAt: '2026-01-02T00:00:00.000Z',
    };

    it('increments totalGames and wins on a win', () => {
      const next = applyGameToStats(emptyStats(), baseGame);
      expect(next.totalGames).toBe(1);
      expect(next.wins).toBe(1);
      expect(next.winRate).toBe(100);
    });

    it('increments totalGames but not wins on a loss', () => {
      const next = applyGameToStats(emptyStats(), { ...baseGame, won: false });
      expect(next.totalGames).toBe(1);
      expect(next.wins).toBe(0);
      expect(next.winRate).toBe(0);
    });

    it('bumps the guess distribution bin for the winning attempt count', () => {
      const next = applyGameToStats(emptyStats(), baseGame);
      expect(next.guessDistribution[3]).toBe(1);
    });

    it('increments gamesByLength played/won for the game letter count', () => {
      const next = applyGameToStats(emptyStats(), baseGame);
      expect(next.gamesByLength[5]).toEqual({ played: 1, won: 1 });

      const afterLoss = applyGameToStats(next, { ...baseGame, won: false });
      expect(afterLoss.gamesByLength[5]).toEqual({ played: 2, won: 1 });
    });

    it('tracks per-mode current/max streak and sets currentStreak/maxStreak from it', () => {
      let stats = emptyStats();
      stats = applyGameToStats(stats, baseGame); // daily_normal win 1
      stats = applyGameToStats(stats, baseGame); // daily_normal win 2
      expect(stats.perModeStreaks.daily_normal).toEqual({ current: 2, max: 2 });
      expect(stats.currentStreak).toBe(2);
      expect(stats.maxStreak).toBe(2);

      stats = applyGameToStats(stats, { ...baseGame, won: false }); // breaks streak
      expect(stats.perModeStreaks.daily_normal).toEqual({ current: 0, max: 2 });
      expect(stats.currentStreak).toBe(0);
      expect(stats.maxStreak).toBe(2); // max streak preserved
    });

    it('keeps separate streaks per mode key (daily vs endless, normal vs hard)', () => {
      let stats = emptyStats();
      stats = applyGameToStats(stats, { ...baseGame, mode: 'endless', hardMode: true });
      expect(stats.perModeStreaks.endless_hard).toEqual({ current: 1, max: 1 });
      expect(stats.perModeStreaks.daily_normal).toBeUndefined();
      expect(stats.currentStreak).toBe(1);
    });
  });

  describe('getStats', () => {
    it('returns null when there is no profile and no history', async () => {
      mockEmptyHistory();
      const stats = await getStats();
      expect(stats).toBeNull();
    });

    it('backfills the profile from history when no profile exists yet', async () => {
      mockNonEmptyHistory();
      expect(readStatsProfile()).toBeNull();

      const stats = await getStats();

      expect(stats).not.toBeNull();
      expect(stats!.totalGames).toBe(2);
      // Backfilled so a restored/next read doesn't recompute from history again.
      const profile = readStatsProfile();
      expect(profile).not.toBeNull();
      expect(profile!.stats.totalGames).toBe(2);
    });

    it('returns the stored profile without touching history when a profile exists', async () => {
      const storedStats = emptyStats({ totalGames: 40, wins: 30, winRate: 75 });
      writeStatsProfile({ stats: storedStats, updatedAtMs: 555 });

      const stats = await getStats();

      expect(stats).toEqual(storedStats);
      expect(mockDb.getFirstAsync).not.toHaveBeenCalled();
      expect(mockDb.getAllAsync).not.toHaveBeenCalled();
    });
  });

  describe('recordGameToProfile (restore-safe)', () => {
    const game = {
      mode: 'endless',
      letterCount: 6,
      guesses: 4,
      won: true,
      hardMode: false,
      completedAt: '2026-02-01T00:00:00.000Z',
    };

    it('applies on top of an existing (e.g. cloud-restored) profile instead of history', async () => {
      const restoredStats: PlayerStats = emptyStats({ totalGames: 50, wins: 40, winRate: 80 });
      writeStatsProfile({ stats: restoredStats, updatedAtMs: 1000 });

      const next = await recordGameToProfile(game);

      expect(next.totalGames).toBe(51);
      expect(next.wins).toBe(41);
      expect(mockDb.getFirstAsync).not.toHaveBeenCalled();

      const persisted = readStatsProfile();
      expect(persisted!.stats.totalGames).toBe(51);
    });

    it('falls back to history then empty stats when no profile exists', async () => {
      mockEmptyHistory();
      const next = await recordGameToProfile(game);
      expect(next.totalGames).toBe(1);
      expect(next.wins).toBe(1);
    });

    it('does NOT double-apply when gameAlreadyInHistory is true and history already reflects the game', async () => {
      // computeStatsFromHistory here stands in for a post-saveGameResult read:
      // total_games already counts the game passed to recordGameToProfile.
      mockNonEmptyHistory(); // total_games: 2, total_wins: 1
      const next = await recordGameToProfile(game, { gameAlreadyInHistory: true });
      // Must equal the history snapshot exactly (2), not 3 (double-counted).
      expect(next.totalGames).toBe(2);
      expect(next.wins).toBe(1);
    });

    it('still applies on top of history when gameAlreadyInHistory is false/omitted (legacy behavior for pre-existing history not yet including the game)', async () => {
      mockNonEmptyHistory(); // total_games: 2, total_wins: 1 (does not include `game`)
      const next = await recordGameToProfile(game);
      expect(next.totalGames).toBe(3);
      expect(next.wins).toBe(2);
    });

    it('regression: no double-count with real saveGameResult ordering (stateful history mock)', async () => {
      // Reproduces production ordering exactly: saveGameResult() (the real
      // storage.ts function, not a stub) inserts a row into a stateful
      // in-memory table BEFORE recordGameToProfile(..., { gameAlreadyInHistory: true })
      // reads computeStatsFromHistory(). If the fix regresses, this game would
      // be counted twice (once from history, once from applyGameToStats).
      const rows: Array<{
        mode: string;
        hard_mode: number;
        guesses: number;
        won: number;
        completed_at: string;
      }> = [];

      mockDb.runAsync.mockImplementation((_sql: string, ...args: unknown[]) => {
        // Column order from storage.saveGameResult's INSERT:
        // id, mode, word, letter_count, guesses, won, hard_mode, extra_guesses_used, completed_at
        const [, mode, , , guesses, won, hardMode, , completedAt] = args as [
          string, string, string, number, number, number, number, number, string
        ];
        rows.push({ mode, hard_mode: hardMode, guesses, won, completed_at: completedAt });
        return Promise.resolve(undefined);
      });

      mockDb.getFirstAsync.mockImplementation((sql: string) => {
        if (sql.includes('total_games')) {
          return Promise.resolve({
            total_games: rows.length,
            total_wins: rows.filter((r) => r.won === 1).length,
            last_date: rows[rows.length - 1]?.completed_at ?? null,
          });
        }
        if (sql.includes('ORDER BY completed_at DESC LIMIT 1')) {
          const last = rows[rows.length - 1];
          return Promise.resolve(last ? { mode: last.mode, hard_mode: last.hard_mode } : null);
        }
        return Promise.resolve(null);
      });
      mockDb.getAllAsync.mockImplementation(() => Promise.resolve([]));

      expect(readStatsProfile()).toBeNull();

      await saveGameResult({
        id: 'g1',
        mode: 'daily',
        word: 'APPLE',
        letterCount: 5,
        guesses: 3,
        won: true,
        hardMode: false,
        extraGuessesUsed: 0,
        completedAt: '2026-03-01T00:00:00.000Z',
      });

      const next = await recordGameToProfile(
        {
          mode: 'daily',
          letterCount: 5,
          guesses: 3,
          won: true,
          hardMode: false,
          completedAt: '2026-03-01T00:00:00.000Z',
        },
        { gameAlreadyInHistory: true }
      );

      expect(rows.length).toBe(1); // sanity: exactly one row was ever saved
      expect(next.totalGames).toBe(1); // not 2 — must not double-count
      expect(next.wins).toBe(1);

      const persisted = readStatsProfile();
      expect(persisted!.stats.totalGames).toBe(1);
    });
  });
});
