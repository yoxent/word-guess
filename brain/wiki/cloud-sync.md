# cloud-sync
updated: 2026-07-06
tags: [cloud, firebase, firestore, sync, leaderboard, auth, phase-5]
related: [google-signin, phase-structure, architecture, tech-stack, key-risks]

## Phase 5 overview
Optional Google Sign-In enabling cloud-synced stats and competitive leaderboards for Daily/Endless modes. 3 plans across 3 waves. Mode: mvp. Depends on Phase 4 (Monetization).

**8 requirements:** CLOUD-01 through CLOUD-08

## Google Sign-In + Firebase Auth

### Architecture
```
User taps "Sign in with Google" button
  → authService.signInWithGoogle()
    → GoogleSignin.signIn() → idToken
    → Firebase auth().signInWithCredential(credential)
    → authStore.setPlayer(firebaseUser)
    → drain syncQueue (deferred scores)
```

### Key rules (D-113-D-118)
- **Web client ID** passed to `GoogleSignin.configure()`, NOT Android client ID (P4, #1 cause of DEVELOPER_ERROR)
- Three SHA-1 fingerprints registered in Firebase: debug, upload, Play App Signing
- OAuth scopes: `profile` + `email` only (minimal)
- Silent sign-in on app startup via `GoogleSignin.signInSilently()` — never blocks gameplay
- Sign-out calls both `GoogleSignin.signOut()` + `auth().signOut()`

### Files
| File | Role |
|------|------|
| `src/services/authService.ts` | GoogleSignIn + Firebase Auth wrapper (configure, signIn, signOut, signInSilently, getCurrentUser, onAuthStateChanged) |
| `src/stores/authStore.ts` | Extended with googleSignIn, googleSignOut, googleSignInSilently |

### Settings UI (D-124-D-127)
- Placeholder `"Sign in — coming in Phase 5"` replaced with working `signInButton` row type
- Signed out: tappable "Sign in with Google" row
- Signed in: player name + "Sign Out" touchable
- Sign-out: single tap, no confirmation

### Cold-start hydration (plan-checker finding)
- Zustand persist rehydrates async — brief flash of `isLoggedIn: false` on cold start
- Mitigation: `_hasHydrated` gating for auth-dependent UI
- `googleSignInSilently` clears stale `isLoggedIn: true` when silent sign-in returns null

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
Exponential backoff: 2^retryCount * 1000ms
  → 1s, 2s, 4s (max 3 retries)
Events with retryCount >= 3 discarded on next drain attempt
```

### Drain triggers (D-139)
| Trigger | Mechanism | Location |
|---------|-----------|----------|
| Auth state change (sign-in) | drainQueue() after setPlayer | authStore.googleSignIn |
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

### Score submission (D-144)
| Mode | Outcome | Submits to |
|------|---------|-----------|
| Daily | Win | `daily_streak` (current streak) |
| Endless | Win | `endless_streak` + `endless_total` |
| Endless | Loss | `endless_streak` (0 if broken) + `endless_total` |

### Screen (3 tabs, 5 states, D-149-D-152)
| Tab | Leaderboard Type |
|-----|-----------------|
| Daily Streak | `daily_streak` |
| Endless Streak | `endless_streak` |
| Endless Total | `endless_total` |

**States:** Not signed in (auth gate) → Loading → Empty → Error → Data

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
- Failed submissions: retry 3× with backoff, then discard (accepted data loss)

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

## Deferred to v2
- Server-side leaderboard validation (Cloud Functions)
- Real-time Firestore onSnapshot for leaderboard updates
- Push notifications
- Email/password or Apple Sign-In
- Cross-device settings sync (stats-only for v1)
