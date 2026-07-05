import { create } from 'zustand';
import type { GameSession, GameMode, GuessFeedback, TileFeedback } from '@/types';
import { evaluateGuess, validateHardMode } from '@/services/wordLogic';
import { useDictionaryStore } from './dictionaryStore';

interface GameState {
  session: GameSession | null;
  currentGuess: string;
  error: string | null;
  isRevealing: boolean;
  pendingInputs: string[];

  startGame: (mode: GameMode, word: string, letterCount: number, hardMode: boolean) => void;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  resetGame: () => void;
  setCurrentGuess: (guess: string) => void;
  restoreSession: (session: GameSession) => void;
  clearError: () => void;
  setIsRevealing: (revealing: boolean) => void;
  addPendingInput: (key: string) => void;
  flushPendingInputs: () => void;
}

// Priority order for key color accumulation: correct > present > absent > empty
const COLOR_PRIORITY: Record<TileFeedback, number> = {
  correct: 3,
  present: 2,
  absent: 1,
  empty: 0,
};

export const useGameStore = create<GameState>()((set, get) => ({
  session: null,
  currentGuess: '',
  error: null,
  isRevealing: false,
  pendingInputs: [],

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
    set({ session, currentGuess: '', error: null, pendingInputs: [] });
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

  submitGuess: () => {
    const { session, currentGuess, isRevealing } = get();
    if (!session || session.status !== 'playing' || isRevealing) return;

    const word = session.word;
    const guess = currentGuess.toUpperCase();
    const len = session.letterCount;

    // Validate word length (safety guard — UI should enforce this)
    if (guess.length !== len) return;

    // Validate guess is in dictionary (D-49)
    const dictStore = useDictionaryStore.getState();
    if (!dictStore.isValidGuess(len, guess)) {
      set({ error: 'Not in word list' });
      return;
    }

    // Hard Mode validation (D-59, D-60, D-61)
    if (session.hardMode && session.guesses.length > 0) {
      const hardModeCheck = validateHardMode(session.feedback, guess);
      if (!hardModeCheck.valid) {
        set({ error: hardModeCheck.reason || 'Must reuse confirmed tiles' });
        return;
      }
    }

    // Block input during tile reveal animation
    set({ isRevealing: true });

    // Evaluate feedback
    const feedback = evaluateGuess(word, guess);

    // Build new keyColors (D-62: accumulated, correct > present > absent priority)
    const prevKeyColors = session.keyColors;
    const newKeyColors: Record<string, TileFeedback> = { ...prevKeyColors };
    for (const f of feedback) {
      const letter = f.letter;
      const existing = newKeyColors[letter];
      if (!existing || (COLOR_PRIORITY[f.feedback] || 0) > (COLOR_PRIORITY[existing] || 0)) {
        newKeyColors[letter] = f.feedback;
      }
    }

    const newGuesses = [...session.guesses, guess];
    const newFeedback = [...session.feedback, feedback];

    // Win/loss detection (GAME-04)
    const isWon = guess === word;
    const isLost = newGuesses.length >= session.maxAttempts;

    set({
      session: {
        ...session,
        guesses: newGuesses,
        feedback: newFeedback,
        keyColors: newKeyColors,
        status: isWon ? 'won' : isLost ? 'lost' : 'playing',
        completedAt: isWon || isLost ? new Date().toISOString() : undefined,
      },
      currentGuess: '',
      error: null,
    });
  },

  resetGame: () => set({ session: null, currentGuess: '', error: null, pendingInputs: [] }),

  setCurrentGuess: (guess) => set({ currentGuess: guess }),

  restoreSession: (session) => {
    set({ session, currentGuess: '', error: null, pendingInputs: [] });
  },

  clearError: () => set({ error: null }),

  setIsRevealing: (revealing) => set({ isRevealing: revealing }),

  addPendingInput: (key) => {
    const { pendingInputs } = get();
    set({ pendingInputs: [...pendingInputs, key] });
  },

  flushPendingInputs: () => {
    const { pendingInputs } = get();
    if (pendingInputs.length === 0) return;
    // Process first pending input
    const key = pendingInputs[0];
    const rest = pendingInputs.slice(1);
    set({ pendingInputs: rest });
    // Route to appropriate action
    const state = get();
    if (key === 'ENTER') state.submitGuess();
    else if (key === 'BACKSPACE') state.removeLetter();
    else state.addLetter(key);
  },
}));
