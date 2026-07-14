import type { PlayerStats } from '../types';

export type EndlessCounters = {
  endlessTotalWords: number;
  endlessStreakNormal: number;
  endlessStreakHard: number;
};

export type StatsProfileSlice = {
  stats: PlayerStats;
  endless: EndlessCounters;
  updatedAtMs: number;
};

export type MergePlayerStatsInput = {
  local: StatsProfileSlice | null;
  cloud: StatsProfileSlice | null;
  currentPlayerId: string;
  statsOwnerPlayerId: string | null;
};

export type MergePlayerStatsResult = {
  profile: StatsProfileSlice;
  /** 'upload' = local-only first push; 'restore' = cloud replaced/filled local; 'merge' = LWW+max; 'replace' = account switch */
  action: 'upload' | 'restore' | 'merge' | 'replace';
};

export function recomputeWinRate(wins: number, totalGames: number): number {
  return totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
}

function emptyStats(): PlayerStats {
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
  };
}

function emptyEndless(): EndlessCounters {
  return {
    endlessTotalWords: 0,
    endlessStreakNormal: 0,
    endlessStreakHard: 0,
  };
}

function emptyProfile(): StatsProfileSlice {
  return {
    stats: emptyStats(),
    endless: emptyEndless(),
    updatedAtMs: 0,
  };
}

function isEmptyEndless(endless: EndlessCounters): boolean {
  return (
    endless.endlessTotalWords === 0 &&
    endless.endlessStreakNormal === 0 &&
    endless.endlessStreakHard === 0
  );
}

function isEmptyLocal(local: StatsProfileSlice | null): boolean {
  if (local == null) return true;
  return local.stats.totalGames === 0 && isEmptyEndless(local.endless);
}

function mergePerModeStreaks(
  base: PlayerStats,
  other: PlayerStats,
): Record<string, { current: number; max: number }> {
  const keys = new Set([
    ...Object.keys(base.perModeStreaks),
    ...Object.keys(other.perModeStreaks),
  ]);
  const merged: Record<string, { current: number; max: number }> = {};
  for (const key of keys) {
    const baseMode = base.perModeStreaks[key];
    const otherMode = other.perModeStreaks[key];
    merged[key] = {
      current: baseMode?.current ?? 0,
      max: Math.max(baseMode?.max ?? 0, otherMode?.max ?? 0),
    };
  }
  return merged;
}

function mergeProfiles(local: StatsProfileSlice, cloud: StatsProfileSlice): StatsProfileSlice {
  const localAt = local.updatedAtMs ?? 0;
  const cloudAt = cloud.updatedAtMs ?? 0;
  const localIsNewer = localAt >= cloudAt;
  const base = localIsNewer ? local : cloud;
  const other = localIsNewer ? cloud : local;

  const perModeStreaks = mergePerModeStreaks(base.stats, other.stats);

  return {
    stats: {
      ...base.stats,
      maxStreak: Math.max(base.stats.maxStreak, other.stats.maxStreak),
      perModeStreaks,
      winRate: recomputeWinRate(base.stats.wins, base.stats.totalGames),
    },
    endless: {
      endlessStreakNormal: base.endless.endlessStreakNormal,
      endlessStreakHard: base.endless.endlessStreakHard,
      endlessTotalWords: Math.max(
        base.endless.endlessTotalWords,
        other.endless.endlessTotalWords,
      ),
    },
    updatedAtMs: base.updatedAtMs,
  };
}

export function mergePlayerStats(input: MergePlayerStatsInput): MergePlayerStatsResult {
  const { local, cloud, currentPlayerId, statsOwnerPlayerId } = input;

  if (cloud == null) {
    return {
      action: 'upload',
      profile: local ?? emptyProfile(),
    };
  }

  if (isEmptyLocal(local)) {
    return {
      action: 'restore',
      profile: cloud,
    };
  }

  if (statsOwnerPlayerId != null && statsOwnerPlayerId !== currentPlayerId) {
    return {
      action: 'replace',
      profile: cloud,
    };
  }

  return {
    action: 'merge',
    profile: mergeProfiles(local!, cloud),
  };
}
