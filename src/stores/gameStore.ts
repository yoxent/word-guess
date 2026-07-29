import { create } from 'zustand';
import type { GameSession, GameMode, GuessFeedback, TileFeedback } from '../types';
import { evaluateGuess, validateHardMode } from '../services/wordLogic';
import { useDictionaryStore } from './dictionaryStore';
import { config } from '../constants/config';
import { clearActiveGame, saveActiveGame, toActiveGameSlot } from '../services/storage';
import { useSettingsStore } from './settingsStore';

/** Ghost letter shown in the active guess row after a rewarded letter hint. */
export type HintTile = { index: number; letter: string };

/** Pick a letter hint for the answer, preferring positions not already correct. */
export function pickLetterHint(
  word: string,
  feedback: GuessFeedback[][],
): HintTile {
  const upper = word.toUpperCase();
  const correctPositions = new Set<number>();
  for (const row of feedback) {
    row.forEach((tile, index) => {
      if (tile.feedback === 'correct') correctPositions.add(index);
    });
  }

  const candidates = upper
    .split('')
    .map((letter, index) => ({ letter, index }))
    .filter(({ index }) => !correctPositions.has(index));

  const pool =
    candidates.length > 0
      ? candidates
      : upper.split('').map((letter, index) => ({ letter, index }));
  return pool[Math.floor(Math.random() * pool.length)];
}

interface GameState {
  session: GameSession | null;
  currentGuess: string;
  error: string | null;
  isRevealing: boolean;
  pendingInputs: string[];
  /** Ghost letter at a correct answer index for the current active row only. */
  hintTile: HintTile | null;
  /**
   * Selected tile index in the active guess row for in-place replace.
   * `null` = append mode (type at the end). Tap a filled tile to select it.
   */
  editIndex: number | null;

  startGame: (mode: GameMode, word: string, letterCount: number, hardMode: boolean) => void;
  addLetter: (letter: string) => void;
  removeLetter: () => void;
  submitGuess: () => void;
  resetGame: () => void;
  setCurrentGuess: (guess: string) => void;
  setEditIndex: (index: number | null) => void;
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
  editIndex: null,

  startGame: (mode, word, letterCount, hardMode) => {
    clearActiveGame(toActiveGameSlot(mode, letterCount, hardMode));

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
      hintTile: null,
      maxAttempts: letterCount + 1,
      startedAt: new Date().toISOString(),
    };
    set({
      session,
      currentGuess: '',
      error: null,
      pendingInputs: [],
      hintTile: null,
      editIndex: null,
    });
  },

  addLetter: (letter) => {
    const { session, currentGuess, editIndex } = get();
    if (!session || session.status !== 'playing') return;
    const upper = letter.toUpperCase();

    // Replace a selected letter in-place (keeps the rest of the sequence).
    if (editIndex != null && editIndex >= 0 && editIndex < currentGuess.length) {
      const chars = currentGuess.split('');
      chars[editIndex] = upper;
      const nextIndex = editIndex + 1;
      set({
        currentGuess: chars.join(''),
        editIndex: nextIndex < chars.length ? nextIndex : null,
      });
      return;
    }

    if (currentGuess.length >= session.letterCount) return;
    set({ currentGuess: currentGuess + upper, editIndex: null });
  },

  removeLetter: () => {
    const { currentGuess, editIndex } = get();
    if (currentGuess.length === 0) return;

    if (editIndex != null && editIndex < currentGuess.length) {
      const chars = currentGuess.split('');
      chars.splice(editIndex, 1);
      const next = chars.join('');
      set({
        currentGuess: next,
        editIndex: next.length === 0 ? null : Math.min(editIndex, next.length - 1),
      });
      return;
    }

    set({ currentGuess: currentGuess.slice(0, -1), editIndex: null });
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
        // Ghost hint is current-row only — clear whether the letter was typed or not.
        hintTile: null,
      },
      currentGuess: '',
      error: null,
      hintTile: null,
      editIndex: null,
    });
  },

  resetGame: () =>
    set({
      session: null,
      currentGuess: '',
      error: null,
      pendingInputs: [],
      hintTile: null,
      editIndex: null,
    }),

  setCurrentGuess: (guess) => set({ currentGuess: guess, editIndex: null }),

  setEditIndex: (index) => {
    const { session, currentGuess, isRevealing, editIndex } = get();
    if (!session || session.status !== 'playing' || isRevealing) return;
    if (index === null) {
      set({ editIndex: null });
      return;
    }
    // Filled tiles, or the next empty slot (append caret).
    if (index < 0 || index > currentGuess.length || index >= session.letterCount) {
      return;
    }
    // Tap again to deselect.
    set({ editIndex: editIndex === index ? null : index });
  },

  restoreSession: (session) => {
    // Restore persisted ghost hint. Older saves only had letterHintUsed —
    // regenerate so the rewarded hint is not lost after reopen.
    let hintTile = session.hintTile ?? null;
    let nextSession = session;
    if (session.letterHintUsed && !hintTile && session.status === 'playing') {
      hintTile = pickLetterHint(session.word, session.feedback);
      nextSession = { ...session, hintTile };
    }
    set({
      session: nextSession,
      currentGuess: '',
      error: null,
      pendingInputs: [],
      hintTile,
      editIndex: null,
    });
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
    // Persist immediately — rewarded progress counts as an in-progress game
    // even with zero guesses typed yet.
    const next = get().session;
    if (next?.status === 'playing') {
      saveActiveGame(next);
    }
  },

  useLetterHint: () => {
    const { session } = get();
    if (!session || session.status !== 'playing' || session.letterHintUsed) return;

    const hintTile = pickLetterHint(session.word, session.feedback);

    set({
      session: {
        ...session,
        letterHintUsed: true,
        hintTile,
      },
      hintTile,
    });
    // Persist immediately so the ghost survives app kill / mode switches.
    const next = get().session;
    if (next) {
      saveActiveGame(next);
    }
  },
}));
