# Key Risks
updated: 2026-07-06 (Phase 5 plan-checker findings — P22/P23/P24 added)
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

### P15: White confetti particles invisible on dark overlay (UNFIXED)
- Cause: `Confetti.tsx` PARTICLE_COLORS includes `#ffffff`. ResultModal renders Confetti inside `rgba(0,0,0,0.5)` overlay → ~1/7 of particles invisible.
- Impact: 0 visual impact for 1/7 particles on win celebrations.
- Fix: Remove `#ffffff` or replace with bright visible color (e.g. `#f1c40f`).
- Phase: 2 (Core Gameplay)

### P16: White-on-yellow contrast failure — present tiles illegible (UNFIXED)
- Cause: Present tiles/keys `#c9b458` (golden yellow) with `textInverse` `#ffffff` text → calculated WCAG contrast ~1.5:1. Below 4.5:1 minimum for normal text.
- Impact: Yellow-highlighted letters (present-in-word) hard to read. Affects both Tile and Keyboard components.
- Fix: Use dark text `#1a1a2e` on yellow tiles/keys, or darken present color.
- Phase: 2 (Core Gameplay)

## Moderate risks (UI review findings, July 2026)

### P17: Dead ResultScreen route in navigator
- Cause: Phase 2 switched from navigated ResultScreen to modal overlay, but route remains registered in Navigation.tsx + src/screens/ResultScreen.tsx exists with placeholder text.
- Risk: Accidentally triggered route shows confusing placeholder. Dead code.
- Fix: Remove route and file, or repurpose as working component.
- Phase: 3

### P18: emoji monospace fontFamily may misalign on Android
- Cause: ResultModal emoji grid uses `fontFamily: 'monospace'`. Android monospace fonts (Droid Sans Mono) lack emoji glyphs. Emoji fall back to system font, breaking alignment.
- Impact: Shareable emoji grid may render misaligned on Android.
- Fix: Use system default font for emoji grid, or test per-device.
- Phase: 3

### P19: Fixed 500ms startup delay instead of readiness detection
- Cause: App.tsx uses setTimeout(500ms) before showing NavigationContainer. Dictionary loaded via synchronous require() at module level.
- Impact: On slow devices, 500ms may be insufficient → visible freeze. On fast devices, 500ms is wasted.
- Fix: Lazy-load per-length word lists or use promise-based readiness.
- Phase: 2

### P20: Alert.alert-based nav menu is non-standard
- Cause: NavMenuButton uses React Native Alert.alert() with action-sheet-style options.
- Risk: Native OS dialog feels jarring for in-app navigation. Lacks customization (icons, sections).
- Fix: Replace with bottom sheet or slide-out drawer.
- Phase: Deferred

### P21: No tutorial/onboarding for new players
- Cause: Game assumes Wordle familiarity. No "How to Play" flow, example guess, or help icon.
- Risk: New users confused about rules (Hard Mode, tile colors, daily completion).
- Phase: 3 (Stats & Settings) or 6 (Pre-Launch)

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
