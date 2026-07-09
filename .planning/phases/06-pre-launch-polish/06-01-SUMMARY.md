---
phase: 06-pre-launch-polish
plan: 01
subsystem: infrastructure, settings, config, animations
tags: [expo-av, sound, zustand, mmkv, settings-store, config-registry, animation-constants, accessibility, theme]

# Dependency graph
requires:
  - phase: 03-stats-settings
    provides: SettingsRowConfig union, settingsStore pattern, settingsConfig arrays
  - phase: 02-core-gameplay
    provides: Animation constants pattern (animations.ts), sound service stub
provides:
  - "expo-av dependency for sound playback"
  - "assets/sounds/ directory for .wav sound files"
  - "AppSettings interface extended with colorBlindMode, reduceMotion, themeMode"
  - "settingsStore with 3 new persisted fields and toggle/set actions"
  - "UI config registry with Accessibility and Appearance sections"
  - "HOME_STAGGER_DELAY and HOME_STAGGER_DURATION animation constants"
affects: [06-02, 06-03, 06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added: [expo-av (SDK 57)]
  patterns: [Config-driven settings extension pattern — append to settingsConfig array]

key-files:
  created: [assets/sounds/.gitkeep]
  modified: [package.json, types/settings.ts, stores/settingsStore.ts, config/ui.ts, constants/animations.ts]

key-decisions:
  - "colorBlindMode defaults to false per D-156"
  - "reduceMotion defaults to false per D-163"
  - "themeMode defaults to 'system' per D-185"
  - "Accessibility and Appearance as separate settings sections per D-191"

patterns-established:
  - "New boolean setting fields added to AppSettings interface with corresponding toggle action in settingsStore"
  - "New settings rows appended to settingsConfig array with existing toggle row type and new themeSelector type"
  - "Animation constants follow existing naming convention CONSTANT_CASE with JSDoc comments"

requirements-completed: [LAUNCH-01, LAUNCH-04]

coverage:
  - id: D1
    description: "expo-av installed as dependency for sound playback"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -q expo-av package.json"
        status: pass
    human_judgment: false
  - id: D2
    description: "assets/sounds/ directory with .gitkeep for sound files"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "test -d assets/sounds && test -f assets/sounds/.gitkeep"
        status: pass
    human_judgment: false
  - id: D3
    description: "AppSettings interface extended with colorBlindMode, reduceMotion, themeMode fields"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -q colorBlindMode src/types/settings.ts"
        status: pass
      - kind: other
        ref: "grep -q reduceMotion src/types/settings.ts"
        status: pass
      - kind: other
        ref: "grep -q themeMode src/types/settings.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "settingsStore with toggleColorBlindMode, toggleReduceMotion, setThemeMode actions and default values"
    requirement: LAUNCH-04
    verification:
      - kind: other
        ref: "grep -q toggleColorBlindMode src/stores/settingsStore.ts"
        status: pass
      - kind: other
        ref: "grep -q colorBlindMode: false src/stores/settingsStore.ts"
        status: pass
      - kind: other
        ref: "grep -q themeMode: 'system' src/stores/settingsStore.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "SettingsRowConfig union extended with themeSelector type"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -q themeSelector src/config/ui.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "settingsConfig has Accessibility and Appearance sections appended after account section"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -E \"id: '(accessibility|appearance)'\" src/config/ui.ts"
        status: pass
    human_judgment: false
  - id: D7
    description: "HOME_STAGGER_DELAY (80ms) and HOME_STAGGER_DURATION (300ms) exported from animations.ts"
    requirement: LAUNCH-04
    verification:
      - kind: other
        ref: "grep -q HOME_STAGGER_DELAY src/constants/animations.ts && grep -q HOME_STAGGER_DURATION src/constants/animations.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-07-09
status: complete
---

# Phase 6: Pre-Launch & Polish — Plan 01 Summary

**expo-av installed, AppSettings/settingsStore extended with 3 new fields, config registry with Accessibility/Appearance sections, and animation constants for home screen stagger**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-09T03:28:00Z
- **Completed:** 2026-07-09T03:36:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Installed `expo-av` for sound playback (keypress, reveal, win, loss) via `npx expo install`
- Created `assets/sounds/` directory with `.gitkeep` (sound .wav files already present)
- Extended `AppSettings` interface with `colorBlindMode`, `reduceMotion`, and `themeMode` fields
- Extended `settingsStore` with `toggleColorBlindMode`, `toggleReduceMotion`, `setThemeMode` actions and persisted defaults (`false`, `false`, `'system'`)
- Extended `SettingsRowConfig` union with `themeSelector` type for the theme picker
- Appended **Accessibility** (colorBlind toggle, reduceMotion toggle) and **Appearance** (themeSelector) sections to `settingsConfig`
- Added `HOME_STAGGER_DELAY` (80ms) and `HOME_STAGGER_DURATION` (300ms) to animation constants for home screen stagger entrance

## Task Commits

Each task was committed atomically:

1. **Task 1: Install expo-av and create assets/sounds/** — `5b1b6c4` (chore)
2. **Task 2: Extend AppSettings type and settingsStore** — `5210e02` (feat)
3. **Task 3: Extend config registry and add animation constants** — `0f69855` (feat)

**Plan metadata:** (final commit to follow)

## Files Created/Modified
- `assets/sounds/.gitkeep` — Placeholder for sound assets directory (sound .wav files already present)
- `package.json` — Added `expo-av` dependency
- `types/settings.ts` — Added `colorBlindMode: boolean`, `reduceMotion: boolean`, `themeMode: 'light' | 'dark' | 'system'` to `AppSettings`
- `stores/settingsStore.ts` — Added `colorBlindMode`, `reduceMotion`, `themeMode` fields with defaults and `toggleColorBlindMode`, `toggleReduceMotion`, `setThemeMode` actions
- `config/ui.ts` — Added `themeSelector` to `SettingsRowConfig` union; appended Accessibility and Appearance sections to `settingsConfig`
- `constants/animations.ts` — Added `HOME_STAGGER_DELAY = 80` and `HOME_STAGGER_DURATION = 300`

## Decisions Made
- Followed plan exactly: `colorBlindMode` defaults to `false` (D-156), `reduceMotion` defaults to `false` (D-163), `themeMode` defaults to `'system'` (D-185)
- Accessibility and Appearance sections as separate settings sections per D-184/D-191
- `expo-av` installed with `--legacy-peer-deps` due to pre-existing `react-native-iap` / `react-native-nitro-modules` peer dependency conflict (same conflict pattern as prior phases — documented in tech-stack)

## Deviations from Plan

None — plan executed exactly as written.

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npx expo install expo-av` failed due to peer dependency conflict**
- **Found during:** Task 1 (Install expo-av)
- **Issue:** `npx expo install` failed with `ERESOLVE` — `react-native-iap@15.3.6` requires `react-native-nitro-modules@^0.35.0` but we have `0.36.1`
- **Fix:** Retried with `npm install --save expo-av --legacy-peer-deps` (standard workaround for this project per tech-stack.md)
- **Files modified:** package.json, package-lock.json
- **Verification:** `grep -q expo-av package.json` passes; `npx expo install --check` confirms SDK compat
- **Committed in:** 5b1b6c4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix followed project's established workaround pattern. No scope creep.

## Issues Encountered
- `npx expo install expo-av` failed on first attempt due to peer dependency conflict (react-native-iap vs react-native-nitro-modules). Resolved with `--legacy-peer-deps` — this is the project's standard approach documented in tech-stack.md.
- Sound .wav files (keypress.wav, reveal.wav, win.wav, lose.wav) were already in `assets/sounds/` from a prior setup — no action needed.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness
- Foundation for Phase 6 established: all type/store/config/infra deps in place
- Ready for Plan 06-02 (theme system — `useColors` hook, colors.ts restructure)
- Ready for Plan 06-03 (sound service wiring, screen reader support)
- Ready for Plan 06-04 (settings UI — new row type renderers in SettingsRow.tsx)
- Ready for Plan 06-05 (home screen stagger animation, back handler, How to Play modal)
- Ready for Plan 06-06 (dead code cleanup, confetti fix, contrast fix, performance, production build)

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| TypeScript compiles (`npx tsc --noEmit --strict`) | ✅ PASS |
| `expo-av` in package.json | ✅ PASS |
| `assets/sounds/.gitkeep` exists | ✅ PASS |
| `colorBlindMode`, `reduceMotion`, `themeMode` in `types/settings.ts` | ✅ PASS |
| `toggleColorBlindMode`, `toggleReduceMotion`, `setThemeMode` in `stores/settingsStore.ts` | ✅ PASS |
| Defaults: `colorBlindMode=false`, `reduceMotion=false`, `themeMode='system'` | ✅ PASS |
| `themeSelector` in `SettingsRowConfig` union | ✅ PASS |
| Accessibility + Appearance sections in `settingsConfig` | ✅ PASS |
| `HOME_STAGGER_DELAY=80`, `HOME_STAGGER_DURATION=300` in `animations.ts` | ✅ PASS |
| No staged files remain after commits | ✅ PASS |

---
*Phase: 06-pre-launch-polish*
*Plan: 01*
*Completed: 2026-07-09*
