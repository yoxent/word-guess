import { mergePlayerStats, recomputeWinRate } from '../mergePlayerStats';
import type { PlayerStats } from '../../types';

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

const endless0 = {
  endlessTotalWords: 0,
  endlessStreakNormal: 0,
  endlessStreakHard: 0,
};

describe('mergePlayerStats', () => {
  it('upload: no cloud → local wins', () => {
    const local = {
      stats: emptyStats({ totalGames: 3, wins: 2, winRate: 67, maxStreak: 2 }),
      endless: { ...endless0, endlessTotalWords: 5 },
      updatedAtMs: 100,
    };
    const r = mergePlayerStats({
      local,
      cloud: null,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: 'p1',
    });
    expect(r.action).toBe('upload');
    expect(r.profile.stats.totalGames).toBe(3);
    expect(r.profile.endless.endlessTotalWords).toBe(5);
  });

  it('restore: empty local → cloud wins', () => {
    const cloud = {
      stats: emptyStats({ totalGames: 10, wins: 7, winRate: 70, maxStreak: 4 }),
      endless: { endlessTotalWords: 20, endlessStreakNormal: 2, endlessStreakHard: 0 },
      updatedAtMs: 500,
    };
    const r = mergePlayerStats({
      local: null,
      cloud,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: null,
    });
    expect(r.action).toBe('restore');
    expect(r.profile.stats.totalGames).toBe(10);
    expect(r.profile.endless.endlessStreakNormal).toBe(2);
  });

  it('replace: owner mismatch → cloud replaces (no merge of local totals)', () => {
    const local = {
      stats: emptyStats({ totalGames: 99, wins: 50, maxStreak: 9 }),
      endless: { ...endless0, endlessTotalWords: 99 },
      updatedAtMs: 9999,
    };
    const cloud = {
      stats: emptyStats({ totalGames: 2, wins: 1, maxStreak: 1 }),
      endless: endless0,
      updatedAtMs: 1,
    };
    const r = mergePlayerStats({
      local,
      cloud,
      currentPlayerId: 'B',
      statsOwnerPlayerId: 'A',
    });
    expect(r.action).toBe('replace');
    expect(r.profile.stats.totalGames).toBe(2);
  });

  it('merge: newer local body + max career ceilings from older cloud', () => {
    const local = {
      stats: emptyStats({
        totalGames: 5,
        wins: 3,
        winRate: 60,
        maxStreak: 2,
        currentStreak: 1,
        perModeStreaks: { daily_normal: { current: 1, max: 2 } },
      }),
      endless: { endlessTotalWords: 4, endlessStreakNormal: 1, endlessStreakHard: 0 },
      updatedAtMs: 200,
    };
    const cloud = {
      stats: emptyStats({
        totalGames: 40,
        wins: 30,
        winRate: 75,
        maxStreak: 10,
        currentStreak: 8,
        perModeStreaks: { daily_normal: { current: 8, max: 10 } },
      }),
      endless: { endlessTotalWords: 50, endlessStreakNormal: 0, endlessStreakHard: 0 },
      updatedAtMs: 100,
    };
    const r = mergePlayerStats({
      local,
      cloud,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: 'p1',
    });
    expect(r.action).toBe('merge');
    // LWW body from newer local
    expect(r.profile.stats.totalGames).toBe(5);
    expect(r.profile.stats.wins).toBe(3);
    expect(r.profile.stats.currentStreak).toBe(1);
    expect(r.profile.endless.endlessStreakNormal).toBe(1);
    // Safety max
    expect(r.profile.stats.maxStreak).toBe(10);
    expect(r.profile.stats.perModeStreaks.daily_normal.max).toBe(10);
    expect(r.profile.endless.endlessTotalWords).toBe(50);
    expect(r.profile.stats.winRate).toBe(recomputeWinRate(3, 5));
  });

  it('merge: newer cloud body + max career ceilings from older local', () => {
    const local = {
      stats: emptyStats({
        totalGames: 40,
        wins: 30,
        winRate: 75,
        maxStreak: 10,
        currentStreak: 8,
        perModeStreaks: { daily_normal: { current: 8, max: 10 } },
      }),
      endless: { endlessTotalWords: 50, endlessStreakNormal: 0, endlessStreakHard: 0 },
      updatedAtMs: 100,
    };
    const cloud = {
      stats: emptyStats({
        totalGames: 5,
        wins: 3,
        winRate: 60,
        maxStreak: 2,
        currentStreak: 1,
        perModeStreaks: { daily_normal: { current: 1, max: 2 } },
      }),
      endless: { endlessTotalWords: 4, endlessStreakNormal: 1, endlessStreakHard: 0 },
      updatedAtMs: 200,
    };
    const r = mergePlayerStats({
      local,
      cloud,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: 'p1',
    });
    expect(r.action).toBe('merge');
    // LWW body from newer cloud
    expect(r.profile.stats.totalGames).toBe(5);
    expect(r.profile.stats.wins).toBe(3);
    expect(r.profile.stats.currentStreak).toBe(1);
    expect(r.profile.endless.endlessStreakNormal).toBe(1);
    // Safety max from older local
    expect(r.profile.stats.maxStreak).toBe(10);
    expect(r.profile.stats.perModeStreaks.daily_normal.max).toBe(10);
    expect(r.profile.endless.endlessTotalWords).toBe(50);
    expect(r.profile.stats.winRate).toBe(recomputeWinRate(3, 5));
  });

  it('treats missing cloud updatedAtMs as 0', () => {
    const local = {
      stats: emptyStats({ totalGames: 1, wins: 1, winRate: 100 }),
      endless: endless0,
      updatedAtMs: 1,
    };
    const cloud = {
      stats: emptyStats({ totalGames: 9, wins: 9, winRate: 100, maxStreak: 9 }),
      endless: endless0,
      updatedAtMs: 0,
    };
    const r = mergePlayerStats({
      local,
      cloud,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: 'p1',
    });
    expect(r.profile.stats.totalGames).toBe(1);
    expect(r.profile.stats.maxStreak).toBe(9);
  });
});
