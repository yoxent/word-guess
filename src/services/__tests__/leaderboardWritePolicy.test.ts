import {
  resolveLeaderboardWritePlayer,
  shouldWriteLeaderboardScore,
} from '../leaderboardWritePolicy';

describe('shouldWriteLeaderboardScore', () => {
  it('blocks a stale daily score of 0 from overwriting a win streak of 1', () => {
    expect(shouldWriteLeaderboardScore('daily_streak', 0, 1)).toBe(false);
    expect(shouldWriteLeaderboardScore('daily_streak', 1, 0)).toBe(true);
    expect(shouldWriteLeaderboardScore('daily_streak', 2, 1)).toBe(true);
  });

  it('blocks a lower endless total from overwriting a higher one', () => {
    expect(shouldWriteLeaderboardScore('endless_total', 0, 1)).toBe(false);
    expect(shouldWriteLeaderboardScore('endless_total', 1, undefined)).toBe(true);
  });

  it('allows endless streak resets to 0 after a loss', () => {
    expect(shouldWriteLeaderboardScore('endless_streak', 0, 5)).toBe(true);
  });
});

describe('resolveLeaderboardWritePlayer', () => {
  it('prefers the signed-in player over a deferred queue placeholder', () => {
    expect(
      resolveLeaderboardWritePlayer({
        queuedPlayerId: 'deferred',
        queuedPlayerName: 'Player',
        authPlayerId: 'uid-123',
        authPlayerName: 'Vincent',
      }),
    ).toEqual({ playerId: 'uid-123', playerName: 'Vincent' });
  });

  it('returns null when there is no real player id to write', () => {
    expect(
      resolveLeaderboardWritePlayer({
        queuedPlayerId: 'deferred',
        queuedPlayerName: 'Player',
        authPlayerId: null,
        authPlayerName: null,
      }),
    ).toBeNull();
  });
});
