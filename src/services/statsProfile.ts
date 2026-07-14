import type { PlayerStats } from '../types';
import { config } from '../constants/config';
import { recomputeWinRate } from './mergePlayerStats';
import { readStatsProfile, writeStatsProfile, computeStatsFromHistory } from './storage';

/** Max possible win attempt count: 10-letter base (11) + Pro rewarded extras (3) = 14 */
const MAX_GUESS_DISTRIBUTION_BIN =
  config.baseAttempts(config.maxWordLength) + config.maxExtraGuessesPro;

export type GameForStats = {
  mode: string;
  letterCount: number;
  guesses: number;
  won: boolean;
  hardMode: boolean;
  completedAt: string;
};

export function emptyStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
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
    ...overrides,
  };
}

function modeKeyFor(mode: string, hardMode: boolean): string {
  const base = mode === 'daily' ? 'daily' : mode === 'endless' ? 'endless' : 'random';
  return `${base}_${hardMode ? 'hard' : 'normal'}`;
}

/** Applies a single completed game to an existing stats aggregate (pure). */
export function applyGameToStats(stats: PlayerStats, game: GameForStats): PlayerStats {
  const modeKey = modeKeyFor(game.mode, game.hardMode);
  const prevModeStreak = stats.perModeStreaks[modeKey] ?? { current: 0, max: 0 };
  const current = game.won ? prevModeStreak.current + 1 : 0;
  const max = Math.max(prevModeStreak.max, current);
  const perModeStreaks = {
    ...stats.perModeStreaks,
    [modeKey]: { current, max },
  };

  const totalGames = stats.totalGames + 1;
  const wins = stats.wins + (game.won ? 1 : 0);

  const guessDistribution =
    stats.guessDistribution.length > 0
      ? [...stats.guessDistribution]
      : new Array(MAX_GUESS_DISTRIBUTION_BIN + 1).fill(0);
  if (game.won) {
    const bin = Math.min(Math.max(game.guesses, 1), MAX_GUESS_DISTRIBUTION_BIN);
    guessDistribution[bin] += 1;
  }

  const prevLength = stats.gamesByLength[game.letterCount] ?? { played: 0, won: 0 };
  const gamesByLength = {
    ...stats.gamesByLength,
    [game.letterCount]: {
      played: prevLength.played + 1,
      won: prevLength.won + (game.won ? 1 : 0),
    },
  };

  const maxStreak = Math.max(...Object.values(perModeStreaks).map((s) => s.max), 0);

  return {
    totalGames,
    wins,
    winRate: recomputeWinRate(wins, totalGames),
    currentStreak: current,
    maxStreak,
    guessDistribution,
    gamesByLength,
    lastGameDate: game.completedAt,
    perModeStreaks,
  };
}

/**
 * App-facing stats reader — profile is the source of truth.
 * Falls back to recomputing from `game_history` only on first read (pre-profile
 * installs), then backfills the profile so future reads (and cloud restores)
 * don't get wiped by that recompute.
 */
export async function getStats(): Promise<PlayerStats | null> {
  const profile = readStatsProfile();
  if (profile) return profile.stats;

  const fromDb = await computeStatsFromHistory();
  if (fromDb) {
    writeStatsProfile({
      stats: fromDb,
      updatedAtMs: Date.parse(fromDb.lastGameDate) || Date.now(),
    });
  }
  return fromDb;
}

/**
 * Applies a completed game on top of the current profile (or, absent one, on
 * top of history) and persists the result. Never re-derives from history when
 * a profile already exists, so a cloud-restored profile survives the next game.
 */
export async function recordGameToProfile(game: GameForStats): Promise<PlayerStats> {
  const prev = readStatsProfile()?.stats ?? (await computeStatsFromHistory()) ?? emptyStats();
  const next = applyGameToStats(prev, game);
  writeStatsProfile({ stats: next, updatedAtMs: Date.now() });
  return next;
}
