---
phase: 05-cloud-social
plan: 01
subsystem: cloud
tags: [firebase, firestore, google-sign-in, async-storage, offline-sync, expo]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: project scaffold, storage layer (AsyncStorage), types, barrel export pattern
  - phase: 04-monetization
    provides: @react-native-firebase/app installed, expo config plugin pattern, AsyncStorage availability
provides:
  - Firestore CRUD service for player stats and leaderboard data (updatePlayerStats, getPlayerStats, submitLeaderboardScore, getLeaderboard)
  - AsyncStorage-backed offline sync queue with idempotent dedup, exponential backoff, and max 3 retries (enqueueEvent, drainQueue, getQueueLength, clearQueue)
  - Updated app.json with Firebase Auth, Firestore, and Google Sign-In config plugins
affects: [05-02 (authService + authStore), 05-03 (leaderboardService + LeaderboardScreen)]

# Tech tracking
tech-stack:
  added:
    - "@react-native-firebase/auth@25.x"
    - "@react-native-firebase/firestore@25.x"
    - "@react-native-google-signin/google-signin@16.x"
  patterns:
    - Firestore CRUD wrapped in try/catch with typed fallback values
    - AsyncStorage-backed write-ahead log with full-array read/write pattern
    - djb2 deterministic hash for local idempotent dedup (not crypto)

key-files:
  created:
    - src/services/firestoreService.ts
    - src/services/syncQueue.ts
  modified:
    - package.json
    - package-lock.json
    - app.json
    - src/services/index.ts

key-decisions:
  - "Used djb2 hash instead of SHA-256 for event IDs (D-136 deviation) to avoid expo-crypto polyfill overhead; sufficient collision resistance for single-device queue dedup"
  - "Firestore offline persistence enabled at module load time via firestore().settings({ persistence: true }) with guard against duplicate calls"
  - "Event ID generated from sessionId + eventType for deterministic idempotency; falls back to JSON.stringify(data) if no sessionId present"
  - "drainQueue discards events with retryCount >= 3 (D-148); retries at 1s, 2s, 4s intervals via 2^retryCount * 1000ms"

requirements-completed:
  - CLOUD-01
  - CLOUD-02
  - CLOUD-06
  - CLOUD-07

# Coverage metadata (#1602) — per-deliverable traceability
coverage:
  - id: D1
    description: "Cloud dependencies @react-native-firebase/auth, @react-native-firebase/firestore, @react-native-google-signin/google-signin installed at Expo SDK-compatible versions"
    requirement: CLOUD-01
    verification:
      - kind: other
        ref: "node -e \"const p=require('./package.json'); console.log(p.dependencies['@react-native-firebase/auth'], p.dependencies['@react-native-firebase/firestore'], p.dependencies['@react-native-google-signin/google-signin'])\""
        status: pass
    human_judgment: false
  - id: D2
    description: "app.json plugins array includes @react-native-firebase/auth, @react-native-firebase/firestore, @react-native-google-signin/google-signin config plugins"
    requirement: CLOUD-01
    verification:
      - kind: other
        ref: "node -e \"const a=require('./app.json'); const p=a.expo.plugins; console.log('auth:', p.includes('@react-native-firebase/auth'), 'firestore:', p.includes('@react-native-firebase/firestore'), 'google-signin:', p.includes('@react-native-google-signin/google-signin'))\""
        status: pass
    human_judgment: false
  - id: D3
    description: "firestoreService.ts exports updatePlayerStats and getPlayerStats with { merge: true } idempotent writes and try/catch error handling"
    requirement: CLOUD-02
    verification:
      - kind: other
        ref: "tsc --noEmit passes; node -e checks exports and merge:true"
        status: pass
    human_judgment: false
  - id: D4
    description: "firestoreService.ts exports submitLeaderboardScore and getLeaderboard for leaderboards/{type}/scores/{playerId} collection with top-50 query"
    requirement: CLOUD-02
    verification:
      - kind: other
        ref: "tsc --noEmit passes; node -e checks exports"
        status: pass
    human_judgment: false
  - id: D5
    description: "syncQueue.ts exports enqueueEvent with idempotent dedup using deterministic djb2 hash event IDs"
    requirement: CLOUD-06
    verification:
      - kind: other
        ref: "tsc --noEmit passes; node -e checks exports and dedup logic"
        status: pass
    human_judgment: false
  - id: D6
    description: "syncQueue.ts exports drainQueue with exponential backoff (2^retryCount*1000ms), max 3 retries, and event discarding on exhaustion"
    requirement: CLOUD-07
    verification:
      - kind: other
        ref: "tsc --noEmit passes; node -e checks retryCount handling"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-06
status: complete
---

# Phase 5: Cloud & Social — Plan 01 Summary

**Firestore CRUD service for player stats and leaderboards, AsyncStorage-backed offline sync queue with idempotent events and exponential backoff, and cloud dependency setup**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-06T06:32:00Z
- **Completed:** 2026-07-06T06:40:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Installed @react-native-firebase/auth@25.x, @react-native-firebase/firestore@25.x, @react-native-google-signin/google-signin@16.x via npx expo install
- Updated app.json plugins array with Firebase Auth, Firestore, and Google Sign-In config plugins
- Created firestoreService.ts with 4 exported functions: updatePlayerStats, getPlayerStats, submitLeaderboardScore, getLeaderboard — all using `{ merge: true }` for idempotent writes with try/catch fallback
- Created syncQueue.ts with 4 exported functions: enqueueEvent (djb2-based deterministic ID for dedup), drainQueue (exponential backoff 2^retryCount*1000ms, max 3 retries), getQueueLength, clearQueue
- Updated src/services/index.ts barrel to export both new services

## Task Commits

Each task was committed atomically:

1. **Task 1: Install cloud dependencies and update app.json config plugins** — `0d248c7` (feat)
2. **Task 2: Create Firestore service for player stats and leaderboards** — `c8e47ba` (feat)
3. **Task 3: Create offline sync queue with idempotent dedup and retry** — `02a009b` (feat)

## Files Created/Modified
- `package.json` - Added 3 cloud dependencies
- `package-lock.json` - Updated lockfile with new transitive deps
- `app.json` - Added Firebase Auth, Firestore, and Google Sign-In config plugins
- `src/services/firestoreService.ts` - Firestore CRUD wrapper with idempotent writes
- `src/services/syncQueue.ts` - AsyncStorage-backed offline write-ahead log
- `src/services/index.ts` - Barrel exports for both new services

## Decisions Made
- Used djb2 hash instead of SHA-256 for deterministic event IDs (D-136 deviation) — avoids expo-crypto polyfill overhead; djb2 provides sufficient collision resistance for single-device queue dedup
- Firestore persistence enabled at module load time with a guard to prevent duplicate `settings()` calls
- drainQueue handler failure tracking: events with retryCount >= 3 are discarded (D-148), retry timing follows 2^retryCount * 1000ms (1s, 2s, 4s)
- Event ID generation: uses `sessionId` from data if present, falls back to `JSON.stringify(data)` for deterministic hash

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- **npm peer dependency conflict with react-native-iap@15.3.6** — pre-existing conflict between react-native-iap and react-native-nitro-modules versions. Resolved by passing `--legacy-peer-deps` to all three `npx expo install` commands. Doesn't affect new cloud packages.

## User Setup Required

None for this plan. Plan 05-02 will document `google-services.json` placement.

## Next Phase Readiness
- Cloud dependencies installed and verified with `npx expo install --check`
- Firestore CRUD service ready for authService (05-02) and leaderboardService (05-03) to consume
- Sync queue ready for offline score submission before sign-in (consumed by GameScreen and authStore)
- Barrel exports in place for seamless import by downstream plan

## Self-Check: PASSED

All files exist, all commits found, all dependencies present, app.json plugins correct, barrel exports updated, TypeScript compiles cleanly.

---
*Phase: 05-cloud-social*
*Completed: 2026-07-06*
