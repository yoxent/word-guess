/**
 * Endless-mode counters used by leaderboard + ResultModal.
 * Deduped by session id so GameScreen and ResultModal can both call safely.
 */
import {
  getEndlessStreak,
  setEndlessStreak,
  getEndlessTotalWords,
  incrementEndlessTotalWords,
} from './storage';

type EndlessEndResult = {
  /** Streak to show in ResultModal (final run length on loss). */
  displayStreak: number;
  /** Streak to submit to leaderboard (0 after a loss resets the board value). */
  endlessStreak: number;
  endlessTotalWords: number;
};

const appliedEndlessResults = new Map<string, EndlessEndResult>();

export function applyEndlessEndCounters(args: {
  sessionId: string;
  won: boolean;
  hardMode: boolean;
}): EndlessEndResult {
  const cached = appliedEndlessResults.get(args.sessionId);
  if (cached) return cached;

  let result: EndlessEndResult;

  if (args.won) {
    const next = getEndlessStreak(args.hardMode) + 1;
    setEndlessStreak(next, args.hardMode);
    incrementEndlessTotalWords();
    result = {
      displayStreak: next,
      endlessStreak: next,
      endlessTotalWords: getEndlessTotalWords(),
    };
  } else {
    const finalStreak = getEndlessStreak(args.hardMode);
    setEndlessStreak(0, args.hardMode);
    incrementEndlessTotalWords();
    result = {
      displayStreak: finalStreak,
      endlessStreak: 0,
      endlessTotalWords: getEndlessTotalWords(),
    };
  }

  appliedEndlessResults.set(args.sessionId, result);
  return result;
}

/** Daily leaderboard score: consecutive daily wins. A win is never submitted as 0. */
export function resolveDailyLeaderboardScore(
  won: boolean,
  currentStreak: number | undefined,
): number | undefined {
  if (!won) return undefined;
  if (typeof currentStreak === 'number' && currentStreak > 0) return currentStreak;
  return 1;
}
