jest.mock('../firestoreService', () => ({
  getLeaderboard: jest.fn(),
  getLeaderboardRank: jest.fn(),
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

jest.mock('../submitLeaderboardGame', () => ({
  callSubmitLeaderboardGame: jest.fn(),
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
import { callSubmitLeaderboardGame } from '../submitLeaderboardGame';
import {
  getLeaderboardData,
  reconcileLocalLeaderboardScores,
  syncLeaderboardForSession,
} from '../leaderboardService';

const authGetState = useAuthStore.getState as jest.Mock;
const statsGetState = useStatsStore.getState as jest.Mock;
const getLeaderboard = firestoreService.getLeaderboard as jest.Mock;
const enqueueEvent = syncQueue.enqueueEvent as jest.Mock;
const mockedGetEndlessStreak = getEndlessStreak as jest.Mock;
const mockedGetEndlessTotalWords = getEndlessTotalWords as jest.Mock;
const mockedGetLeaderboardMetrics = getLeaderboardMetrics as jest.Mock;
const mockedApplyEndlessEndCounters = applyEndlessEndCounters as jest.Mock;
const mockedResolveDailyLeaderboardScore =
  resolveDailyLeaderboardScore as jest.Mock;
const mockedCallSubmit = callSubmitLeaderboardGame as jest.Mock;

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
    mockedCallSubmit.mockResolvedValue('ok');
  });

  it('reconcile does not write scores or enqueue', async () => {
    await reconcileLocalLeaderboardScores();

    expect(mockedCallSubmit).not.toHaveBeenCalled();
    expect(enqueueEvent).not.toHaveBeenCalled();
  });

  it('surfaces leaderboard load failures instead of rendering empty data', async () => {
    getLeaderboard.mockRejectedValue(new Error('network down'));

    await expect(getLeaderboardData('daily_streak')).rejects.toThrow(
      'network down',
    );
  });

  it('syncLeaderboardForSession endless win calls the callable once', async () => {
    mockedApplyEndlessEndCounters.mockReturnValue({
      displayStreak: 5,
      endlessStreak: 5,
      endlessTotalWords: 99,
    });
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 1,
      endlessStreak: 5,
      endlessTotalWords: 99,
      bestStreak: 5,
      sharpshooter: 3,
    });

    await syncLeaderboardForSession({
      id: 'endless-won-1',
      mode: 'endless',
      status: 'won',
      hardMode: false,
      completedAt: '2026-09-03T11:00:00.000Z',
    });

    expect(mockedApplyEndlessEndCounters).toHaveBeenCalledWith({
      sessionId: 'endless-won-1',
      won: true,
      hardMode: false,
    });
    expect(mockedCallSubmit).toHaveBeenCalledTimes(1);
    const payload = mockedCallSubmit.mock.calls[0][0];
    expect(payload.sessionId).toBe('endless-won-1');
    expect(payload.claimed).toEqual({
      endlessStreak: 5,
      endlessTotalWords: 99,
      bestStreak: 5,
      sharpshooter: 3,
    });
    expect(payload.checksum).toEqual(expect.any(String));
    expect(enqueueEvent).not.toHaveBeenCalled();
    expect(mockedGetEndlessStreak).not.toHaveBeenCalled();
    expect(mockedGetEndlessTotalWords).not.toHaveBeenCalled();
  });

  it('syncLeaderboardForSession endless loss does not send run/total claimed keys', async () => {
    mockedApplyEndlessEndCounters.mockReturnValue({
      displayStreak: 4,
      endlessStreak: 4,
      endlessTotalWords: 40,
    });
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 0,
      endlessStreak: 0,
      endlessTotalWords: 40,
      bestStreak: 8,
      sharpshooter: 2,
    });

    await syncLeaderboardForSession({
      id: 'endless-lost-1',
      mode: 'endless',
      status: 'lost',
      hardMode: false,
      completedAt: '2026-09-03T11:00:00.000Z',
    });

    expect(mockedCallSubmit).toHaveBeenCalledTimes(1);
    expect(mockedCallSubmit.mock.calls[0][0].claimed).toEqual({
      bestStreak: 8,
      sharpshooter: 2,
    });
  });

  it('syncLeaderboardForSession daily win publishes metrics dailyStreak once', async () => {
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 7,
      endlessStreak: 1,
      endlessTotalWords: 1,
      bestStreak: 7,
      sharpshooter: 2,
    });

    await syncLeaderboardForSession({
      id: 'daily-won-1',
      mode: 'daily',
      status: 'won',
      hardMode: false,
      completedAt: '2026-09-03T11:00:00.000Z',
    });

    expect(mockedApplyEndlessEndCounters).not.toHaveBeenCalled();
    expect(mockedResolveDailyLeaderboardScore).toHaveBeenCalledWith(true, 7);
    expect(mockedCallSubmit).toHaveBeenCalledTimes(1);
    expect(mockedCallSubmit.mock.calls[0][0].claimed).toEqual({
      dailyStreak: 7,
      bestStreak: 7,
      sharpshooter: 2,
    });
  });

  it('syncLeaderboardForSession random win publishes career boards only', async () => {
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 0,
      endlessStreak: 0,
      endlessTotalWords: 0,
      bestStreak: 4,
      sharpshooter: 6,
    });

    await syncLeaderboardForSession({
      id: 'random-won-1',
      mode: 'random',
      status: 'won',
      hardMode: false,
      completedAt: '2026-09-03T11:00:00.000Z',
    });

    expect(mockedApplyEndlessEndCounters).not.toHaveBeenCalled();
    expect(mockedCallSubmit).toHaveBeenCalledTimes(1);
    expect(mockedCallSubmit.mock.calls[0][0].claimed).toEqual({
      bestStreak: 4,
      sharpshooter: 6,
    });
  });

  it('skips tutorial sessions', async () => {
    await syncLeaderboardForSession({
      id: 'tutorial-1',
      mode: 'daily',
      status: 'won',
      hardMode: false,
      isTutorial: true,
      completedAt: '2026-09-03T11:00:00.000Z',
    });

    expect(mockedCallSubmit).not.toHaveBeenCalled();
    expect(enqueueEvent).not.toHaveBeenCalled();
  });

  it('queues one leaderboard_game when signed out', async () => {
    authGetState.mockReturnValue({
      isLoggedIn: false,
      playerId: null,
      playerName: null,
    });
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 1,
      endlessStreak: 0,
      endlessTotalWords: 0,
      bestStreak: 1,
      sharpshooter: 1,
    });

    await syncLeaderboardForSession({
      id: 'daily-offline-1',
      mode: 'daily',
      status: 'won',
      hardMode: false,
      completedAt: '2026-09-03T11:00:00.000Z',
    });

    expect(mockedCallSubmit).not.toHaveBeenCalled();
    expect(enqueueEvent).toHaveBeenCalledTimes(1);
    expect(enqueueEvent.mock.calls[0][0]).toBe('leaderboard_game');
    expect(enqueueEvent.mock.calls[0][1].checksum).toEqual(expect.any(String));
  });

  it('enqueues when the callable asks to retry', async () => {
    mockedCallSubmit.mockResolvedValue('retry');
    mockedGetLeaderboardMetrics.mockReturnValue({
      dailyStreak: 1,
      endlessStreak: 0,
      endlessTotalWords: 0,
      bestStreak: 1,
      sharpshooter: 1,
    });

    await syncLeaderboardForSession({
      id: 'daily-retry-1',
      mode: 'daily',
      status: 'won',
      hardMode: false,
      completedAt: '2026-09-03T11:00:00.000Z',
    });

    expect(enqueueEvent).toHaveBeenCalledWith(
      'leaderboard_game',
      expect.objectContaining({ sessionId: 'daily-retry-1' }),
    );
  });
});
