---
phase: 04-monetization
plan: 01
subsystem: monetization
tags: [admob, react-native-google-mobile-ads, react-native-iap, firebase-remote-config, zustand, interstitial, rewarded]

requires:
  - phase: 02-core-gameplay
    provides: GameStore with extraGuessesUsed, maxAttempts; ResultModal layout
  - phase: 03-stats-settings
    provides: settingsStore with setPro/isPro; config-driven UI registry pattern; barrel export pattern

provides:
  - Zustand adStore singleton (D-103 – D-105) with InterstitialAd/RewardedAd lifecycle management
  - Remote Config service (D-106 – D-109) for fetch-on-launch ad unit IDs with test-ID fallback
  - Per-tier extra guess limits: maxExtraGuessesFree: 2, maxExtraGuessesPro: 3 (D-94)
  - App.json config plugins for react-native-google-mobile-ads, react-native-iap, expo-build-properties
  - TypeScript types: AdState, RestoreResult

affects: 04-monetization (plans 02, 03)

tech-stack:
  added:
    - react-native-google-mobile-ads (16.x)
    - react-native-iap (15.x)
    - @react-native-firebase/remote-config
    - @react-native-firebase/app
  patterns:
    - Module-level ad instances (InterstitialAd/RewardedAd) stored outside Zustand for non-serializable state
    - Ad lifecycle: preload → LOADED event → show → CLOSED event → lazy preload next
    - Remote Config as typed service with TestIds fallback in dev

key-files:
  created:
    - src/types/monetization.ts
    - src/stores/adStore.ts
    - src/services/remoteConfig.ts
  modified:
    - package.json
    - app.json
    - src/constants/config.ts
    - src/types/index.ts
    - src/stores/index.ts
    - src/app/App.tsx

key-decisions:
  - "InterstitialAd / RewardedAd instances stored as module-level variables, not in Zustand (not serializable)"
  - "Preload skipped if already loaded or already loading (prevents double-loading)"
  - "Lazy preload of next ad after CLOSED event so next show() call has a ready ad"
  - "EARNED_REWARD listener attached just before show and cleaned up after (one-shot pattern)"
  - "Remote Config fetch is fire-and-forget in App.tsx — never blocks startup"
  - "In development (__DEV__), always use Google test ad IDs; in prod, read from Remote Config"

patterns-established:
  - "Ad store wraps react-native-google-mobile-ads behind Zustand interface — components import useAdStore, not ad SDK directly"
  - "Per-tier config split uses destructured exports from config.ts"
  - "Remote Config service typed as pure functions, not a class"

requirements-completed: [AD-01, AD-05, AD-06, AD-07]

coverage:
  - id: D1
    description: "Dependencies installed and config plugins registered in app.json"
    requirement: "AD-01"
    verification:
      - kind: other
        ref: "npm ls react-native-google-mobile-ads react-native-iap @react-native-firebase/remote-config @react-native-firebase/app"
        status: pass
      - kind: other
        ref: "grep plugins app.json"
        status: pass
    human_judgment: false
  - id: D2
    description: "Zustand adStore singleton with InterstitialAd/RewardedAd lifecycle management"
    requirement: "AD-05"
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D3
    description: "Remote Config service with fetchAdUnitIds, getInterstitialAdId, getRewardedAdId, TestIds fallback"
    requirement: "AD-06"
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D4
    description: "Per-tier extra guess limits: maxExtraGuessesFree: 2, maxExtraGuessesPro: 3"
    requirement: "AD-07"
    verification:
      - kind: other
        ref: "grep maxExtraGuessesFree src/constants/config.ts && grep maxExtraGuessesPro src/constants/config.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Monetization types (AdState, RestoreResult) defined and barrel-exported"
    requirement: "AD-01"
    verification:
      - kind: other
        ref: "npx tsc --noEmit"
        status: pass
    human_judgment: false
  - id: D6
    description: "Remote Config fetch wired in App.tsx on mount (fire-and-forget)"
    requirement: "AD-06"
    verification:
      - kind: other
        ref: "grep fetchAdUnitIds src/app/App.tsx"
        status: pass
    human_judgment: false

duration: 18min
completed: 2026-07-06
status: complete
---

# Phase 4: Monetization — Plan 01 Summary

**Monetization foundation layer: dependency installs, ad store singleton with ref-counted lifecycle, Remote Config service with test-ID fallback, per-tier extra guess limits**

## Performance

- **Duration:** 18 min
- **Started:** 2026-07-06T11:30:00Z
- **Completed:** 2026-07-06T11:48:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Installed `react-native-google-mobile-ads`, `react-native-iap`, `@react-native-firebase/remote-config`, `@react-native-firebase/app` with npm
- Registered all config plugins in app.json preserving the existing `expo-sqlite` entry
- Created `AdState` interface and `RestoreResult` type in `src/types/monetization.ts` with barrel export
- Split `maxExtraGuesses` into `maxExtraGuessesFree: 2` and `maxExtraGuessesPro: 3` per D-94
- Created `src/stores/adStore.ts`: Zustand singleton managing InterstitialAd/RewardedAd lifecycle with module-level ad instances, LOADED/ERROR/CLOSED/EARNED_REWARD event handling, lazy preload on CLOSED, prevention of double-loading
- Created `src/services/remoteConfig.ts`: `fetchAdUnitIds()`, `getInterstitialAdId()`, `getRewardedAdId()` with TestIds in dev, Remote Config in prod, empty-string fallback
- Wired `fetchAdUnitIds()` in `App.tsx` useEffect (fire-and-forget, non-blocking)
- Exported `useAdStore` from stores barrel

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, add config plugins, define types** — `0c90c2d` (feat)
2. **Task 2: Split maxExtraGuesses in config.ts, create adStore.ts** — `9a36c74` (feat)
3. **Task 3: Create Remote Config service, wire app init** — `0eb5d91` (feat)

**Plan metadata:** `0eb5d91` (feat: complete 04-01 plan — Remote Config is the last task commit)

## Files Created/Modified
- `package.json` / `package-lock.json` — Added 4 monetization dependencies
- `app.json` — Extended plugins: react-native-iap, react-native-google-mobile-ads config (with placeholder IDs), expo-build-properties (Kotlin 2.2.0); preserved expo-sqlite
- `src/types/monetization.ts` — AdState interface, RestoreResult type
- `src/types/index.ts` — Barrel export for monetization types
- `src/constants/config.ts` — Split maxExtraGuessesFree: 2, maxExtraGuessesPro: 3
- `src/stores/adStore.ts` — Zustand singleton with ad lifecycle methods
- `src/stores/index.ts` — Barrel export for useAdStore
- `src/services/remoteConfig.ts` — Remote Config fetch and typed accessors
- `src/app/App.tsx` — fetchAdUnitIds call on mount

## Decisions Made
- **Module-level ad instances:** InterstitialAd/RewardedAd stored outside Zustand (they're not serializable). Zustand tracks only loaded/loading boolean flags.
- **Prevent double-loading:** preloadInterstitial/preloadRewarded check `interstitialLoaded || interstitialLoading` before creating a new ad.
- **Lazy preload on CLOSED:** After an ad is dismissed, the store automatically preloads the next one so it's ready for the next show() call.
- **One-shot EARNED_REWARD listener:** Attached just before showing and cleaned up after, avoiding stale callback references.
- **Test IDs in dev:** `getInterstitialAdId()` and `getRewardedAdId()` return `TestIds.*` when `__DEV__` is true, regardless of Remote Config state.

## Deviations from Plan

None — plan executed exactly as written.

## Authentication Gates

None — no auth flow was required.

## Issues Encountered

None — all steps completed without issues.

## Known Stubs

- **app.json:** `androidAppId` is `"ca-app-pub-xxxxxxxx~xxxxxxxx"` (placeholder) — must be replaced with real AdMob App ID before release.
- **app.json:** `iosAppId` is `""` (empty) — must be populated for iOS release.

## Threat Flags

None — the implemented components are the foundation layer only. No sensitive data exposed. Ad instances are test IDs only and will be configured per environment.

## Known Stubs (scan)

- `app.json` `androidAppId`: placeholder value `"ca-app-pub-xxxxxxxx~xxxxxxxx"`
- `app.json` `iosAppId`: empty string

## Self-Check: PASSED

Verification results:
- `npx tsc --noEmit` — compiled without errors
- `package.json` — all 4 dependencies present
- `app.json plugins` — 4 entries: expo-sqlite, react-native-iap, react-native-google-mobile-ads (config), expo-build-properties
- `src/constants/config.ts` — contains `maxExtraGuessesFree: 2` and `maxExtraGuessesPro: 3`
- `src/types/monetization.ts` — exists with AdState and RestoreResult
- `src/types/index.ts` — exports monetization
- `src/stores/adStore.ts` — exists with exported useAdStore
- `src/stores/index.ts` — exports useAdStore
- `src/services/remoteConfig.ts` — exists with fetchAdUnitIds, getInterstitialAdId, getRewardedAdId
- `src/app/App.tsx` — imports and calls fetchAdUnitIds
- Git log — 3 atomic commits present

---
*Phase: 04-monetization*
*Completed: 2026-07-06*
