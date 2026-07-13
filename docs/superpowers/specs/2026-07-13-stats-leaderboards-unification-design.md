# Stats ↔ Leaderboards Unification Design

**Date:** 2026-07-13  
**Status:** Approved  
**Approach:** Soft unify — one local source of truth; leaderboards publish ranked slices

---

## Problem

Statistics and Leaderboards feel like separate systems to players, and partly are under the hood.

- Stats screen shows personal history from local SQLite / derived streaks.
- Leaderboards publish separate Firestore score docs, sometimes derived from parallel Endless MMKV helpers rather than the same APIs Stats uses.
- Tab labels (`Daily` / `Streak` / `Total`) do not say which mode they track, so “Streak” and “Total” look global when they are Endless-only.

## Goals

1. **One local source of truth** for the player’s own competitive metrics.
2. Statistics and Leaderboards use the **same language** for the same numbers.
3. Leaderboards remain a **ranked publish** of selected metrics (not a second counter system).
4. Minimal MVP scope — no Firestore schema rewrite.

## Non-goals

- Deriving leaderboards by querying `playerStats` documents (hard unify).
- Adding new competitive metrics (Random mode, guess distribution, etc.).
- Merging Stats and Leaderboard into one screen.
- Removing Google Sign-In / Play Games auth work (orthogonal).

---

## Product model

```text
Game ends
  → record local stats once (existing stats path)
  → derive leaderboard metrics from local stats APIs
  → publish ranked snapshot to Firestore leaderboards/{type}/scores/{uid}
```

| Layer | Role |
|-------|------|
| Local stats (SQLite + derived streaks / Endless totals) | Source of truth for *my* metrics |
| Statistics screen | Personal view of that data |
| Leaderboard publish | Copy selected metrics into ranked Firestore docs |
| Leaderboard screen | Ranked view of those published metrics |

**Rule:** Never invent a separate gameplay counter for leaderboards. Submit only values already owned by the local stats layer.

---

## Metrics (MVP)

| Leaderboard type | Meaning | Source of truth |
|------------------|---------|-----------------|
| `daily_streak` | Consecutive Daily wins | `stats.perModeStreaks.daily_normal` / `daily_hard` (publish max of current, same as reconcile today) |
| `endless_streak` | Current Endless win run | Canonical Endless streak from storage (`getEndlessStreak`), not a leaderboard-only increment |
| `endless_total` | Lifetime Endless words cleared | Canonical Endless total from storage (`getEndlessTotalWords`) |

Cloud shapes stay as today:

- `playerStats/{uid}` — full personal stats mirror (optional sync).
- `leaderboards/{type}/scores/{uid}` — ranked fields only: `playerId`, `playerName`, `score`, `updatedAt`.

---

## UI copy

Rename leaderboard tabs to match Stats language:

| Current | New tab label | Subtitle (keep/clarify) |
|---------|---------------|-------------------------|
| Daily | **Daily streak** | Consecutive Daily wins |
| Streak | **Endless streak** | Current Endless win run |
| Total | **Endless words** | Total Endless words cleared |

Auth gate / empty copy should use the same mode+metric phrasing where it mentions what is ranked.

---

## Technical design

### New seam: `getLeaderboardMetrics()`

Introduce a pure/helper module (e.g. `src/services/leaderboardMetrics.ts`) that reads **only** from the local stats/storage APIs Stats already trusts:

```ts
type LeaderboardMetrics = {
  dailyStreak: number;      // max(daily_normal, daily_hard) current
  endlessStreak: number;    // max(normal, hard) current Endless run
  endlessTotalWords: number;
};

function getLeaderboardMetrics(stats?: PlayerStats | null): LeaderboardMetrics
```

Callers:

- `syncLeaderboardForSession` — after local stats/Endless counters are updated for the session
- `reconcileLocalLeaderboardScores` — when opening Leaderboard

### Session end order

1. Record game into stats (`recordGameIfNeeded`) / apply Endless end counters **once** via the existing stats/storage path.
2. Call `getLeaderboardMetrics()`.
3. `submitScore` for applicable types (Daily win → `daily_streak`; Endless → streak + total when total > 0).

`applyEndlessEndCounters` may remain as the single Endless mutator for session end, but leaderboard code must not maintain a second total/streak. Prefer: session end updates storage once; metrics helper only reads.

### Write policy (unchanged)

Keep monotonic writes for `daily_streak` and `endless_total` (`shouldWriteLeaderboardScore`). Endless streak may go to 0 on loss (current behavior).

### Auth / identity (unchanged)

Publish as Firebase Auth UID (`playerId == request.auth.uid`). Deferred queue resolves to signed-in UID on drain.

---

## Testing

- Unit tests for `getLeaderboardMetrics` (daily max of normal/hard; endless read-only).
- Existing leaderboard write-policy and sync tests still pass; update any fixtures that assumed independent counter logic.
- Manual: one Daily win + one Endless win → Stats and Leaderboard show the same streak/word numbers for that player; tabs read as mode+metric.

---

## Rollout

1. Add metrics helper + wire sync/reconcile.
2. Rename Leaderboard tab labels/subtitles.
3. Smoke on device with signed-in account.
4. Optional follow-up: wiki (`cloud-sync.md`, `stats-and-share.md`) note that leaderboards are publish projections of local stats.

---

## Decisions locked

- **Approach A** — soft unify (local truth + ranked publish).
- Keep three Firestore leaderboard collections.
- Tab labels: Daily streak / Endless streak / Endless words.
- No hard unify of cloud into `playerStats`-only ranking for MVP.
