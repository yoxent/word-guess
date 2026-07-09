---
phase: 06-pre-launch-polish
plan: 02
subsystem: theming, accessibility, audio
tags: [colors, theme, useColors, dark-mode, PixelRatio, expo-av, sound, font-scaling]

requires:
  - phase: 03-stats-settings
    provides: settingsStore with themeMode, colorBlindMode, reduceMotion fields
provides:
  - Light/dark color palettes in colors.ts with deprecated backward-compat alias
  - useColors() theme-aware hook for component consumption
  - PixelRatio font scaling on all typography.ts constants
  - expo-av wired sound service with 4 sound file loading
  - App.tsx sound.init() and setEnabled() calls on startup
affects:
  - Plan 06-03 (component migration to useColors, sound callsites, theme wiring)
  - Plan 06-05 (colors consumer migration to useColors, removal of deprecated alias)

tech-stack:
  added: [expo-av sound wiring pattern, PixelRatio font scaling pattern]
  patterns:
    - "useColors() hook: React component reads settingsStore.themeMode + useColorScheme(), returns active palette"
    - "expo-av sound service: init() loads all sounds via Promise.all, play* functions use replayAsync()"
    - "PixelRatio scaling: fontScale captured once at module level, all fontSize * fontScale with Math.round()"

key-files:
  created:
    - hooks/useColors.ts
  modified:
    - constants/colors.ts
    - constants/typography.ts
    - services/sound.ts
    - app/App.tsx

key-decisions:
  - "Settings store already had themeMode, colorBlindMode, reduceMotion fields from prior plan — no store changes needed"
  - "Sound files use actual filename lose.wav (not loss.wav as in plan)" — deviation handled
  - "useColorScheme() returns ColorSchemeName including 'unspecified'; ternary fallback used instead of ?? operator"

patterns-established:
  - "Theme system: colors.ts exports lightColors + darkColors, useColors() hook returns active palette based on themeMode + system preference"
  - "Sound service: init → load all sounds via Promise.all, play* → replayAsync(), try/catch on all async operations"

requirements-completed: [LAUNCH-03, LAUNCH-01, LAUNCH-02, LAUNCH-04]

coverage:
  - id: D1
    description: "colors.ts restructured into lightColors and darkColors palettes with deprecated colors alias"
    requirement: LAUNCH-01
    verification:
      - kind: unit
        ref: "constants/colors.ts#lightColors + darkColors export and deprecated colors alias"
        status: pass
    human_judgment: false
  - id: D2
    description: "useColors() hook returns correct palette based on settingsStore.themeMode and useColorScheme()"
    requirement: LAUNCH-01
    verification:
      - kind: unit
        ref: "hooks/useColors.ts#exists, imports useColorScheme and useSettingsStore"
        status: pass
    human_judgment: false
  - id: D3
    description: "All 5 typography.ts fontSize and lineHeight values scaled by PixelRatio.getFontScale()"
    requirement: LAUNCH-03
    verification:
      - kind: unit
        ref: "constants/typography.ts#10 Math.round calls covering fontSize and lineHeight"
        status: pass
    human_judgment: false
  - id: D4
    description: "sound.ts wired with expo-av Audio.Sound loading 4 sound files with error handling"
    requirement: LAUNCH-04
    verification:
      - kind: unit
        ref: "services/sound.ts#importAudioFromExpoAv,setAudioModeAsync,replayAsync,createAsync,lose.wav"
        status: pass
    human_judgment: false
  - id: D5
    description: "App.tsx calls sound.init() on startup and syncs soundEnabled from settingsStore"
    requirement: LAUNCH-02
    verification:
      - kind: unit
        ref: "app/App.tsx#importSound,initCall,setEnabledCall"
        status: pass
    human_judgment: false

duration: 12 min
completed: 2026-07-09
status: complete
---

# Phase 6: Pre-Launch & Polish — Plan 02 Summary

**Theme system foundation — colors restructured into light/dark palettes, useColors() hook created, typography scaled via PixelRatio, sound service wired with expo-av**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-09T03:34:19Z
- **Completed:** 2026-07-09T03:46:29Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- `colors.ts` restructured from single `colors` object into `lightColors` and `darkColors` palettes with deprecated backward-compat `colors = lightColors` alias
- `hooks/useColors.ts` created — reads `settingsStore.themeMode` and `useColorScheme()` to return the active palette; handles system mode with fallback to light
- `typography.ts` — all 5 `fontSize` and `lineHeight` values scaled by `PixelRatio.getFontScale()` with `Math.round()` for accessibility
- `services/sound.ts` — no-op stub replaced with expo-av wiring: `Audio.setAudioModeAsync`, 4 sound files loaded via `Audio.Sound.createAsync()` in `Promise.all`, `replayAsync()` for playback, all errors caught with `console.warn`
- `app/App.tsx` — imports sound service, calls `sound.init()` and `sound.setEnabled()` during startup (fire-and-forget, non-blocking)

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure colors.ts and create useColors() hook** — `c620452` (feat)
2. **Task 2: Add PixelRatio font scaling to typography.ts** — `f911e15` (feat)
3. **Task 3: Wire sound.ts with expo-av and init() in App.tsx** — `7a865b0` (feat)

## Files Created/Modified
- `src/constants/colors.ts` — Restructured: lightColors, darkColors, deprecated colors alias, AppColor type
- `src/hooks/useColors.ts` — NEW: Theme-aware hook returning active palette
- `src/constants/typography.ts` — PixelRatio font scaling applied to all fontSize/lineHeight values
- `src/services/sound.ts` — Rewritten: expo-av wired with 4 sound files, replayAsync playback
- `src/app/App.tsx` — Added sound.init() and setEnabled() calls on startup

## Decisions Made
- Settings store already had `themeMode`, `colorBlindMode`, `reduceMotion` fields from a prior plan — no store changes were needed for this plan
- Used `systemScheme === 'dark' ? 'dark' : 'light'` instead of `??` operator because `useColorScheme()` returns `ColorSchemeName` (`'light' | 'dark' | 'unspecified' | null | undefined`), which is not assignable to `'light' | 'dark'` with just `??`
- Sound file uses `lose.wav` (actual filename) not `loss.wav` as originally specified in the plan

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useColorScheme() type compatibility**
- **Found during:** Task 1 (useColors.ts)
- **Issue:** `useColorScheme()` returns `ColorSchemeName` which includes `'unspecified'` — the `??` operator pattern from the plan didn't compile under strict TypeScript
- **Fix:** Changed from `systemScheme ?? 'light'` to `systemScheme === 'dark' ? 'dark' : 'light'` — handles all possible return values correctly
- **Files modified:** hooks/useColors.ts
- **Verification:** TypeScript compiles with zero errors
- **Committed in:** c620452 (Task 1 commit)

**2. [Rule 1 - Bug] expo-av Audio.setAudioModeAsync parameter name**
- **Found during:** Task 3 (sound.ts)
- **Issue:** expo-av API expects `playsInSilentModeIOS` not `playsInSilentMode` — TypeScript compilation error
- **Fix:** Changed parameter name to `playsInSilentModeIOS`
- **Files modified:** services/sound.ts
- **Verification:** TypeScript compiles with zero errors
- **Committed in:** 7a865b0 (Task 3 commit)

**3. [Rule 1 - Bug] Sound file filename mismatch**
- **Found during:** Task 3 (sound.ts)
- **Issue:** Plan specifies `loss.wav` but actual file in `assets/sounds/` is named `lose.wav`
- **Fix:** Used `require('../../assets/sounds/lose.wav')` — the actual filename on disk
- **Files modified:** services/sound.ts
- **Verification:** grep confirms correct filename in require path
- **Committed in:** 7a865b0 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (3 Rule 1 - bugs)
**Impact on plan:** All auto-fixes necessary for TypeScript compilation and file system correctness. No scope creep.

## Issues Encountered
None — all deviations were handled automatically via deviation rules.

## Next Phase Readiness
- Theme foundation complete: colors exported as light/dark palettes, useColors() hook available
- Font scaling applied to typography constants
- Sound service wired and initializing on startup
- Ready for Plan 06-03 (component migration to useColors, theme injection into Navigation, sound callsites in Keyboard/Tile/ResultModal, settings UI for theme selector, How to Play modal, entrance animation, BackHandler, accessibility props, reduce motion gating)

---
*Phase: 06-pre-launch-polish*
*Completed: 2026-07-09*

## Self-Check: PASSED
