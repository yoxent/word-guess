# Phase Structure
updated: 2026-07-08 (Phase 5 verified — 28/28 must-haves passed)
tags: [roadmap, phases, planning]
related: [project-overview, key-risks, architecture, game-modes, planning-patterns]

## 6 phases — sequential, MVP mode (vertical slices)

```
Phase 1 (Foundation)
  └── Phase 2 (Core Gameplay)
        └── Phase 3 (Stats & Settings)
              └── Phase 4 (Monetization)
                    └── Phase 5 (Cloud & Social)
                          └── Phase 6 (Pre-Launch & Polish)
```

## Phase details

### Phase 1: Foundation
- **Goal:** Expo scaffold, dictionary preprocess, colors, types, navigation shell, storage layer
- **Reqs:** FOUND-01 → FOUND-06 (6 reqs)
- **Key decisions:** Expo + RN Navigation (not Expo Router), MMKV/SQLite/AsyncStorage split, @/ path alias, dev-client prebuild from day one, EAS configured now
- **Status:** Planned (3 plans, 2 waves, Walking Skeleton)
- **Wave 1:** Scaffold + types + colors + dictionary (plan 01-01)
- **Wave 2 (parallel):** Storage + Zustand stores (01-02) + Navigation + screens (01-03)
- **Out:** No game logic, no stats UI
- **Plan checker found:** Metro requires static require(), VALIDATION.md required for Nyquist

### Phase 2: Core Gameplay (COMPLETED 2026-07-05)
- **Goal:** Full playable game — all 4 modes, tile feedback, keyboard, animations, sound stubs, haptics, Hard Mode, daily seed
- **Reqs:** GAME-01 → GAME-19 (19 reqs — largest phase)
- **Critical:** Reanimated from day one, seed security (multi-source hash, no JNI), NYT Hard Mode rules with 20+ unit tests
- **Scope adjustments:** GAME-16 (sound) deferred to no-op stub — actual expo-av files added later by dev. GAME-19 (seed) simplified to multi-source hash + ProGuard, no JNI layer (accepted risk)
- **Phase 1 dependency:** scaffold, types, dictionary ready
- **Status:** Complete (4 plans, 3 waves, 16 commits, 23 source files)
- **Wave 1:** Core logic — dictionary preprocessing update (valid-{N}.json + defs-{N}.json), wordLogic.ts, dailySeed.ts, sound.ts stub, dictionaryStore + gameStore updates (plan 02-01) — 3 tasks
- **Wave 2 (sequential — overlap on ResultModal.tsx):** Game UI components — Tile/GuessRow/GameBoard/Keyboard/ResultModal/Confetti + GameScreen (02-02). Mode routing — LengthPickerModal, HomeScreen (Free/Random/Daily/Endless), daily completion tracking, Endless "Play Next", definition lookup (02-03) — 6 tasks
- **Wave 3:** Polish — Reanimated animations, animation constants (tunable per D-31), AppState persistence, LoadingScreen, haptics, Hard Mode shake/toast (02-04) — 4 tasks
- **Out:** No stats tracking (Phase 3), no ads/IAP (Phase 4), no cloud sync (Phase 5)
- **Key artifacts:** 7 game components, LoadingScreen, wordLogic/dailySeed/sound services, animation constants, AppState persistence, haptics wiring

### Phase 3: Stats & Settings (COMPLETED 2026-07-06)
- **Goal:** Persistent stats, settings screen, share results
- **Reqs:** STAT-01 → STAT-05 (5 reqs — smallest phase)
- **Dependency:** Phase 2 (need game completions to record stats)
- **Status:** Complete (3 plans, 3 waves, 3 commits, 12 files)
- **Key decisions:** D-67–D-86 + UI design contract (03-UI-SPEC.md)
  - Stats screen: scrolling card sections driven by UI config registry
  - Stats card entrance: fade-in + slide-up (opacity 0→1, translateY 10→0, 300ms, 80ms stagger per card) (D-82)
  - Guess distribution: react-native-chart-kit bar chart
  - Share: floating action button (fixed bottom, absolute position) copies emoji grid + mode + attempts + date to clipboard (D-83)
  - Per-mode streaks: computed AND displayed in Phase 3 (daily/endless/free+random separate); data collection wire (gameStore→statsStore.recordGame) added in Phase 3 (D-85)
  - Pull-to-refresh: always enabled on Stats screen (D-86)
  - Typography: 5-size type scale extracted to `src/constants/typography.ts` (D-84)
  - Settings: config-driven toggle rows; account section shows placeholder "Sign in — coming in Phase 5"
  - UI Configuration Registry: `src/config/ui.ts` — single source of truth for composable UI (stats cards + settings rows); screens are dumb iterators
- **Architecture additions:** `src/config/` layer, `src/utils/share.ts`, `src/constants/typography.ts`, components `StatCard` + `SettingsRow`
- **New deps:** react-native-chart-kit, react-native-svg, expo-clipboard
- **Design tokens:** Spacing scale (4-48px multiples of 4), typography scale (5 sizes), color role assignments (accent reserved for toggles + share CTA). See [design-tokens](design-tokens.md).
- **Wave 1:** Data layer — PlayerStats extension, SQL aggregation (per-mode streaks, guess distribution, games-by-length), statsStore expansion, GameScreen→recordGame() wiring (plan 03-01)
- **Wave 2:** UI infrastructure — typography constants, UI config registry, StatCard, SettingsRow, share utility, deps install (plan 03-02)
- **Wave 3:** Screens — config-driven StatsScreen (loading/empty/error states, chart, share FAB, pull-to-refresh, entrance animation) + SettingsScreen (3 config-driven sections) (plan 03-03)
- **Known gotcha:** `react-native-chart-kit` chartConfig uses `decimalPlaces` not `decimalCount` — plan had wrong property name, caught at compile time

### Phase 4: Monetization (Executed 2026-07-06)
- **Goal:** Interstitial ads, rewarded video, Pro IAP $1.99, restore
- **Reqs:** AD-01 → AD-07 (7 reqs)
- **Status:** Complete (3 plans, 2 waves, 12 implementation commits)
- **Dependency:** Phase 3
- **Key decisions:** D-87–D-112
  - Flappy Bird-style interstitial timing (transition from ResultModal to next screen, not during play)
  - Frequency caps: Daily=every game, Endless/Random=every 2nd
  - Rewarded ad: button in ResultModal (loss only), extra guess per ad
  - Extra guesses: Free=2, Pro=3 (Pro can still watch ads)
  - Pro IAP: `com.vorithstudio.wordguess.pro`, $1.99, non-consumable
  - Restore: Account section, hidden when Pro active, color-coded toast
  - Ad manager: Zustand store (singleton, ref-counted lifecycle)
  - Ad IDs: Firebase Remote Config (fetch on launch, fallback to test IDs)
  - Settings config extension: new `restore` + `purchase` row types, Account section expanded
  - UI design contract approved: 5/6 dimensions PASS, 1 FLAG (toast contrast deferred to Phase 6)
- **Wave 1:** Foundation — install 4 deps (verified: react-native-google-mobile-ads@16.4.0, react-native-iap@15.3.6, @react-native-firebase/remote-config@25.1.0, @react-native-firebase/app@25.x), split maxExtraGuesses, create adStore (Zustand), remoteConfig service, app init wiring (plan 04-01)
- **Wave 2 (parallel):** Settings — extend UI config registry with restore/purchase types, implement restore + Pro purchase flows with toast feedback (04-02). Game — interstitial + rewarded ad in ResultModal, frequency capping, extra guess mechanics in gameStore (04-03)
- **Plan checker caught:** AD-03 purchase flow missing from initial plans — added purchase row type + requestPurchase() before execution
- **New deps:** react-native-google-mobile-ads, react-native-iap, @react-native-firebase/remote-config, @react-native-firebase/app
- **Config plugins added:** react-native-google-mobile-ads (with androidAppId placeholder), react-native-iap, expo-build-properties (kotlinVersion 2.2.0)
- **See:** [monetization](monetization.md) for full architecture

### Phase 5: Cloud & Social (Complete, Verified)
- **Goal:** Google Sign-In, cloud sync, 3 leaderboards
- **Reqs:** CLOUD-01 → CLOUD-08 (8 reqs)
- **Critical:** SHA-1 triple registration, Web client ID, event-based sync, offline sync queue with retry
- **Dependency:** Phase 4 (Monetization)
- **Status:** Executed (3 plans, 3 waves) + Verified (28/28 must-haves passed, 3 human-verify items deferred to device testing)
- **Build fix needed:** Kotlin 2.3.0 pin for play-services-ads compat — see [tech-stack](tech-stack.md) and [android-build-setup](android-build-setup.md)
- **Wave 1:** Install cloud deps, create firestoreService (Firestore CRUD), create syncQueue (offline write-ahead log with idempotent events, exponential backoff)
- **Wave 2:** Create authService (GoogleSignIn + Firebase Auth wrapper), extend authStore, update SettingsScreen sign-in UI, wire silent sign-in + periodic drain in App.tsx
- **Wave 3:** Create leaderboardService, rebuild LeaderboardScreen (3-tab segment control, 5 states), wire game completion→score submission + stats sync
- **Verification override:** @react-native-firebase/firestore correctly omitted from app.json plugins (no app.plugin.js — Firestore auto-links via @react-native-firebase/app)

### Phase 6: Pre-Launch & Polish
- **Goal:** Accessibility, Play Store submission, performance, production build
- **Reqs:** LAUNCH-01 → LAUNCH-09 (9 reqs)
- **Dependency:** All previous phases

## Dev workflow
1. UI prototyping: `npx expo start` (Expo Go for non-native features)
2. Native modules: `npx expo run:android` (dev client)
3. Production: `eas build --platform android --profile production`
4. Submit: `eas submit --platform android`
