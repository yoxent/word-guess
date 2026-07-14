# cloud-sync
updated: 2026-07-14 (Play Games–only auth; stats profile restore)
tags: [cloud, firebase, firestore, sync, leaderboard, auth, phase-5]
related: [google-signin, phase-structure, architecture, tech-stack, key-risks]

## Phase 5 overview
Optional Play Games sign-in enabling cloud-synced stats and competitive leaderboards for Daily/Endless modes. 3 plans across 3 waves. Mode: mvp. Depends on Phase 4 (Monetization).

**8 requirements:** CLOUD-01 through CLOUD-08

## Play Games + Firebase Auth

### Architecture
```
User taps "Sign in with Play Games" (or silent auto-auth on launch)
  → authService.signIn() / signInSilently()
    → PlayGamesAuth.signInWithFirebase(webClientId, interactive)
      → GamesSignInClient (silent poll or interactive signIn)
      → requestServerSideAccess(webClientId) → server auth code
      → PlayGamesAuthProvider.getCredential(code) → Firebase Auth
    → authStore.setPlayer(firebaseUser)
    → drain syncQueue (deferred scores)
```

### Key rules
- **Web client ID** passed to Play Games `requestServerSideAccess`, NOT Android client ID
- SHA-1 fingerprints in Play Console / Firebase must include the cert that **actually signs** the install
- Firebase Auth → enable **Play Games** provider (Google Sign-In provider is unused)
- Silent sign-in on app startup via Play Games non-interactive path — never blocks gameplay
- Sign-out calls Firebase `signOut` via native module
- Details: [google-signin](google-signin.md) (page kept as Play Games auth doc)

### Files
| File | Role |
|------|------|
| `src/services/authService.ts` | Play Games + Firebase Auth wrapper |
| `src/stores/authStore.ts` | signIn, signOutAccount, signInSilently |
| `modules/play-games-auth` | Native Expo module (PGS → Firebase) |

### Settings UI (D-124-D-127)
- Placeholder `"Sign in — coming in Phase 5"` replaced with working `signInButton` row type
- Signed out: tappable "Sign in with Google" row + chevron
- Signed in: avatar + truncated player name + "Sign Out" (name uses `flexShrink` / ellipsis so Sign Out stays inside the card)
- Sign-out: single tap, no confirmation

### Cold-start hydration (plan-checker finding)
- Zustand persist rehydrates async — brief flash of `isLoggedIn: false` on cold start
- Mitigation: `_hasHydrated` gating for auth-dependent UI
- `signInSilently` clears stale `isLoggedIn: true` when silent sign-in returns null

## Firestore data model (D-128-D-132)

### Collections
```
playerStats/{playerId}
  — playerName, totalGames, wins, winRate, currentStreak, maxStreak
  — guessDistribution, gamesByLength, perModeStreaks, lastGameDate

leaderboards/daily_streak/scores/{playerId}
  — playerId, playerName, score (daily streak), updatedAt

leaderboards/endless_streak/scores/{playerId}
  — playerId, playerName, score (consecutive correct), updatedAt

leaderboards/endless_total/scores/{playerId}
  — playerId, playerName, score (total words), updatedAt

leaderboards/best_streak/scores/{playerId}
  — playerId, playerName, score (best-ever streak any mode), updatedAt

leaderboards/sharpshooter/scores/{playerId}
  — playerId, playerName, score (fast-win points: 1×3 + 2×2 + 3×1), updatedAt
```

### Write strategy
- `set({...}, { merge: true })` for idempotent upsert — never overwrites fields
- Event-based incremental sync: each game writes atomic update, not full-state overwrite
- Queries: `orderBy('score', 'desc').limit(50)` for top 50 per leaderboard

### Error handling
- All Firestore calls wrapped in try/catch
- Return typed fallback values (false, null, empty array) — never throw
- Firestore SDK internal retry handles transient errors
- syncQueue handles persistent offline cases

## Offline sync queue (D-133-D-140)

### Design
- `src/services/syncQueue.ts` — AsyncStorage-backed write-ahead log
- Event types: `game_result` (stats sync), `leaderboard_score` (score submission)
- Event structure: `{ id, type, data, retryCount, nextRetryAt, createdAt }`
- Event IDs: deterministic hash of session ID + event type (djb2/fnv1a) for idempotent dedup
- No queue size limit (unbounded)

### Retry & backoff (D-137-D-138)
```
Exponential backoff: 2^retryCount * 1500ms
  → ~3s, 6s, 12s, 24s, 48s (max 6 retries)
Events with retryCount >= 6 discarded on next drain attempt
```

### Drain triggers (D-139)
| Trigger | Mechanism | Location |
|---------|-----------|----------|
| Auth state change (sign-in) | drainQueue() after setPlayer | authStore.signIn |
| Periodic timer | setInterval 30s | App.tsx useEffect |
| App foreground | AppState 'active' listener | App.tsx useEffect |

### Queue operations
- `enqueueEvent(type, data, id?)` — skips duplicate IDs
- `drainQueue(handler)` — iterates, calls handler, removes on success, increments retryCount on failure
- `getQueueLength()` — pending count
- `clearQueue()` — for testing/admin

## Leaderboards (D-141-D-152)

### Service
- `src/services/leaderboardService.ts` — wraps Firestore operations
- `submitScore(type, score)` — submits to leaderboard, queues if offline/unauthed
- `getLeaderboardData(type)` — fetches top 50, marks current player
- `updateLeaderboardAfterGame(params)` — mode-aware: Daily→daily_streak, Endless→streak+total

### Stats ↔ leaderboards (2026-07-13)
Local stats/storage is the source of truth for the player's competitive metrics.
Leaderboards publish ranked slices via `getLeaderboardMetrics()` — they do not maintain a second counter system.
UI chips: **Daily** / **Run** / **Words** / **Best** / **Sharp** (podium + flair titles + personal footer).

### Score submission (D-144)
| Mode | Outcome | Submits to |
|------|---------|-----------|
| Daily | Win | `daily_streak` + career boards |
| Endless | Win | `endless_streak` + `endless_total` + career boards |
| Endless | Loss | `endless_streak` (0 if broken) + `endless_total` + career boards |
| Random / other | Win or loss | career boards only (`best_streak`, `sharpshooter` when > 0) |

Career boards:
- `best_streak` ← `PlayerStats.maxStreak` (monotonic)
- `sharpshooter` ← guessDistribution 1×3 + 2×2 + 3×1 (monotonic)

### Screen (5 boards, podium UI)
| Chip | Leaderboard Type |
|------|-----------------|
| Daily | `daily_streak` |
| Run | `endless_streak` |
| Words | `endless_total` |
| Best | `best_streak` |
| Sharp | `sharpshooter` |

**States:** Not signed in (auth gate) → Loading → Empty → Error → Data (podium for top 3 + list 4+)

### Wire protocol (D-153-D-154)
```
Game completes (animation done)
  → recordGame() to SQLite (local)
  → if signed in + online:
      updatePlayerStats → Firestore
      submitScore → Firestore leaderboard
  → if signed in + offline:
      enqueue game_result to syncQueue
  → if not signed in:
      enqueue leaderboard_score to syncQueue (deferred)
```
All sync is **fire-and-forget** — never blocks UI transition.

## Deferred score queue (D-146-D-148)
- Scores from unauthenticated games queued as `leaderboard_score` events
- On sign-in: drainQueue replays all queued scores
- Failed submissions: retry 6× with backoff, then discard (accepted data loss)

## Endless total words (D-145)
- MMKV counter: `getEndlessTotalWords()` / `incrementEndlessTotalWords()` in storage.ts
- Incremented in ResultModal on Endless game completion
- Submitted to `endless_total` leaderboard after every Endless game

## Plan checker findings (resolved)

| Issue | Finding | Fix |
|-------|---------|-----|
| CLOUD-02 gap | `updatePlayerStats` created but never called | Added to game completion flow with online/offline fallback |
| D-136 deviation | D-136 specified SHA-256, plan used djb2 | Documented rationale: expo-crypto overhead unnecessary for local dedup |
| D-139 partial | Only auth drain trigger implemented | Added periodic 30s timer + AppState foreground drain in App.tsx |
| Daily streak stale | recordGame() not awaited before read | Computed as `baseStreak + (won ? 1 : 0)` |

## Stats profile restore (2026-07-14)

Design spec: [`docs/superpowers/specs/2026-07-14-stats-cloud-restore-design.md`](../../docs/superpowers/specs/2026-07-14-stats-cloud-restore-design.md) (see **Future / Deferred** there for backlog items not in this slice).

### Profile source of truth
- **Local aggregate SOT:** MMKV `stats_profile_v1` (`readStatsProfile` / `writeStatsProfile`) holds the syncable `PlayerStats` aggregate + `updatedAtMs`; endless counters stay in separate MMKV keys and are hydrated with the profile.
- **Cloud mirror:** `playerStats/{playerId}` — pull/merge on sign-in, push after merge.
- **Owner binding:** `statsOwnerPlayerId` — account switch (`owner ≠ current playerId`) replaces local with cloud (no cross-account merge).
- Stats screen always reads local profile (signed-out OK); leaderboards personal footer uses same profile via `getLeaderboardMetrics()`.

### Sign-in sequence (`syncPlayerProfileOnAuth`)
Pull → `mergePlayerStats` → hydrate SQLite/MMKV → `statsStore.loadStats()` → push merged profile → `reconcileLocalLeaderboardScores()` → drain queue.

### Sync queue supersede
- **Account switch:** pending `game_result` events cleared immediately (`removeEventsByType`) so a prior owner's stale snapshots cannot drain into the new account.
- **After successful merge push:** all pending `game_result` events removed — merged profile supersedes queued full snapshots; push failure re-enqueues one `game_result` under the current owner.

## Deferred to v2
- Server-side leaderboard validation (Cloud Functions)
- Real-time Firestore onSnapshot for leaderboard updates
- Push notifications
- Email/password or Apple Sign-In
- Cross-device settings sync (stats-only for v1)
- Multi-device concurrent play, hydrate UI polish, vector clocks — see design spec **Future / Deferred**
