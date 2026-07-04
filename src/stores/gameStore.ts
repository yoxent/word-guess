import { create } from 'zustand';
import type { GameSession, GameMode, GuessFeedback, TileFeedback } from '@/types';

interface GameState {
  session: GameSession | null;
  currentGuess: string;
  startGame: (mode: GameMode, word: string, letterCount: number, hardMode: boolean) => void;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: (guesses: string[], feedback: GuessFeedback[][], keyColors: Record<string, TileFeedback>) => void;
  resetGame: () => void;
  setCurrentGuess: (guess: string) => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  session: null,
  currentGuess: '',
  startGame: (mode, word, letterCount, hardMode) => {
    const session: GameSession = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 9),
      mode,
      word,
      letterCount,
      guesses: [],
      feedback: [],
      keyColors: {},
      status: 'playing',
      hardMode,
      extraGuessesUsed: 0,
      maxAttempts: letterCount + 1,
      startedAt: new Date().toISOString(),
    };
    set({ session, currentGuess: '' });
  },
  addLetter: (letter) => {
    const { session, currentGuess } = get();
    if (!session || session.status !== 'playing') return;
    if (currentGuess.length >= session.letterCount) return;
    set({ currentGuess: currentGuess + letter });
  },
  removeLetter: () => {
    const { currentGuess } = get();
    if (currentGuess.length === 0) return;
    set({ currentGuess: currentGuess.slice(0, -1) });
  },
  submitGuess: (guesses, feedback, keyColors) => {
    const { session } = get();
    if (!session || session.status !== 'playing') return;
    const word = session.word;
    const isWon = guesses[guesses.length - 1] === word;
    const isLost = guesses.length >= session.maxAttempts;
    set({
      session: {
        ...session,
        guesses,
        feedback,
        keyColors,
        status: isWon ? 'won' : isLost ? 'lost' : 'playing',
        completedAt: isWon || isLost ? new Date().toISOString() : undefined,
      },
      currentGuess: '',
    });
  },
  resetGame: () => set({ session: null, currentGuess: '' }),
  setCurrentGuess: (guess) => set({ currentGuess: guess }),
}));
