import {
  applyEndlessEndCounters,
  resolveDailyLeaderboardScore,
} from '../endlessLeaderboardCounters';

jest.mock('../storage', () => ({
  getEndlessStreak: jest.fn(),
  setEndlessStreak: jest.fn(),
  getEndlessTotalWords: jest.fn(),
  incrementEndlessTotalWords: jest.fn(),
}));

import {
  getEndlessStreak,
  setEndlessStreak,
  getEndlessTotalWords,
  incrementEndlessTotalWords,
} from '../storage';

describe('resolveDailyLeaderboardScore', () => {
  it('never returns 0 for a win', () => {
    expect(resolveDailyLeaderboardScore(true, 0)).toBe(1);
    expect(resolveDailyLeaderboardScore(true, undefined)).toBe(1);
    expect(resolveDailyLeaderboardScore(true, 3)).toBe(3);
  });

  it('returns undefined when not a win', () => {
    expect(resolveDailyLeaderboardScore(false, 5)).toBeUndefined();
  });
});

describe('applyEndlessEndCounters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getEndlessStreak as jest.Mock).mockReturnValue(2);
    (getEndlessTotalWords as jest.Mock).mockReturnValue(10);
    (incrementEndlessTotalWords as jest.Mock).mockImplementation(() => {
      (getEndlessTotalWords as jest.Mock).mockReturnValue(11);
      return 11;
    });
  });

  it('increments streak and total on win', () => {
    const result = applyEndlessEndCounters({
      sessionId: 'win-1',
      won: true,
      hardMode: false,
    });
    expect(setEndlessStreak).toHaveBeenCalledWith(3, false);
    expect(incrementEndlessTotalWords).toHaveBeenCalled();
    expect(result).toEqual({
      displayStreak: 3,
      endlessStreak: 3,
      endlessTotalWords: 11,
    });
  });

  it('resets board streak to 0 on loss but keeps display streak', () => {
    const result = applyEndlessEndCounters({
      sessionId: 'loss-1',
      won: false,
      hardMode: true,
    });
    expect(setEndlessStreak).toHaveBeenCalledWith(0, true);
    expect(result.displayStreak).toBe(2);
    expect(result.endlessStreak).toBe(0);
    expect(result.endlessTotalWords).toBe(11);
  });

  it('is idempotent for the same session id', () => {
    applyEndlessEndCounters({ sessionId: 'dup-1', won: true, hardMode: false });
    applyEndlessEndCounters({ sessionId: 'dup-1', won: true, hardMode: false });
    expect(incrementEndlessTotalWords).toHaveBeenCalledTimes(1);
  });
});
