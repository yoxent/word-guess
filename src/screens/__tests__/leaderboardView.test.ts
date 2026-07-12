import {
  resolveLeaderboardView,
  shouldApplyLeaderboardResult,
} from '../leaderboardView';
import type { LeaderboardData } from '../../types';

const dailyData: LeaderboardData = {
  type: 'daily_streak',
  lastUpdated: '2026-07-12T00:00:00.000Z',
  entries: [
    {
      playerId: 'daily-player',
      playerName: 'Daily Only Player',
      score: 9,
      rank: 1,
      isCurrentPlayer: false,
    },
  ],
};

describe('resolveLeaderboardView', () => {
  it('shows loading while a tab fetch is in flight, even if previous data exists', () => {
    // Reproduces: switching tabs left previous entries visible because
    // isLoading && data still rendered the old list.
    expect(
      resolveLeaderboardView({
        isLoading: true,
        error: null,
        data: dailyData,
      }),
    ).toBe('loading');
  });

  it('shows loading when switching tabs clears data', () => {
    expect(
      resolveLeaderboardView({
        isLoading: true,
        error: null,
        data: null,
      }),
    ).toBe('loading');
  });

  it('shows list when loaded with entries', () => {
    expect(
      resolveLeaderboardView({
        isLoading: false,
        error: null,
        data: dailyData,
      }),
    ).toBe('list');
  });

  it('shows empty when loaded with no entries', () => {
    expect(
      resolveLeaderboardView({
        isLoading: false,
        error: null,
        data: { type: 'endless_streak', entries: [], lastUpdated: '' },
      }),
    ).toBe('empty');
  });

  it('shows error when load failed', () => {
    expect(
      resolveLeaderboardView({
        isLoading: false,
        error: 'Failed to load leaderboard. Please try again.',
        data: null,
      }),
    ).toBe('error');
  });
});

describe('shouldApplyLeaderboardResult', () => {
  it('rejects a stale response from a previous tab', () => {
    expect(
      shouldApplyLeaderboardResult(1, 2, 'daily_streak', 'endless_streak'),
    ).toBe(false);
  });

  it('accepts the latest response for the active tab', () => {
    expect(
      shouldApplyLeaderboardResult(2, 2, 'endless_streak', 'endless_streak'),
    ).toBe(true);
  });
});
