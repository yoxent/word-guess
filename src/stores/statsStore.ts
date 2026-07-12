import { create } from 'zustand';
import { getStats, saveGameResult } from '../services/storage';
import type { PlayerStats, GameMode, GuessFeedback } from '../types';

/** Module-level dedupe so GameScreen + ResultModal can both call safely. */
const recordedSessionIds = new Set<string>();
/** In-flight promises so a second caller awaits the first write instead of reading stale stats. */
const inFlightRecords = new Map<string, Promise<void>>();

export type GameResultInput = {
  id: string;
  mode: string;
  word: string;
  letterCount: number;
  guesses: number;
  won: boolean;
  hardMode: boolean;
  extraGuessesUsed: number;
  completedAt: string;
  feedback: GuessFeedback[][];
};

interface StatsState {
  stats: PlayerStats | null;
  isLoading: boolean;
  lastGameResult: {
    mode: GameMode;
    word: string;
    attempts: number;
    won: boolean;
    maxAttempts: number;
    date: string;
    feedback: GuessFeedback[][];
  } | null;
  loadStats: () => Promise<void>;
  recordGame: (result: GameResultInput) => Promise<void>;
  /** Idempotent — safe to call from ResultModal and GameScreen. */
  recordGameIfNeeded: (result: GameResultInput) => Promise<void>;
}

export const useStatsStore = create<StatsState>()((set, get) => ({
  stats: null,
  isLoading: true,
  lastGameResult: null,
  loadStats: async () => {
    try {
      const stats = await getStats();
      set({ stats, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  recordGame: async (result) => {
    await saveGameResult({
      id: result.id,
      mode: result.mode,
      word: result.word,
      letterCount: result.letterCount,
      guesses: result.guesses,
      won: result.won,
      hardMode: result.hardMode,
      extraGuessesUsed: result.extraGuessesUsed,
      completedAt: result.completedAt,
    });
    const stats = await getStats();
    set({
      stats,
      lastGameResult: {
        mode: result.mode as GameMode,
        word: result.word,
        attempts: result.guesses,
        won: result.won,
        maxAttempts: result.letterCount + 1,
        date: result.completedAt,
        feedback: result.feedback,
      },
    });
  },
  recordGameIfNeeded: async (result) => {
    const inFlight = inFlightRecords.get(result.id);
    if (inFlight) {
      await inFlight;
      return;
    }
    if (recordedSessionIds.has(result.id)) return;

    const promise = (async () => {
      recordedSessionIds.add(result.id);
      try {
        await get().recordGame(result);
      } catch (err) {
        recordedSessionIds.delete(result.id);
        if (__DEV__) {
          console.warn('[stats] recordGameIfNeeded failed', err);
        }
        // Do not rethrow — callers often fire-and-forget (ResultModal).
      } finally {
        inFlightRecords.delete(result.id);
      }
    })();

    inFlightRecords.set(result.id, promise);
    await promise;
  },
}));
