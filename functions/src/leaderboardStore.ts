import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import type { LeaderboardChecksumClaimed } from './leaderboardChecksum';
import type { LeaderboardWriteOp } from './evaluateSubmitLeaderboardGame';

const SCORE_TYPES = [
  'daily_streak',
  'endless_streak',
  'endless_total',
  'best_streak',
  'sharpshooter',
] as const;

export type LeaderboardSubmitState = {
  receiptExists: boolean;
  rate: {
    lastCompletedAt?: string;
    dayKey?: string;
    acceptedCount?: number;
    lastDailyCompletedDate?: string;
  } | null;
  existingScores: {
    daily_streak?: number;
    endless_streak?: number;
    endless_total?: number;
    best_streak?: number;
    sharpshooter?: number;
  };
};

function rateRef(uid: string) {
  return getFirestore().doc(`leaderboardReceipts/${uid}`);
}

function receiptRef(uid: string, sessionId: string) {
  return getFirestore().doc(`leaderboardReceipts/${uid}/games/${sessionId}`);
}

function scoreRef(type: string, uid: string) {
  return getFirestore().doc(`leaderboards/${type}/scores/${uid}`);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export async function loadLeaderboardSubmitState(
  uid: string,
  sessionId: string,
): Promise<LeaderboardSubmitState> {
  const [receiptSnap, rateSnap, ...scoreSnaps] = await Promise.all([
    receiptRef(uid, sessionId).get(),
    rateRef(uid).get(),
    ...SCORE_TYPES.map((type) => scoreRef(type, uid).get()),
  ]);

  const rateData = rateSnap.data();
  const existingScores: LeaderboardSubmitState['existingScores'] = {};
  SCORE_TYPES.forEach((type, index) => {
    const score = optionalNumber(scoreSnaps[index]?.data()?.score);
    if (score !== undefined) {
      existingScores[type] = score;
    }
  });

  return {
    receiptExists: receiptSnap.exists,
    rate: rateSnap.exists
      ? {
          lastCompletedAt: optionalString(rateData?.lastCompletedAt),
          dayKey: optionalString(rateData?.dayKey),
          acceptedCount: optionalNumber(rateData?.acceptedCount),
          lastDailyCompletedDate: optionalString(
            rateData?.lastDailyCompletedDate,
          ),
        }
      : null,
    existingScores,
  };
}

export async function applyLeaderboardOps(
  uid: string,
  playerName: string,
  ops: LeaderboardWriteOp[],
): Promise<void> {
  const db = getFirestore();
  const receiptOp = ops.find((op) => op.op === 'setReceipt');
  await db.runTransaction(async (tx) => {
    if (receiptOp && receiptOp.op === 'setReceipt') {
      const existing = await tx.get(receiptRef(uid, receiptOp.sessionId));
      if (existing.exists) {
        return;
      }
    }

    for (const op of ops) {
      if (op.op === 'setReceipt') {
        tx.set(receiptRef(uid, op.sessionId), {
          sessionId: op.sessionId,
          completedAt: op.completedAt,
          mode: op.mode,
          won: op.won,
          acceptedAt: FieldValue.serverTimestamp(),
        });
      } else if (op.op === 'setRate') {
        const rate: Record<string, unknown> = {
          lastCompletedAt: op.lastCompletedAt,
          dayKey: op.dayKey,
          acceptedCount: op.acceptedCount,
        };
        if (op.lastDailyCompletedDate) {
          rate.lastDailyCompletedDate = op.lastDailyCompletedDate;
        }
        tx.set(rateRef(uid), rate, { merge: true });
      } else if (op.op === 'setScore') {
        tx.set(
          scoreRef(op.type, uid),
          {
            playerId: uid,
            playerName,
            score: op.score,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } else if (op.op === 'deleteScore') {
        tx.delete(scoreRef(op.type, uid));
      }
    }
  });
}

export type { LeaderboardChecksumClaimed };
