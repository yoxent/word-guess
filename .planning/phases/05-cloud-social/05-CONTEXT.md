# Phase 5: Cloud & Social — Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

---

<domain>
## Phase Boundary

Optional Google Sign-In enabling cloud-synced stats and competitive leaderboards for Daily Challenge and Endless modes.

**Requirements:** CLOUD-01 through CLOUD-08

### In scope
- Google Play Sign-In via @react-native-google-signin + Firebase Auth token exchange
- Cloud-synced stats via Firebase Firestore — event-based incremental sync (not full-state overwrite)
- Daily Challenge leaderboard — top players by daily streak; requires sign-in to view
- Endless leaderboard — top players by total consecutive correct guesses
- Endless leaderboard (total words guessed ever) — separate listing viewable independently
- Offline-first sync with write-ahead log — game results appended to sync queue; drain queue with idempotent events on connectivity; handles 3+ offline games before sync
- Deferred score queue — if sign-in not complete at score time, queue score locally; submit when auth succeeds; retry 3× with exponential backoff
- Google Sign-In configured with Web client ID (not Android client ID); OAuth consent screen set to External
- Three SHA-1 fingerprints registered in Firebase (debug, upload, Play App Signing)
- Leaderboard state handling: not signed in, loading, empty, error, data

### Out of scope
- Server-side receipt validation or leaderboard moderation
- RevenueCat or purchase SDK middleware
- Email/password or other auth providers (Google-only for MVP)
- Real-time leaderboard updates via Firestore listeners (manual refresh/on-mount query is sufficient for MVP)
- Push notifications
- Multiplayer or real-time game features
- Web/iOS support (Android-only for launch)

</domain>

<decisions>
## Implementation Decisions

### Prior Phase Carry-Forward

| Phase | Decisions | Relevance |
|-------|-----------|-----------|
| Phase 1 | D-01–D-24 | Project structure, storage split (MMKV/SQLite/AsyncStorage), authStore + auth token pattern, barrel exports, relative imports |
| Phase 2 | D-25–D-66 | Game loop, endless streak tracking in storage.ts, daily completion tracking, game completion flow in GameScreen/ResultModal |
| Phase 3 | D-67–D-86 | Config-driven UI registry (`src/config/ui.ts`), SettingsRowConfig union types, per-mode streaks, statsStore.recordGame(), typography constants |
| Phase 4 | D-87–D-112 | Firebase Remote Config pattern, Zustand store patterns for SDK wrappers, game completion→ad flow in ResultModal |

### Phase 5 Decisions

#### 1. Google Sign-In Implementation
- **D-113:** Use `@react-native-google-signin/google-signin` (16.x) for native Google Sign-In button
- **D-114:** Pass **Web client ID** (from Firebase Console → Web credentials) to `GoogleSignin.configure()`, NOT the Android client ID — this is the #1 cause of DEVELOPER_ERROR
- **D-115:** After successful `GoogleSignin.signIn()`, exchange idToken via `firebase.auth().signInWithCredential(GoogleAuthProvider.credential(idToken))`
- **D-116:** All three SHA-1 fingerprints must be registered in Firebase project settings: debug (`~/.android/debug.keystore`), upload (local .jks), Play App Signing (Play Console → App Integrity)
- **D-117:** OAuth scopes: `profile` and `email` only (minimal for MVP)
- **D-118:** Silent sign-in on app startup via `GoogleSignin.signInSilently()` — restores session transparently; never blocks gameplay

#### 2. Auth Store Integration
- **D-119:** Create `src/services/authService.ts` wrapping GoogleSignin + Firebase Auth — separates SDK concerns from Zustand store
- **D-120:** Extend `authStore` with `googleSignIn()`, `googleSignOut()`, `googleSignInSilently()` actions — wire through to authService
- **D-121:** `authStore.setPlayer()` updated to accept Firebase user info (uid, displayName)
- **D-122:** `authStore.signOut()` extended to call `GoogleSignin.signOut()` + `firebase.auth().signOut()`
- **D-123:** On sign-in success, drain the deferred sync queue (any queued score submissions)

#### 3. Settings Screen Auth UI
- **D-124:** Replace `{ type: 'placeholder', id: 'signIn', ... }` in config/ui.ts with `{ type: 'signIn', id: 'signIn', ... }` — new row type in SettingsRowConfig union
- **D-125:** New `signInButton` row type renders: when NOT signed in → tappable "Sign in with Google" row (Google icon + text); when signed in → shows player name + "Sign Out" touchable
- **D-126:** If user is signed in, hide sign-in row and show player name row + sign-out row instead
- **D-127:** Sign-out is a single tap with no confirmation dialog (quick action)

#### 4. Firestore Data Model
- **D-128:** Firestore collections:
  - `playerStats/{playerId}` — aggregated player stats document
  - `leaderboards/daily_streak/scores/{playerId}` — daily streak scores
  - `leaderboards/endless_streak/scores/{playerId}` — endless streak scores
  - `leaderboards/endless_total/scores/{playerId}` — endless total words scores
- **D-129:** Player stats document fields: playerName, totalGames, wins, winRate, currentStreak, maxStreak, guessDistribution, gamesByLength, perModeStreaks, lastGameDate
- **D-130:** Leaderboard score documents: playerId, playerName, score, updatedAt
- **D-131:** Use Firestore `set()` with `{ merge: true }` for idempotent writes (avoid overwriting fields)
- **D-132:** Leaderboard queries: `orderBy('score', 'desc').limit(50)` for top 50

#### 5. Offline Sync Queue
- **D-133:** Create `src/services/syncQueue.ts` — AsyncStorage-backed queue (JSON array)
- **D-134:** Queue event types: `game_result` (game completion data for stats sync), `leaderboard_score` (score submission data)
- **D-135:** Event structure: `{ id: string, type: string, data: object, retryCount: number, nextRetryAt: string|null, createdAt: string }`
- **D-136:** Event IDs are deterministic (hash of game session ID + event type) for idempotency — prevents duplicate entries
- **D-137:** `drainQueue(handler)` iterates queue, calls async handler for each event, removes on success, increments retryCount + sets nextRetryAt on failure
- **D-138:** Exponential backoff formula: `2^retryCount * 1000ms` delay before next retry; max 3 retries
- **D-139:** Queue drains on: auth state change (sign-in), periodic timer (every 30s while app is active), app foreground event
- **D-140:** Sync queue supports 3+ offline games — no limit on queue size

#### 6. Leaderboard Score Submission
- **D-141:** Create `src/services/leaderboardService.ts` — wraps Firestore leaderboard operations
- **D-142:** `submitScore(type, score)` writes to appropriate leaderboard collection; uses `{ merge: true }` for upsert
- **D-143:** `getLeaderboard(type)` queries top 50 scores from leaderboard collection
- **D-144:** Score submission at game completion:
  - Daily Challenge win → submit daily streak (from perModeStreaks.daily.current) to daily_streak leaderboard
  - Endless mode win → submit endless streak to endless_streak leaderboard, submit total endless words to endless_total leaderboard
  - Endless mode loss → submit final streak to endless_streak, submit total endless words to endless_total (streak may be 0)
- **D-145:** Total endless words tracked via `getEndlessTotalWords()` / `incrementEndlessTotalWords()` in storage.ts (MMKV counter)

#### 7. Deferred Score Queue (CLOUD-07)
- **D-146:** When game completes and user is NOT signed in, enqueue `leaderboard_score` event to sync queue
- **D-147:** When auth state changes to signed in, drain sync queue (replay all queued leaderboard_score events)
- **D-148:** Failed submissions increment retryCount; after 3 retries, event is discarded (accepted data loss for extreme edge case)

#### 8. Leaderboard Screen
- **D-149:** LeaderboardScreen uses a segmented control with 3 segments: "Daily Streak", "Endless Streak", "Endless Total"
- **D-150:** Screen states:
  - Not signed in: Sign-in prompt with "Sign in with Google" button + explanation text
  - Loading: ActivityIndicator centered
  - Empty: "No entries yet" with mode-appropriate message
  - Error: Error message + "Retry" button
  - Data: FlatList of LeaderboardEntry rows; current player highlighted with accent color
- **D-151:** Leaderboard auto-refreshes on screen focus (useFocusEffect)
- **D-152:** Pull-to-refresh on leaderboard data

#### 9. Game Completion → Sync Wiring
- **D-153:** After game completes in GameScreen (animation done, stats recorded), attempt to sync:
  1. If signed in + online → submit to leaderboardService directly + sync stats via Firestore
  2. If signed in + offline → enqueue game_result to syncQueue
  3. If not signed in → enqueue leaderboard_score to syncQueue (deferred)
- **D-154:** Sync is non-blocking (fire-and-forget) — never delays the user's transition

### Claude's Discretion
- Exact syncQueue.ts API surface (enqueue, drain, getQueueLength, clear)
- FirestoreService error handling granularity (which errors are retryable vs fatal)
- Leaderboard segment control styling (consistent with existing UI components)
- Leaderboard Entry row layout (rank, name, score, highlight)
- Sync status indicator (subtle indicator in leaderboard or settings showing "Syncing..." / "Synced")
- Auth state subscription timing (when to attach/remove auth state listener)
- Whether to show a subtle "Sign in to save your scores" prompt on game completion (non-blocking, dismissable)

</decisions>

<deferred>
## Deferred Ideas
- **Server-side receipt validation** — not needed for MVP. Client-side Firestore rules + auth is sufficient.
- **RevenueCat or purchase SDK middleware** — ruled out in Phase 1. Not relevant to cloud/auth.
- **Real-time leaderboard updates via Firestore onSnapshot** — manual refresh / on-mount query is sufficient for MVP.
- **Push notifications** — not needed for MVP.
- **Email/password or Apple Sign-In** — Google-only for MVP.
- **Syncing settings or game state across devices** — stats-only sync for MVP.

</deferred>

---

*Phase: 5-Cloud-Social*
*Context gathered: 2026-07-06*
*Prior phases carried forward: Phase 1 (D-01–D-24), Phase 2 (D-25–D-66), Phase 3 (D-67–D-86), Phase 4 (D-87–D-112)*
*Decisions this phase: D-113 through D-154*
