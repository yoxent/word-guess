import { leaderboardChecksum } from './leaderboardChecksum';
import {
  MAX_ACCEPTS_PER_UTC_DAY,
  evaluateSubmitLeaderboardGame,
} from './evaluateSubmitLeaderboardGame';

const NOW = Date.parse('2026-09-03T12:00:00.000Z');

function body(partial: {
  sessionId?: string;
  completedAt?: string;
  mode?: string;
  won?: boolean;
  claimed?: {
    dailyStreak?: number;
    endlessStreak?: number;
    endlessTotalWords?: number;
    bestStreak?: number;
    sharpshooter?: number;
  };
}) {
  const base = {
    sessionId: partial.sessionId ?? 's1',
    completedAt: partial.completedAt ?? '2026-09-03T11:00:00.000Z',
    mode: partial.mode ?? 'daily',
    won: partial.won ?? true,
    claimed: partial.claimed ?? { dailyStreak: 1 },
  };
  return {
    ...base,
    checksum: leaderboardChecksum(base),
  };
}

function evalSubmit(
  overrides: Partial<Parameters<typeof evaluateSubmitLeaderboardGame>[0]> = {},
) {
  return evaluateSubmitLeaderboardGame({
    nowMs: NOW,
    body: body({}),
    receiptExists: false,
    rate: null,
    existingScores: {},
    ...overrides,
  });
}

describe('evaluateSubmitLeaderboardGame', () => {
  it('rejects a checksum mismatch', () => {
    const signed = body({});
    expect(
      evalSubmit({ body: { ...signed, checksum: '0'.repeat(64) } }),
    ).toEqual({ ok: false, reason: 'checksum' });
  });

  it('rejects completedAt more than 2 minutes in the future', () => {
    expect(
      evalSubmit({
        body: body({ completedAt: '2026-09-03T12:03:00.000Z' }),
      }),
    ).toEqual({ ok: false, reason: 'future' });
  });

  it('returns duplicate success with no ops when the receipt exists', () => {
    expect(evalSubmit({ receiptExists: true })).toEqual({
      ok: true,
      reason: 'duplicate',
      ops: [],
    });
  });

  it('rejects a second session 29s after lastCompletedAt', () => {
    expect(
      evalSubmit({
        body: body({
          sessionId: 's2',
          completedAt: '2026-09-03T11:00:29.000Z',
        }),
        rate: { lastCompletedAt: '2026-09-03T11:00:00.000Z' },
      }),
    ).toEqual({ ok: false, reason: 'too_soon' });
  });

  it('accepts a second session 30s after lastCompletedAt', () => {
    const result = evalSubmit({
      body: body({
        sessionId: 's2',
        completedAt: '2026-09-03T11:00:30.000Z',
        claimed: { dailyStreak: 1 },
      }),
      rate: {
        lastCompletedAt: '2026-09-03T11:00:00.000Z',
        dayKey: '2026-09-03',
        acceptedCount: 1,
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ops.some((op) => op.op === 'setReceipt')).toBe(true);
    }
  });

  it('rejects the 2881st accept on the same server UTC day', () => {
    expect(
      evalSubmit({
        rate: { dayKey: '2026-09-03', acceptedCount: MAX_ACCEPTS_PER_UTC_DAY },
      }),
    ).toEqual({ ok: false, reason: 'day_cap' });
  });

  it('resets the day cap on the next UTC day', () => {
    const result = evalSubmit({
      nowMs: Date.parse('2026-09-04T00:00:00.000Z'),
      body: body({
        completedAt: '2026-09-03T23:00:00.000Z',
        claimed: { dailyStreak: 1 },
      }),
      rate: { dayKey: '2026-09-03', acceptedCount: MAX_ACCEPTS_PER_UTC_DAY },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a daily win that jumps more than +1', () => {
    expect(
      evalSubmit({
        body: body({ claimed: { dailyStreak: 7 } }),
        existingScores: {},
      }),
    ).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects a second daily game on the same completedAt UTC date', () => {
    expect(
      evalSubmit({
        body: body({ sessionId: 's2', completedAt: '2026-09-03T11:30:00.000Z' }),
        rate: {
          lastDailyCompletedDate: '2026-09-03',
          acceptedCount: 1,
          dayKey: '2026-09-03',
        },
      }),
    ).toEqual({ ok: false, reason: 'daily_date' });
  });

  it('deletes daily_streak on daily loss', () => {
    const result = evalSubmit({
      body: body({ won: false, claimed: { dailyStreak: 0 } }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ops).toContainEqual({
        op: 'deleteScore',
        type: 'daily_streak',
      });
      expect(
        result.ops.some(
          (op) => op.op === 'setScore' && op.type === 'daily_streak',
        ),
      ).toBe(false);
    }
  });

  it('does not write endless_streak on endless loss', () => {
    const result = evalSubmit({
      body: body({
        mode: 'endless',
        won: false,
        claimed: { endlessStreak: 4 },
      }),
      existingScores: { endless_streak: 4 },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.ops.some(
          (op) => op.op === 'setScore' && op.type === 'endless_streak',
        ),
      ).toBe(false);
    }
  });

  it('rejects best_streak jump larger than +1', () => {
    expect(
      evalSubmit({
        body: body({
          mode: 'free',
          claimed: { bestStreak: 9 },
        }),
        existingScores: { best_streak: 1 },
      }),
    ).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects sharpshooter jump larger than +3', () => {
    expect(
      evalSubmit({
        body: body({
          mode: 'free',
          claimed: { sharpshooter: 10 },
        }),
        existingScores: { sharpshooter: 1 },
      }),
    ).toEqual({ ok: false, reason: 'invalid' });
  });

  it('does not write a board when the claimed key is missing', () => {
    const result = evalSubmit({
      body: body({ mode: 'free', won: true, claimed: { bestStreak: 1 } }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.ops.some(
          (op) => op.op === 'setScore' && op.type === 'sharpshooter',
        ),
      ).toBe(false);
    }
  });
});
