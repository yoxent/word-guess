import { create } from 'zustand';
import { getStats, saveGameResult, initDatabase } from '@/services/storage';
import type { PlayerStats } from '@/types';

interface StatsState {
  stats: PlayerStats | null;
  isLoading: boolean;
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
  }) => Promise<void>;
}

export const useStatsStore = create<StatsState>()((set, get) => ({
  stats: null,
  isLoading: true,
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
    set({ stats });
  },
}));
