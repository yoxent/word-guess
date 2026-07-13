import { computeLeaderboardMetrics } from '../leaderboardMetrics';

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
});
