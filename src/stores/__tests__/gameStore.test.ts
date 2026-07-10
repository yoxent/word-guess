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

jest.mock('../../constants/config', () => ({
  config: {
    maxExtraGuessesFree: 1,
    maxExtraGuessesPro: 3,
  },
}));

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
      hintLetter: null,
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
  });

  describe('addLetter', () => {
    beforeEach(() => {
      useGameStore.getState().startGame('random', 'APPLE', 5, false);
    });

    it('adds letter to current guess', () => {
      useGameStore.getState().addLetter('A');
      expect(useGameStore.getState().currentGuess).toBe('A');
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
      const colors1 = useGameStore.getState().session?.keyColors;
      // Should have colors for C, R, A, N, E
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
