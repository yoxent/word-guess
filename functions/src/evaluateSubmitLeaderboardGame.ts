import {
  checksumsMatch,
  leaderboardChecksum,
  type LeaderboardChecksumClaimed,
} from './leaderboardChecksum';

export const MIN_GAP_MS = 30_000;
export const MAX_ACCEPTS_PER_UTC_DAY = 2880;
export const FUTURE_SKEW_MS = 120_000;

export type LeaderboardGameMode = 'daily' | 'endless' | 'free' | 'random';

export type SubmitLeaderboardReason =
  | 'duplicate'
  | 'too_soon'
  | 'day_cap'
  | 'checksum'
  | 'invalid'
  | 'future'
  | 'daily_date';

export type LeaderboardWriteOp =
  | {
      op: 'setReceipt';
      sessionId: string;
      completedAt: string;
      mode: LeaderboardGameMode;
      won: boolean;
    }
  | {
      op: 'setRate';
      lastCompletedAt: string;
      dayKey: string;
      acceptedCount: number;
      lastDailyCompletedDate?: string;
    }
  | {
      op: 'setScore';
      type:
        | 'daily_streak'
        | 'endless_streak'
        | 'endless_total'
        | 'best_streak'
        | 'sharpshooter';
      score: number;
    }
  | { op: 'deleteScore'; type: 'daily_streak' };

export type EvaluateSubmitInput = {
  nowMs: number;
  body: {
    sessionId: string;
    completedAt: string;
    mode: string;
    won: boolean;
    checksum: string;
    claimed: LeaderboardChecksumClaimed;
  };
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

export type EvaluateSubmitResult =
  | { ok: true; reason?: 'duplicate'; ops: LeaderboardWriteOp[] }
  | { ok: false; reason: Exclude<SubmitLeaderboardReason, 'duplicate'> };

const MODES = new Set<string>(['daily', 'endless', 'free', 'random']);

export function utcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function plusOne(
  existing: number | undefined,
  claimed: number | undefined,
): 'skip' | 'write' | 'invalid' {
  if (claimed === undefined) return 'skip';
  if (existing === undefined) return claimed === 1 ? 'write' : 'invalid';
  if (claimed <= existing) return 'skip';
  if (claimed === existing + 1) return 'write';
  return 'invalid';
}

function sharpshooterCap(
  existing: number | undefined,
  claimed: number | undefined,
): 'skip' | 'write' | 'invalid' {
  if (claimed === undefined) return 'skip';
  if (existing === undefined) {
    return claimed >= 1 && claimed <= 3 ? 'write' : 'invalid';
  }
  if (claimed <= existing) return 'skip';
  if (claimed <= existing + 3) return 'write';
  return 'invalid';
}

export function evaluateSubmitLeaderboardGame(
  input: EvaluateSubmitInput,
): EvaluateSubmitResult {
  const { body, nowMs, receiptExists, rate, existingScores } = input;
  const completedAtMs = Date.parse(body.completedAt);
  if (Number.isNaN(completedAtMs)) {
    return { ok: false, reason: 'invalid' };
  }
  if (completedAtMs > nowMs + FUTURE_SKEW_MS) {
    return { ok: false, reason: 'future' };
  }

  const computed = leaderboardChecksum({
    sessionId: body.sessionId,
    completedAt: body.completedAt,
    mode: body.mode,
    won: body.won,
    claimed: body.claimed,
  });
  if (!checksumsMatch(computed, body.checksum)) {
    return { ok: false, reason: 'checksum' };
  }

  if (!MODES.has(body.mode) || !body.sessionId) {
    return { ok: false, reason: 'invalid' };
  }
  const mode = body.mode as LeaderboardGameMode;

  if (receiptExists) {
    return { ok: true, reason: 'duplicate', ops: [] };
  }

  if (rate?.lastCompletedAt) {
    const lastMs = Date.parse(rate.lastCompletedAt);
    if (!Number.isNaN(lastMs) && completedAtMs < lastMs + MIN_GAP_MS) {
      return { ok: false, reason: 'too_soon' };
    }
  }

  const today = utcDateKey(nowMs);
  const count =
    rate?.dayKey === today ? (rate.acceptedCount ?? 0) : 0;
  if (count >= MAX_ACCEPTS_PER_UTC_DAY) {
    return { ok: false, reason: 'day_cap' };
  }

  const completedDate = utcDateKey(completedAtMs);
  if (mode === 'daily' && rate?.lastDailyCompletedDate === completedDate) {
    return { ok: false, reason: 'daily_date' };
  }

  const claimed = body.claimed;
  const scoreOps: LeaderboardWriteOp[] = [];

  if (mode === 'daily' && body.won) {
    const decision = plusOne(existingScores.daily_streak, claimed.dailyStreak);
    if (decision === 'invalid') return { ok: false, reason: 'invalid' };
    if (decision === 'write' && claimed.dailyStreak !== undefined) {
      scoreOps.push({
        op: 'setScore',
        type: 'daily_streak',
        score: claimed.dailyStreak,
      });
    }
  }

  if (mode === 'daily' && !body.won) {
    scoreOps.push({ op: 'deleteScore', type: 'daily_streak' });
  }

  if (mode === 'endless' && body.won) {
    const streak = plusOne(existingScores.endless_streak, claimed.endlessStreak);
    if (streak === 'invalid') return { ok: false, reason: 'invalid' };
    if (streak === 'write' && claimed.endlessStreak !== undefined) {
      scoreOps.push({
        op: 'setScore',
        type: 'endless_streak',
        score: claimed.endlessStreak,
      });
    }
    const total = plusOne(
      existingScores.endless_total,
      claimed.endlessTotalWords,
    );
    if (total === 'invalid') return { ok: false, reason: 'invalid' };
    if (total === 'write' && claimed.endlessTotalWords !== undefined) {
      scoreOps.push({
        op: 'setScore',
        type: 'endless_total',
        score: claimed.endlessTotalWords,
      });
    }
  }

  const best = plusOne(existingScores.best_streak, claimed.bestStreak);
  if (best === 'invalid') return { ok: false, reason: 'invalid' };
  if (best === 'write' && claimed.bestStreak !== undefined) {
    scoreOps.push({
      op: 'setScore',
      type: 'best_streak',
      score: claimed.bestStreak,
    });
  }

  const sharp = sharpshooterCap(
    existingScores.sharpshooter,
    claimed.sharpshooter,
  );
  if (sharp === 'invalid') return { ok: false, reason: 'invalid' };
  if (sharp === 'write' && claimed.sharpshooter !== undefined) {
    scoreOps.push({
      op: 'setScore',
      type: 'sharpshooter',
      score: claimed.sharpshooter,
    });
  }

  const setRate: LeaderboardWriteOp = {
    op: 'setRate',
    lastCompletedAt: body.completedAt,
    dayKey: today,
    acceptedCount: count + 1,
  };
  if (mode === 'daily') {
    setRate.lastDailyCompletedDate = completedDate;
  } else if (rate?.lastDailyCompletedDate) {
    setRate.lastDailyCompletedDate = rate.lastDailyCompletedDate;
  }

  const ops: LeaderboardWriteOp[] = [
    {
      op: 'setReceipt',
      sessionId: body.sessionId,
      completedAt: body.completedAt,
      mode,
      won: body.won,
    },
    setRate,
    ...scoreOps,
  ];

  return { ok: true, ops };
}
