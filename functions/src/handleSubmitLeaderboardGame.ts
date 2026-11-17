import { HttpsError } from 'firebase-functions/v2/https';
import type { LeaderboardChecksumClaimed } from './leaderboardChecksum';
import { evaluateSubmitLeaderboardGame } from './evaluateSubmitLeaderboardGame';
import {
  applyLeaderboardOps,
  loadLeaderboardSubmitState,
} from './leaderboardStore';

export type SubmitLeaderboardGameCall = {
  auth?: { uid: string; token?: { name?: string } } | null;
  data: unknown;
};

export type SubmitLeaderboardGameResult =
  | { ok: true; reason?: 'duplicate' }
  | {
      ok: false;
      reason:
        | 'too_soon'
        | 'day_cap'
        | 'checksum'
        | 'invalid'
        | 'future'
        | 'daily_date';
    };

const CLAIMED_KEYS = [
  'dailyStreak',
  'endlessStreak',
  'endlessTotalWords',
  'bestStreak',
  'sharpshooter',
] as const;

function parseClaimed(raw: unknown): LeaderboardChecksumClaimed | null {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const source = raw as Record<string, unknown>;
  const claimed: LeaderboardChecksumClaimed = {};
  for (const key of CLAIMED_KEYS) {
    if (!(key in source)) continue;
    const value = source[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    claimed[key] = value;
  }
  return claimed;
}

export async function handleSubmitLeaderboardGame(
  request: SubmitLeaderboardGameCall,
): Promise<SubmitLeaderboardGameResult> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }

  const data = request.data as Record<string, unknown> | null;
  const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : '';
  const completedAt =
    typeof data?.completedAt === 'string' ? data.completedAt : '';
  const mode = typeof data?.mode === 'string' ? data.mode : '';
  const checksum = typeof data?.checksum === 'string' ? data.checksum : '';
  const won = data?.won;
  const claimed = parseClaimed(data?.claimed);

  if (
    !sessionId ||
    !completedAt ||
    !mode ||
    !checksum ||
    typeof won !== 'boolean' ||
    claimed === null
  ) {
    return { ok: false, reason: 'invalid' };
  }

  const tokenName = request.auth?.token?.name?.trim();
  const bodyName =
    typeof data?.playerName === 'string' ? data.playerName.trim() : '';
  const playerName = tokenName || bodyName || 'Player';

  const state = await loadLeaderboardSubmitState(uid, sessionId);
  const result = evaluateSubmitLeaderboardGame({
    nowMs: Date.now(),
    body: { sessionId, completedAt, mode, won, checksum, claimed },
    receiptExists: state.receiptExists,
    rate: state.rate,
    existingScores: state.existingScores,
  });

  if (!result.ok) {
    return result;
  }
  if (result.reason === 'duplicate') {
    return { ok: true, reason: 'duplicate' };
  }

  await applyLeaderboardOps(uid, playerName, result.ops);
  return { ok: true };
}
