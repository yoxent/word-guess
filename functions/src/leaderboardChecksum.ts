import { createHash, timingSafeEqual } from 'crypto';

export const LEADERBOARD_CHECKSUM_SEED = 'wg-lb-v1-seed-2026';

export type LeaderboardChecksumClaimed = {
  dailyStreak?: number;
  endlessStreak?: number;
  endlessTotalWords?: number;
  bestStreak?: number;
  sharpshooter?: number;
};

export type LeaderboardChecksumInput = {
  sessionId: string;
  completedAt: string;
  mode: string;
  won: boolean;
  claimed: LeaderboardChecksumClaimed;
};

function slot(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function leaderboardCanonicalString(
  input: LeaderboardChecksumInput,
): string {
  return [
    input.sessionId,
    input.completedAt,
    input.mode,
    input.won ? '1' : '0',
    slot(input.claimed.dailyStreak),
    slot(input.claimed.endlessStreak),
    slot(input.claimed.endlessTotalWords),
    slot(input.claimed.bestStreak),
    slot(input.claimed.sharpshooter),
  ].join('|');
}

export function leaderboardChecksum(input: LeaderboardChecksumInput): string {
  return createHash('sha256')
    .update(`${leaderboardCanonicalString(input)}:${LEADERBOARD_CHECKSUM_SEED}`)
    .digest('hex');
}

export function checksumsMatch(expectedHex: string, actualHex: string): boolean {
  if (expectedHex.length !== actualHex.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expectedHex, 'utf8'),
      Buffer.from(actualHex, 'utf8'),
    );
  } catch {
    return false;
  }
}
