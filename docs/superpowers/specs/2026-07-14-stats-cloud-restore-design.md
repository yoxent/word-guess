# Stats Cloud Restore + Consistency Design

**Date:** 2026-07-14  
**Status:** Approved (brainstorm)  
**Approach:** Extend Phase 5 path (Approach 1) — local-first `PlayerStats` mirror with pull/merge on sign-in  
**Related:** [2026-07-13-stats-leaderboards-unification-design.md](./2026-07-13-stats-leaderboards-unification-design.md), `brain/wiki/cloud-sync.md`

---

## Problem

- Leaderboards require auth to show ranked data; Statistics do not.
- Cloud already mirrors `playerStats` on write, but a **new install** does not restore personal stats into local storage.
- Endless competitive counters (`endlessTotalWords`, endless streaks) live in MMKV outside `PlayerStats`, so restore of stats alone would leave Words/Run inconsistent with Stats.
- Sign-in currently **drains the sync queue first** with no pull/merge, so stale queued snapshots can fight a restore.
- Account switch on the same device can contaminate another player’s cloud profile if local history is blindly merged.

## Goals

1. **Backup / restore (A):** After sign-in on a new install, Stats shows the player’s past statistics from cloud.
2. **Consistency with leaderboards (C):** Stats and leaderboard personal metrics stay cross-checkable — same canonical numbers.
3. Preserve **offline-first**: always write local first; sync when signed in and able.
4. Preserve **auth asymmetry**: Stats readable signed-out (local); leaderboards remain auth-gated for ranked lists.

## Non-goals (this slice)

See [Future / Deferred](#future--deferred) for the full backlog. This slice does **not** implement true multi-device concurrent play, settings sync, server-side score validation, or realtime leaderboard listeners.

---

## Architecture

**Source of truth:** local profile (SQLite `PlayerStats` + MMKV endless counters).  
**Cloud:** signed-in mirror at `playerStats/{playerId}` for restore and cross-device backup.  
**Leaderboards:** ranked publish of slices derived via `getLeaderboardMetrics()` (unchanged product model from the unification design).

```text
Game completes
  → recordGame (local) — always
  → update endless MMKV counters when applicable — always
  → if signed in + online: push playerStats + leaderboard submits
  → else if signed in + offline (or push fails): syncQueue

Sign-in / silent auth (online)
  → setPlayer
  → load local PlayerStats + MMKV endless counters
  → getPlayerStats(cloud)
  → merge or replace per rules below
  → hydrate SQLite + MMKV + statsStore.loadStats()
  → push merged profile once
  → resubmit leaderboard metrics from merged local
  → drain syncQueue (stale game_result superseded — see Sync queue)

Stats screen
  → always reads local (works signed-out / offline)

Leaderboard screen
  → auth required for ranked lists
  → personal footer / metrics from same local profile via getLeaderboardMetrics()
```

**Merge owner:** one pure function (e.g. `mergePlayerStats`) — no second merge path in auth vs game completion.

---

## Data model

### Cloud `playerStats/{playerId}` (extend existing)

| Field | Notes |
|-------|--------|
| Existing `PlayerStats` fields | `totalGames`, `wins`, `winRate`, streaks, distribution, `gamesByLength`, `lastGameDate`, `perModeStreaks`, … |
| `playerId`, `playerName` | Identity |
| `updatedAt` | Firestore `serverTimestamp()` (already written on update). **Must be returned by `getPlayerStats`** (stop stripping). Compare as millis. |
| `endlessTotalWords` | MMKV mirror — required for Words board restore |
| `endlessStreakNormal` | MMKV mirror |
| `endlessStreakHard` | MMKV mirror |

### Local binding

| Key | Purpose |
|-----|---------|
| `statsOwnerPlayerId` | Last playerId whose profile owns local stats/MMKV. `null` if never bound / signed out without switch handling yet. |

On successful hydrate/replace for the current account, set `statsOwnerPlayerId = current playerId`.

---

## Merge rules (`mergePlayerStats`)

Inputs: local profile (stats + endless counters + local freshness), cloud doc (stats + endless counters + `updatedAt`), current `playerId`, `statsOwnerPlayerId`.

### Precedence

1. **No cloud doc** → local wins (first upload).
2. **Empty / missing local** → cloud wins (new-install restore).
3. **`statsOwnerPlayerId` present and ≠ current `playerId`** → **cloud replaces local** (account switch). Do **not** merge.
4. Otherwise compare freshness (`updatedAt` millis):
   - Missing cloud `updatedAt` → treat as `0`.
   - Local freshness: last successful local bump / last game write time stored alongside profile (device clock is acceptable for MVP).
   - **Base = newer side** (last-write-wins for the profile body).

### Field rules after choosing base

| Category | Fields | Rule |
|----------|--------|------|
| LWW from newer base | `totalGames`, `wins`, `gamesByLength`, `guessDistribution`, `currentStreak`, `lastGameDate`, per-mode `.current`, endless *current* streaks (`endlessStreakNormal` / `Hard` when treating as current run) | Take from newer base only (keeps wins/games coherent) |
| Safety `max` | `maxStreak`, each `perModeStreaks[*].max`, `endlessTotalWords` | `result = max(newer, older)` |
| Derived | `winRate` | Recompute from `wins / totalGames` after merge (never LWW blindly) |

Then set outgoing freshness to “now” for the next push (`serverTimestamp` on write).

**Rationale:** Applying `max` to `totalGames`/`wins` independently can pair an older lifetime with a newer win count and break `winRate`. Career ceilings (`maxStreak`, lifetime words) are safe to ratchet up.

---

## Sign-in sequence (replaces drain-first)

1. `setPlayer`
2. Load local stats + MMKV endless counters + `statsOwnerPlayerId`
3. If offline → skip pull; keep local; existing queue behavior; retry pull+merge on next online drain/foreground
4. `getPlayerStats`
5. Merge or replace per rules
6. Hydrate SQLite + MMKV; `statsStore.loadStats()`
7. Set `statsOwnerPlayerId`
8. Push merged profile once (`updatePlayerStats` + endless fields)
9. Resubmit leaderboard scores from `getLeaderboardMetrics()` (merged local)
10. Drain sync queue

### Sync queue interaction

- After a successful merged push, **stale `game_result` events that only replay older full snapshots must not overwrite** the merged cloud doc.
- Preferred MVP behavior: on successful merge push, remove or mark superseded pending `game_result` events whose payload freshness is older than the merged profile; keep `leaderboard_score` drain for any still-needed publishes (or rely on step 9 resubmit and skip redundant ones).
- If merge hydrate succeeds but push fails: enqueue one profile sync (`game_result` with merged snapshot or dedicated event) for retry.

---

## Auth asymmetry (unchanged product)

| Surface | Signed out | Signed in |
|---------|------------|-----------|
| Stats | Local only | Local + cloud restore/sync |
| Leaderboards | Auth gate | Ranked lists + personal metrics from local profile |

Sign-out clears auth flags only; **does not wipe local stats** (single-player continuity). Account switch is handled on the *next* sign-in via `statsOwnerPlayerId` replace rule.

---

## Error handling

- Firestore helpers remain non-throwing; failures return null/false; never block gameplay or Stats UI.
- Hydrate/pull failure: keep local; leave owner unchanged; retry on foreground / 30s timer / next sign-in.
- Push failure after hydrate: local is canonical; queue merged snapshot for retry.
- Leaderboard resubmit failure: queue `leaderboard_score` via existing path.
- No blocking toast required this slice.

---

## Testing

1. **Unit — `mergePlayerStats`:** empty local; empty cloud; newer local; newer cloud; monotonic safety nets; account-switch replace; `winRate` recompute; endless counters carried.
2. **Unit/integration — sign-in sequence (mocks):** pull → merge → hydrate → push → leaderboard resubmit → drain; assert stale `game_result` cannot clobber merged profile.
3. **Regression:** Stats loads signed-out; leaderboard remains auth-gated.

Out of scope for this slice’s tests: multi-device race stress, UI flash timing, settings sync.

---

## Implementation touchpoints (guidance)

| Area | Change |
|------|--------|
| `firestoreService.getPlayerStats` | Return `updatedAt` (+ endless fields); stop stripping freshness |
| `firestoreService.updatePlayerStats` | Persist endless counter fields with stats |
| New pure merge helper | `mergePlayerStats` (+ tests) |
| Local storage | `statsOwnerPlayerId`; hydrate helpers for stats + MMKV endless |
| `authStore` sign-in / silent | Run sign-in sequence before/around drain |
| `syncQueue` / drain handler | Supersede stale `game_result` after merged push |
| Leaderboard publish | Resubmit from `getLeaderboardMetrics()` post-hydrate |

No new “cloud-primary Stats screen” — local remains the read path.

---

## Future / Deferred

Documented for revisit. **Not in this slice.**

| Item | Why deferred | Notes when revisiting |
|------|----------------|------------------------|
| **True multi-device concurrent play** | Needs richer conflict strategy than LWW+career max (risk of lost games under interleaved play) | Consider per-game event log, CRDTs, or server-side aggregation; do not pretend profile LWW is enough |
| **Cross-device settings sync** | Explicitly out of Phase 5 v1 (`cloud-sync` wiki) | Separate doc + consent; not tied to stats restore |
| **Server-side leaderboard validation** | Already v2 in wiki | Cloud Functions to reject impossible scores |
| **Realtime leaderboard `onSnapshot`** | Already v2 in wiki | Live board updates without pull-to-refresh |
| **Hydrate UI polish** | Low risk | Loading/`isHydratingStats` to avoid brief pre-merge flash on Stats |
| **Vector clocks / skew-proof freshness** | MVP uses server `updatedAt` + simple local stamp | Revisit if clock skew causes real support issues |
| **Hard unify: derive boards by querying `playerStats`** | Rejected in 2026-07-13 unification design | Only if ranked queries from profile docs become desirable |
| **Email/password or Apple Sign-In** | Auth product expansion | Orthogonal to merge rules; still need `statsOwnerPlayerId` |

---

## Success criteria

1. New install → sign in → Stats shows prior cloud statistics (including distribution / streaks).
2. After restore, Words/Run/Best/Sharp personal values match Stats-derived metrics (endless MMKV hydrated).
3. Signed-out Stats still works from local data.
4. Account B signing in on a device that had account A’s local data does **not** merge A into B.
5. Stale queued `game_result` events do not overwrite a fresher merged profile.
