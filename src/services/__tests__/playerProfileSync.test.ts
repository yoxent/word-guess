import type { PlayerStats } from '../../types';

jest.mock('../storage', () => ({
  readStatsProfile: jest.fn(),
  writeStatsProfile: jest.fn(),
  getStatsOwnerPlayerId: jest.fn(),
  setStatsOwnerPlayerId: jest.fn(),
  setEndlessTotalWords: jest.fn(),
  setEndlessStreak: jest.fn(),
  getEndlessStreak: jest.fn(),
  getEndlessTotalWords: jest.fn(),
}));

jest.mock('../firestoreService', () => ({
  getPlayerStatsResult: jest.fn(),
  updatePlayerStats: jest.fn(),
}));

jest.mock('../syncQueue', () => ({
  enqueueEvent: jest.fn(),
  removeEventsByType: jest.fn(),
}));

jest.mock('../leaderboardService', () => ({
  reconcileLocalLeaderboardScores: jest.fn(),
}));

jest.mock('../../stores/statsStore', () => ({
  useStatsStore: { getState: jest.fn() },
}));

import { syncPlayerProfileOnAuth } from '../playerProfileSync';
import * as storage from '../storage';
import * as firestoreService from '../firestoreService';
import * as syncQueue from '../syncQueue';
import * as leaderboardService from '../leaderboardService';
import { useStatsStore } from '../../stores/statsStore';

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

const endless0 = { endlessTotalWords: 0, endlessStreakNormal: 0, endlessStreakHard: 0 };

const loadStats = jest.fn().mockResolvedValue(undefined);

describe('syncPlayerProfileOnAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storage.getEndlessTotalWords as jest.Mock).mockReturnValue(0);
    (storage.getEndlessStreak as jest.Mock).mockReturnValue(0);
    (storage.readStatsProfile as jest.Mock).mockReturnValue(null);
    (storage.getStatsOwnerPlayerId as jest.Mock).mockReturnValue(null);
    (firestoreService.updatePlayerStats as jest.Mock).mockResolvedValue(true);
    (syncQueue.enqueueEvent as jest.Mock).mockResolvedValue(true);
    (syncQueue.removeEventsByType as jest.Mock).mockResolvedValue(0);
    (leaderboardService.reconcileLocalLeaderboardScores as jest.Mock).mockResolvedValue(undefined);
    (useStatsStore.getState as jest.Mock).mockReturnValue({ loadStats });
  });

  it('missing cloud + local games → upload push called with local totals', async () => {
    (storage.readStatsProfile as jest.Mock).mockReturnValue({
      stats: emptyStats({ totalGames: 5, wins: 3 }),
      updatedAtMs: 1000,
    });
    (firestoreService.getPlayerStatsResult as jest.Mock).mockResolvedValue({ kind: 'missing' });

    const result = await syncPlayerProfileOnAuth({ playerId: 'p1', playerName: 'Alice' });

    expect(result).toEqual({ ok: true, action: 'upload' });
    expect(firestoreService.updatePlayerStats).toHaveBeenCalledWith(
      'p1',
      'Alice',
      expect.objectContaining({ totalGames: 5, wins: 3 }),
      endless0,
    );
    expect(storage.setStatsOwnerPlayerId).toHaveBeenCalledWith('p1');
    expect(syncQueue.removeEventsByType).toHaveBeenCalledWith('game_result');
    expect(leaderboardService.reconcileLocalLeaderboardScores).toHaveBeenCalled();
  });

  it('found cloud + empty local → hydrate local + push + reconcile + remove game_result', async () => {
    (firestoreService.getPlayerStatsResult as jest.Mock).mockResolvedValue({
      kind: 'found',
      profile: {
        stats: emptyStats({ totalGames: 10, wins: 7 }),
        endless: { endlessTotalWords: 20, endlessStreakNormal: 2, endlessStreakHard: 0 },
        updatedAtMs: 500,
      },
    });

    const result = await syncPlayerProfileOnAuth({ playerId: 'p1', playerName: 'Alice' });

    expect(result).toEqual({ ok: true, action: 'restore' });
    expect(storage.writeStatsProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        stats: expect.objectContaining({ totalGames: 10, wins: 7 }),
        updatedAtMs: 500,
      }),
    );
    expect(storage.setEndlessTotalWords).toHaveBeenCalledWith(20);
    expect(storage.setEndlessStreak).toHaveBeenCalledWith(2, false);
    expect(storage.setEndlessStreak).toHaveBeenCalledWith(0, true);
    expect(storage.setStatsOwnerPlayerId).toHaveBeenCalledWith('p1');
    expect(loadStats).toHaveBeenCalled();
    expect(firestoreService.updatePlayerStats).toHaveBeenCalledWith(
      'p1',
      'Alice',
      expect.objectContaining({ totalGames: 10 }),
      { endlessTotalWords: 20, endlessStreakNormal: 2, endlessStreakHard: 0 },
    );
    expect(syncQueue.removeEventsByType).toHaveBeenCalledWith('game_result');
    expect(leaderboardService.reconcileLocalLeaderboardScores).toHaveBeenCalled();
  });

  it('owner A then current B, cloud found → replace (local 99 not pushed as merge)', async () => {
    (storage.getStatsOwnerPlayerId as jest.Mock).mockReturnValue('A');
    (storage.readStatsProfile as jest.Mock).mockReturnValue({
      stats: emptyStats({ totalGames: 99, wins: 50 }),
      updatedAtMs: 9999,
    });
    (storage.getEndlessTotalWords as jest.Mock).mockReturnValue(99);
    (firestoreService.getPlayerStatsResult as jest.Mock).mockResolvedValue({
      kind: 'found',
      profile: {
        stats: emptyStats({ totalGames: 2, wins: 1 }),
        endless: endless0,
        updatedAtMs: 1,
      },
    });

    const result = await syncPlayerProfileOnAuth({ playerId: 'B', playerName: 'Bob' });

    expect(result).toEqual({ ok: true, action: 'replace' });
    expect(firestoreService.updatePlayerStats).toHaveBeenCalledWith(
      'B',
      'Bob',
      expect.objectContaining({ totalGames: 2 }),
      endless0,
    );
    expect(storage.setStatsOwnerPlayerId).toHaveBeenCalledWith('B');
  });

  it('push failure → enqueue game_result, no removeEventsByType', async () => {
    (storage.readStatsProfile as jest.Mock).mockReturnValue({
      stats: emptyStats({ totalGames: 5, wins: 3 }),
      updatedAtMs: 1000,
    });
    (firestoreService.getPlayerStatsResult as jest.Mock).mockResolvedValue({ kind: 'missing' });
    (firestoreService.updatePlayerStats as jest.Mock).mockResolvedValue(false);

    const result = await syncPlayerProfileOnAuth({ playerId: 'p1', playerName: 'Alice' });

    expect(result.ok).toBe(false);
    expect(syncQueue.enqueueEvent).toHaveBeenCalledWith('game_result', {
      stats: expect.objectContaining({ totalGames: 5, wins: 3 }),
      endless: endless0,
      updatedAtMs: 1000,
    });
    expect(syncQueue.removeEventsByType).not.toHaveBeenCalled();
    expect(leaderboardService.reconcileLocalLeaderboardScores).not.toHaveBeenCalled();
  });

  it('get error → no hydrate, owner unchanged', async () => {
    (firestoreService.getPlayerStatsResult as jest.Mock).mockResolvedValue({ kind: 'error' });

    const result = await syncPlayerProfileOnAuth({ playerId: 'p1', playerName: 'Alice' });

    expect(result).toEqual({ ok: false });
    expect(storage.writeStatsProfile).not.toHaveBeenCalled();
    expect(storage.setStatsOwnerPlayerId).not.toHaveBeenCalled();
    expect(firestoreService.updatePlayerStats).not.toHaveBeenCalled();
    expect(loadStats).not.toHaveBeenCalled();
  });

  it('owner mismatch + cloud missing → does not upload prior owner totals into new account', async () => {
    (storage.getStatsOwnerPlayerId as jest.Mock).mockReturnValue('A');
    (storage.readStatsProfile as jest.Mock).mockReturnValue({
      stats: emptyStats({ totalGames: 50, wins: 40 }),
      updatedAtMs: 5000,
    });
    (firestoreService.getPlayerStatsResult as jest.Mock).mockResolvedValue({ kind: 'missing' });

    const result = await syncPlayerProfileOnAuth({ playerId: 'B', playerName: 'Bob' });

    expect(result).toEqual({ ok: true, action: 'replace' });
    expect(firestoreService.updatePlayerStats).toHaveBeenCalledWith(
      'B',
      'Bob',
      expect.objectContaining({ totalGames: 0, wins: 0 }),
      endless0,
    );
    expect(storage.writeStatsProfile).toHaveBeenCalledWith(
      expect.objectContaining({ stats: expect.objectContaining({ totalGames: 0 }) }),
    );
    expect(storage.setStatsOwnerPlayerId).toHaveBeenCalledWith('B');
  });
});
