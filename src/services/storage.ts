import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, GameSession, PlayerStats } from '../types';
import { config } from '../constants/config';

/** Max possible win attempt count: 10-letter base (11) + Pro rewarded extras (3) = 14 */
const MAX_GUESS_DISTRIBUTION_BIN =
  config.baseAttempts(config.maxWordLength) + config.maxExtraGuessesPro;

// ── MMKV: synchronous KV for settings + active game state (D-21) ──
const mmkv: MMKV = createMMKV({ id: 'app-settings' });

export const mmkvZustandStorage: StateStorage = {
  setItem: (name: string, value: string) => mmkv.set(name, value),
  getItem: (name: string) => mmkv.getString(name) ?? null,
  removeItem: (name: string) => mmkv.remove(name),
};

// ── Settings (MMKV) ──
const SETTINGS_KEY = 'wordguess.settings';
const ACTIVE_GAME_KEY = 'wordguess.activeGame';

export function getSettings(): AppSettings | null {
  const raw = mmkv.getString(SETTINGS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSettings(settings: AppSettings): void {
  mmkv.set(SETTINGS_KEY, JSON.stringify(settings));
}

function activeGameKey(hardMode: boolean): string {
  return `${ACTIVE_GAME_KEY}_${hardMode ? 'hard' : 'normal'}`;
}

export function getActiveGame(hardMode: boolean): GameSession | null {
  const raw = mmkv.getString(activeGameKey(hardMode));
  return raw ? JSON.parse(raw) : null;
}

export function saveActiveGame(game: GameSession): void {
  mmkv.set(activeGameKey(game.hardMode), JSON.stringify(game));
}

export function clearActiveGame(hardMode: boolean): void {
  mmkv.remove(activeGameKey(hardMode));
}

// ── SQLite: game history / stats (D-22) ──
let db: SQLite.SQLiteDatabase | null = null;
/** Singleflight — concurrent callers share one open+migrate promise. */
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const database = await SQLite.openDatabaseAsync('wordguess.db');
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS game_history (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        word TEXT NOT NULL,
        letter_count INTEGER NOT NULL,
        guesses INTEGER NOT NULL,
        won INTEGER NOT NULL DEFAULT 0,
        hard_mode INTEGER NOT NULL DEFAULT 0,
        extra_guesses_used INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_game_history_completed_at ON game_history(completed_at);
      CREATE INDEX IF NOT EXISTS idx_game_history_mode ON game_history(mode);
    `);
    db = database;
    return database;
  })();

  try {
    return await dbInitPromise;
  } catch (err) {
    db = null;
    dbInitPromise = null;
    throw err;
  }
}

async function ensureDb(): Promise<SQLite.SQLiteDatabase> {
  return db ?? (await initDatabase());
}

async function computePerModeStreaks(db: SQLite.SQLiteDatabase): Promise<Record<string, { current: number; max: number }>> {
  // Each mode splits into normal (0) and hard (1) sub-groups
  const groups = [
    { key: 'daily_normal', sql: "mode = 'daily' AND hard_mode = 0" },
    { key: 'daily_hard', sql: "mode = 'daily' AND hard_mode = 1" },
    { key: 'endless_normal', sql: "mode = 'endless' AND hard_mode = 0" },
    { key: 'endless_hard', sql: "mode = 'endless' AND hard_mode = 1" },
    // Free Play was merged into Endless; keep 'free' in SQL for legacy rows
    { key: 'random_normal', sql: "mode IN ('free', 'random') AND hard_mode = 0" },
    { key: 'random_hard', sql: "mode IN ('free', 'random') AND hard_mode = 1" },
  ];

  const result: Record<string, { current: number; max: number }> = {};

  for (const group of groups) {
    const rows = await db.getAllAsync<{ won: number; completed_at: string }>(
      `SELECT won, completed_at FROM game_history WHERE ${group.sql} ORDER BY completed_at DESC`
    );

    // Max streak: longest consecutive win run across all rows
    let maxStreak = 0;
    let runLength = 0;
    for (const row of rows) {
      if (row.won === 1) {
        runLength++;
        if (runLength > maxStreak) maxStreak = runLength;
      } else {
        runLength = 0;
      }
    }

    // Current streak: count consecutive wins from most recent game
    let currentStreak = 0;
    for (const row of rows) {
      if (row.won === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    result[group.key] = { current: currentStreak, max: maxStreak };
  }

  return result;
}

async function computeGuessDistribution(db: SQLite.SQLiteDatabase): Promise<number[]> {
  const rows = await db.getAllAsync<{ guesses: number; count: number }>(
    `SELECT guesses, COUNT(*) as count FROM game_history WHERE won = 1 GROUP BY guesses ORDER BY guesses`
  );
  if (rows.length === 0) return [];

  // Fixed bins 1..MAX covering longest mode + rewarded extras:
  // maxWordLength(10) + 1 base + maxExtraGuessesPro(3) = 14
  const distribution = new Array(MAX_GUESS_DISTRIBUTION_BIN + 1).fill(0);
  for (const row of rows) {
    const bin = Math.min(Math.max(row.guesses, 1), MAX_GUESS_DISTRIBUTION_BIN);
    distribution[bin] += row.count;
  }
  return distribution;
}

async function computeGamesByLength(db: SQLite.SQLiteDatabase): Promise<Record<number, { played: number; won: number }>> {
  const rows = await db.getAllAsync<{ letter_count: number; played: number; won: number }>(
    `SELECT letter_count, COUNT(*) as played, SUM(won) as won FROM game_history GROUP BY letter_count ORDER BY letter_count`
  );
  const result: Record<number, { played: number; won: number }> = {};
  for (const row of rows) {
    result[row.letter_count] = { played: row.played, won: row.won || 0 };
  }
  return result;
}

/** Recomputes aggregate stats from `game_history` only (ignores the syncable profile). */
export async function computeStatsFromHistory(): Promise<PlayerStats | null> {
  const database = await ensureDb();

  const row = await database.getFirstAsync<{
    total_games: number;
    total_wins: number;
    last_date: string | null;
  }>(`
    SELECT
      COUNT(*) as total_games,
      COALESCE(SUM(won), 0) as total_wins,
      MAX(completed_at) as last_date
    FROM game_history
  `);

  if (!row || row.total_games === 0) return null;

  const [perModeStreaks, guessDistribution, gamesByLength] = await Promise.all([
    computePerModeStreaks(database),
    computeGuessDistribution(database),
    computeGamesByLength(database),
  ]);

  // Determine last-played mode+hardship for currentStreak
  const lastGameRow = await database.getFirstAsync<{ mode: string; hard_mode: number }>(
    `SELECT mode, hard_mode FROM game_history ORDER BY completed_at DESC LIMIT 1`
  );
  let lastModeKey = 'random_normal';
  if (lastGameRow) {
    const suffix = lastGameRow.hard_mode === 1 ? '_hard' : '_normal';
    if (lastGameRow.mode === 'daily') {
      lastModeKey = 'daily' + suffix;
    } else if (lastGameRow.mode === 'endless') {
      lastModeKey = 'endless' + suffix;
    } else {
      lastModeKey = 'random' + suffix;
    }
  }

  const currentStreak = perModeStreaks[lastModeKey]?.current ?? 0;
  const maxStreak = Math.max(
    ...Object.values(perModeStreaks).map(s => s.max),
    0
  );

  return {
    totalGames: row.total_games,
    wins: row.total_wins,
    winRate: row.total_games > 0 ? Math.round((row.total_wins / row.total_games) * 100) : 0,
    currentStreak,
    maxStreak,
    guessDistribution,
    gamesByLength,
    lastGameDate: row.last_date ?? '',
    perModeStreaks,
  };
}

export async function saveGameResult(result: {
  id: string;
  mode: string;
  word: string;
  letterCount: number;
  guesses: number;
  won: boolean;
  hardMode: boolean;
  extraGuessesUsed: number;
  completedAt: string;
}): Promise<void> {
  const database = await ensureDb();
  await database.runAsync(
    `INSERT OR REPLACE INTO game_history (id, mode, word, letter_count, guesses, won, hard_mode, extra_guesses_used, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    result.id,
    result.mode,
    result.word,
    result.letterCount,
    result.guesses,
    result.won ? 1 : 0,
    result.hardMode ? 1 : 0,
    result.extraGuessesUsed,
    result.completedAt
  );
}

// ── Daily challenge completion tracking (D-40, D-41) ──
export function getDailyCompletedLengths(dateStr: string): number[] {
  const raw = mmkv.getString('daily_completed_' + dateStr);
  return raw ? JSON.parse(raw) : [];
}

export function markDailyCompleted(dateStr: string, length: number): void {
  const completed = getDailyCompletedLengths(dateStr);
  if (!completed.includes(length)) {
    completed.push(length);
    mmkv.set('daily_completed_' + dateStr, JSON.stringify(completed));
  }
}

// ── Endless mode streak (D-47) ──
export function getEndlessStreak(hardMode: boolean): number {
  const key = hardMode ? 'endless_streak_hard' : 'endless_streak_normal';
  return mmkv.getNumber(key) ?? 0;
}

export function setEndlessStreak(streak: number, hardMode: boolean): void {
  const key = hardMode ? 'endless_streak_hard' : 'endless_streak_normal';
  mmkv.set(key, streak);
}

// ── Endless total words counter (D-145) ──
const ENDLESS_TOTAL_KEY = 'endless_total_words';

export function getEndlessTotalWords(): number {
  return mmkv.getNumber(ENDLESS_TOTAL_KEY) ?? 0;
}

export function incrementEndlessTotalWords(): number {
  const current = getEndlessTotalWords();
  const next = current + 1;
  mmkv.set(ENDLESS_TOTAL_KEY, next);
  return next;
}

export function setEndlessTotalWords(n: number): void {
  mmkv.set(ENDLESS_TOTAL_KEY, Math.max(0, Math.floor(n)));
}

// ── Stats profile: syncable aggregate source of truth (cloud restore-safe) ──
const STATS_OWNER_KEY = 'stats_owner_player_id';
const STATS_PROFILE_KEY = 'stats_profile_v1';

export type StoredStatsProfile = {
  stats: PlayerStats;
  updatedAtMs: number;
};

export function getStatsOwnerPlayerId(): string | null {
  return mmkv.getString(STATS_OWNER_KEY) ?? null;
}

export function setStatsOwnerPlayerId(playerId: string | null): void {
  if (playerId == null) {
    mmkv.remove(STATS_OWNER_KEY);
  } else {
    mmkv.set(STATS_OWNER_KEY, playerId);
  }
}

export function readStatsProfile(): StoredStatsProfile | null {
  const raw = mmkv.getString(STATS_PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function writeStatsProfile(profile: StoredStatsProfile): void {
  mmkv.set(STATS_PROFILE_KEY, JSON.stringify(profile));
}

export function clearStatsProfile(): void {
  mmkv.remove(STATS_PROFILE_KEY);
}

/**
 * App-facing stats reader. Delegates to the profile-aware source of truth in
 * `statsProfile.ts` so existing `storage.getStats` imports keep working while
 * a restored/synced profile always wins over recomputing from history.
 *
 * Uses a lazy require (not a static re-export) to sidestep the storage <->
 * statsProfile circular import: statsProfile.ts imports `computeStatsFromHistory`,
 * `readStatsProfile`, and `writeStatsProfile` from this module, so resolving the
 * reverse reference at module-load time would grab a not-yet-initialized export.
 */
export async function getStats(): Promise<PlayerStats | null> {
  const statsProfile: typeof import('./statsProfile') = require('./statsProfile');
  return statsProfile.getStats();
}

// ── AsyncStorage: auth tokens only (D-23) ──
const AUTH_TOKEN_KEY = 'wordguess.authToken';

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  }
}
