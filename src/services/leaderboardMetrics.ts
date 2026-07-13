import type { PlayerStats } from '../types';
import { getEndlessStreak, getEndlessTotalWords } from './storage';

export type LeaderboardMetrics = {
  dailyStreak: number;
  endlessStreak: number;
  endlessTotalWords: number;
};

export function computeLeaderboardMetrics(input: {
  perModeStreaks?: Record<string, { current: number; max: number }> | null;
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
  return {
    dailyStreak,
    endlessStreak,
    endlessTotalWords: input.endlessTotalWords,
  };
}

/** Reads local stats + Endless storage — sole source for publish values. */
export function getLeaderboardMetrics(
  stats?: PlayerStats | null,
): LeaderboardMetrics {
  return computeLeaderboardMetrics({
    perModeStreaks: stats?.perModeStreaks,
    endlessStreakNormal: getEndlessStreak(false),
    endlessStreakHard: getEndlessStreak(true),
    endlessTotalWords: getEndlessTotalWords(),
  });
}
