import {
  resolveLeaderboardWritePlayer,
  shouldClearLeaderboardScore,
  shouldWriteLeaderboardScore,
} from '../leaderboardWritePolicy';

describe('shouldWriteLeaderboardScore', () => {
  it('never writes a non-positive score (zeros belong on clear, not on the board)', () => {
    expect(shouldWriteLeaderboardScore('daily_streak', 0, undefined)).toBe(false);
    expect(shouldWriteLeaderboardScore('endless_streak', 0, 5)).toBe(false);
    expect(shouldWriteLeaderboardScore('endless_total', 0, 1)).toBe(false);
    expect(shouldWriteLeaderboardScore('best_streak', 0, undefined)).toBe(false);
    expect(shouldWriteLeaderboardScore('sharpshooter', -1, 2)).toBe(false);
  });

  it('blocks a stale daily score of 0 from overwriting a win streak of 1', () => {
    expect(shouldWriteLeaderboardScore('daily_streak', 0, 1)).toBe(false);
    expect(shouldWriteLeaderboardScore('daily_streak', 1, 0)).toBe(true);
    expect(shouldWriteLeaderboardScore('daily_streak', 2, 1)).toBe(true);
  });

  it('blocks a lower endless total from overwriting a higher one', () => {
    expect(shouldWriteLeaderboardScore('endless_total', 0, 1)).toBe(false);
    expect(shouldWriteLeaderboardScore('endless_total', 1, undefined)).toBe(true);
  });

  it('never lets best streak or sharpshooter decrease', () => {
    expect(shouldWriteLeaderboardScore('best_streak', 3, 5)).toBe(false);
    expect(shouldWriteLeaderboardScore('best_streak', 6, 5)).toBe(true);
    expect(shouldWriteLeaderboardScore('sharpshooter', 1, 4)).toBe(false);
    expect(shouldWriteLeaderboardScore('sharpshooter', 4, 4)).toBe(true);
  });
});

describe('shouldClearLeaderboardScore', () => {
  it('clears current-streak boards when the streak resets to 0', () => {
    expect(shouldClearLeaderboardScore('endless_streak', 0)).toBe(true);
    expect(shouldClearLeaderboardScore('daily_streak', 0)).toBe(true);
  });

  it('does not clear career / cumulative boards on 0', () => {
    expect(shouldClearLeaderboardScore('endless_total', 0)).toBe(false);
    expect(shouldClearLeaderboardScore('best_streak', 0)).toBe(false);
    expect(shouldClearLeaderboardScore('sharpshooter', 0)).toBe(false);
  });

  it('does not clear positive scores', () => {
    expect(shouldClearLeaderboardScore('endless_streak', 1)).toBe(false);
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
