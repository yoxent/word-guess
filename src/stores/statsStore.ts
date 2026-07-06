import { create } from 'zustand';
import { getStats, saveGameResult, initDatabase } from '../services/storage';
import type { PlayerStats, GameMode, GuessFeedback } from '../types';

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
  recordGame: (result: {
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
  }) => Promise<void>;
}

export const useStatsStore = create<StatsState>()((set) => ({
  stats: null,
  isLoading: true,
  lastGameResult: null,
  loadStats: async () => {
    try {
      await initDatabase();
      const stats = await getStats();
      set({ stats, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
  recordGame: async (result) => {
    await saveGameResult(result);
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
}));
