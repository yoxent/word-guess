# Key Risks
updated: 2026-07-08 (Phase 6 — P15/P16/P17 fixed, P19 resolved with stagger animation)
tags: [risks, pitfalls, critical]
related: [daily-seed, google-signin, phase-structure, tech-stack, dictionary-preprocessing, cloud-sync]

## Critical risks (rewrite / store rejection / abandonment)

### P1: JS-thread tile animations stutter (MITIGATED)
- Cause: Using RN's Animated API (bridges JS thread per frame)
- Mitigation: react-native-reanimated 4.x worklets used exclusively — Tile flip via useSharedValue/useAnimatedStyle, all on UI thread. No JS thread frames during animation.
- Status: Mitigated in Phase 2. Implementation uses interpolateColor, interpolate for rotateX, withSequence for bounce.
- Detection: Profile with Flipper during tile reveal. JS thread >16ms frames = fail.
- Phase: 2 (Core Gameplay)

### P2: Daily seed extraction via APK decompilation (ACCEPTED RISK, SIMPLIFIED)
- Cause: Private seed as plain JS string. apktool + strings reveals in minutes.
- Decision: Accepted deterministic multi-source hash (DJB2) + ProGuard/R8 minification instead of JNI. No native layer for seed — adequate for casual cheating prevention.
- Mitigation: Multi-source hash: `APP_SEED + ':' + dateStr + ':' + length` → DJB2 → index. Seed constant `wg-v1-seed-2026` obfuscated via ProGuard.
- Future: Server-side validation (Phase 5+) to verify submitted daily word.
- Detection: `apktool d app-release.apk && strings ./ | grep -i seed`
- Phase: 2 (Core Gameplay)

### P3: Play Store rejection (ad/IAP compliance)
- Cause: Missing ad declaration, privacy policy, test ads in production, IAP product ID mismatch
- Mitigation: Declare ads in Play Console. Privacy policy URL. Test ads FIRST. Match product IDs exactly.
- Phase: 4 (Monetization), 6 (Pre-Launch)

### P4: Google Sign-In DEVELOPER_ERROR
- Cause: SHA-1 fingerprint mismatch between debug/upload/Play App Signing keys
- Mitigation: Register ALL 3 fingerprints in Firebase. Use Web client ID in GoogleSignin.configure(). Test release builds on real device.
- Phase: 5 (Cloud)
- Ref: @react-native-google-signin docs — this is the #1 reported issue

### P5: Offline data corruption (race condition)
- Cause: Multiple offline games → naive last-write-wins sync corrupts aggregated stats
- Mitigation: Event-based incremental sync (append game result, not full-state overwrite). Write-ahead log. Idempotent events.
- Phase: 5 (Cloud)

## Moderate risks

### P6: Interstitial double-loading (MITIGATED)
- Singleton Zustand adStore (adStore.ts) with ref-counted lifecycle. preloadInterstitial/preloadRewarded check loaded/loading flags before creating ads.
- Phase: 4
- Mitigation verified: adStore.ts uses module-level InterstitialAd/RewardedAd instances + Zustand boolean tracking. Lazy preload on CLOSED event. No double-load paths.

### P7: Missing IAP restore flow (MITIGATED)
- Restore button in Settings Account section calls RNIap.getAvailablePurchases(). color-coded toast feedback.
- Phase: 4
- Mitigation verified: restore implemented via handleRestore() in SettingsScreen.tsx, purchaseUpdatedListener handles Pro purchase async flow.

### P8: Dictionary blocks JS thread at startup
- Strip enriched JSON at build time (~150KB gzipped final). Static require() at module level — synchronous, no startup delay.
- Phase: 1 (Foundation)

### P12: Metro bundler crash from dynamic require()
- Cause: Using dynamic `require()` with template literals or `@/` path aliases. Metro cannot resolve either.
- Mitigation: Always use static `require()` with relative paths for bundled assets. Pre-import all word lists at module level.
- Detection: Plan checker flags dynamic require patterns. Also: `npx react-native start` will error on load.
- Phase: 1 (Foundation)

### P13: React Navigation version discrepancy
- Cause: Training data claims 8.x exists, npm registry shows 7.17.9 as latest.
- Mitigation: Always verify versions via `npm view <pkg> version` before planning. Document verified versions.
- Detection: Plan checker cross-references RESEARCH.md version claims.
- Phase: All

### P9: Score submission before sign-in complete
- Deferred score queue with retry (3x, exponential backoff). Visible sync status.
- Phase: 5

### P10: Keyboard flicker during tile reveal (MITIGATED)
- Keyboard wrapped in React.memo (D-63) — prevents re-render during tile animation.
- Keyboard color update fires after setTimeout matching total animation time.
- Input queued during animation (D-66) via pendingInputs array, flushed after animation completion.
- Phase: 2

### P11: Android back button during animation/ad/IAP
- BackHandler listener per screen. Block during critical states. Graceful skip on back.
- Phase: 1 (Foundation) + Phase 4 (Monetization)

### P14: Input queue processing bug — flushPendingInputs drains only 1 item (FIXED 2026-07-05)
- Cause: `gameStore.flushPendingInputs()` dequeued and processed exactly 1 item per call, then stopped. If user typed N keys during tile reveal animation, only the first was applied.
- Impact: Silent dropped keystrokes — user types during animation, letters vanish.
- Fix: `setTimeout(() => get().flushPendingInputs(), 0)` after each non-ENTER input — recursively drains queue until empty. ENTER stops draining (triggers new animation → submission path handles re-flush).
- Phase: 2 (Core Gameplay)

### P21: Dictionary case mismatch — all guesses rejected as "Not in word list" (FIXED 2026-07-05)
- Cause: `isValidGuess`/`isValidWord` in dictionaryStore used `.toUpperCase()` for set lookup, but valid-{N}.json and {N}.json files store words in **lowercase** (from preprocessing script). Set.has() is case-sensitive, so every word failed.
- Impact: All guesses rejected. Game unplayable.
- Fix: Changed lookups to `.toLowerCase()`. Also normalized `session.word.toUpperCase()` in `submitGuess` for `evaluateGuess()` case-sensitive character comparison.
- Detection: Word-level validation always fails regardless of input.
- Phase: 2 (Core Gameplay)

### P15: White confetti particles invisible on dark overlay (FIXED 2026-07-08)
- Cause: `Confetti.tsx` PARTICLE_COLORS includes `#ffffff`. ResultModal renders Confetti inside `rgba(0,0,0,0.5)` overlay → ~1/7 of particles invisible.
- Fix: Replace `#ffffff` with bright visible color `#f1c40f` (golden yellow).
- Phase: 6 (Pre-Launch & Polish)

### P16: White-on-yellow contrast failure — present tiles illegible (FIXED 2026-07-08)
- Cause: Present tiles/keys `#c9b458` (golden yellow) with `textInverse` `#ffffff` text → calculated WCAG contrast ~1.5:1. Below 4.5:1 minimum for normal text.
- Fix: Use dark text `#1a1a2e` on yellow tiles/keys instead of white.
- Phase: 6 (Pre-Launch & Polish)

## Moderate risks (UI review findings, July 2026)

### P29: useFocusEffect called outside NavigationContainer — render crash on RN 0.86 (FIXED 2026-07-09)
- Cause: Centralized `useFocusEffect` (for BackHandler, commit 44f20f8 / 06-04) was called in the outer `Navigation()` function alongside the `<NavigationContainer>` JSX. The hook requires navigation context from a *parent* `NavigationContainer`, not a sibling.
- Symptom: `Couldn't find a navigation object. Is your component inside NavigationContainer?` thrown on every render. App screen is blank with red-box error.
- Fix: Extract hook logic into a child component (`BackHandlerController`) rendered *inside* `<NavigationContainer>`. Hook now has valid context.
- Lesson: Navigation hooks must be in descendants of the container. Pattern: split into outer (container) + inner (hooks).
- Phase: 6 (Post-launch)

### P37: Three UI bugs — keyboard action key colors, missing tile text, modal Cancel pattern (FIXED 2026-07-09)

**Bug 1 — Keyboard action key colors:** Action keys (ENTER/BACKSPACE) used `colors.key.special` (dark gray in dark theme) + `colors.key.actionText` (= `text.inverse`, dark in dark theme) → unreadable dark-on-dark in dark theme. Fixed by using the same `colors.key.unused` background and `colors.key.text` (= `text.primary`, theme-aware) as letter keys. Action keys are now visually consistent with letter keys, just wider and with a different text label.

**Bug 2 — Tile text "missing" after guessing:** The `animatedTextStyle` in `Tile.tsx` interpolated the text opacity from 1 → 0 → 1 during the flip animation. If the worklet got stuck or the JS thread was busy (e.g., the gameStore update happening in the same render cycle), `flipProgress.value` could be left at 0.5, which would render the text at opacity 0 (invisible). The text would reappear on remount because a fresh animation ran to completion. Fixed by removing the text opacity animation entirely — the text is always visible. The background color and rotation still animate for the Wordle-style flip effect. Side effect: the text is no longer hidden during the flip (a small UX trade-off, but worth it for reliability). The `animatedTextStyle` is left defined in the code with a comment explaining why it's unused, so a future maintainer doesn't try to re-add it.

**Bug 3 — LengthPickerModal Cancel button + Continue Game modal standardization:**
- `LengthPickerModal`: removed the Cancel button. Changed the overlay to a `Pressable` with `onPress={onClose}` so tapping outside the card dismisses. Added `onStartShouldSetResponder={() => true}` to the card so tapping inside the card (including the length buttons) does NOT dismiss.
- `HomeScreen`'s Continue Game modal: was already using `onTouchEnd` on the overlay (which had a similar effect), but inconsistent with the new pattern. Standardized to `Pressable` + `onStartShouldSetResponder` for consistency with the length picker.
- The pattern is: tap on overlay → dismiss; tap on card → does NOT dismiss (buttons inside the card still work).
- No other modals have Cancel buttons to change (`ResultModal` has action buttons Play Next/Back to Menu, `HowToPlayModal` has Got it! — these are actions, not cancels, and aren't in scope for this pattern).

- Lesson: For text content that should always be visible, don't tie its opacity to an animation that could get stuck. The text should be stable; only the background/visual chrome should animate. For modal dismissal, the Pressable + onStartShouldSetResponder pattern is more explicit and standard than onTouchEnd.
- Phase: 6 (Post-launch)
- Cause: On Android 11+ (API 30+), every service that uses app-ops (like media playback) must declare an `android:attributionTag` in the manifest. `expo-audio`'s `AudioControlsService` does NOT set this by default. The system logs a warning every time the service is active: `AppOps: attributionTag not declared in manifest of com.vorithstudio.wordguess`. The user noticed these during the login flow (because the BGM was playing while they tapped Sign In).
- Attempted fix: `scripts/patch-audio-attribution-tag.mjs` added `android:attributionTag="audioPlayback"` to the `<service>` element. **REVERTED** — the AAPT2 binary used by the project's build chain does not recognize the `android:attributionTag` attribute, even with compileSdk = 36. The build fails with: `AAPT: error: attribute android:attributionTag not found.`
- Why: The attribute is added in API 31+ in AOSP, and `node_modules/react-native/gradle/libs.versions.toml` declares `compileSdk = "36"`. The failure suggests a build-tools / AAPT2 version mismatch — the AAPT2 binary in the toolchain may predate the attribute even though the framework jar at API 36 should know about it.
- Current state: the manifest is back to default (no `attributionTag`). The patch script is preserved as a no-op so it can be re-enabled with a one-line change if the toolchain is updated. The AppOps warning will continue to appear in logcat whenever the BGM is playing.
- Alternative fixes to investigate later (not done now, since this is just a log warning):
  - Update AGP / build-tools to a newer version that includes a newer AAPT2
  - Wait for `expo-audio` to add the attribute natively
  - Use a custom config plugin that emits the attribute via a different mechanism
- Note on other log noise from the login flow (NOT actionable, system-level):
  - `kchd: Previous channel was garbage collected` — gRPC channel leak in Google Play Services. Known internal issue, not our code.
  - `MediaControlProfile: base actions not supported` — Android Bluetooth system, not our app.
  - `Invalid resource ID 0x00000000` — Google Play Services UI internal.
  - `TaskPersister: File error accessing recents directory` — system-level.
  - The login itself uses Google Sign-In via `@react-native-google-signin` + `@react-native-firebase/auth`. The auth flow is correct — these are just warnings, not errors.
- Lesson: When patching the AndroidManifest, always `npx expo run:android` to verify the build still compiles. AAPT2 attribute recognition is sensitive to toolchain version, and an attribute that's valid in API 31+ can still be rejected by an older AAPT2. Better to add a build-test step to the postinstall flow.
- Phase: 6 (Post-launch)

### P35: Slider "blink from 0%" on mount + stale closure + BGM static from volume clipping (FIXED 2026-07-09)
- Cause (slider blink): the VolumeSlider started with `useState(0)` for width, so the first render had `fillWidth = 0` (invisible fill) and the thumb hidden behind `{width > 0 && ...}`. The visible slider was empty until `onLayout` fired and set the actual width — a single-frame 'pop in' from 0% to the real value.
- Cause (stale closure): the PanResponder was created once via `useRef` and captured the first render's `updateFromX`, which closed over the first render's `handleChange` (and its `config.storeKey`). If anything changed the closure identity later, the slider would call the wrong action.
- Cause (BGM static): the audio mode `interruptionMode: 'duckOthers'` only affects OTHER apps, not the app's own BGM+SFX mix. When an SFX played on top of the BGM at full volume, the combined output exceeded 1.0 and clipped, producing audible static/distortion.
- Fixes:
  - Slider: width initialized to `screenWidth - 2 * 20` (estimate) so the first render already shows the slider in its final visual position. `onLayout` refines to actual.
  - Slider: `handleChangeRef` ref pattern — the latest `handleChange` is stored in a ref each render and the PanResponder calls `handleChangeRef.current(v)`. Always the freshest closure.
  - Slider: added `onMoveShouldSetPanResponderCapture: () => true` to claim the gesture before the parent ScrollView can (Android gesture race fix).
  - Slider: NaN/Infinity guards in `updateFromX` and `onLayout`.
  - BGM: when an SFX plays, the BGM is ducked to 30% of its intended volume for the SFX's duration (200-2200ms depending on the SFX). After the duck timer elapses, the BGM is restored to its intended volume. The duck sets `_bgmPlayer.volume` directly (bypassing `setBgmVolume`'s play/pause transition logic) so it's purely a volume change.
  - Padding: `layout.screenPadding` bumped from 16 to 20 (per user feedback — 16 was too tight, especially for the top-right settings icons in the Home topBar). All screens now use the constant consistently.
- Lesson: Three unrelated symptoms shared a single category: 'a real-world app needs more defensive defaults than a quick prototype does'. Initialize width to a sensible estimate instead of 0. Use refs for callbacks captured by long-lived objects (PanResponder). Implement ducking when mixing two audio sources.
- Phase: 6 (Post-launch)
- Cause: `setBgmVolume(v)` unconditionally called `_bgmPlayer.play()` when `v > 0`. The volume slider fires `setBgmVolume` 10-30 times per second during a drag, so `play()` was called on every drag tick. On a looping player, this either restarted playback (audible glitches) or stacked audio sessions (static noise). The same native call also blocked the JS thread on each invocation, which caused the PanResponder to queue up events and produced the slider "rubberbanding" effect (visual position lagging behind the finger).
- Symptom: Erratic BGM playback (restarts mid-loop), audible static, and the slider snapping back to lower values when dragged higher.
- Fix: `setBgmVolume` now only calls `play()` on the 0→>0 transition (start playback) and `pause()` on the >0→0 transition (stop playback). Mid-range volume changes just update `player.volume` without touching playback state. Both bugs (audio + slider) are fixed by this single change.
- Lesson: Side-effect calls (play/pause/seek) should be tied to **transitions**, not every state update. The pattern: track previous state, only invoke the side effect when the state has crossed a meaningful boundary. Calling side effects on every state update is a common anti-pattern that causes both performance issues and audio glitches.
- Phase: 6 (Post-launch)

### P33: Continuous volume slider — custom PanResponder implementation (2026-07-09)
- Cause: The user wanted a real continuous slider for volume control, not a 3-position segmented control. A community slider package (`@react-native-community/slider`) would have added a native module, but the user has been burned by native-module JSI issues before (P28), and a custom slider is only ~50 lines of code with PanResponder.
- Fix: `VolumeSlider` component built on `PanResponder` in `SettingsRow.tsx`:
  - Touch area is 40px tall (track is 6px — easier to grab)
  - PanResponder handles both tap-to-jump and drag
  - Value rounded to 2 decimals before persisting (avoids float noise from rapid drags writing dozens of unique values)
  - `accessibilityRole="adjustable"` + `accessibilityValue` for screen readers
- Lesson: For a single-purpose control with a well-defined input range (0-1), a custom PanResponder-based component is cheaper than a native dep. Native deps add build complexity, prebuild risk, and a runtime surface for ABI mismatches. Custom RN components are fine when the control fits in ~50 lines and doesn't need 60fps gesture handling.
- Phase: 6 (Post-launch)

### P32: Audio architecture — BGM with reactive volume + AppState lifecycle (2026-07-09)
- Cause: BGM (background music) needs to play continuously across the app, but respect (a) user volume preference, (b) app lifecycle (pause on background), and (c) live updates when the user adjusts the volume slider in Settings.
- Fix: New audio service architecture in `src/services/sound.ts`:
  - BGM player created on `sound.init()`, `loop = true`, persists for the app's lifetime
  - `setBgmVolume(v)` and `setSfxVolume(v)` apply volumes reactively — idempotent
  - `pauseBgm()` / `resumeBgm()` called from `AppState` listener in `App.tsx`
  - Reactive `useEffect` in `App.tsx` watches `bgmVolume` / `sfxVolume` and applies changes — this is the toggle-side-effects pattern generalized to numeric values
- Lesson: BGM is a long-lived audio resource, different from SFX. Treat it as a singleton (one player for the whole app), control via volume rather than play/pause, and tie lifecycle to AppState. The `loop = true` flag means the player can be paused/resumed without re-seeking.
- Phase: 6 (Post-launch) — see [toggle-side-effects](./toggle-side-effects.md) for the pattern.

### P31: Flat useColors() API produces "wrong key for context" bugs (FIXED 2026-07-09)
- Cause: The pre-refactor `useColors()` hook returned a flat object (`{ accent, textPrimary, tileCorrect, ... }`). Components picked colors by key name, with no semantic distinction between "button background" and "toggle track" and "icon color" — all three used `colors.accent`. When a component wanted the wrong color (or missed setting any color, as in P30), nothing in the type system caught it.
- Symptom: Recurring contrast / wrong-color bugs across the dark theme migration. P30 was the most visible (unreadable toggle label) but the underlying anti-pattern was everywhere.
- Fix: Replaced `useColors()` with `useTheme()` that returns a semantic structure. Components now ask for `theme.colors.button.primary.bg` instead of `colors.accent`. The type system forces every consumer to pick a semantically valid color slot — there is no `theme.colors.accent` shortcut.
- Lesson: When you have "one color used for many things" in a flat namespace, the type system can't help you. Semantic grouping makes intent explicit and prevents the wrong-key bug by construction.
- Phase: 6 (Post-launch) — see [theme-system](./theme-system.md) for full architecture.

### P30: Text contrast — module-level styles without color (FIXED 2026-07-09)
- Cause: `SettingsRow.ToggleRow` was the only row type using a module-level `styles` constant (the others all use `useStyles(colors)`). The module-level `styles.label` had no `color` property, so the label inherited the OS default text color (black on Android).
- Symptom: Toggle row labels ("Sound Effects", "Haptic Feedback", "Color Blind Mode", "Reduce Motion") were black on the dark `surface` card (`#2a2a3e`) in dark theme — essentially invisible.
- Fix: `ToggleRow` now uses `useStyles(colors)` like the other 6 row types. Removed the module-level `styles` alias entirely. Refactor surfaced 3 additional contrast issues (segmented control, completed length, emojiText) which were fixed in the same commit.
- Lesson: When a component supports multiple row variants via theme-aware `useStyles()`, **every** variant must use it. A single variant using a separate module-level stylesheet is a bug magnet. Audit rule: every `<Text>` in a component that supports dark theme must have an explicit `color` from the theme hook (or `textInverse` on a known background). React Native does not auto-pick a readable color for unknown themes.
- Phase: 6 (Post-launch)

### P28: expo-av JSI ABI mismatch on RN 0.86 (FIXED 2026-07-09)
- Cause: `expo-av@16.0.8` is the legacy SDK ~50/51 package. Its `libexpo-av.so` was built against an old RN JSI ABI. On RN 0.86.0, `facebook::jsi::Value::asObject(Runtime&)` symbol has changed → `dlopen failed: cannot locate symbol` at `AVManager.<clinit>` → `FATAL EXCEPTION` on `pool-5-thread-1` at app launch.
- Symptom: App crashes immediately on startup with `UnsatisfiedLinkError` referencing `libexpo-av.so`. Misleading "Pinning is deprecated since Android Q" warning precedes it (unrelated noise).
- Fix: Migrate to `expo-audio@~57.0.0` (modern Expo modules). API: `createAudioPlayer(source)` returns `AudioPlayer` directly (no `{sound}` wrapper). `player.seekTo(0); player.play()` replaces `sound.replayAsync()`. Re-run `npx expo prebuild` after install.
- Lesson: Always verify package version aligns with current Expo SDK. `expo-av` was deprecated in SDK 52. Use `npx expo install` for Expo modules — it enforces version alignment.
- Phase: 6 (Post-launch)

### P17: Dead ResultScreen route in navigator (FIXED 2026-07-08)
- Cause: Phase 2 switched from navigated ResultScreen to modal overlay, but route remained registered in Navigation.tsx + src/screens/ResultScreen.tsx existed with placeholder text.
- Fix: Delete file and remove route from Navigation.tsx and RootStackParamList.
- Phase: 6 (Pre-Launch & Polish)

### P18: emoji monospace fontFamily may misalign on Android
- Cause: ResultModal emoji grid uses `fontFamily: 'monospace'`. Android monospace fonts (Droid Sans Mono) lack emoji glyphs. Emoji fall back to system font, breaking alignment.
- Impact: Shareable emoji grid may render misaligned on Android.
- Fix: Use system default font for emoji grid, or test per-device.
- Phase: 3

### P19: Fixed 500ms startup delay (RESOLVED 2026-07-08)
- Cause: App.tsx uses setTimeout(500ms) before showing NavigationContainer. Dictionary loaded via synchronous require() at module level.
- Fix: Replace with sequential stagger entrance animation on Home screen (title → buttons → icons, 80ms stagger). No artificial delay. Loading screen shows only during initialization.
- Phase: 6 (Pre-Launch & Polish)

### P20: Alert.alert-based nav menu is non-standard
- Cause: NavMenuButton uses React Native Alert.alert() with action-sheet-style options.
- Risk: Native OS dialog feels jarring for in-app navigation. Lacks customization (icons, sections).
- Fix: Replace with bottom sheet or slide-out drawer.
- Phase: Deferred

### P27: No tutorial/onboarding for new players (FIXED 2026-07-08)
- Cause: Game assumes Wordle familiarity. No "How to Play" flow, example guess, or help icon.
- Fix: HowToPlayModal overlay (not a nav route) with tile color examples + rules text + "Got it!" dismiss. Accessible via ? icon in Home screen icon bar.
- Phase: 6 (Pre-Launch & Polish)

## Build risks

### P25: Kotlin metadata version mismatch — play-services-ads 25.4.0 needs Kotlin 2.3.0 (MITIGATED)
- Cause: `react-native-google-mobile-ads` 16.4.0 depends on `play-services-ads:25.4.0`, compiled with Kotlin metadata 2.3.0. RN 0.86 ships Kotlin 2.1.20 via Gradle version catalog. Compiler can't read metadata 2.3.0 — fails with `Module was compiled with an incompatible version of Kotlin. The binary version of its metadata is 2.3.0, expected version is 2.1.0.`
- Scope quirk: `expo-build-properties` sets `android.kotlinVersion` in `gradle.properties`, but the ads module reads `rootProject.ext.kotlinVersion` via `getExtOrDefault()`. Different scopes — the gradle property doesn't propagate.
- Mitigation: `ext.kotlinVersion = '2.3.0'` in `android/build.gradle` + `scripts/patch-kotlin-version.mjs` postinstall patch script
- Detection: Gradle build fails at `:react-native-google-mobile-ads:compileDebugKotlin`
- Phase: All (first build after adding the ads dependency)

### P26: Early return before hooks causes "Rendered more hooks" crash (FIXED 2026-07-08)
- Cause: 4 `useCallback` hooks placed after `if (!session || session.status === 'playing') { return null; }` guard in ResultModal. First renders returned early (7 hooks), then won/lost render hit all 11 hooks → "Rendered more hooks than during the previous render".
- Impact: Red-screen crash when game transitions to result. Full React error.
- Fix: Move all hooks before the early return. Use optional chaining (`session?.mode`) and store `.getState()` for ad/iap calls so callbacks are safe to define when session is null.
- Detection: React error screen with `updateWorkInProgressHook` in stack trace, pointing to `ResultModal.tsx`.
- Phase: 2 (Core Gameplay)

## Phase 5 planning findings (plan checker)

### P22: CLOUD-02 stats sync wire gap (CAUGHT AT PLAN-CHECK)
- Cause: firestoreService.updatePlayerStats() created in 05-01 but never called in any plan. CLOUD-02 (cloud-synced stats) had no implementation task.
- Impact: Player stats never synced to Firestore — leaderboards isolated, no cloud backup.
- Fix: Added updatePlayerStats() call alongside leaderboard submission in game completion flow; enqueue game_result to syncQueue when offline/unauthed.
- Phase: 5 (Cloud & Social)

### P23: D-136 hash algorithm deviation (CAUGHT AT PLAN-CHECK)
- Cause: D-136 specified SHA-256 for event IDs, but plan action used djb2/fnv1a. Documented as accepted deviation.
- Risk: Collision if sync queue scales to thousands of events (theoretical).
- Fix: Documented rationale — expo-crypto polyfill overhead unnecessary for single-device dedup. SHA-256 can be adopted if cross-device dedup needed.
- Phase: 5

### P24: Zustand persist hydration race on cold start (CAUGHT AT PLAN-CHECK)
- Cause: authStore persisted to AsyncStorage. On cold start, rehydration is async — isLoggedIn briefly false before persisted true loads.
- Impact: Brief flash of "not signed in" UI on app launch for authenticated users.
- Fix: Gate auth-dependent UI with `_hasHydrated`. `googleSignInSilently` clears stale isLoggedIn on failure.
- Phase: 5
