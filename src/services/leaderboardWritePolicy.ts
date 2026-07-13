/**
 * Pure helpers for leaderboard write decisions — kept separate so we can
 * regression-test the bugs that left Daily at 0 and Total empty.
 */

export type MonotonicLeaderboardType = 'daily_streak' | 'endless_total';

/** Daily streak / endless total must never move backwards (stale queue overwrites). */
export function shouldWriteLeaderboardScore(
  type: string,
  incomingScore: number,
  existingScore: number | undefined,
): boolean {
  if (type !== 'daily_streak' && type !== 'endless_total') {
    return true;
  }
  if (typeof existingScore !== 'number') {
    return true;
  }
  return incomingScore >= existingScore;
}

/**
 * When draining the offline queue, never write to the literal "deferred"
 * placeholder — use the signed-in player instead.
 */
export function resolveLeaderboardWritePlayer(args: {
  queuedPlayerId: string | undefined;
  authPlayerId: string | null | undefined;
  authPlayerName: string | null | undefined;
  queuedPlayerName: string | undefined;
}): { playerId: string; playerName: string } | null {
  const playerId =
    args.authPlayerId && args.authPlayerId.length > 0
      ? args.authPlayerId
      : args.queuedPlayerId && args.queuedPlayerId !== 'deferred'
        ? args.queuedPlayerId
        : null;

  if (!playerId) return null;

  const playerName =
    (args.authPlayerName && args.authPlayerName.length > 0
      ? args.authPlayerName
      : args.queuedPlayerName) ?? 'Player';

  return { playerId, playerName };
}
