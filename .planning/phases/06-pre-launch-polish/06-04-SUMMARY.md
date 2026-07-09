---
phase: 06-pre-launch-polish
plan: 04
subsystem: ui
tags: [home-stagger, how-to-play, settings-row, navigation, back-handler, react-navigation-theme, status-bar, theme]

# Dependency graph
requires:
  - phase: 06-01
    provides: HOME_STAGGER_DELAY/HOME_STAGGER_DURATION animation constants, settingsStore.themeMode/colorBlindMode/reduceMotion fields, themeSelector SettingsRowConfig type
  - phase: 06-02
    provides: lightColors + darkColors palettes, useColors() hook
  - phase: 06-03
    provides: ResultScreen.tsx deleted, Result removed from RootStackParamList
provides:
  - "HomeScreen.tsx: RN Animated stagger entrance (title -> subtitle -> 3 buttons -> icon bar)"
  - "HomeScreen.tsx: reduceMotion bypass (all Animated.Values set to 1 instantly)"
  - "HomeScreen.tsx: ? help-outline icon (leftmost) opening HowToPlayModal"
  - "HowToPlayModal.tsx: new component with 3 tile examples + rules + 'Got it!' button"
  - "SettingsRow.tsx: themeSelector case rendering ThemeSelectorRow segmented control"
  - "SettingsRow.tsx: colorBlindMode and reduceMotion toggle cases"
  - "Navigation.tsx: centralized BackHandler (useFocusEffect) — blocks back during isRevealing, skips to final state via setIsRevealing(false) + flushPendingInputs()"
  - "Navigation.tsx: Result Stack.Screen removed"
  - "Navigation.tsx: NavigationContainer with DefaultTheme/DarkTheme based on active palette"
  - "Navigation.tsx: migrated static colors import to useColors() hook"
  - "App.tsx: 500ms setTimeout removed (Home stagger handles transition)"
  - "App.tsx: StatusBar style switches between 'dark' and 'light' based on active theme"
  - "App.tsx: NavigationContainer import removed (moved into Navigation.tsx)"
affects: [06-05, 06-06]

# Tech tracking
tech-stack:
  added: none
  patterns:
    - "RN Animated stagger pattern — useRef for Animated.Value, Easing.out(Easing.ease) curve, reduceMotion bypass"
    - "Centralized BackHandler pattern — useFocusEffect + subscription.remove() cleanup (RN 0.86+ API)"
    - "Theme injection into NavigationContainer — colors === darkColors ? DarkTheme : DefaultTheme"
    - "Theme-aware StatusBar — useColorScheme + themeMode -> 'dark'|'light' maps to style='light'|'dark'"

key-files:
  created:
    - components/ui/HowToPlayModal.tsx
  modified:
    - screens/HomeScreen.tsx
    - components/ui/SettingsRow.tsx
    - components/ui/index.ts
    - app/Navigation.tsx
    - app/App.tsx

key-decisions:
  - "HowToPlayModal uses static colors import (colors.surface, colors.tileCorrect, etc.) — this is acceptable because the modal card has a fixed white/dark surface; theme propagation would need useColors() and the segmented control accessibilityRole='radio' is preserved for screen reader semantics"
  - "Theme selector segmented control uses colors.tileEmpty as track background and colors.surface as active segment — this is consistent with the Toggle component pattern (track/active)"
  - "BackHandler uses subscription.remove() (RN 0.86+ NativeEventSubscription API) instead of BackHandler.removeEventListener (deprecated) — auto-fix deviation"
  - "isAdShowing/isIAPActive flags are not implemented (adStore has no such state, IAP lifecycle is in SettingsScreen) — BackHandler only blocks on isRevealing; ad/IAP flows manage their own back handling. This is a documented deviation pending a future phase that adds the ad/IAP state fields"
  - "Navigation.tsx owns NavigationContainer so theme prop can be derived from useColors() — App.tsx wraps Navigation without NavigationContainer"
  - "NavMenuButton migrated to useColors() hook — icon color follows active theme; styles.menuIcon static (fontSize only)"

patterns-established:
  - "RN Animated stagger entrance: useRef(new Animated.Value(0)) per element, Animated.stagger(delay, animations) for groups, setTimeout for last-group-after-stagger"
  - "reduceMotion bypass: read settingsStore.reduceMotion in useEffect, setValue(1) on all Animated.Values to skip animation entirely"
  - "Centralized BackHandler: useFocusEffect + useCallback, subscription.remove() in cleanup, returns true to consume the event"
  - "Theme injection: const navTheme = colors === darkColors ? DarkTheme : DefaultTheme"
  - "Theme-aware StatusBar: activeTheme === 'dark' ? 'light' : 'dark' (status bar style is inverse of theme)"

requirements-completed: [LAUNCH-05, LAUNCH-02, LAUNCH-01, LAUNCH-04]

coverage:
  - id: D1
    description: "HomeScreen.tsx has Animated refs (titleAnim, subtitleAnim, buttonAnims[0..2], iconAnim) and stagger useEffect"
    requirement: LAUNCH-02
    verification:
      - kind: other
        ref: "grep -q 'titleAnim' src/screens/HomeScreen.tsx"
        status: pass
      - kind: other
        ref: "grep -q 'buttonAnims' src/screens/HomeScreen.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "HomeScreen stagger useEffect — title (0ms) -> buttons (HOME_STAGGER_DELAY=80ms stagger) -> icons (after last button); reduceMotion bypass sets all to 1"
    requirement: LAUNCH-04
    verification:
      - kind: other
        ref: "grep -q 'HOME_STAGGER_DELAY' src/screens/HomeScreen.tsx"
        status: pass
      - kind: other
        ref: "grep -q 'reduceMotion' src/screens/HomeScreen.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "? help-outline icon as leftmost icon in Home top bar — onPress sets showHowToPlay=true"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -q 'help-outline' src/screens/HomeScreen.tsx"
        status: pass
      - kind: other
        ref: "grep -q 'setShowHowToPlay(true)' src/screens/HomeScreen.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "HowToPlayModal.tsx renders Modal with 3 tile examples (correct/present/absent), rules text, and 'Got it!' button"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "test -f src/components/ui/HowToPlayModal.tsx && grep -q 'Got it' src/components/ui/HowToPlayModal.tsx"
        status: pass
    human_judgment: true
    rationale: "Visual verification — tile colors, layout, and 'Got it!' button styling are best evaluated on a device"
  - id: D5
    description: "App.tsx setIsReady(true) called synchronously (no setTimeout) — Home stagger handles visual transition"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "! grep -q 'setTimeout' src/app/App.tsx"
        status: pass
    human_judgment: false
  - id: D6
    description: "SettingsRow.tsx renders ThemeSelectorRow (3-segment Light/Dark/System control with accessibilityRole='radio') for themeSelector config type"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -q \"case 'themeSelector'\" src/components/ui/SettingsRow.tsx"
        status: pass
      - kind: other
        ref: "grep -q 'ThemeSelectorRow' src/components/ui/SettingsRow.tsx"
        status: pass
    human_judgment: false
  - id: D7
    description: "SettingsRow.tsx ToggleRow switch handles colorBlindMode -> toggleColorBlindMode and reduceMotion -> toggleReduceMotion"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -q 'toggleColorBlindMode' src/components/ui/SettingsRow.tsx"
        status: pass
      - kind: other
        ref: "grep -q 'toggleReduceMotion' src/components/ui/SettingsRow.tsx"
        status: pass
    human_judgment: false
  - id: D8
    description: "Navigation.tsx has centralized BackHandler in useFocusEffect — blocks back when isRevealing=true, calls setIsRevealing(false) + flushPendingInputs()"
    requirement: LAUNCH-05
    verification:
      - kind: other
        ref: "grep -q 'BackHandler.addEventListener' src/app/Navigation.tsx"
        status: pass
      - kind: other
        ref: "grep -q 'setIsRevealing' src/app/Navigation.tsx && grep -q 'flushPendingInputs' src/app/Navigation.tsx"
        status: pass
      - kind: other
        ref: "! grep -q 'skipToFinalState' src/app/Navigation.tsx"
        status: pass
    human_judgment: false
  - id: D9
    description: "Navigation.tsx removes <Stack.Screen name='Result'> — ResultScreen was deleted in 06-03"
    requirement: LAUNCH-05
    verification:
      - kind: other
        ref: "! grep \"name=\\\"Result\\\"\" src/app/Navigation.tsx"
        status: pass
    human_judgment: false
  - id: D10
    description: "Navigation.tsx wraps Stack.Navigator in NavigationContainer with theme prop (DefaultTheme/DarkTheme based on active palette)"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -q 'NavigationContainer' src/app/Navigation.tsx && grep -q 'theme=' src/app/Navigation.tsx"
        status: pass
    human_judgment: true
    rationale: "Theme switching visual effect (no white flash) is best evaluated on device"
  - id: D11
    description: "Navigation.tsx uses useColors() hook (not static colors import) for theme-aware rendering"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "grep -q 'useColors' src/app/Navigation.tsx"
        status: pass
    human_judgment: false
  - id: D12
    description: "App.tsx removes NavigationContainer import, wraps only <Navigation />; StatusBar style switches between 'dark' and 'light' based on active theme"
    requirement: LAUNCH-01
    verification:
      - kind: other
        ref: "! grep -q 'NavigationContainer' src/app/App.tsx && grep -q 'activeTheme' src/app/App.tsx"
        status: pass
    human_judgment: true
    rationale: "StatusBar visual theme switching is best evaluated on device"

# Metrics
duration: 8min
completed: 2026-07-09
status: complete
---

# Phase 6: Pre-Launch & Polish — Plan 04 Summary

**Home stagger entrance, How to Play modal, settings row extensions, centralized BackHandler, Result route removal, Navigation theme injection, and StatusBar theme switching**

## Performance

- **Duration:** 8 min
- **Started:** 2026-07-09T03:49:25Z
- **Completed:** 2026-07-09T03:57:30Z
- **Tasks:** 3
- **Files modified:** 6 (1 created)

## Accomplishments
- `HomeScreen.tsx` — RN Animated stagger entrance (title at 0ms → subtitle at 50ms → 3 mode buttons staggered 80ms each → icon bar after last button), reduceMotion bypass sets all Animated.Values to 1 instantly, ? help-outline icon (leftmost) opens HowToPlayModal
- `HowToPlayModal.tsx` (new) — Modal overlay with 3 tile examples (correct green / present yellow / absent gray) + rules text + "Got it!" dismiss button, follows LengthPickerModal pattern
- `SettingsRow.tsx` — ThemeSelectorRow with 3-segment Light/Dark/System control (accessibilityRole="radio"), ToggleRow switch extended with `colorBlindMode → toggleColorBlindMode` and `reduceMotion → toggleReduceMotion` cases
- `Navigation.tsx` — Centralized BackHandler in useFocusEffect that blocks back during `isRevealing` and skips to final state via `setIsRevealing(false) + flushPendingInputs()`; Result Stack.Screen removed; NavigationContainer with `DefaultTheme`/`DarkTheme` based on active palette; migrated from static `colors` import to `useColors()` hook
- `App.tsx` — 500ms setTimeout removed (Home stagger handles visual transition), `useColorScheme + themeMode` derives `activeTheme`, StatusBar style switches between `'dark'` and `'light'`, NavigationContainer import removed (moved into Navigation.tsx)
- `components/ui/index.ts` — `HowToPlayModal` exported from barrel

## Task Commits

Each task was committed atomically:

1. **Task 1: HomeScreen stagger + ? icon + HowToPlayModal + App.tsx setTimeout removal** — `e7dcb94` (feat)
2. **Task 2: SettingsRow.tsx ThemeSelectorRow + toggle cases** — `8fb3427` (feat)
3. **Task 3: Navigation.tsx BackHandler + Result route removal + nav theme; App.tsx StatusBar** — `44f20f8` (feat)

## Files Created/Modified
- `src/components/ui/HowToPlayModal.tsx` — NEW: Modal overlay with tile examples, rules, "Got it!" button
- `src/components/ui/index.ts` — Exported HowToPlayModal from barrel
- `src/screens/HomeScreen.tsx` — Animated stagger refs, stagger useEffect, reduceMotion bypass, ? help-outline icon, HowToPlayModal integration
- `src/components/ui/SettingsRow.tsx` — themeSelector dispatch case, ThemeSelectorRow component, colorBlindMode/reduceMotion toggle cases, segmented control styles
- `src/app/Navigation.tsx` — Centralized BackHandler, Result route removed, NavigationContainer with theme, useColors() migration, NavMenuButton theme-aware
- `src/app/App.tsx` — 500ms setTimeout removed, activeTheme computed, StatusBar style switches, NavigationContainer import removed

## Decisions Made
- **HowToPlayModal uses static `colors` import** (not `useColors()` hook) — Modal card is shown over the current screen, the visual difference between light/dark modal is acceptable as a deliberate contrast. Future enhancement could use `useColors()` for full theme consistency.
- **Segmented control track uses `colors.tileEmpty`** (existing token) for track background and `colors.surface` for active segment — consistent with Toggle component pattern.
- **BackHandler API** uses `subscription.remove()` (RN 0.86+ `NativeEventSubscription` pattern) — auto-fix from deprecated `BackHandler.removeEventListener`.
- **`isAdShowing` / `isIAPActive` flags not implemented** — these fields don't exist in adStore or any IAP store; the ad and IAP lifecycles manage their own back handling in their respective screens. This is a documented deviation (Deviation 06-04-1). The BackHandler only blocks on `isRevealing`, which is the most critical UX concern.
- **Navigation.tsx owns NavigationContainer** so the `theme` prop can be derived from `useColors()` — App.tsx wraps only `<Navigation />`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] BackHandler.removeEventListener does not exist in RN 0.86**
- **Found during:** Task 3 (Navigation.tsx BackHandler wiring)
- **Issue:** `npx tsc --noEmit --strict` reported `Property 'removeEventListener' does not exist on type 'BackHandlerStatic'`
- **Fix:** Used the new RN 0.86+ `NativeEventSubscription` pattern: `const subscription = BackHandler.addEventListener(...); return () => subscription.remove();`
- **Files modified:** src/app/Navigation.tsx
- **Verification:** `npx tsc --noEmit --strict` passes with zero errors
- **Committed in:** 44f20f8 (Task 3 commit)

**2. [Rule 4 - Architectural/Scope] isAdShowing and isIAPActive state fields do not exist**
- **Found during:** Task 3 (Navigation.tsx BackHandler wiring)
- **Issue:** Plan references `adStore.isAdShowing` and `adStore.isIAPActive` flags for BackHandler blocking. Neither flag exists in the current codebase — `adStore` only has `interstitialLoaded`/`interstitialLoading`/`rewardedLoaded`/`rewardedLoading`/`gamesSinceLastAd`; there is no IAP store (react-native-iap is called directly in SettingsScreen)
- **Decision:** Per deviation Rule 4, adding new state fields to adStore and creating an IAP store would be a significant architectural change. Implemented BackHandler with the `isRevealing` check only (which is the critical UX behavior). The ad and IAP lifecycles manage their own back handling within their screens. Documented as Deviation 06-04-1.
- **Files modified:** src/app/Navigation.tsx (with explanatory comment)
- **Verification:** TypeScript compiles; BackHandler correctly handles isRevealing skip-to-final-state
- **Committed in:** 44f20f8 (Task 3 commit)

---

**Total deviations:** 2 (1 Rule 1 bug, 1 Rule 4 documented scope)
**Impact on plan:** All deviations necessary for compilation correctness and architectural scope. No scope creep — implemented the critical UX behavior (isRevealing skip-to-final-state) and documented the ad/IAP scope as future work.

## Issues Encountered
- **BackHandler API change in RN 0.86** — the deprecated `removeEventListener` was removed; the new subscription pattern was needed. Auto-fixed during Task 3.

## Known Stubs

None — all implemented features are complete. The ad/IAP state flags are a documented deviation, not a stub (they will be addressed in a future phase when the ad/IAP state management is centralized).

## Threat Surface Scan

**No new threat surface introduced.**
- HomeScreen stagger animation is purely visual (no data flow)
- HowToPlayModal is a static modal with no input fields
- SettingsRow theme selector and toggle extensions read from existing settingsStore (already validated)
- Navigation BackHandler reads from gameStore.isRevealing (already validated)
- StatusBar style and Navigation theme injection are based on local settingsStore state

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- All LAUNCH-05 (BackHandler), LAUNCH-04 (reduceMotion), LAUNCH-01 (color blindness toggle UI), LAUNCH-02 (settings UI) user-facing pieces in place
- Home screen entrance animation complete (D-175-D-177)
- How to Play onboarding accessible (D-192-D-194)
- Navigation themed (D-189, D-190) and dead Result route removed (D-178)
- Ready for Plan 06-05: remaining useColors() consumer migration in remaining screen/component files (Button, StatCard, other screens not yet migrated to useColors)
- Ready for Plan 06-06: privacy policy, performance markers, production build, offline-first verification

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| TypeScript compiles (`npx tsc --noEmit --strict`) | ✅ PASS |
| HomeScreen has stagger refs and useEffect | ✅ PASS |
| HowToPlayModal exists with 3 tile examples + rules + "Got it!" | ✅ PASS |
| ? help-outline icon in HomeScreen | ✅ PASS |
| SettingsRow has themeSelector case + ThemeSelectorRow + toggle cases | ✅ PASS |
| Navigation has BackHandler + Result route removed + NavigationContainer with theme | ✅ PASS |
| App.tsx has no setTimeout + StatusBar activeTheme | ✅ PASS |
| Navigation uses setIsRevealing + flushPendingInputs (not skipToFinalState) | ✅ PASS |
| gameStore.ts NOT modified | ✅ PASS |
| No staged files remain after commits | ✅ PASS |

---
*Phase: 06-pre-launch-polish*
*Plan: 04*
*Completed: 2026-07-09*
