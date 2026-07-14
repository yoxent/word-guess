# Stats Cloud Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore signed-in players’ statistics (and Endless counters) from Firestore on new install / sign-in, merge with LWW + career safety nets, and keep Stats ↔ leaderboard metrics cross-checkable.

**Architecture:** Introduce a syncable MMKV **stats profile** as the aggregate source of truth for display + cloud sync (game_history remains an append-only log). Pure `mergePlayerStats` owns conflict rules. On sign-in: pull → merge/replace → hydrate profile + Endless MMKV → push → reconcile leaderboards → drain queue (stale `game_result` superseded).

**Tech Stack:** TypeScript, Jest, Zustand, MMKV (`storage.ts`), Firestore (`firestoreService`), existing `syncQueue` + `leaderboardService`

**Spec:** `docs/superpowers/specs/2026-07-14-stats-cloud-restore-design.md`

## Global Constraints

- Local-first: never block gameplay or Stats UI on network.
- Stats readable signed-out; leaderboards stay auth-gated for ranked lists.
- Merge: newer base (LWW) for totals/distribution/currents; `max` only for `maxStreak`, per-mode `.max`, `endlessTotalWords`; recompute `winRate`.
- Account switch (`statsOwnerPlayerId` ≠ current): cloud **replaces** local — do not merge.
- Commit only when the user asks (repo convention); plan steps still say “Commit if requested”.
- Do not implement Future/Deferred items from the spec (multi-device CRDT, settings sync, server validation, realtime boards, hydrate UI polish).

## File map

| File | Responsibility |
|------|----------------|
| `src/types/stats.ts` (or `src/types/statsProfile.ts`) | `StatsProfile`, `CloudPlayerStatsDoc`, endless counter fields |
| `src/services/mergePlayerStats.ts` | Pure merge/replace rules |
| `src/services/__tests__/mergePlayerStats.test.ts` | Merge unit tests |
| `src/services/storage.ts` | Profile read/write, owner, `setEndlessTotalWords`, getters already exist |
| `src/services/statsProfile.ts` | `getStats` orchestration: profile SOT + history backfill + `applyGameToStats` |
| `src/services/__tests__/statsProfile.test.ts` | Profile + getStats behavior |
| `src/services/firestoreService.ts` | Read/write `updatedAt` + endless fields; distinguish missing vs error |
| `src/services/playerProfileSync.ts` | Sign-in pull/merge/hydrate/push/reconcile orchestration |
| `src/services/__tests__/playerProfileSync.test.ts` | Sequence tests with mocks |
| `src/services/syncQueue.ts` | `removeEventsByType` (or equivalent) for superseding stale `game_result` |
| `src/stores/authStore.ts` | Call sync before drain on sign-in / silent |
| `src/stores/statsStore.ts` | Ensure `recordGame` updates profile via new `getStats` path |
| `src/services/index.ts` | Exports |
| `brain/wiki/cloud-sync.md` | Short note: restore + profile SOT + deferred list pointer |

---

### Task 1: Pure `mergePlayerStats` (TDD)

**Files:**
- Create: `src/services/mergePlayerStats.ts`
- Create: `src/services/__tests__/mergePlayerStats.test.ts`
- Modify: `src/types/stats.ts` (add shared profile types if not in merge file)

**Interfaces:**
- Produces:
```ts
export type EndlessCounters = {
  endlessTotalWords: number;
  endlessStreakNormal: number;
  endlessStreakHard: number;
};

export type StatsProfileSlice = {
  stats: PlayerStats;
  endless: EndlessCounters;
  updatedAtMs: number;
};

export type MergePlayerStatsInput = {
  local: StatsProfileSlice | null;
  cloud: StatsProfileSlice | null;
  currentPlayerId: string;
  statsOwnerPlayerId: string | null;
};

export type MergePlayerStatsResult = {
  profile: StatsProfileSlice;
  /** 'upload' = local-only first push; 'restore' = cloud replaced/filled local; 'merge' = LWW+max; 'replace' = account switch */
  action: 'upload' | 'restore' | 'merge' | 'replace';
};

export function mergePlayerStats(input: MergePlayerStatsInput): MergePlayerStatsResult;

export function recomputeWinRate(wins: number, totalGames: number): number;
// Math.round((wins / totalGames) * 100) or 0 if totalGames === 0 — match storage.getStats
```

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/mergePlayerStats.test.ts` with at least:

```ts
import { mergePlayerStats, recomputeWinRate } from '../mergePlayerStats';
import type { PlayerStats } from '../../types';

function emptyStats(over: Partial<PlayerStats> = {}): PlayerStats {
  return {
    totalGames: 0,
    wins: 0,
    winRate: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [],
    gamesByLength: {},
    lastGameDate: '',
    perModeStreaks: {},
    ...over,
  };
}

const endless0 = {
  endlessTotalWords: 0,
  endlessStreakNormal: 0,
  endlessStreakHard: 0,
};

describe('mergePlayerStats', () => {
  it('upload: no cloud → local wins', () => {
    const local = {
      stats: emptyStats({ totalGames: 3, wins: 2, winRate: 67, maxStreak: 2 }),
      endless: { ...endless0, endlessTotalWords: 5 },
      updatedAtMs: 100,
    };
    const r = mergePlayerStats({
      local,
      cloud: null,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: 'p1',
    });
    expect(r.action).toBe('upload');
    expect(r.profile.stats.totalGames).toBe(3);
    expect(r.profile.endless.endlessTotalWords).toBe(5);
  });

  it('restore: empty local → cloud wins', () => {
    const cloud = {
      stats: emptyStats({ totalGames: 10, wins: 7, winRate: 70, maxStreak: 4 }),
      endless: { endlessTotalWords: 20, endlessStreakNormal: 2, endlessStreakHard: 0 },
      updatedAtMs: 500,
    };
    const r = mergePlayerStats({
      local: null,
      cloud,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: null,
    });
    expect(r.action).toBe('restore');
    expect(r.profile.stats.totalGames).toBe(10);
    expect(r.profile.endless.endlessStreakNormal).toBe(2);
  });

  it('replace: owner mismatch → cloud replaces (no merge of local totals)', () => {
    const local = {
      stats: emptyStats({ totalGames: 99, wins: 50, maxStreak: 9 }),
      endless: { ...endless0, endlessTotalWords: 99 },
      updatedAtMs: 9999,
    };
    const cloud = {
      stats: emptyStats({ totalGames: 2, wins: 1, maxStreak: 1 }),
      endless: endless0,
      updatedAtMs: 1,
    };
    const r = mergePlayerStats({
      local,
      cloud,
      currentPlayerId: 'B',
      statsOwnerPlayerId: 'A',
    });
    expect(r.action).toBe('replace');
    expect(r.profile.stats.totalGames).toBe(2);
  });

  it('merge: newer local body + max career ceilings from older cloud', () => {
    const local = {
      stats: emptyStats({
        totalGames: 5,
        wins: 3,
        winRate: 60,
        maxStreak: 2,
        currentStreak: 1,
        perModeStreaks: { daily_normal: { current: 1, max: 2 } },
      }),
      endless: { endlessTotalWords: 4, endlessStreakNormal: 1, endlessStreakHard: 0 },
      updatedAtMs: 200,
    };
    const cloud = {
      stats: emptyStats({
        totalGames: 40,
        wins: 30,
        winRate: 75,
        maxStreak: 10,
        currentStreak: 8,
        perModeStreaks: { daily_normal: { current: 8, max: 10 } },
      }),
      endless: { endlessTotalWords: 50, endlessStreakNormal: 0, endlessStreakHard: 0 },
      updatedAtMs: 100,
    };
    const r = mergePlayerStats({
      local,
      cloud,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: 'p1',
    });
    expect(r.action).toBe('merge');
    // LWW body from newer local
    expect(r.profile.stats.totalGames).toBe(5);
    expect(r.profile.stats.wins).toBe(3);
    expect(r.profile.stats.currentStreak).toBe(1);
    expect(r.profile.endless.endlessStreakNormal).toBe(1);
    // Safety max
    expect(r.profile.stats.maxStreak).toBe(10);
    expect(r.profile.stats.perModeStreaks.daily_normal.max).toBe(10);
    expect(r.profile.endless.endlessTotalWords).toBe(50);
    expect(r.profile.stats.winRate).toBe(recomputeWinRate(3, 5));
  });

  it('treats missing cloud updatedAtMs as 0', () => {
    const local = {
      stats: emptyStats({ totalGames: 1, wins: 1, winRate: 100 }),
      endless: endless0,
      updatedAtMs: 1,
    };
    const cloud = {
      stats: emptyStats({ totalGames: 9, wins: 9, winRate: 100, maxStreak: 9 }),
      endless: endless0,
      updatedAtMs: 0,
    };
    const r = mergePlayerStats({
      local,
      cloud,
      currentPlayerId: 'p1',
      statsOwnerPlayerId: 'p1',
    });
    expect(r.profile.stats.totalGames).toBe(1);
    expect(r.profile.stats.maxStreak).toBe(9);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- --testPathPattern=mergePlayerStats --no-coverage`

Expected: FAIL (module / exports missing)

- [ ] **Step 3: Implement `mergePlayerStats.ts`**

Implement precedence exactly as spec:
1. `cloud == null` → `{ action: 'upload', profile: local }` (if local also null, use empty profile with `updatedAtMs: 0`)
2. `local == null` or local `totalGames === 0` and empty endless → `{ action: 'restore', profile: cloud }`
3. `statsOwnerPlayerId != null && statsOwnerPlayerId !== currentPlayerId` → `{ action: 'replace', profile: cloud }` (if cloud null, empty profile)
4. Else pick newer by `updatedAtMs` as base, older as other; copy LWW fields from base; for safety fields `max(base, other)`; set `winRate = recomputeWinRate(wins, totalGames)`; return `{ action: 'merge', profile }`

For per-mode `.max`: union all mode keys from both; each key `max = max(base.max, other.max)`, `current` from base.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- --testPathPattern=mergePlayerStats --no-coverage`

- [ ] **Step 5: Commit if requested**

```bash
git add src/services/mergePlayerStats.ts src/services/__tests__/mergePlayerStats.test.ts src/types/stats.ts
git commit -m "feat(stats): add mergePlayerStats with LWW and career max rules"
```

---

### Task 2: Local stats profile storage + `getStats` SOT

**Why:** Today `getStats()` recomputes only from `game_history`. Cloud restore of aggregates would be wiped after the next local game. Profile MMKV is required for A+C.

**Files:**
- Modify: `src/services/storage.ts`
- Create: `src/services/statsProfile.ts`
- Create: `src/services/__tests__/statsProfile.test.ts`
- Modify: `src/stores/statsStore.ts` (use profile-aware path — usually no API change)
- Modify: `src/services/index.ts`

**Interfaces:**
```ts
// storage.ts
export function getStatsOwnerPlayerId(): string | null;
export function setStatsOwnerPlayerId(playerId: string | null): void;
export function setEndlessTotalWords(n: number): void; // Math.max(0, floor)

export type StoredStatsProfile = {
  stats: PlayerStats;
  updatedAtMs: number;
};

export function readStatsProfile(): StoredStatsProfile | null;
export function writeStatsProfile(profile: StoredStatsProfile): void;
export function clearStatsProfile(): void;

// statsProfile.ts
export function applyGameToStats(stats: PlayerStats, game: {
  mode: string;
  letterCount: number;
  guesses: number;
  won: boolean;
  hardMode: boolean;
  completedAt: string;
}): PlayerStats;

/** Replaces storage.getStats as the app-facing reader (re-export or swap call sites). */
export async function getStats(): Promise<PlayerStats | null>;
```

**MMKV keys (exact):**
- `stats_owner_player_id` (string)
- `stats_profile_v1` (JSON `StoredStatsProfile`)
- existing endless keys unchanged

- [ ] **Step 1: Write failing tests for profile + applyGame + getStats backfill**

In `src/services/__tests__/statsProfile.test.ts`, mock MMKV/SQLite the same way `storage.test.ts` does (follow existing jest setup). Cover:
1. `applyGameToStats` increments `totalGames` / `wins` / distribution / `gamesByLength` / mode streak
2. `getStats` with no profile and empty history → null
3. `getStats` with no profile but history → returns computed stats and **writes profile** (spy `writeStatsProfile`)
4. `getStats` with profile present → returns profile.stats **without** requiring history
5. After `writeStatsProfile` then `applyGame` via record path helper → profile totals increase (restore-safe)

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- --testPathPattern=statsProfile --no-coverage`

- [ ] **Step 3: Implement storage helpers**

Add owner + profile + `setEndlessTotalWords` next to existing endless helpers in `storage.ts`.

- [ ] **Step 4: Implement `statsProfile.ts`**

1. Move/copy current SQL aggregation from `storage.getStats` into `computeStatsFromHistory()` (keep private in `statsProfile.ts` or `storage.ts` as `computeStatsFromHistory`).
2. `storage.getStats` should become a thin re-export of `statsProfile.getStats` **or** change all imports to `statsProfile` — prefer **one** `getStats` export from `storage.ts` that delegates to profile logic to avoid breaking imports.
3. `getStats` algorithm:
   - `profile = readStatsProfile()`
   - if profile → return `profile.stats`
   - else `fromDb = computeStatsFromHistory()`; if fromDb, `writeStatsProfile({ stats: fromDb, updatedAtMs: Date.parse(fromDb.lastGameDate) || Date.now() })`; return fromDb
4. `applyGameToStats`: update aggregates for one game (mode key `daily|endless|random` + `_hard|_normal`); bump `current`/`max` for that mode; set `currentStreak` to that mode’s current; `maxStreak = max(all mode maxes)`; recompute winRate.

- [ ] **Step 5: Wire `statsStore.recordGame`**

After `saveGameResult`:
```ts
const prev = readStatsProfile()?.stats ?? (await computeStatsFromHistory()) ?? emptyStats();
const next = applyGameToStats(prev, result);
writeStatsProfile({ stats: next, updatedAtMs: Date.now() });
set({ stats: next, lastGameResult: ... });
```
Do **not** call legacy history-only `getStats` to replace a restored profile.

- [ ] **Step 6: Run tests**

Run:
```
npm test -- --testPathPattern=statsProfile --no-coverage
npm test -- --testPathPattern=statsStore --no-coverage
```
Expected: PASS (update any snapshots/mocks if needed)

- [ ] **Step 7: Commit if requested**

```bash
git commit -m "feat(stats): persist syncable stats profile as aggregate source of truth"
```

---

### Task 3: Firestore profile read/write (endless + updatedAt)

**Files:**
- Modify: `src/services/firestoreService.ts`
- Modify: `src/services/__tests__/` (add or extend firestore tests if present; otherwise test via playerProfileSync mocks in Task 4)
- Modify: call sites of `updatePlayerStats` / `getPlayerStats` as needed

**Interfaces:**
```ts
export type CloudPlayerProfile = {
  stats: PlayerStats;
  endless: EndlessCounters;
  updatedAtMs: number;
  playerName?: string;
};

export type GetPlayerStatsResult =
  | { kind: 'found'; profile: CloudPlayerProfile }
  | { kind: 'missing' }
  | { kind: 'error' };

export async function getPlayerStatsResult(playerId: string): Promise<GetPlayerStatsResult>;

// Keep getPlayerStats as thin wrapper returning profile.stats or null for compat,
// but prefer getPlayerStatsResult in new sync code.

export async function updatePlayerStats(
  playerId: string,
  playerName: string,
  stats: PlayerStats,
  endless?: EndlessCounters,
): Promise<boolean>;
```

- [ ] **Step 1: Change `updatePlayerStats` to persist endless fields**

When `endless` omitted, read current MMKV counters via `getEndlessTotalWords` / `getEndlessStreak` so existing call sites still upload a full mirror:

```ts
const endlessPayload = endless ?? {
  endlessTotalWords: getEndlessTotalWords(),
  endlessStreakNormal: getEndlessStreak(false),
  endlessStreakHard: getEndlessStreak(true),
};

await setDoc(ref, {
  playerId,
  playerName,
  ...stats,
  ...endlessPayload,
  updatedAt: serverTimestamp(),
}, { merge: true });
```

- [ ] **Step 2: Implement `getPlayerStatsResult`**

- `!exists` → `{ kind: 'missing' }`
- catch → `{ kind: 'error' }`
- else parse stats fields, endless fields (default 0), `updatedAtMs` from Firestore Timestamp (`toMillis()`), missing → `0`

- [ ] **Step 3: Fix drain handler / GameScreen callers** if signature requires endless (optional arg keeps compat)

- [ ] **Step 4: `tsc` / tests**

Run: `npm run ts:check`

- [ ] **Step 5: Commit if requested**

```bash
git commit -m "feat(cloud): persist endless counters and updatedAt on playerStats"
```

---

### Task 4: `playerProfileSync` orchestration + queue supersede

**Files:**
- Create: `src/services/playerProfileSync.ts`
- Create: `src/services/__tests__/playerProfileSync.test.ts`
- Modify: `src/services/syncQueue.ts` — add `removeEventsByType(type: SyncEvent['type']): Promise<number>`
- Modify: `src/stores/authStore.ts`
- Modify: `src/services/index.ts`

**Interfaces:**
```ts
export async function syncPlayerProfileOnAuth(params: {
  playerId: string;
  playerName: string;
}): Promise<{ ok: boolean; action?: MergePlayerStatsResult['action'] }>;
```

**Sequence (must match spec):**
1. Load local profile (`readStatsProfile` + endless MMKV) + `getStatsOwnerPlayerId()`
2. `getPlayerStatsResult(playerId)`
3. If `kind === 'error'` → return `{ ok: false }` (leave owner unchanged; caller may still drain)
4. Build `cloud` slice from `found` or `null` if `missing`
5. Build `local` slice: if no profile and no endless activity, `null`; else profile/endless/`updatedAtMs`
6. `mergePlayerStats(...)`
7. Hydrate: `writeStatsProfile`, `setEndlessTotalWords`, `setEndlessStreak` ×2, `setStatsOwnerPlayerId(playerId)`, `useStatsStore.getState().loadStats()`
8. `updatePlayerStats(...)` with merged stats+endless  
   - if push fails: `enqueueEvent('game_result', { stats, endless, updatedAtMs })` then return
9. On push success: `removeEventsByType('game_result')` then `reconcileLocalLeaderboardScores()`
10. Return `{ ok: true, action }`

- [ ] **Step 1: Write failing sequence tests** (mock firestore, storage, leaderboard, syncQueue, statsStore)

Cases:
1. missing cloud + local games → upload push called with local totals
2. found cloud + empty local → hydrate local + push + reconcile + remove game_result
3. owner A then current B → replace (local 99 not pushed as merge)
4. push failure → enqueue game_result, no removeEventsByType
5. get error → no hydrate owner change

- [ ] **Step 2: Implement `removeEventsByType` in syncQueue**

```ts
export async function removeEventsByType(
  type: SyncEvent['type'],
): Promise<number> {
  const queue = await readQueue();
  const next = queue.filter((e) => e.type !== type);
  const removed = queue.length - next.length;
  if (removed > 0) await writeQueue(next);
  return removed;
}
```

Export it.

- [ ] **Step 3: Implement `playerProfileSync.ts`**

- [ ] **Step 4: Wire `authStore`**

In both `signIn` and `signInSilently` after `setPlayer`:

```ts
await syncPlayerProfileOnAuth({
  playerId: result.user.id,
  playerName: result.user.name ?? 'Player',
});
syncQueue.drainQueue(drainHandler).catch(() => {});
```

Update `drainHandler` for `game_result` to pass `event.data.endless` into `updatePlayerStats` when present.

Also call `syncPlayerProfileOnAuth` from the existing App.tsx periodic/foreground drain path **once when online auth is already set** is optional this slice; minimum is sign-in + silent. If App already drains on foreground, add:

```ts
// before or after drain when hasSignedInPlayer
await syncPlayerProfileOnAuth({ playerId, playerName });
```

only if cheap/idempotent — **do include** foreground retry so `kind === 'error'` / offline sign-in recovers (spec).

- [ ] **Step 5: Run tests**

```
npm test -- --testPathPattern=playerProfileSync --no-coverage
npm test -- --testPathPattern=mergePlayerStats --no-coverage
npm run ts:check
```

- [ ] **Step 6: Commit if requested**

```bash
git commit -m "feat(auth): pull-merge hydrate player stats profile on sign-in"
```

---

### Task 5: Wiki + regression sanity

**Files:**
- Modify: `brain/wiki/cloud-sync.md` — add subsection “Stats profile restore (2026-07-14)” pointing at the spec; list profile SOT; note queue supersede; link Future/Deferred
- Modify: `docs/superpowers/specs/2026-07-14-stats-cloud-restore-design.md` — remove stray trailing `}` if still present

- [ ] **Step 1: Update wiki** (one short section, no essay)

- [ ] **Step 2: Run broader regression**

```
npm test -- --testPathPattern='leaderboard|statsStore|auth' --no-coverage
npm run ts:check
```

- [ ] **Step 3: Manual checklist** (document in PR/commit body when shipping)

1. Signed-out Stats still shows local profile/history
2. New install → sign in → Stats shows cloud totals + Endless words/streaks
3. Leaderboard personal footer matches Stats-derived metrics after restore
4. Sign out A → sign in B → B does not keep A’s totals

- [ ] **Step 4: Commit if requested**

```bash
git commit -m "docs: record stats profile restore in cloud-sync wiki"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Local-first + cloud mirror | 3–4 |
| Restore on new install | 2, 4 |
| Endless counters in cloud + hydrate | 3, 4 |
| `updatedAt` compare / stop stripping | 3 |
| LWW + career max + winRate | 1 |
| Account switch replace | 1, 4 |
| Sign-in sequence order | 4 |
| Stale `game_result` must not clobber | 4 (`removeEventsByType`) |
| Resubmit leaderboards after merge | 4 (`reconcileLocalLeaderboardScores`) |
| Push fail → queue | 4 |
| Pull error → leave owner | 4 |
| Auth asymmetry unchanged | (no Stats auth gate — verified Task 5) |
| Deferred items not built | Global constraints |

## Placeholder / consistency review

- No TBD steps; types aligned on `EndlessCounters` / `StatsProfileSlice` / `MergePlayerStatsResult`.
- `getStats` import path: Task 2 keeps `storage.getStats` as façade so leaderboardService needs no import churn.
- Foreground retry of `syncPlayerProfileOnAuth` included in Task 4 to satisfy offline/error retry without new timers.
