import type { PlayerStats } from '../types';
import { getEndlessStreak, getEndlessTotalWords } from './storage';

export type LeaderboardMetrics = {
  dailyStreak: number;
  endlessStreak: number;
  endlessTotalWords: number;
  bestStreak: number;
  sharpshooter: number;
};

/** Fast-win points: 1-guess×3 + 2-guess×2 + 3-guess×1. */
export function computeSharpshooterScore(
  guessDistribution: number[] | null | undefined,
): number {
  const dist = guessDistribution ?? [];
  return (dist[1] ?? 0) * 3 + (dist[2] ?? 0) * 2 + (dist[3] ?? 0) * 1;
}

export function computeLeaderboardMetrics(input: {
  perModeStreaks?: Record<string, { current: number; max: number }> | null;
  maxStreak?: number | null;
  guessDistribution?: number[] | null;
  endlessStreakNormal: number;
  endlessStreakHard: number;
  endlessTotalWords: number;
}): LeaderboardMetrics {
  const streaks = input.perModeStreaks ?? {};
  const dailyStreak = Math.max(
    streaks.daily_normal?.current ?? 0,
    streaks.daily_hard?.current ?? 0,
  );
  const endlessStreak = Math.max(
    input.endlessStreakNormal,
    input.endlessStreakHard,
  );
  const bestFromModes = Math.max(
    0,
    ...Object.values(streaks).map((s) => s.max ?? 0),
  );
  const bestStreak = Math.max(input.maxStreak ?? 0, bestFromModes);

  return {
    dailyStreak,
    endlessStreak,
    endlessTotalWords: input.endlessTotalWords,
    bestStreak,
    sharpshooter: computeSharpshooterScore(input.guessDistribution),
  };
}

/** Reads local stats + Endless storage — sole source for publish values. */
export function getLeaderboardMetrics(
  stats?: PlayerStats | null,
): LeaderboardMetrics {
  return computeLeaderboardMetrics({
    perModeStreaks: stats?.perModeStreaks,
    maxStreak: stats?.maxStreak,
    guessDistribution: stats?.guessDistribution,
    endlessStreakNormal: getEndlessStreak(false),
    endlessStreakHard: getEndlessStreak(true),
    endlessTotalWords: getEndlessTotalWords(),
  });
}
