import type { GameSession } from '../types';
import {
  hasActiveProgress,
  matchesResumeTarget,
  shouldOfferContinue,
  shouldRestoreActiveGame,
} from '../activeGame';

function makeSession(overrides: Partial<GameSession> = {}): GameSession {
  return {
    id: 'test',
    mode: 'random',
    word: 'APPLE',
    letterCount: 6,
    guesses: [],
    feedback: [],
    keyColors: {},
    status: 'playing',
    hardMode: false,
    extraGuessesUsed: 0,
    letterHintUsed: false,
    maxAttempts: 7,
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('activeGame', () => {
  describe('matchesResumeTarget', () => {
    it('treats any random save as the same slot regardless of letter count', () => {
      const saved = makeSession({ mode: 'random', letterCount: 6 });
      expect(matchesResumeTarget(saved, 'random', 9, false)).toBe(true);
    });

    it('still requires letter count to match for endless', () => {
      const saved = makeSession({ mode: 'endless', letterCount: 6 });
      expect(matchesResumeTarget(saved, 'endless', 6, false)).toBe(true);
      expect(matchesResumeTarget(saved, 'endless', 8, false)).toBe(false);
    });
  });

  describe('shouldOfferContinue', () => {
    it('offers continue for random when letter counts differ', () => {
      const saved = makeSession({
        mode: 'random',
        letterCount: 6,
        guesses: ['CRANE'],
      });
      expect(shouldOfferContinue(saved, 'random', 10, false)).toBe(true);
    });

    it('does not offer continue for random without progress', () => {
      const saved = makeSession({ mode: 'random', letterCount: 6 });
      expect(shouldOfferContinue(saved, 'random', 10, false)).toBe(false);
    });
  });

  describe('shouldRestoreActiveGame', () => {
    it('restores random saves even when route letter count differs', () => {
      const saved = makeSession({ mode: 'random', letterCount: 6 });
      expect(shouldRestoreActiveGame(saved, 'random', 10, false)).toBe(true);
    });

    it('requires letter count match for non-random modes', () => {
      const saved = makeSession({ mode: 'endless', letterCount: 6 });
      expect(shouldRestoreActiveGame(saved, 'endless', 6, false)).toBe(true);
      expect(shouldRestoreActiveGame(saved, 'endless', 8, false)).toBe(false);
    });

    it('does not restore a daily save from a previous UTC day', () => {
      const saved = makeSession({
        mode: 'daily',
        letterCount: 5,
        guesses: ['CRANE'],
        startedAt: '2020-01-01T12:00:00.000Z',
      });
      expect(shouldRestoreActiveGame(saved, 'daily', 5, false)).toBe(false);
      expect(shouldOfferContinue(saved, 'daily', 5, false)).toBe(false);
    });

    it('restores a daily save from today UTC', () => {
      const saved = makeSession({
        mode: 'daily',
        letterCount: 5,
        guesses: ['CRANE'],
        startedAt: new Date().toISOString(),
      });
      expect(shouldRestoreActiveGame(saved, 'daily', 5, false)).toBe(true);
      expect(shouldOfferContinue(saved, 'daily', 5, false)).toBe(true);
    });

    it('ignores startedAt for non-daily modes', () => {
      const saved = makeSession({
        mode: 'endless',
        letterCount: 6,
        guesses: ['CRANES'],
        startedAt: '2020-01-01T12:00:00.000Z',
      });
      expect(shouldRestoreActiveGame(saved, 'endless', 6, false)).toBe(true);
    });
  });

  describe('hasActiveProgress', () => {
    it('counts rewarded hints as progress', () => {
      const saved = makeSession({ letterHintUsed: true });
      expect(hasActiveProgress(saved)).toBe(true);
    });
  });
});
