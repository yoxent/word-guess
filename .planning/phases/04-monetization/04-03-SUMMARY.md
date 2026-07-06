---
phase: 04-monetization
plan: 03
subsystem: ui, ads, game-loop
tags: react-native, google-mobile-ads, zustand, interstitial, rewarded-video
requires:
  - phase: 04-01
    provides: adStore with preload/show/rewarded methods, config with maxExtraGuesses
provides:
  - addExtraGuess() mechanic in gameStore for rewarded ad reward
  - Rewarded ad button in ResultModal on loss state
  - Interstitial ad before ResultModal navigation with frequency capping
  - GameScreen interstitial preload and gamesSinceLastAd counter
affects: [04-04 (if any remaining ad work)]
tech-stack:
  added: []
  patterns:
    - "Interstitial shown before navigation transitions (Flappy Bird-style)"
    - "Rewarded ad triggered by user tap, not automatically"
key-files:
  created: []
  modified:
    - src/stores/gameStore.ts
    - src/components/game/ResultModal.tsx
    - src/screens/GameScreen.tsx
key-decisions:
  - "Option A (ResultModal imports adStore directly) selected over Option B (GameScreen owns navigation) — simpler and consistent with existing pattern"
patterns-established:
  - "Interstitial frequency guarded by isPro and session mode"
  - "Extra guesses resume game from 'lost' to 'playing' state"
requirements-completed: [AD-01, AD-02, AD-03]
coverage:
  - id: D1
    description: "addExtraGuess() method on gameStore resumes lost game, increments maxAttempts and extraGuessesUsed, respects per-tier max"
    requirement: AD-02
    verification:
      - kind: other
        ref: "npx tsc --noEmit — compiles cleanly"
        status: pass
    human_judgment: false
  - id: D2
    description: "ResultModal shows Watch Ad for +1 Guess button on loss state when extraGuessesUsed < maxExtra (free=2, pro=3)"
    requirement: AD-02
    verification:
      - kind: other
        ref: "npx tsc --noEmit — compiles cleanly"
        status: pass
    human_judgment: true
    rationale: "UI rendering requires visual verification on device/simulator"
  - id: D3
    description: "Interstitial fires before Play Next / Back to Menu navigation with frequency capping (Daily=every game, Endless/Random=every 2nd); Pro users skip interstitials"
    requirement: AD-01
    verification:
      - kind: other
        ref: "npx tsc --noEmit — compiles cleanly"
        status: pass
    human_judgment: true
    rationale: "Ad behavior requires device-level testing with real ad SDK"
  - id: D4
    description: "GameScreen preloads interstitial at game start and after game completion; incrementGamesSinceLastAd on game over"
    requirement: AD-03
    verification:
      - kind: other
        ref: "npx tsc --noEmit — compiles cleanly"
        status: pass
    human_judgment: true
    rationale: "Preload timing and counter increment require runtime verification"
duration: 12min
completed: 2026-07-06
status: complete
---

# Phase 4: Monetization Summary — Plan 04-03

**Ad lifecycle wired into game loop — interstitial at result transitions with frequency capping, rewarded video on loss state for extra guesses, preloaded at game start**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-06
- **Completed:** 2026-07-06
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `addExtraGuess()` method on gameStore that resumes game from 'lost' to 'playing', increments maxAttempts by 1, respects per-tier cap (free=2, pro=3)
- ResultModal rewarded ad button renders on loss state when extraGuessesUsed < maxExtra; tap triggers rewarded video and grants extra guess
- Interstitial fires before Play Next / Back to Menu navigation in ResultModal; frequency capped by mode (Daily=every game, Endless/Random=every 2nd)
- Pro users (isPro=true) skip interstitials but still see rewarded ad button
- GameScreen preloads interstitial at game start and after game completion; increments gamesSinceLastAd counter on game over

## Task Commits

Each task was committed atomically:

1. **Task 1: Add extra guess mechanics to gameStore** - `04cc519` (feat)
2. **Task 2: Add rewarded ad button and interstitial to ResultModal** - `57971df` (feat)
3. **Task 3: Wire interstitial preload and frequency counter in GameScreen** - `b40ede4` (feat)

## Files Created/Modified
- `src/stores/gameStore.ts` - Added `addExtraGuess()` method with per-tier max cap
- `src/components/game/ResultModal.tsx` - Added rewarded ad button, interstitial before navigation, frequency logic, and styles
- `src/screens/GameScreen.tsx` - Added interstitial preload at game start and after game completion, gamesSinceLastAd counter

## Decisions Made
- **Option A (ResultModal directly imports adStore)** selected over Option B (GameScreen owns navigation callbacks). Option A is simpler and consistent with ResultModal's existing pattern of importing multiple stores directly.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. All tasks compiled cleanly on first attempt.

## Threat Model Coverage

The plan's threat register (T4-06, T4-07, T4-08) dispositions were reviewed:

- **T4-06 (Extra guess exploit):** Accepted. `addExtraGuess()` guards on `status !== 'lost'` and `extraGuessesUsed >= maxExtra` — the counter prevents excessive grants.
- **T4-07 (Ad not loading):** Accepted. Both interstitial and rewarded ad paths degrade silently (navigate without ad; button tap no-ops if ad not ready).
- **T4-08 (Pro gating bypass):** Accepted. `isPro` stored locally in MMKV — no server-side enforcement in MVP.

## Next Phase Readiness
- Ad lifecycle fully wired: preload → interstitial at transition → rewarded on loss → frequency counter
- Ready for any remaining monetization work (plan 04-04 if created)
- Device-level testing needed to verify actual ad serving (test IDs configured in adStore)

## Self-Check: PASSED

- `04cc519` — commit found ✔
- `57971df` — commit found ✔
- `b40ede4` — commit found ✔
- `src/stores/gameStore.ts` — exists ✔
- `src/components/game/ResultModal.tsx` — exists ✔
- `src/screens/GameScreen.tsx` — exists ✔
- `.planning/phases/04-monetization/04-03-SUMMARY.md` — exists ✔
- No staged files ✔
- TypeScript compiles (`npx tsc --noEmit`) — clean ✔

---
*Phase: 04-monetization*
*Plan: 03*
*Completed: 2026-07-06*
