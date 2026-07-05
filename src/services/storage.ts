import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings, GameSession, PlayerStats } from '../types';

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

export function getActiveGame(): GameSession | null {
  const raw = mmkv.getString(ACTIVE_GAME_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveActiveGame(game: GameSession): void {
  mmkv.set(ACTIVE_GAME_KEY, JSON.stringify(game));
}

export function clearActiveGame(): void {
  mmkv.remove(ACTIVE_GAME_KEY);
}

// ── SQLite: game history / stats (D-22) ──
let db: SQLite.SQLiteDatabase | null = null;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('wordguess.db');
  await db.execAsync(`
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
}

export async function getStats(): Promise<PlayerStats | null> {
  if (!db) return null;
  const row = await db.getFirstAsync<{
    total_games: number;
    total_wins: number;
  }>('SELECT COUNT(*) as total_games, SUM(won) as total_wins FROM game_history');
  if (!row || row.total_games === 0) return null;
  return {
    totalGames: row.total_games,
    wins: row.total_wins || 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [],
    gamesByLength: {},
    lastGameDate: '',
    completedDailyChallenges: [],
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
  if (!db) return;
  await db.runAsync(
    `INSERT INTO game_history (id, mode, word, letter_count, guesses, won, hard_mode, extra_guesses_used, completed_at)
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
export function getEndlessStreak(): number {
  return mmkv.getNumber('endless_streak') ?? 0;
}

export function setEndlessStreak(streak: number): void {
  mmkv.set('endless_streak', streak);
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
