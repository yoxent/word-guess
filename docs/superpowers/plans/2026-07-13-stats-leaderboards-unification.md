# Stats ↔ Leaderboards Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make local stats the single source of truth for competitive metrics, publish ranked slices to Firestore without separate leaderboard counters, and rename Leaderboard tabs to Daily streak / Endless streak / Endless words.

**Architecture:** Add a small metrics seam (`computeLeaderboardMetrics` / `getLeaderboardMetrics`) that only reads local stats + Endless storage. Wire `syncLeaderboardForSession` and `reconcileLocalLeaderboardScores` through that seam. Rename Leaderboard UI copy to match Stats language. No Firestore schema changes.

**Tech Stack:** TypeScript, Jest, React Native / Expo, existing `leaderboardService` + `storage` + `LeaderboardScreen`

**Spec:** `docs/superpowers/specs/2026-07-13-stats-leaderboards-unification-design.md`

## Global Constraints

- Soft unify only — keep `playerStats/{uid}` and `leaderboards/{type}/scores/{uid}`.
- Never invent a second gameplay counter for leaderboards; submit values owned by local stats/storage.
- Tab labels must be exactly: `Daily streak`, `Endless streak`, `Endless words`.
- Keep monotonic write policy for `daily_streak` and `endless_total`.
- Commit only when the user asks (repo convention); still stage logical checkpoints in plan text as “Commit if requested”.

## File map

| File | Responsibility |
|------|----------------|
| `src/services/leaderboardMetrics.ts` | Pure compute + thin reader over local stats/storage |
| `src/services/__tests__/leaderboardMetrics.test.ts` | Unit tests for metric derivation |
| `src/services/leaderboardService.ts` | Call metrics seam from sync + reconcile |
| `src/services/__tests__/leaderboardService.test.ts` | Update mocks/assertions for metrics seam |
| `src/screens/LeaderboardScreen.tsx` | Tab labels, hints, empty copy |
| `src/services/index.ts` | Export metrics helpers if other modules need them |
| `brain/wiki/cloud-sync.md` | Optional one-paragraph note (Task 4) |

---

### Task 1: Leaderboard metrics seam (TDD)

**Files:**
- Create: `src/services/leaderboardMetrics.ts`
- Create: `src/services/__tests__/leaderboardMetrics.test.ts`

**Interfaces:**
- Consumes: `PlayerStats` from `src/types`; `getEndlessStreak` / `getEndlessTotalWords` from `src/services/storage`
- Produces:
  - `export type LeaderboardMetrics = { dailyStreak: number; endlessStreak: number; endlessTotalWords: number }`
  - `export function computeLeaderboardMetrics(input: { perModeStreaks?: Record<string, { current: number; max: number }> | null; endlessStreakNormal: number; endlessStreakHard: number; endlessTotalWords: number }): LeaderboardMetrics`
  - `export function getLeaderboardMetrics(stats?: PlayerStats | null): LeaderboardMetrics`

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/leaderboardMetrics.test.ts`:

```ts
import { computeLeaderboardMetrics } from '../leaderboardMetrics';

describe('computeLeaderboardMetrics', () => {
  it('uses max of daily_normal and daily_hard current streaks', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: {
          daily_normal: { current: 2, max: 5 },
          daily_hard: { current: 4, max: 4 },
        },
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
        endlessTotalWords: 0,
      }).dailyStreak,
    ).toBe(4);
  });

  it('defaults missing daily streaks to 0', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: null,
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
        endlessTotalWords: 0,
      }).dailyStreak,
    ).toBe(0);
  });

  it('uses max of endless normal/hard current runs', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: {},
        endlessStreakNormal: 3,
        endlessStreakHard: 1,
        endlessTotalWords: 10,
      }).endlessStreak,
    ).toBe(3);
  });

  it('passes through endless total words', () => {
    expect(
      computeLeaderboardMetrics({
        perModeStreaks: {},
        endlessStreakNormal: 0,
        endlessStreakHard: 0,
        endlessTotalWords: 42,
      }).endlessTotalWords,
    ).toBe(42);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/services/__tests__/leaderboardMetrics.test.ts --no-coverage`

Expected: FAIL — cannot find module `../leaderboardMetrics` (or similar).

- [ ] **Step 3: Write minimal implementation**

Create `src/services/leaderboardMetrics.ts`:

```ts
import type { PlayerStats } from '../types';
import { getEndlessStreak, getEndlessTotalWords } from './storage';

export type LeaderboardMetrics = {
  dailyStreak: number;
  endlessStreak: number;
  endlessTotalWords: number;
};

export function computeLeaderboardMetrics(input: {
  perModeStreaks?: Record<string, { current: number; max: number }> | null;
  endlessStreakNormal: number;
  endlessStreakHard: number;
  endlessTotalWords: number;
}): LeaderboardMetrics {
  const streaks = input.perModeStreaks ?? {};
  const dailyStreak = Math.max(
    streaks.daily_normal?.current ?? 0,
    streaks.daily_hard?.current ?? 0,
  );
  const endlessStreak = Math.max(
    input.endlessStreakNormal,
    input.endlessStreakHard,
  );
  return {
    dailyStreak,
    endlessStreak,
    endlessTotalWords: input.endlessTotalWords,
  };
}

/** Reads local stats + Endless storage — sole source for publish values. */
export function getLeaderboardMetrics(
  stats?: PlayerStats | null,
): LeaderboardMetrics {
  return computeLeaderboardMetrics({
    perModeStreaks: stats?.perModeStreaks,
    endlessStreakNormal: getEndlessStreak(false),
    endlessStreakHard: getEndlessStreak(true),
    endlessTotalWords: getEndlessTotalWords(),
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/services/__tests__/leaderboardMetrics.test.ts --no-coverage`

Expected: PASS (4 tests).

- [ ] **Step 5: Commit if requested**

```bash
git add src/services/leaderboardMetrics.ts src/services/__tests__/leaderboardMetrics.test.ts
git commit -m "$(cat <<'EOF'
Add leaderboard metrics seam from local stats.

EOF
)"
```

---

### Task 2: Wire sync + reconcile through metrics seam

**Files:**
- Modify: `src/services/leaderboardService.ts`
- Modify: `src/services/__tests__/leaderboardService.test.ts`
- Modify: `src/services/index.ts` (export `getLeaderboardMetrics` / `computeLeaderboardMetrics` / `LeaderboardMetrics`)

**Interfaces:**
- Consumes: `getLeaderboardMetrics` from Task 1; existing `applyEndlessEndCounters` (Endless mutator only); `submitScore` / `updateLeaderboardAfterGame`
- Produces: `syncLeaderboardForSession` and `reconcileLocalLeaderboardScores` that publish only metrics from `getLeaderboardMetrics`

- [ ] **Step 1: Add failing reconcile test that metrics mock is used**

In `src/services/__tests__/leaderboardService.test.ts`, add:

```ts
jest.mock('../leaderboardMetrics', () => ({
  getLeaderboardMetrics: jest.fn(),
}));

import { getLeaderboardMetrics } from '../leaderboardMetrics';

const mockedGetLeaderboardMetrics = getLeaderboardMetrics as jest.Mock;

// inside beforeEach, after other mocks:
mockedGetLeaderboardMetrics.mockReturnValue({
  dailyStreak: 1,
  endlessStreak: 1,
  endlessTotalWords: 1,
});

it('reconcile publishes values from getLeaderboardMetrics only', async () => {
  mockedGetLeaderboardMetrics.mockReturnValue({
    dailyStreak: 7,
    endlessStreak: 5,
    endlessTotalWords: 99,
  });
  submitLeaderboardScore.mockResolvedValue(true);

  await reconcileLocalLeaderboardScores();

  expect(mockedGetLeaderboardMetrics).toHaveBeenCalled();
  expect(submitLeaderboardScore).toHaveBeenCalledWith(
    'daily_streak',
    'uid-1',
    'Player One',
    7,
  );
  expect(submitLeaderboardScore).toHaveBeenCalledWith(
    'endless_streak',
    'uid-1',
    'Player One',
    5,
  );
  expect(submitLeaderboardScore).toHaveBeenCalledWith(
    'endless_total',
    'uid-1',
    'Player One',
    99,
  );
  // Must not derive from direct storage mocks when metrics seam is present
  expect(mockedGetEndlessStreak).not.toHaveBeenCalled();
  expect(mockedGetEndlessTotalWords).not.toHaveBeenCalled();
});
```

Keep existing reconcile failure test; update it if it still reaches storage directly.

- [ ] **Step 2: Run the new test — expect FAIL**

Run: `npx jest src/services/__tests__/leaderboardService.test.ts --no-coverage`

Expected: FAIL — reconcile still calls storage helpers / wrong scores.

- [ ] **Step 3: Refactor `reconcileLocalLeaderboardScores`**

Replace the body of `reconcileLocalLeaderboardScores` in `src/services/leaderboardService.ts` with:

```ts
export async function reconcileLocalLeaderboardScores(): Promise<void> {
  const authState = useAuthStore.getState();
  if (!authState.isLoggedIn || !authState.playerId) return;

  try {
    const stats =
      useStatsStore.getState().stats ?? (await getStats());
    const metrics = getLeaderboardMetrics(stats);

    if (metrics.dailyStreak > 0) {
      await submitScore(
        'daily_streak',
        metrics.dailyStreak,
        `reconcile:daily:${metrics.dailyStreak}`,
      );
    }
    if (metrics.endlessStreak > 0) {
      await submitScore(
        'endless_streak',
        metrics.endlessStreak,
        `reconcile:streak:${metrics.endlessStreak}`,
      );
    }
    if (metrics.endlessTotalWords > 0) {
      await submitScore(
        'endless_total',
        metrics.endlessTotalWords,
        `reconcile:total:${metrics.endlessTotalWords}`,
      );
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[leaderboard] reconcileLocalLeaderboardScores failed', err);
    }
  }
}
```

Add import:

```ts
import { getLeaderboardMetrics } from './leaderboardMetrics';
```

Remove unused direct uses of `getEndlessStreak` / `getEndlessTotalWords` from this file **if** no longer referenced after Step 4. Keep `getStats` import.

- [ ] **Step 4: Refactor `syncLeaderboardForSession` to publish metrics after local updates**

Keep Endless mutation via `applyEndlessEndCounters` (single mutator). After mutation / after daily stats read, publish from `getLeaderboardMetrics`:

```ts
export async function syncLeaderboardForSession(
  session: Pick<GameSession, 'id' | 'mode' | 'status' | 'hardMode'>,
): Promise<void> {
  if (session.status !== 'won' && session.status !== 'lost') return;
  if (syncedSessionIds.has(session.id)) return;
  syncedSessionIds.add(session.id);

  try {
    if (session.mode === 'daily' && session.status === 'won') {
      // Prefer refreshed stats after recordGame; fall back to store/storage.
      const stats =
        useStatsStore.getState().stats ?? (await getStats());
      const metrics = getLeaderboardMetrics(stats);
      const dailyStreak = resolveDailyLeaderboardScore(
        true,
        metrics.dailyStreak > 0 ? metrics.dailyStreak : undefined,
      );
      await updateLeaderboardAfterGame({
        mode: 'daily',
        won: true,
        sessionId: session.id,
        dailyStreak,
      });
      return;
    }

    if (session.mode === 'endless') {
      // Mutate Endless counters once; then read metrics for publish.
      applyEndlessEndCounters({
        sessionId: session.id,
        won: session.status === 'won',
        hardMode: session.hardMode,
      });
      const stats =
        useStatsStore.getState().stats ?? (await getStats());
      const metrics = getLeaderboardMetrics(stats);
      await updateLeaderboardAfterGame({
        mode: 'endless',
        won: session.status === 'won',
        sessionId: session.id,
        endlessStreak: metrics.endlessStreak,
        endlessTotalWords: metrics.endlessTotalWords,
      });
    }
  } catch (err) {
    syncedSessionIds.delete(session.id);
    if (__DEV__) {
      console.warn('[leaderboard] syncLeaderboardForSession failed', err);
    }
  }
}
```

Important: do **not** discard the return value of `applyEndlessEndCounters` for ResultModal display elsewhere — ResultModal already calls `applyEndlessEndCounters` separately for UI. This sync path must still call it (or rely on prior call + cache) so totals/streak exist before `getLeaderboardMetrics`. Prefer keeping the call here so sync works even if ResultModal order differs; `applyEndlessEndCounters` is session-deduped.

- [ ] **Step 5: Export from `src/services/index.ts`**

Add:

```ts
export {
  computeLeaderboardMetrics,
  getLeaderboardMetrics,
} from './leaderboardMetrics';
export type { LeaderboardMetrics } from './leaderboardMetrics';
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npx jest src/services/__tests__/leaderboardMetrics.test.ts src/services/__tests__/leaderboardService.test.ts src/services/__tests__/leaderboardWritePolicy.test.ts src/services/__tests__/endlessLeaderboardCounters.test.ts --no-coverage
```

Expected: all PASS.

- [ ] **Step 7: Commit if requested**

```bash
git add src/services/leaderboardService.ts src/services/__tests__/leaderboardService.test.ts src/services/index.ts
git commit -m "$(cat <<'EOF'
Publish leaderboard scores from local stats metrics seam.

EOF
)"
```

---

### Task 3: Rename Leaderboard tab copy

**Files:**
- Modify: `src/screens/LeaderboardScreen.tsx` (TAB_LABELS, TAB_SCORE_HINT, EMPTY_MESSAGES; auth gate already says Play Games — leave auth wording)

**Interfaces:**
- Consumes: existing `LeaderboardType` keys (unchanged)
- Produces: UI strings matching spec exactly

- [ ] **Step 1: Update label maps**

Replace:

```ts
const TAB_LABELS: Record<LeaderboardType, string> = {
  daily_streak: 'Daily streak',
  endless_streak: 'Endless streak',
  endless_total: 'Endless words',
};

const TAB_SCORE_HINT: Record<LeaderboardType, string> = {
  daily_streak: 'consecutive Daily wins',
  endless_streak: 'current Endless run',
  endless_total: 'Endless words cleared',
};

const EMPTY_MESSAGES: Record<LeaderboardType, string> = {
  daily_streak:
    'No Daily streaks yet.\nWin Daily Challenges on consecutive days to climb this board.',
  endless_streak:
    'No Endless streaks yet.\nWin games in Endless mode to set a streak.',
  endless_total:
    'No Endless word totals yet.\nPlay Endless mode — this ranks total words cleared.',
};
```

If segment tabs look cramped with longer labels, keep labels as above (spec-locked); do not abbreviate back to Daily/Streak/Total.

- [ ] **Step 2: Run leaderboard view unit tests**

Run: `npx jest src/screens/__tests__/leaderboardView.test.ts --no-coverage`

Expected: PASS (view helpers unchanged).

- [ ] **Step 3: Manual smoke checklist (device)**

- Open Leaderboard → tabs read **Daily streak / Endless streak / Endless words**.
- After 1 Daily win + 1 Endless win while signed in, player’s published scores match Stats-facing streak/total semantics.
- Pull-to-refresh / refocus still reconciles without inventing new counters.

- [ ] **Step 4: Commit if requested**

```bash
git add src/screens/LeaderboardScreen.tsx
git commit -m "$(cat <<'EOF'
Rename leaderboard tabs to mode + metric labels.

EOF
)"
```

---

### Task 4: Wiki note (optional but recommended)

**Files:**
- Modify: `brain/wiki/cloud-sync.md` (short section under leaderboard / sync)
- Modify: `docs/superpowers/specs/2026-07-13-stats-leaderboards-unification-design.md` — set Status to `Approved`

- [ ] **Step 1: Add wiki paragraph**

Near the leaderboard service description in `brain/wiki/cloud-sync.md`, add:

```md
### Stats ↔ leaderboards (2026-07-13)
Local stats/storage is the source of truth for the player's competitive metrics.
Leaderboards publish ranked slices (`daily_streak`, `endless_streak`, `endless_total`) via `getLeaderboardMetrics()` — they do not maintain a second counter system.
UI tabs: **Daily streak** / **Endless streak** / **Endless words**.
```

- [ ] **Step 2: Mark spec status Approved**

Change the spec header Status line to: `Approved`

- [ ] **Step 3: Commit if requested**

```bash
git add brain/wiki/cloud-sync.md docs/superpowers/specs/2026-07-13-stats-leaderboards-unification-design.md
git commit -m "$(cat <<'EOF'
Document stats/leaderboard soft-unify in wiki and spec.

EOF
)"
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| One local source of truth | Task 1–2 |
| `getLeaderboardMetrics` seam | Task 1 |
| Wire sync + reconcile | Task 2 |
| Tab renames | Task 3 |
| Keep Firestore shapes / write policy | Task 2 (no schema change; policy untouched) |
| Unit tests for metrics | Task 1 |
| Wiki note | Task 4 |

## Placeholder / consistency check

- No TBD steps.
- `LeaderboardMetrics` field names consistent across tasks: `dailyStreak`, `endlessStreak`, `endlessTotalWords`.
- Tab strings match spec exactly.
