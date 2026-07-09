---
phase: 06-pre-launch-polish
plan: 05
subsystem: ui, theming
tags: [colors, theme, useColors, dark-mode, theme-migration, typography]

# Dependency graph
requires:
  - phase: 06-02
    provides: lightColors + darkColors palettes, useColors() hook, deprecated `colors` alias
  - phase: 06-03
    provides: Tile.tsx already migrated to useSettingsStore, Keyboard/ResultModal etc. with sound wiring
  - phase: 06-04
    provides: HomeScreen stagger + HowToPlayModal, Navigation.tsx useColors + darkColors for Nav theme, App.tsx StatusBar theme switching
provides:
  - "All 6 screen files use useColors() hook (HomeScreen, GameScreen, StatsScreen, SettingsScreen, LeaderboardScreen, LoadingScreen)"
  - "All 5 game component files use useColors() hook (Tile, Keyboard, ResultModal, LengthPickerModal, GameBoard) — Confetti has no colors import, untouched"
  - "All 4 UI component files use useColors() hook (Button, StatCard, SettingsRow, HowToPlayModal)"
  - "typography.ts no longer imports colors — color field removed from each style; consumers apply per-theme color from useColors()"
  - "Zero consumers of deprecated `colors` alias in src/ (only Navigation.tsx imports `darkColors` specifically for navigation theme comparison, per plan)"
affects: [06-06]

# Tech tracking
tech-stack:
  added: none
  patterns:
    - "useColors() + useMemo(StyleSheet.create) pattern: component reads hook, rebuilds dynamic styles when theme changes"
    - "FEEDBACK_COLORS / KEY_COLOR_MAP patterns: color maps moved from module-level constant to useMemo inside component"
    - "typography color separation: typography.ts is now pure type/sizing/weight constant; color is applied per-consumer from useColors()"

key-files:
  created: []
  modified:
    - screens/HomeScreen.tsx
    - screens/GameScreen.tsx
    - screens/StatsScreen.tsx
    - screens/SettingsScreen.tsx
    - screens/LeaderboardScreen.tsx
    - screens/LoadingScreen.tsx
    - components/game/Tile.tsx
    - components/game/Keyboard.tsx
    - components/game/ResultModal.tsx
    - components/game/LengthPickerModal.tsx
    - components/game/GameBoard.tsx
    - components/ui/Button.tsx
    - components/ui/StatCard.tsx
    - components/ui/SettingsRow.tsx
    - components/ui/HowToPlayModal.tsx
    - constants/typography.ts

key-decisions:
  - "useMemo(StyleSheet.create) pattern: keeps styles reactive without per-render StyleSheet construction cost; rebuilds only when `colors` reference changes (which only happens on theme switch)"
  - "typography.ts color field removed entirely (not replaced with textPrimary/textSecondary constants): the most explicit approach — each consumer must apply color from useColors(), preventing future dark-mode regressions"
  - "HowToPlayModal migrated despite omission from plan's files_modified list: the plan's success criteria explicitly requires zero consumers of the deprecated alias outside colors.ts and useColors.ts"
  - "Navigation.tsx left as-is: already migrated by 06-04, only imports `darkColors` for the `colors === darkColors` theme comparison (per plan)"

patterns-established:
  - "useColors() + useMemo pattern: `const colors = useColors(); const styles = useMemo(() => StyleSheet.create({...}), [colors]);` — keeps StyleSheet reactive, single source of truth, no per-render allocation"
  - "Theme-aware color constants moved out of module scope: e.g., Tile's `FEEDBACK_COLORS` and Keyboard's `KEY_COLOR_MAP` are now built inside the component, so they pick up the active palette"
  - "Typography styles are color-agnostic: typography.ts exports pure type/sizing/weight; consumer applies `color: colors.textPrimary` or `color: colors.textSecondary` explicitly in the same useMemo block"

requirements-completed: [LAUNCH-01]

# Coverage metadata
coverage:
  - id: D1
    description: "All 6 screen files migrated from { colors } import to useColors() hook"
    verification:
      - kind: other
        ref: "grep -r 'import { colors }' src/screens/ returns no matches"
        status: pass
      - kind: other
        ref: "grep -c useColors src/screens/GameScreen.tsx shows 2 (import + call)"
        status: pass
    human_judgment: false
  - id: D2
    description: "All 5 game component files (Tile, Keyboard, ResultModal, LengthPickerModal, GameBoard) migrated to useColors()"
    verification:
      - kind: other
        ref: "grep -r 'import { colors }' src/components/game/ returns no matches"
        status: pass
      - kind: other
        ref: "Tile.tsx FEEDBACK_COLORS and Keyboard.tsx KEY_COLOR_MAP now built inside useMemo"
        status: pass
    human_judgment: false
  - id: D3
    description: "UI components (Button, StatCard, SettingsRow, HowToPlayModal) migrated to useColors()"
    verification:
      - kind: other
        ref: "grep -r 'import { colors }' src/components/ui/ returns no matches"
        status: pass
    human_judgment: false
  - id: D4
    description: "typography.ts no longer imports colors; consumers apply per-theme color"
    verification:
      - kind: other
        ref: "grep -r 'from.*colors' src/constants/typography.ts returns no matches"
        status: pass
      - kind: other
        ref: "All typography spread sites in StatCard, SettingsRow, LeaderboardScreen, SettingsScreen, StatsScreen now set explicit color from useColors()"
        status: pass
    human_judgment: false
  - id: D5
    description: "TypeScript compiles with zero errors"
    verification:
      - kind: other
        ref: "npx tsc --noEmit --strict → exit 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visual verification of theme switching (light/dark/system)"
    verification: []
    human_judgment: true
    rationale: "Theme switching is a visual feature that requires running the app on a device and observing the color palette change. TypeScript and grep checks confirm migration correctness, but the actual rendering of light/dark palettes needs a human visual check."

# Metrics
duration: ~10 min
completed: 2026-07-09
status: complete
---

# Phase 6: Pre-Launch & Polish — Plan 05 Summary

**Complete theme system migration — 16 files converted from `{ colors }` import to `useColors()` hook, with typography color-baking fixed for dark mode**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-07-09T03:56:43Z
- **Completed:** 2026-07-09T04:08:00Z
- **Tasks:** 3
- **Files modified:** 16
- **Commits:** 3 (430f2b8, 36c7dc8, 42dc54a)

## Accomplishments
- All 6 screen files migrated to `useColors()` — HomeScreen, GameScreen, StatsScreen, SettingsScreen, LeaderboardScreen, LoadingScreen
- All 5 game component files migrated — Tile (FEEDBACK_COLORS moved into useMemo), Keyboard (KEY_COLOR_MAP moved into useMemo), ResultModal, LengthPickerModal, GameBoard
- All 4 UI component files migrated — Button, StatCard, SettingsRow, HowToPlayModal
- typography.ts cleaned up: removed baked-in `color` field that would have made text invisible in dark mode; each consumer now applies per-theme color from `useColors()`
- Final state: zero consumers of the deprecated `{ colors }` alias outside constants/colors.ts and hooks/useColors.ts (Navigation.tsx's `darkColors` import is intentional for the navigation theme comparison)
- Theme switching (light/dark/system via Settings segmented control) now propagates to the entire app at runtime

## Task Commits

Each task was committed atomically:

1. **Task 1a: Migrate screen files from colors import to useColors() hook** — `430f2b8` (feat)
2. **Task 1b: Migrate game component files from colors import to useColors() hook** — `36c7dc8` (feat)
3. **Task 1c: Migrate UI components and app files from colors import to useColors() hook** — `42dc54a` (feat)

## Files Created/Modified
- `src/screens/HomeScreen.tsx` — Static `colors` import → `useColors()`; `useMemo(StyleSheet.create, [colors])` for all styles
- `src/screens/GameScreen.tsx` — Same pattern; all 9 styles moved into useMemo
- `src/screens/StatsScreen.tsx` — Same pattern; typography color fields added explicitly (per typography.ts change)
- `src/screens/SettingsScreen.tsx` — Same pattern; typography color fields added explicitly
- `src/screens/LeaderboardScreen.tsx` — Same pattern; 3 typography spreads without color now have explicit `color: colors.textPrimary`
- `src/screens/LoadingScreen.tsx` — Simplest case; useColors + useMemo(StyleSheet.create)
- `src/components/game/Tile.tsx` — `FEEDBACK_COLORS` map moved into useMemo along with styles; texture overlay/border styles now color-aware
- `src/components/game/Keyboard.tsx` — `KEY_COLOR_MAP` rebuilt via useMemo with active palette; structural styles (no color) kept in useMemo too
- `src/components/game/ResultModal.tsx` — All styles moved into useMemo(StyleSheet.create, [colors])
- `src/components/game/LengthPickerModal.tsx` — Same pattern
- `src/components/game/GameBoard.tsx` — Same pattern
- `src/components/ui/Button.tsx` — Variants (primary/secondary/danger) now read from `useColors()`; structural styles in useMemo
- `src/components/ui/StatCard.tsx` — `useColors()` + useMemo; typography.cardTitle spread now sets explicit `color: colors.textPrimary`
- `src/components/ui/SettingsRow.tsx` — `useColors()` introduced via custom `useStyles(colors)` hook pattern; typography spreads without color now set explicit `color: colors.textPrimary`
- `src/components/ui/HowToPlayModal.tsx` — Migrated as deviation (was created in 06-04, plan's file list missed it but success criteria required zero consumers)
- `src/constants/typography.ts` — Removed `color` field from all 5 typography styles; imports `colors` no longer needed; consumers must apply color from `useColors()`

## Decisions Made
- **useMemo(StyleSheet.create) over inline styles**: keeps style definitions readable and consistent across the codebase, while still being reactive to theme changes. Cost: rebuilds StyleSheet object only on theme change (memoized on `colors` reference).
- **Remove typography color field entirely** (not migrate to `textPrimary`/`textSecondary` constants): the most explicit approach prevents future regressions where a developer adds a new typography consumer and forgets to apply color. Each consumer that needs color now sets it explicitly.
- **Tile's `FEEDBACK_COLORS` rebuilt per render** via useMemo: the map is small (4 entries) and only changes when theme switches, so this is essentially free.
- **Navigation.tsx left untouched**: already migrated by 06-04, only imports `darkColors` for the navigation theme comparison — this is per the plan's explicit allowance.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Migrated `HowToPlayModal.tsx` (not in plan's file list)**
- **Found during:** Task 1c, after running the final `grep -r "from.*constants/colors"` check
- **Issue:** `HowToPlayModal.tsx` was created in 06-04 (home stagger + HowToPlay plan) and imported the deprecated `{ colors }` alias. Plan 06-05's `files_modified` list omitted it, but the plan's success criteria requires "No file under src/ imports the deprecated `{ colors }` alias from constants/colors except constants/colors.ts itself and hooks/useColors.ts". This is a critical inconsistency — without migrating this file, the theme system would be partially broken in the home-screen help overlay.
- **Fix:** Replaced the static import with `useColors()` and moved `StyleSheet.create` into `useMemo`. Same pattern as other UI components.
- **Files modified:** `src/components/ui/HowToPlayModal.tsx`
- **Verification:** TypeScript compiles, grep for `import { colors }` returns no matches
- **Committed in:** `42dc54a` (Task 1c commit)

**2. [Rule 2 - Missing Critical] Fixed `typography.ts` color baking for dark mode**
- **Found during:** Task 1c final verification (`grep -r "from.*constants/colors"` revealed typography.ts still imports the deprecated alias)
- **Issue:** `typography.ts` imported the deprecated `colors` alias and baked `color: colors.textPrimary` (light mode) into every typography style. Since `typography.X` is spread into consumer styles via `...typography.X`, this would have made text invisible in dark mode (dark text on dark background). This is a critical correctness issue that would have broken the entire dark theme experience.
- **Fix:** Removed `color` field from all 5 typography styles (statValue, cardTitle, settingsRow, body, statLabel). Audited all 7 consumer files and added explicit `color: colors.textPrimary` or `color: colors.textSecondary` to each typography spread site. Audited consumers: StatCard.title, SettingsRow.label + playerNameLabel, LeaderboardScreen.authTitle + emptyTitle + playerNameText, SettingsScreen.sectionTitle, StatsScreen.emptyTitle + statValue + statLabel + perModeLabel + perModeValue + tableHeaderCell + tableCell.
- **Files modified:** `src/constants/typography.ts`, plus 5 consumer files
- **Verification:** TypeScript compiles, all typography spread sites set explicit color, light/dark mode text should now be visible
- **Committed in:** `42dc54a` (Task 1c commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2: missing critical functionality)
**Impact on plan:** Both deviations are correctness/quality issues that would have caused broken behavior in the shipped theme system. The plan's file list was incomplete (HowToPlayModal omission) and the plan didn't anticipate that typography.ts baked in light-palette colors. Auto-fixing both was necessary for the theme system to work as designed.

## Issues Encountered
- `npx tsc --noEmit --strict` ran cleanly throughout — no type errors
- `npx jest --bail --passWithNoTests` exits with "No tests found" — the project does not have a test suite (per phase 6 plan, no tests added)
- Line ending warnings from Git (CRLF vs LF) on Windows — informational, no action needed

## User Setup Required
None — no external service configuration required. This plan is purely a code refactor with no runtime infrastructure changes.

## Next Phase Readiness
- Theme system is fully functional at the code level: all components read from `useColors()`, all consumers migrated, typography correctly applies per-theme color
- Ready for plan 06-06 (final phase plan — TBD)
- Recommended manual verification: launch the app, switch theme mode in Settings (Light → Dark → System), observe all screens and components re-render with the appropriate palette. This visual check is not automatable from this plan's verification scope.

---
*Phase: 06-pre-launch-polish*
*Plan: 05*
*Completed: 2026-07-09*
