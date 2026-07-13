import {
  computeLeaderboardMetrics,
  computeSharpshooterScore,
} from '../leaderboardMetrics';

describe('computeLeaderboardMetrics', () => {
  it('uses max of daily_normal and daily_hard current streaks', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: {
          daily_normal: { current: 2, max: 5 },
          daily_hard: { current: 4, max: 4 },
        },
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
        endlessTotalWords: 0,
      }).dailyStreak,
    ).toBe(4);
  });

  it('defaults missing daily streaks to 0', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: null,
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
        endlessTotalWords: 0,
      }).dailyStreak,
    ).toBe(0);
  });

  it('uses max of endless normal/hard current runs', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: {},
        endlessStreakNormal: 3,
        endlessStreakHard: 1,
        endlessTotalWords: 10,
      }).endlessStreak,
    ).toBe(3);
  });

  it('passes through endless total words', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: {},
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
        endlessTotalWords: 42,
      }).endlessTotalWords,
    ).toBe(42);
  });

  it('uses maxStreak and per-mode max for best streak', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: {
          daily_normal: { current: 1, max: 8 },
          random_hard: { current: 0, max: 12 },
        },
        maxStreak: 10,
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
        endlessTotalWords: 0,
      }).bestStreak,
    ).toBe(12);
  });

  it('computes sharpshooter from guess distribution', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: {},
        guessDistribution: [0, 2, 3, 4, 1],
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
        endlessTotalWords: 0,
      }).sharpshooter,
    ).toBe(2 * 3 + 3 * 2 + 4 * 1);
  });
});

describe('computeSharpshooterScore', () => {
  it('returns 0 for empty distribution', () => {
    expect(computeSharpshooterScore(undefined)).toBe(0);
    expect(computeSharpshooterScore([])).toBe(0);
  });
});
