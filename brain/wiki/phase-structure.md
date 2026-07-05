# Phase Structure
updated: 2026-07-05 (Phase 3 UI-SPEC)
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

### Phase 3: Stats & Settings (UI-SPEC Approved 2026-07-05)
- **Goal:** Persistent stats, settings screen, share results
- **Reqs:** STAT-01 → STAT-05 (5 reqs — smallest phase)
- **Dependency:** Phase 2 (need game completions to record stats)
- **Status:** UI-SPEC approved — ready for planning
- **Key decisions:** D-67–D-81 + UI design contract (03-UI-SPEC.md)
  - Stats screen: scrolling card sections driven by UI config registry
  - Guess distribution: react-native-chart-kit bar chart
  - Settings: config-driven toggle rows; account section shows placeholder "Sign in — coming in Phase 5"
  - Share: manual share button in Stats screen, copies emoji grid + mode + attempts + date to clipboard
  - Streak: per-mode tracking (Daily separate from others); Endless streak separate; streak resets on `lost` state
  - UI Configuration Registry: `src/config/ui.ts` — single source of truth for composable UI (stats cards + settings rows); screens are dumb iterators
- **Architecture additions:** `src/config/` layer, `src/utils/share.ts`, components `StatCard` + `SettingsRow`
- **New deps:** react-native-chart-kit, react-native-svg, expo-clipboard
- **Design tokens:** Spacing scale (4-48px multiples of 4), typography scale (5 sizes), color role assignments (accent reserved for toggles + share CTA). See [design-tokens](design-tokens.md).

### Phase 4: Monetization
- **Goal:** Interstitial ads, rewarded video, Pro IAP $1.99, restore
- **Reqs:** AD-01 → AD-07 (7 reqs)
- **Critical:** Play Store compliance (verify current policy before starting)
- **Dependency:** Phase 2 (ads shown after game completion)

### Phase 5: Cloud & Social
- **Goal:** Google Sign-In, cloud sync, 3 leaderboards
- **Reqs:** CLOUD-01 → CLOUD-08 (8 reqs)
- **Critical:** SHA-1 triple registration, Web client ID, event-based sync
- **Dependency:** Phase 3 (stats exist to sync)

### Phase 6: Pre-Launch & Polish
- **Goal:** Accessibility, Play Store submission, performance, production build
- **Reqs:** LAUNCH-01 → LAUNCH-09 (9 reqs)
- **Dependency:** All previous phases

## Dev workflow
1. UI prototyping: `npx expo start` (Expo Go for non-native features)
2. Native modules: `npx expo run:android` (dev client)
3. Production: `eas build --platform android --profile production`
4. Submit: `eas submit --platform android`
