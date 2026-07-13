jest.mock('../firestoreService', () => ({
  submitLeaderboardScore: jest.fn(),
  getLeaderboard: jest.fn(),
}));

jest.mock('../syncQueue', () => ({
  enqueueEvent: jest.fn(),
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../../stores/statsStore', () => ({
  useStatsStore: {
    getState: jest.fn(),
  },
}));

jest.mock('../storage', () => ({
  getStats: jest.fn(),
  getEndlessStreak: jest.fn(),
  getEndlessTotalWords: jest.fn(),
}));

jest.mock('../endlessLeaderboardCounters', () => ({
  applyEndlessEndCounters: jest.fn(),
  resolveDailyLeaderboardScore: jest.fn((won: boolean, current?: number) =>
    won ? (current && current > 0 ? current : 1) : undefined,
  ),
}));

jest.mock('../leaderboardMetrics', () => ({
  getLeaderboardMetrics: jest.fn(),
}));

import * as firestoreService from '../firestoreService';
import * as syncQueue from '../syncQueue';
import { useAuthStore } from '../../stores/authStore';
import { useStatsStore } from '../../stores/statsStore';
import { getLeaderboardMetrics } from '../leaderboardMetrics';
import {
  applyEndlessEndCounters,
  resolveDailyLeaderboardScore,
} from '../endlessLeaderboardCounters';
import {
  getEndlessStreak,
  getEndlessTotalWords,
} from '../storage';
import {
  getLeaderboardData,
  reconcileLocalLeaderboardScores,
  syncLeaderboardForSession,
} from '../leaderboardService';

const authGetState = useAuthStore.getState as jest.Mock;
const statsGetState = useStatsStore.getState as jest.Mock;
const submitLeaderboardScore =
  firestoreService.submitLeaderboardScore as jest.Mock;
const getLeaderboard = firestoreService.getLeaderboard as jest.Mock;
const enqueueEvent = syncQueue.enqueueEvent as jest.Mock;
const mockedGetEndlessStreak = getEndlessStreak as jest.Mock;
const mockedGetEndlessTotalWords = getEndlessTotalWords as jest.Mock;
const mockedGetLeaderboardMetrics = getLeaderboardMetrics as jest.Mock;
const mockedApplyEndlessEndCounters = applyEndlessEndCounters as jest.Mock;
const mockedResolveDailyLeaderboardScore =
  resolveDailyLeaderboardScore as jest.Mock;

describe('leaderboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authGetState.mockReturnValue({
      isLoggedIn: true,
      playerId: 'uid-1',
      playerName: 'Player One',
    });
    statsGetState.mockReturnValue({
      stats: {
        perModeStreaks: {
          daily_normal: { current: 1 },
          daily_hard: { current: 0 },
        },
      },
    });
    mockedGetEndlessStreak.mockImplementation((hardMode: boolean) =>
      hardMode ? 0 : 1,
    );
    mockedGetEndlessTotalWords.mockReturnValue(1);
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 1,
      endlessStreak: 1,
      endlessTotalWords: 1,
      bestStreak: 1,
      sharpshooter: 1,
    });
    enqueueEvent.mockResolvedValue(true);
  });

  it('reconcile publishes values from getLeaderboardMetrics only', async () => {
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 7,
      endlessStreak: 5,
      endlessTotalWords: 99,
      bestStreak: 12,
      sharpshooter: 8,
    });
    submitLeaderboardScore.mockResolvedValue(true);

    await reconcileLocalLeaderboardScores();

    expect(mockedGetLeaderboardMetrics).toHaveBeenCalled();
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'daily_streak',
      'uid-1',
      'Player One',
      7,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'endless_streak',
      'uid-1',
      'Player One',
      5,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'endless_total',
      'uid-1',
      'Player One',
      99,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'best_streak',
      'uid-1',
      'Player One',
      12,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'sharpshooter',
      'uid-1',
      'Player One',
      8,
    );
    // Must not derive from direct storage mocks when metrics seam is present.
    expect(mockedGetEndlessStreak).not.toHaveBeenCalled();
    expect(mockedGetEndlessTotalWords).not.toHaveBeenCalled();
  });

  it('does not cache a failed reconcile as complete', async () => {
    submitLeaderboardScore.mockResolvedValueOnce(false);

    await reconcileLocalLeaderboardScores();
    await reconcileLocalLeaderboardScores();

    expect(submitLeaderboardScore).toHaveBeenCalledTimes(10);
  });

  it('surfaces leaderboard load failures instead of rendering empty data', async () => {
    getLeaderboard.mockRejectedValue(new Error('network down'));

    await expect(getLeaderboardData('daily_streak')).rejects.toThrow(
      'network down',
    );
  });

  it('syncLeaderboardForSession endless path mutates counters then publishes metrics', async () => {
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 1,
      endlessStreak: 5,
      endlessTotalWords: 99,
      bestStreak: 5,
      sharpshooter: 3,
    });
    submitLeaderboardScore.mockResolvedValue(true);

    await syncLeaderboardForSession({
      id: 'endless-won-1',
      mode: 'endless',
      status: 'won',
      hardMode: false,
    });

    expect(mockedApplyEndlessEndCounters).toHaveBeenCalledWith({
      sessionId: 'endless-won-1',
      won: true,
      hardMode: false,
    });
    expect(mockedGetLeaderboardMetrics).toHaveBeenCalled();
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'endless_streak',
      'uid-1',
      'Player One',
      5,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'endless_total',
      'uid-1',
      'Player One',
      99,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'best_streak',
      'uid-1',
      'Player One',
      5,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'sharpshooter',
      'uid-1',
      'Player One',
      3,
    );
    expect(mockedGetEndlessStreak).not.toHaveBeenCalled();
    expect(mockedGetEndlessTotalWords).not.toHaveBeenCalled();
  });

  it('syncLeaderboardForSession daily win publishes metrics dailyStreak', async () => {
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 7,
      endlessStreak: 1,
      endlessTotalWords: 1,
      bestStreak: 7,
      sharpshooter: 2,
    });
    submitLeaderboardScore.mockResolvedValue(true);

    await syncLeaderboardForSession({
      id: 'daily-won-1',
      mode: 'daily',
      status: 'won',
      hardMode: false,
    });

    expect(mockedApplyEndlessEndCounters).not.toHaveBeenCalled();
    expect(mockedGetLeaderboardMetrics).toHaveBeenCalled();
    expect(mockedResolveDailyLeaderboardScore).toHaveBeenCalledWith(true, 7);
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'daily_streak',
      'uid-1',
      'Player One',
      7,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'best_streak',
      'uid-1',
      'Player One',
      7,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'sharpshooter',
      'uid-1',
      'Player One',
      2,
    );
  });

  it('syncLeaderboardForSession random win publishes career boards only', async () => {
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 0,
      endlessStreak: 0,
      endlessTotalWords: 0,
      bestStreak: 4,
      sharpshooter: 6,
    });
    submitLeaderboardScore.mockResolvedValue(true);

    await syncLeaderboardForSession({
      id: 'random-won-1',
      mode: 'random',
      status: 'won',
      hardMode: false,
    });

    expect(mockedApplyEndlessEndCounters).not.toHaveBeenCalled();
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'best_streak',
      'uid-1',
      'Player One',
      4,
    );
    expect(submitLeaderboardScore).toHaveBeenCalledWith(
      'sharpshooter',
      'uid-1',
      'Player One',
      6,
    );
    expect(submitLeaderboardScore).not.toHaveBeenCalledWith(
      'daily_streak',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
