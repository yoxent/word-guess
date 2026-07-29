# Version Check + Daily UTC Rollover Design

**Date:** 2026-07-29  
**Status:** Approved (brainstorm)  
**Approach:** Firebase Remote Config min version + dismissible update modal; invalidate stale daily active games by UTC date  
**Related:** `src/services/remoteConfig.ts`, `src/utils/activeGame.ts`, `brain/wiki/daily-seed.md`, D-58

---

## Problem

1. **Force players toward newer builds:** Closed testing / production needs a way to prompt users to update via Play Store when a floor version is published, without shipping a new binary just to raise that floor.
2. **Stale daily sessions:** Opening an unfinished Daily Challenge after UTC midnight still restores yesterday’s in-progress game. Spec (D-58 / daily-seed wiki) says daily saves expire when the daily resets; restore logic never checks the date.

## Goals

1. On launch, if installed app version is **below** Remote Config `min_supported_version`, show a dismissible “Update available” modal; **Update** opens Play Store for this app.
2. Dismiss (“Later”) lets the user keep playing; modal may appear again on the **next cold start** while still below the floor.
3. Daily active-game restore / continue only when the saved session’s UTC day equals **today**; otherwise clear the slot and start today’s daily word.
4. Fail-open on version check when Remote Config is unreachable so offline / misconfigured clients are not bricked.

## Non-goals

- Native Play In-App Updates API.
- Hard force-update (non-dismissible) or kill-switch.
- Persisting “don’t ask again for this version” (every cold start re-prompts while below floor).
- Re-showing the update modal on AppState resume within the same process.
- Auto-ending an in-progress daily that stays open across UTC midnight without leaving GameScreen (follow-up if needed).
- iOS App Store links (Android / Play-first; package already `com.vorithstudio.wordguess`).

---

## Architecture

### A. Version check

```text
App startup (existing fetchAndActivate for ad units)
  → read min_supported_version from Remote Config (default "0.0.0")
  → compare to Application.nativeApplicationVersion (semver major.minor.patch)
  → if installed < min → set showUpdateModal = true after isReady
  → UpdateRequiredModal over Navigation
       Update → Linking market://… then https Play Store fallback
       Later / back / requestClose → dismiss for this process
```

**Remote Config key**

| Key | Type | Default in app | Meaning |
|-----|------|----------------|---------|
| `min_supported_version` | String | `"0.0.0"` | Semver floor; missing/empty/default → never prompt |

**Comparison:** Pure helper parsing `X.Y.Z` (non-numeric or incomplete parts treated as `0`). Equality or newer → no modal. Only **strictly less than** prompts.

**Play Store target**

- Primary: `market://details?id=com.vorithstudio.wordguess`
- Fallback: `https://play.google.com/store/apps/details?id=com.vorithstudio.wordguess`

**Wiring**

- Extend `remoteConfig` (or a thin `versionCheck` helper that uses the same `getRemoteConfig()` instance) with `getMinSupportedVersion()` and `isUpdateRequired(installedVersion)`.
- Reuse the existing startup `fetchAndActivate` path (today `fetchAdUnitIds`); after activate, evaluate update required using the installed native version from `expo-application` (add dependency if not already present).
- Root UI: `UpdateRequiredModal` mounted beside `Navigation` in `App.tsx` when ready.

**Modal UX**

- Match existing fade + card modals (`HowToPlayModal` patterns / theme tokens).
- Title: “Update available”
- Body: short line that a newer version is available.
- Primary: **Update** (opens store; modal stays until Later — returning from Play does not auto-dismiss).
- Secondary: **Later** (dismiss). `onRequestClose` = dismiss (soft update).

### B. Daily UTC rollover

```text
Home → shouldOfferContinue / GameScreen → shouldRestoreActiveGame
  → if mode === 'daily' AND
       getDailyDateString(new Date(saved.startedAt)) !== getDailyDateString()
     → treat as no save (return false)
  → callers already clearActiveGame when not restoring / when starting fresh
```

- Use existing `GameSession.startedAt` ISO string; no schema change.
- Apply the same date gate anywhere a daily MMKV save is restored without going through those helpers (notably GameScreen AppState foreground restore — call the shared helper or inline the same rule).
- Random / endless: unchanged.
- `daily_completed_YYYY-MM-DD` already keyed by date — no change.

---

## Error handling

| Case | Behavior |
|------|----------|
| RC fetch fails / offline | Fail-open; no update modal |
| `min_supported_version` missing / `"0.0.0"` | No modal |
| Installed version unreadable | Fail-open; no modal |
| Market URL fails | Open https fallback |
| Stale daily save | Clear slot; start today’s word |
| Same UTC day unfinished daily | Restore as today |

---

## Testing

**Version**

- Semver compare: below / equal / above / malformed / empty min.
- Modal: Update invokes Linking with market then fallback path; Later hides modal.
- Getter: default when RC value empty.

**Daily**

- `shouldOfferContinue` / `shouldRestoreActiveGame`: yesterday `startedAt` + daily → false; today → true (with progress rules unchanged).
- Non-daily modes ignore date.

---

## Ops / Firebase

1. Publish Remote Config parameter `min_supported_version` (string), default `"0.0.0"` in console and in app defaults if `setDefaults` is used.
2. When a release must nudge testers/players, set e.g. `"1.0.2"` and publish; do not set above the version actually available on Play for that track or users will hit Play with no update.

---

## File touch list (expected)

- `src/services/remoteConfig.ts` (or `versionCheck` helper) — min version + compare
- `src/utils/semver.ts` (or colocated compare) — pure compare
- `src/components/ui/UpdateRequiredModal.tsx` (+ export)
- `src/app/App.tsx` — evaluate after fetch; host modal
- `src/utils/activeGame.ts` (+ tests) — daily date gate
- `src/screens/GameScreen.tsx` — AppState restore uses same gate
- Tests under `src/utils/__tests__`, `src/components/ui/__tests__`, service tests as needed
- Optional: brief wiki note under daily-seed / monetization or architecture for RC key

---

## Future / deferred

- Force-update mode via RC boolean.
- AppState midnight rollover while GameScreen stays mounted.
- iOS App Store URL when shipping iOS.
- “Skip this min version” preference.
