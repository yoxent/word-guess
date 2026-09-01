// Mock dependencies before import
jest.mock('../../services/storage', () => ({
  mmkvZustandStorage: {
    getItem: jest.fn().mockReturnValue(null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
  getActiveGame: jest.fn().mockReturnValue(null),
  saveActiveGame: jest.fn(),
  clearActiveGame: jest.fn(),
  toActiveGameSlot: (
    mode: string,
    letterCount: number,
    hardMode: boolean,
  ) => ({ mode, letterCount, hardMode }),
  activeGameSlotFromSession: (session: {
    mode: string;
    letterCount: number;
    hardMode: boolean;
  }) => ({
    mode: session.mode,
    letterCount: session.letterCount,
    hardMode: session.hardMode,
  }),
}));

jest.mock('../../services/sound', () => ({
  init: jest.fn(),
  playKeyPress: jest.fn(),
  playReveal: jest.fn(),
  playWin: jest.fn(),
  playLoss: jest.fn(),
}));

jest.mock('../dictionaryStore', () => ({
  useDictionaryStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn().mockReturnValue({
      hardModeEnabled: false,
      isPro: false,
    }),
  },
}));

jest.mock('../../constants/config', () => {
  const baseAttempts = (letterCount: number) => letterCount + 1;
  const config = {
    maxExtraGuessesFree: 1,
    maxExtraGuessesPro: 2,
    proBonusAttempts: 1,
    baseAttempts,
  };
  return {
    config,
    isForceMaxBoardForSpacing: () => false,
    computeTargetMaxAttempts: (
      letterCount: number,
      extraGuessesUsed: number,
      isPro: boolean,
    ) =>
      baseAttempts(letterCount) +
      (isPro ? config.proBonusAttempts : 0) +
      extraGuessesUsed,
  };
});

import { useGameStore } from '../gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    // Setup dictionaryStore mock to return true by default
    const dictionaryStore = require('../dictionaryStore');
    const mockIsValidGuess = jest.fn(() => true);
    dictionaryStore.useDictionaryStore.getState.mockReturnValue({
      isValidGuess: mockIsValidGuess,
    });

    useGameStore.setState({
      session: null,
      currentGuess: '',
      error: null,
      isRevealing: false,
      pendingInputs: [],
      hintTile: null,
      editIndex: null,
    });
  });

  describe('startGame', () => {
    it('creates a new session', () => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      const session = useGameStore.getState().session;
      expect(session).not.toBeNull();
      expect(session?.word).toBe('APPLE');
      expect(session?.letterCount).toBe(5);
      expect(session?.status).toBe('playing');
      expect(session?.guesses).toEqual([]);
    });

    it('sets hard mode', () => {
      useGameStore.getState().startGame('random', 'APPLE', 5, true);
      expect(useGameStore.getState().session?.hardMode).toBe(true);
    });

    it('calculates max attempts as letterCount + 1', () => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      expect(useGameStore.getState().session?.maxAttempts).toBe(6);
    });

    it('marks a tutorial session without clearing a real continue slot', () => {
      const { clearActiveGame } = require('../../services/storage');
      (clearActiveGame as jest.Mock).mockClear();
      useGameStore.getState().startGame('random', 'ENJOY', 5, false, true);
      expect(useGameStore.getState().session?.isTutorial).toBe(true);
      expect(useGameStore.getState().session?.word).toBe('ENJOY');
      expect(useGameStore.getState().session?.maxAttempts).toBe(6);
      expect(clearActiveGame).not.toHaveBeenCalled();
    });

    it('resets rewarded hints when starting a new game', () => {
      const { clearActiveGame } = require('../../services/storage');
      useGameStore.setState({
        session: {
          id: 'old',
          mode: 'random',
          word: 'APPLE',
          letterCount: 5,
          guesses: [],
          feedback: [],
          keyColors: {},
          status: 'playing',
          hardMode: false,
          extraGuessesUsed: 2,
          letterHintUsed: true,
          maxAttempts: 8,
          startedAt: new Date().toISOString(),
        },
        hintTile: { index: 1, letter: 'P' },
      });

      useGameStore.getState().startGame('random', 'CRANE', 5, false);
      const session = useGameStore.getState().session;

      expect(clearActiveGame).toHaveBeenCalledWith({
        mode: 'random',
        letterCount: 5,
        hardMode: false,
      });
      expect(session?.extraGuessesUsed).toBe(0);
      expect(session?.letterHintUsed).toBe(false);
      expect(session?.maxAttempts).toBe(6);
      expect(useGameStore.getState().hintTile).toBeNull();
    });
  });

  describe('addLetter', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
    });

    it('adds letter to current guess', () => {
      useGameStore.getState().addLetter('A');
      expect(useGameStore.getState().currentGuess).toBe('A');
    });

    it('keeps hintTile when letters are typed (ghost until submit)', () => {
      useGameStore.setState({ hintTile: { index: 0, letter: 'A' } });
      useGameStore.getState().addLetter('A');
      expect(useGameStore.getState().hintTile).toEqual({ index: 0, letter: 'A' });
    });

    it('replaces a selected letter without deleting the rest', () => {
      useGameStore.getState().addLetter('A');
      useGameStore.getState().addLetter('B');
      useGameStore.getState().addLetter('C');
      useGameStore.getState().setEditIndex(1);
      useGameStore.getState().addLetter('X');
      expect(useGameStore.getState().currentGuess).toBe('AXC');
      expect(useGameStore.getState().editIndex).toBe(2);
    });

    it('does not exceed word length', () => {
      for (let i = 0; i < 7; i++) {
        useGameStore.getState().addLetter('A');
      }
      expect(useGameStore.getState().currentGuess).toHaveLength(5);
    });

    it('does nothing if no session', () => {
      useGameStore.setState({ session: null });
      useGameStore.getState().addLetter('A');
      expect(useGameStore.getState().currentGuess).toBe('');
    });

    it('does nothing if game not playing', () => {
      useGameStore.setState({
        session: { ...useGameStore.getState().session!, status: 'won' },
      });
      useGameStore.getState().addLetter('A');
      expect(useGameStore.getState().currentGuess).toBe('');
    });
  });

  describe('removeLetter', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      useGameStore.getState().addLetter('A');
      useGameStore.getState().addLetter('P');
    });

    it('removes last letter', () => {
      useGameStore.getState().removeLetter();
      expect(useGameStore.getState().currentGuess).toBe('A');
    });

    it('removes the selected letter and keeps neighbors', () => {
      useGameStore.getState().addLetter('P');
      useGameStore.getState().setEditIndex(1);
      useGameStore.getState().removeLetter();
      expect(useGameStore.getState().currentGuess).toBe('AP');
      expect(useGameStore.getState().editIndex).toBe(1);
    });

    it('does nothing when empty', () => {
      useGameStore.setState({ currentGuess: '' });
      useGameStore.getState().removeLetter();
      expect(useGameStore.getState().currentGuess).toBe('');
    });
  });

  describe('submitGuess', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
    });

    it('submits valid guess and records feedback', () => {
      useGameStore.setState({ currentGuess: 'CRANE' });
      useGameStore.getState().submitGuess();
      const state = useGameStore.getState();
      expect(state.session?.guesses).toContain('CRANE');
      expect(state.session?.feedback).toHaveLength(1);
      expect(state.currentGuess).toBe('');
    });

    it('marks win when guess matches word', () => {
      useGameStore.setState({ currentGuess: 'APPLE' });
      useGameStore.getState().submitGuess();
      const session = useGameStore.getState().session;
      expect(session?.pendingStatus).toBe('won');
      expect(session?.status).toBe('playing');
      useGameStore.getState().finalizeRevealOutcome();
      expect(useGameStore.getState().session?.status).toBe('won');
    });

    it.skip('marks loss when max attempts reached', () => {
      // TODO: Fix mock issue with dictionaryStore
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      const session = useGameStore.getState().session!;
      expect(session.maxAttempts).toBe(6);

      // Submit wrong guesses until loss
      for (let i = 0; i < 6; i++) {
        useGameStore.setState({ currentGuess: 'CRANE' });
        useGameStore.getState().submitGuess();
      }

      const finalSession = useGameStore.getState().session;
      expect(finalSession?.guesses.length).toBe(6);
      expect(finalSession?.status).toBe('lost');
    });

    it('does nothing if not enough letters', () => {
      useGameStore.setState({ currentGuess: 'APP' });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().session?.guesses).toHaveLength(0);
    });

    it('does nothing if revealing', () => {
      useGameStore.setState({
        currentGuess: 'APPLE',
        isRevealing: true,
      });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().session?.guesses).toHaveLength(0);
    });

    it('clears hintTile on successful submit', () => {
      useGameStore.setState({
        currentGuess: 'CRANE',
        hintTile: { index: 2, letter: 'P' },
      });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().hintTile).toBeNull();
      expect(useGameStore.getState().session?.guesses).toContain('CRANE');
    });

    it('keeps hintTile when submit fails validation', () => {
      const dictionaryStore = require('../dictionaryStore');
      dictionaryStore.useDictionaryStore.getState.mockReturnValue({
        isValidGuess: jest.fn(() => false),
      });

      useGameStore.setState({
        currentGuess: 'XXXXX',
        hintTile: { index: 0, letter: 'A' },
      });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().hintTile).toEqual({ index: 0, letter: 'A' });
      expect(useGameStore.getState().error).toBe('Not in word list');
    });

    it('rejects a valid but unscripted tutorial guess without consuming a row', () => {
      useGameStore.getState().startGame('random', 'ENJOY', 5, false, true);
      useGameStore.setState({
        currentGuess: 'PLANT',
        session: {
          ...useGameStore.getState().session!,
          guesses: ['CRANE', 'LEMON'],
        },
      });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().session?.guesses).toEqual(['CRANE', 'LEMON']);
      expect(useGameStore.getState().currentGuess).toBe('PLANT');
      expect(useGameStore.getState().error).toBe('Not quite — use the clues!');
    });

    it('accepts ENVOY as the third tutorial guess without winning', () => {
      useGameStore.getState().startGame('random', 'ENJOY', 5, false, true);
      useGameStore.setState({
        currentGuess: 'ENVOY',
        session: {
          ...useGameStore.getState().session!,
          guesses: ['CRANE', 'LEMON'],
        },
      });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().session?.guesses).toContain('ENVOY');
      expect(useGameStore.getState().session?.pendingStatus).toBeUndefined();
    });

    it('accepts ENJOY as the tutorial solution', () => {
      useGameStore.getState().startGame('random', 'ENJOY', 5, false, true);
      useGameStore.setState({
        currentGuess: 'ENJOY',
        session: {
          ...useGameStore.getState().session!,
          guesses: ['CRANE', 'LEMON', 'ENVOY'],
        },
      });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().session?.guesses).toContain('ENJOY');
      expect(useGameStore.getState().session?.pendingStatus).toBe('won');
    });
  });

  describe('useLetterHint', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
    });

    it('sets hintTile at a non-correct position and marks letterHintUsed', () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      useGameStore.getState().useLetterHint();
      const hint = useGameStore.getState().hintTile;
      expect(hint).not.toBeNull();
      expect(hint?.letter).toBe(useGameStore.getState().session!.word[hint!.index]);
      expect(useGameStore.getState().session?.letterHintUsed).toBe(true);
      randomSpy.mockRestore();
    });

    it('skips positions already marked correct', () => {
      useGameStore.setState({
        session: {
          ...useGameStore.getState().session!,
          feedback: [
            [
              { letter: 'A', feedback: 'correct' },
              { letter: 'X', feedback: 'absent' },
              { letter: 'X', feedback: 'absent' },
              { letter: 'X', feedback: 'absent' },
              { letter: 'X', feedback: 'absent' },
            ],
          ],
          guesses: ['AXXXX'],
        },
      });
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      useGameStore.getState().useLetterHint();
      expect(useGameStore.getState().hintTile?.index).not.toBe(0);
      randomSpy.mockRestore();
    });

    it('persists hintTile on the session so saves keep the ghost letter', () => {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      useGameStore.getState().useLetterHint();
      const hint = useGameStore.getState().hintTile;
      expect(useGameStore.getState().session?.hintTile).toEqual(hint);
      randomSpy.mockRestore();
    });

    it('saves the active game immediately after a letter hint ad reward', () => {
      const { saveActiveGame } = require('../../services/storage');
      useGameStore.getState().useLetterHint();
      expect(saveActiveGame).toHaveBeenCalled();
      const saved = (saveActiveGame as jest.Mock).mock.calls.at(-1)?.[0];
      expect(saved.letterHintUsed).toBe(true);
      expect(saved.hintTile).toEqual(useGameStore.getState().hintTile);
    });

    it('does nothing if letter hint already used', () => {
      useGameStore.setState({
        session: { ...useGameStore.getState().session!, letterHintUsed: true },
      });
      useGameStore.getState().useLetterHint();
      expect(useGameStore.getState().hintTile).toBeNull();
    });
  });

  describe('restoreSession', () => {
    it('restores persisted hintTile from the session', () => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      const saved = {
        ...useGameStore.getState().session!,
        letterHintUsed: true,
        hintTile: { index: 2, letter: 'P' },
      };
      useGameStore.getState().restoreSession(saved);
      expect(useGameStore.getState().hintTile).toEqual({ index: 2, letter: 'P' });
      expect(useGameStore.getState().session?.letterHintUsed).toBe(true);
    });

    it('regenerates hintTile for older saves that only set letterHintUsed', () => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      const saved = {
        ...useGameStore.getState().session!,
        letterHintUsed: true,
        hintTile: null,
      };
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
      useGameStore.getState().restoreSession(saved);
      const hint = useGameStore.getState().hintTile;
      expect(hint).not.toBeNull();
      expect(hint?.letter).toBe('APPLE'[hint!.index]);
      expect(useGameStore.getState().session?.hintTile).toEqual(hint);
      randomSpy.mockRestore();
    });
  });

  describe('resetGame', () => {
    it('clears all state', () => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      useGameStore.getState().addLetter('A');
      useGameStore.getState().resetGame();
      const state = useGameStore.getState();
      expect(state.session).toBeNull();
      expect(state.currentGuess).toBe('');
      expect(state.error).toBeNull();
    });
  });

  describe('keyColors', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
    });

    it('accumulates key colors from guesses', () => {
      // Word is APPLE, first guess CRANE
      useGameStore.setState({ currentGuess: 'CRANE' });
      useGameStore.getState().submitGuess();
      // Colors apply after reveal finishes, not on submit
      expect(useGameStore.getState().session?.pendingKeyColors).toBeDefined();
      expect(Object.keys(useGameStore.getState().session?.pendingKeyColors || {}).length).toBeGreaterThan(0);
      useGameStore.getState().finalizeRevealOutcome();
      const colors1 = useGameStore.getState().session?.keyColors;
      expect(colors1).toBeDefined();
      expect(Object.keys(colors1 || {}).length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('shows error for invalid word', () => {
      const dictionaryStore = require('../dictionaryStore');
      dictionaryStore.useDictionaryStore.getState.mockReturnValue({
        isValidGuess: jest.fn(() => false),
      });

      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      useGameStore.setState({ currentGuess: 'XXXXX' });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().error).toBe('Not in word list');
    });

    it('clears error on successful guess', () => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
      useGameStore.setState({ error: 'Some error' });
      useGameStore.setState({ currentGuess: 'CRANE' });
      useGameStore.getState().submitGuess();
      expect(useGameStore.getState().error).toBeNull();
    });
  });
});
