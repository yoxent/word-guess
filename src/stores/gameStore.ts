import { create } from 'zustand';
import type { GameSession, GameMode, GuessFeedback, TileFeedback } from '../types';
import { evaluateGuess, validateHardMode } from '../services/wordLogic';
import { useDictionaryStore } from './dictionaryStore';
import { config } from '../constants/config';
import { clearActiveGame } from '../services/storage';
import { useSettingsStore } from './settingsStore';

/** Ghost letter shown in the active guess row after a rewarded letter hint. */
export type HintTile = { index: number; letter: string };

interface GameState {
  session: GameSession | null;
  currentGuess: string;
  error: string | null;
  isRevealing: boolean;
  pendingInputs: string[];
  /** Ghost letter at a correct answer index for the current active row only. */
  hintTile: HintTile | null;

  startGame: (mode: GameMode, word: string, letterCount: number, hardMode: boolean) => void;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  resetGame: () => void;
  setCurrentGuess: (guess: string) => void;
  restoreSession: (session: GameSession) => void;
  clearError: () => void;
  setIsRevealing: (revealing: boolean) => void;
  /** Promote pendingStatus → status after tile reveal finishes. */
  finalizeRevealOutcome: () => void;
  addPendingInput: (key: string) => void;
  flushPendingInputs: () => void;
  addExtraGuess: () => void;
  useLetterHint: () => void;
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
  hintTile: null,

  startGame: (mode, word, letterCount, hardMode) => {
    clearActiveGame(hardMode);

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
      letterHintUsed: false,
      maxAttempts: letterCount + 1,
      startedAt: new Date().toISOString(),
    };
    set({ session, currentGuess: '', error: null, pendingInputs: [], hintTile: null });
  },

  addLetter: (letter) => {
    const { session, currentGuess } = get();
    if (!session || session.status !== 'playing') return;
    if (currentGuess.length >= session.letterCount) return;
    const upper = letter.toUpperCase();
    set({ currentGuess: currentGuess + upper });
  },

  removeLetter: () => {
    const { currentGuess } = get();
    if (currentGuess.length === 0) return;
    set({ currentGuess: currentGuess.slice(0, -1) });
  },

  submitGuess: () => {
    const { session, currentGuess, isRevealing } = get();
    if (!session || session.status !== 'playing' || isRevealing) return;

    const word = session.word.toUpperCase();
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

    // Win/loss detection (GAME-04). Keep status 'playing' until the tile-reveal
    // animation finishes — flipping status to won/lost mid-reveal unmounts hint
    // UI and fires ResultModal side effects while Reanimated is still flushing
    // tile prop overrides, triggering Fabric SurfaceMountingManager assertions.
    const isWon = guess === word;
    const isLost = newGuesses.length >= session.maxAttempts;
    const gameEnded = isWon || isLost;

    set({
      isRevealing: true,
      session: {
        ...session,
        guesses: newGuesses,
        feedback: newFeedback,
        keyColors: session.keyColors,
        pendingKeyColors: newKeyColors,
        status: 'playing',
        pendingStatus: gameEnded ? (isWon ? 'won' : 'lost') : undefined,
        completedAt: gameEnded ? new Date().toISOString() : undefined,
      },
      currentGuess: '',
      error: null,
      // Ghost hint is current-row only — clear whether the letter was typed or not.
      hintTile: null,
    });
  },

  resetGame: () => set({ session: null, currentGuess: '', error: null, pendingInputs: [], hintTile: null }),

  setCurrentGuess: (guess) => set({ currentGuess: guess }),

  restoreSession: (session) => {
    set({ session, currentGuess: '', error: null, pendingInputs: [], hintTile: null });
  },

  clearError: () => set({ error: null }),

  setIsRevealing: (revealing) => set({ isRevealing: revealing }),

  finalizeRevealOutcome: () => {
    const { session } = get();
    if (!session) return;

    const outcome = session.pendingStatus;
    const nextKeyColors = session.pendingKeyColors ?? session.keyColors;

    if (!outcome && !session.pendingKeyColors) return;

    set({
      session: {
        ...session,
        ...(outcome ? { status: outcome, pendingStatus: undefined } : {}),
        keyColors: nextKeyColors,
        pendingKeyColors: undefined,
      },
    });
  },

  addPendingInput: (key) => {
    const { pendingInputs } = get();
    set({ pendingInputs: [...pendingInputs, key] });
  },

  flushPendingInputs: () => {
    const { pendingInputs } = get();
    if (pendingInputs.length === 0) return;
    const key = pendingInputs[0];
    set({ pendingInputs: pendingInputs.slice(1) });

    // Route to appropriate action
    const state = get();
    if (key === 'ENTER') {
      state.submitGuess();
      // ENTER may trigger new animation — stop draining here
      return;
    } else if (key === 'BACKSPACE') {
      state.removeLetter();
    } else {
      state.addLetter(key);
    }

    // Drain remaining queued inputs on next tick (P14 fix)
    setTimeout(() => get().flushPendingInputs(), 0);
  },

  addExtraGuess: () => {
    const { session } = get();
    // Allow during 'playing' (watch ad for hint) or 'lost' (continue after loss)
    if (!session || (session.status !== 'playing' && session.status !== 'lost')) return;

    const maxExtra = useSettingsStore.getState().isPro
      ? config.maxExtraGuessesPro
      : config.maxExtraGuessesFree;

    if (session.extraGuessesUsed >= maxExtra) return;

    set({
      session: {
        ...session,
        maxAttempts: session.maxAttempts + 1,
        extraGuessesUsed: session.extraGuessesUsed + 1,
      },
      currentGuess: '',
      error: null,
    });
  },

  useLetterHint: () => {
    const { session } = get();
    if (!session || session.status !== 'playing' || session.letterHintUsed) return;

    const word = session.word.toUpperCase();

    // Prefer positions not already marked correct from prior feedback.
    const correctPositions = new Set<number>();
    for (const row of session.feedback) {
      row.forEach((tile, index) => {
        if (tile.feedback === 'correct') correctPositions.add(index);
      });
    }

    const candidates = word
      .split('')
      .map((letter, index) => ({ letter, index }))
      .filter(({ index }) => !correctPositions.has(index));

    // Fallback: any position (e.g. all green somehow mid-session).
    const pool =
      candidates.length > 0
        ? candidates
        : word.split('').map((letter, index) => ({ letter, index }));
    const hintTile = pool[Math.floor(Math.random() * pool.length)];

    set({
      session: {
        ...session,
        letterHintUsed: true,
      },
      hintTile,
    });
  },
}));
