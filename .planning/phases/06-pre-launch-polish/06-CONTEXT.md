# Phase 6: Pre-Launch & Polish — Context

**Gathered:** 2026-07-08
**Status:** Ready for planning

---

<domain>
## Phase Boundary

Production-ready app submitted to Google Play Store — accessible to all players, performant on mid-range devices, compliant with Play Store policies. Also includes theme system, startup animation, sound file integration, onboarding, and dead code cleanup as polish work.

**Requirements:** LAUNCH-01 through LAUNCH-09

### In scope
- Color blindness support — texture patterns on tiles (dots/stripes/solid), enabled via Settings toggle (OFF by default)
- Screen reader (TalkBack) — announces tile position, letter, and state; proper `accessible` props
- Font size scaling via PixelRatio — typography constants only, not tiles/layout
- Reduce motion — skip ALL animations toggle in Settings (OFF by default), user-controlled
- Android back button — single centralized BackHandler, blocked during animation/ad/IAP, graceful skip-to-final-state
- Play Store compliance — ads declared in Play Console, privacy policy on GitHub Pages, content rating
- Performance profiling — console.time markers for thresholds + visual FPS check
- Production AAB build via EAS — internal + closed testing
- Offline-first verification — works fully on first launch with no internet
- Theme system — light, dark, and system (follows device setting)
- Home screen entrance animation — sequential stagger replacing hardcoded 500ms delay
- Sound files — user-provided .wav files at assets/sounds/, expo-av wiring
- "How to Play" modal overlay — tile color examples, rules text, dismiss button
- Dead code cleanup — remove ResultScreen, fix white confetti, fix present tile contrast
- 3 themes: light, dark, system

### Out of scope
- iOS version or deployment
- RevenueCat or purchase SDK middleware
- Push notifications
- Server-side receipt validation
- Alternative languages
- Tutorial beyond basic "How to Play" modal
- Replacing Alert.alert-based NavMenu (P20 — deferred)

</domain>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — LAUNCH-01 through LAUNCH-09 define Phase 6 scope
- `.planning/ROADMAP.md` — Phase 6 goal, success criteria, mode (mvp)

### Prior Phase Decisions
- `.planning/phases/05-cloud-social/05-CONTEXT.md` — D-113 through D-154 (Google Sign-In, sync, leaderboards)
- `.planning/phases/04-monetization/04-CONTEXT.md` — D-87 through D-112 (ad lifecycle, IAP, restore)
- `.planning/phases/03-stats-settings/03-CONTEXT.md` — D-67 through D-86 (config registry, settings toggles, typography)
- `.planning/phases/02-core-gameplay/02-CONTEXT.md` — D-25 through D-66 (animations, game state, sound stub)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01 through D-24 (project structure, colors, nav)

### Brain (wiki context)
- `brain/wiki/key-risks.md` — P3 (Play Store rejection), P11 (back button), P15 (confetti invisible), P16 (contrast failure), P17 (dead ResultScreen), P19 (startup delay), P27 (no tutorial)
- `brain/wiki/tech-stack.md` — Dependencies: expo-av (for sound), expo-haptics (already installed)
- `brain/wiki/animation-system.md` — Tile flip timing constants (for reduce-motion skip)
- `brain/wiki/ui-config-registry.md` — SettingsRowConfig extension pattern (for new toggle row types + theme selector)
- `brain/wiki/architecture.md` — Component structure, Navigation setup, screen list
- `brain/wiki/design-tokens.md` — Color roles, WCAG contrast values (for dark palette)
- `brain/wiki/phase-structure.md` — Phase 6 overview in roadmap

### Codebase — Key Integration Points
- `src/app/App.tsx` — Centralized BackHandler (D-159), LoadingScreen→Home stagger transition (D-167)
- `src/app/Navigation.tsx` — Remove ResultScreen route (D-170), React Navigation theme injection (D-181)
- `src/components/game/Tile.tsx` — Texture overlay rendering (D-155), accessibility props (D-183)
- `src/components/game/ResultModal.tsx` — White confetti color fix (D-171)
- `src/components/game/Confetti.tsx` — Replace #ffffff in PARTICLE_COLORS (D-171)
- `src/screens/GameScreen.tsx` — Back-blocking during animation (D-160), animation completion callback
- `src/screens/HomeScreen.tsx` — Sequential stagger on mount (D-167), ? icon for How to Play (D-175)
- `src/components/ui/SettingsRow.tsx` — New row types: colorBlindness toggle, reduceMotion toggle, theme selector
- `src/config/ui.ts` — Settings config extension with new rows
- `src/stores/settingsStore.ts` — New fields: colorBlindMode, reduceMotion, themeMode
- `src/constants/colors.ts` — Restructure to lightColors + darkColors palettes
- `src/constants/typography.ts` — PixelRatio fontScale multiplier
- `src/services/sound.ts` — Wire expo-av with user-provided .wav files
- `src/screens/ResultScreen.tsx` — Delete file (D-170)

### New Files to Create
- `src/components/ui/HowToPlayModal.tsx` — How to Play modal overlay
- `src/hooks/useColors.ts` — Theme-aware color hook returning active palette
- `assets/sounds/` directory — user-provided .wav sound files

### Dependencies to Add
- `expo-av` — For sound playback (already in tech-stack as listed dep)

</canonical_refs>

<decisions>
## Implementation Decisions

### Prior Phase Carry-Forward

| Phase | Decisions | Relevance |
|-------|-----------|-----------|
| Phase 1 | D-01–D-24 | Project structure, colors.ts pattern, layout constants, navigation stack |
| Phase 2 | D-25–D-66 | Tile animation (Reanimated), game state, sound stub, endless streak keys |
| Phase 3 | D-67–D-86 | Config-driven settings UI (SettingsRowConfig union), typography constants, barrel exports |
| Phase 4 | D-87–D-112 | Ad lifecycle (block BackHandler during ad), IAP flow (block BackHandler during purchase), settingsStore.setPro() |
| Phase 5 | D-113–D-154 | Google Sign-In flow, leaderboard screens (BackHandler + accessibility apply here too) |

### Phase 6 Decisions

#### 1. Color Blindness Support (LAUNCH-01)
- **D-155:** Texture overlays drawn on top of tiles — dots for correct, diagonal stripes for present, solid fill for absent. Overlay is a visual addition, not a replacement of color.
- **D-156:** Controlled via Settings toggle `colorBlindMode` in settingsStore, **OFF by default**. Uses existing toggle row pattern from UI config registry.

#### 2. Screen Reader Support (LAUNCH-02)
- **D-157:** Tile announcements format: `"Position {N}: {letter}, {state}"` — e.g., `"Position 1: A, correct"`. Gives spatial context essential for word-guessing layout.
- **D-158:** Empty tiles announce: `"Position {N}: empty"`. Current row's unfilled tiles are empty.
- **D-159:** Keyboard keys announce letter name only (no position needed). Enter key announces "Enter", Backspace announces "Backspace".
- **D-160:** Proper `accessible`, `accessibilityLabel`, and `accessibilityRole` props on all interactive elements (tiles, keyboard keys, buttons, modals).

#### 3. Font Size Scaling (LAUNCH-03)
- **D-161:** Scale `fontSize` values in `src/constants/typography.ts` by `PixelRatio.getFontScale()`. Applied once at constant definition time.
- **D-162:** Do NOT scale tile sizes or layout spacing — tile sizes are already dynamically computed from screen width (caps at 56px, floors at 32px) and adapt naturally.

#### 4. Reduce Motion (LAUNCH-04)
- **D-163:** Settings toggle `reduceMotion` in settingsStore — user-controlled, NOT automatic from `AccessibilityInfo.isReduceMotionEnabled()`. **OFF by default.**
- **D-164:** When enabled, skip ALL animations: tile flip (Reanimated worklets skip), confetti (not rendered), stat card entrance (instant), home page stagger (instant). Game shows instant results.

#### 5. Back Button Handling (LAUNCH-05)
- **D-165:** Single centralized `BackHandler` listener in `Navigation.tsx` (or `App.tsx`), not per-screen listeners.
- **D-166:** Back blocked when: tile animations are playing (`isRevealing === true`), interstitial/rewarded ad is displayed, IAP purchase flow is active.
- **D-167:** During tile animation: skip to final state (complete all tile reveals instantly), show the result state, then back navigates normally. During ad/IAP: back is blocked until ad dismisses or purchase completes. Graceful skip, never crash.

#### 6. Play Store Compliance (LAUNCH-06)
- **D-168:** Privacy policy hosted on **GitHub Pages** — create a `docs/privacy.md` in repo (or separate `wordguess-privacy` repo with GitHub Pages enabled). Content covers AdMob data collection, Google Sign-In data, and standard Play Store requirements.

#### 7. Performance Profiling (LAUNCH-07)
- **D-169:** Use `console.time()` / `console.timeEnd()` markers at key code paths for threshold verification. No Flipper setup needed unless visual check reveals jank.
- **D-170:** Markers at: dictionary load (App mount), stats read (StatsScreen mount), stats write (game completion). All guarded behind `__DEV__` flag — stripped from production AAB.
- **D-171:** Visual FPS assessment on mid-range device. If tile animation appears smooth during gameplay, thresholds are met. If jank detected, set up Flipper for diagnosis.

#### 8. Production Build (LAUNCH-08)
- **D-172:** EAS Build profiles already configured (dev/preview/production). Production AAB via `eas build --platform android --profile production`.
- **D-173:** Build order: internal testing → closed testing track → production release. Real AdMob app ID, real Firebase Remote Config keys, branded assets (icon/splash) swapped in before closed testing.

#### 9. Offline-First Verification (LAUNCH-09)
- **D-174:** Test on device in airplane mode. Verify: daily word generated locally, no crash, full game loop playable, stats persist, ads gracefully fail (no crash, just skip). All cloud sync operations (Firestore, Remote Config) must handle missing network gracefully — already pattern from Phase 5 implementation.

#### 10. Home Page Startup Animation
- **D-175:** Replace hardcoded 500ms `setTimeout` in `App.tsx` with a **sequential stagger entrance animation** on the Home screen.
- **D-176:** Stagger order and timing: title (0ms delay, 300ms fade-in + slide-up 10px) → mode buttons (80ms stagger per button, same animation) → icon bar (after last button). Uses React Native `Animated` API — lightweight, no Reanimated needed for entrance.
- **D-177:** Loading screen shows briefly during module initialization, then Home screen animates in. No artificial delay.

#### 11. Dead Code Cleanup
- **D-178:** Delete `src/screens/ResultScreen.tsx` and remove its route from `Navigation.tsx` / `RootStackParamList`. It was replaced by ResultModal overlay in Phase 2 and is dead code (P17).
- **D-179:** Replace `#ffffff` in `Confetti.tsx` `PARTICLE_COLORS` with a bright visible color (e.g., `#f1c40f` golden yellow) — white particles are invisible on the ResultModal dark overlay (P15).
- **D-180:** Fix present tile/key contrast (P16) — present tiles/keys (`#c9b458` background) use dark text (`#1a1a2e`) instead of white (`#ffffff`). Affects Tile.tsx tile text color and Keyboard.tsx key text color on present keys.

#### 12. Sound Files
- **D-181:** Sound asset files go in `assets/sounds/` directory.
- **D-182:** File naming: `keypress.wav`, `reveal.wav`, `win.wav`, `loss.wav`. User provides the actual .wav files manually.
- **D-183:** `sound.ts` service to be wired with `expo-av` `Audio.Sound.createAsync()` during planning — load on `init()`, call `.replayAsync()` in each function, add callsites in Keyboard (playKeyPress), Tile animation callback (playReveal), ResultModal win/loss (playWin/playLoss).

#### 13. Theme System (Light / Dark / System)
- **D-184:** 3 theme modes: `'light'` (current palette), `'dark'` (inverted palette), `'system'` (follows `useColorScheme()` from React Native — reacts live to device theme changes).
- **D-185:** Settings store gains `themeMode: 'light' | 'dark' | 'system'` field, persisted to MMKV.
- **D-186:** `src/constants/colors.ts` restructured to export `lightColors` and `darkColors` palettes instead of a single `colors` object.
- **D-187:** New `src/hooks/useColors.ts` hook returns the active palette (`lightColors` or `darkColors`) based on `themeMode` + `useColorScheme()` for system mode.
- **D-188:** All components that import `colors` directly must migrate to `useColors()` hook. ~15-20 files affected — mechanical change.
- **D-189:** React Navigation receives `DarkTheme` or `DefaultTheme` based on active theme (prevents white flash on navigation).
- **D-190:** `expo-status-bar` style switches `'dark'` / `'light'` based on theme.
- **D-191:** Settings screen gets a theme selector row (segmented control or radio group for 3 options) in Account section or new "Appearance" section.

#### 14. How to Play (Onboarding)
- **D-192:** Modal overlay component `HowToPlayModal.tsx` — not a navigation route. Reuses existing modal pattern from `LengthPickerModal.tsx`.
- **D-193:** Content: 3 tile examples (green tick with "Correct letter, right spot", yellow circle with "Correct letter, wrong spot", gray square with "Letter not in word"), followed by brief rules text: "Guess the word in {N} tries. Each guess must be a valid word.", and a "Got it!" dismiss button.
- **D-194:** Accessible via a `?` icon in the Home screen top-right icon bar (alongside stats/leaderboard/settings icons using `help-outline` MaterialIcon).

### Claude's Discretion
- Exact texture overlay rendering approach (absolute-positioned View on Tile vs SVG overlay vs Unicode characters)
- Settings section structure for new toggles (separate "Accessibility" section or grouped with existing sections)
- How to Play modal styling (consistent with existing modal look)
- Theme selector UI (segmented control vs 3 radio buttons vs dropdown)
- Dark color palette exact values (must maintain contrast ratios, reference design-tokens.md)
- Performance marker exact placement and guard pattern
- BackHandler skip-to-final-state implementation details
- Stagger animation curve (Easing.out(Easing.ease) recommended for natural feel)
- How to dismiss the How to Play modal (tap-backdrop dismiss + "Got it!" button)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`SettingsRow.tsx`** (`src/components/ui/SettingsRow.tsx`) — Switch-case dispatch renderer. Adding `colorBlindness` toggle and `reduceMotion` toggle is one new case each. Same pattern as existing toggle rows.
- **`LengthPickerModal.tsx`** (`src/components/game/LengthPickerModal.tsx`) — Modal overlay pattern to reuse for `HowToPlayModal.tsx`. Follows same structure: semi-transparent backdrop, centered content card, dismiss button.
- **`config/ui.ts`** (`src/config/ui.ts`) — Settings sections defined as config arrays. Adding new toggles = appending to array. Adding theme selector = new row type or new section.
- **`settingsStore.ts`** (`src/stores/settingsStore.ts`) — Already MMKV-persisted with toggle actions. Adding `colorBlindMode`, `reduceMotion`, `themeMode` fields follows existing pattern.
- **`constants/animations.ts`** (`src/constants/animations.ts`) — All animation timing constants for tile flip. Reduce motion skips these entirely.
- **`Navigation.tsx`** (`src/app/Navigation.tsx`) — Where centralized BackHandler and React Navigation theme integration go.
- **`HomeScreen.tsx`** (`src/screens/HomeScreen.tsx`) — Already has icon bar with stats/leaderboard/settings icons. Add `?` icon here. Entrance stagger animation on mount.
- **`App.tsx`** (`src/app/App.tsx`) — Contains the 500ms setTimeout to replace. Also where BackHandler could be centralized.

### Established Patterns
- **Config-driven UI** (Phase 3): Adding settings rows = editing `config/ui.ts` array. No JSX changes in `SettingsScreen.tsx`.
- **MMKV-persisted Zustand**: `settingsStore.ts` — toggle pattern established. New boolean fields follow exactly.
- **Modal overlay**: `LengthPickerModal.tsx` — backdrop + centered card + dismiss. `HowToPlayModal.tsx` follows same pattern.
- **Service pattern**: `sound.ts` already has the expected API surface. Adding expo-av wiring is filling in the stubs.
- **Animated API entrance**: `StatsScreen.tsx` already has fade-in + slide-up entrance animation using RN Animated. Home stagger can build on the same approach.
- **Relative imports**: No `@/` alias — all imports use relative paths (Metro constraint).

### Integration Points
- **Tile.tsx** → Add `accessibilityLabel` ("Position N: letter, state") + texture overlay View (absolute positioned, conditionally rendered based on `colorBlindMode`)
- **Keyboard.tsx** → Add `accessibilityLabel` on Key components, wire `playKeyPress()` call (sound)
- **ResultModal.tsx** → Fix white confetti color, wire `playWin()` / `playLoss()` calls
- **GameScreen.tsx** → Block back during `isRevealing`, skip-to-final-state on back during animation, wire sound calls in animation completion
- **Navigation.tsx** → Single BackHandler, React Navigation theme
- **App.tsx** → Remove 500ms timer, trigger stagger animation
- **colors.ts** → Heavy refactor: single flat object → `lightColors` + `darkColors`
- **Every component importing colors** → Switch to `useColors()` hook

### Dark Theme Palette Requirements
The dark palette must maintain WCAG contrast:
- Background: dark (e.g., `#1a1a2e` or `#121212`)
- Surface: slightly lighter (e.g., `#2a2a3e`)
- TextPrimary: near-white (e.g., `#e8e8e8`)
- TextSecondary: meets 4.5:1 on dark backgrounds
- Tile colors (correct/present/absent): adjust for dark background visibility
- Accent: may need slight brightening for dark mode

</code_context>

<specifics>
## Specific Ideas

- **Home screen icon bar layout:** Order left→right: `?` (How to Play), `emoji-events` (Stats), `leaderboard` (Leaderboard), `settings` (Settings) — ? goes first since it's new-user-facing
- **How to Play modal style:** Clean white card on dark backdrop, tile examples centered like the game board (3 tiles in a row showing green/yellow/gray with label text below each)
- **Color blindness texture approach:** Render a small `View` with `position: absolute, inset: 0` on each Tile, with `backgroundColor` pattern — dots via `borderRadius: 50%` + small circle at center, stripes via narrow `View` rotated, solid via full opacity layer
- **Sound files:** Use short (<1s) sounds. Keypress = 100ms click. Reveal = 300ms whoosh. Win = 1.5s jingle. Loss = 800ms gentle tone.
- **Dark palette reference:** Follow Material Design 3 dark theme guidelines for surface/on-surface colors

</specifics>

<deferred>
## Deferred Ideas

- **Replace Alert.alert-based NavMenu** (P20) — non-standard navigation pattern, but functional. Deferred post-launch.
- **Server-side receipt validation** — not needed for MVP. Client-side check via react-native-iap is sufficient.
- **iOS release** — separate project setup, deferred to v2.
- **Push notifications** — not scoped for v1.
- **Auto-detect reduce motion from system settings** — user chose manual toggle. System detection could be added as enhancement later.

</deferred>

---

*Phase: 6-Pre-Launch-Polish*
*Context gathered: 2026-07-08*
*Prior phases carried forward: Phase 1 (D-01–D-24), Phase 2 (D-25–D-66), Phase 3 (D-67–D-86), Phase 4 (D-87–D-112), Phase 5 (D-113–D-154)*
*Decisions this phase: D-155 through D-194*
