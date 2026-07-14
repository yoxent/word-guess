# word-guess — CODEBASE.md
updated: 2026-07-06
tags: [codebase, structure, map]

## Overview
Expo SDK 57 React Native word-guessing game for Android. TypeScript (strict), Zustand state, React Navigation 7.x native-stack, Reanimated 4.x animations. 6-phase GSD project, currently at Phase 4 (Monetization) planning.

---

## Root files

| File | Purpose |
|------|---------|
| `App.tsx` | Expo entry; re-exports from `src/app/App.tsx` |
| `app.json` | Expo config — name, slug, icons, splash, android/ios packages, plugins |
| `package.json` | Dependencies, scripts (start, android, ts:check, preprocess-dictionary) |
| `tsconfig.json` | TypeScript strict mode, `baseUrl: "."`, `ignoreDeprecations: "6.0"` |
| `babel.config.js` | Babel with `expo`, `react-native-reanimated/plugin` |
| `metro.config.js` | Metro bundler config |
| `eas.json` | EAS Build profiles (dev/preview/production) |
| `.gitignore` | Ignores generated native dirs, build outputs, secrets, temp files |

### Data files (git-ignored sources)
| File | Purpose |
|------|---------|
| `dictionary.full.json` | Full guess validation list (~184K words) |
| `dictionary.full.enriched.json` | Curated enriched target words + definitions (~12K words) |
| `profanity-blocklist.txt` | Profanity filter (2,617 entries) |
| `manual-blocklist.txt` | Manual exclusion list — proper nouns, names, brands (976 entries) |

---

## `scripts/` — Build-time tooling

| File | Purpose |
|------|---------|
| `scripts/preprocess-dictionary.mjs` | Postinstall script: reads source dicts + blocklists → 18 output JSONs per length 5-10 |

---

## `assets/` — Static assets

| Path | Purpose |
|------|---------|
| `assets/icon.png` | App icon |
| `assets/splash.png` | Splash screen image |
| `assets/adaptive-icon.png` | Android adaptive icon foreground |
| `assets/android-icon-*.png` | Android icon variants (background, foreground, monochrome) |
| `assets/favicon.png` | Web favicon |
| `assets/dictionary/` | Generated word lists (18 files, git-ignored) — `{N}.json`, `valid-{N}.json`, `defs-{N}.json` for lengths 5-10 |

---

## `src/app/` — App entry and navigation

| File | Purpose |
|------|---------|
| `src/app/App.tsx` | Root component — LoadingScreen → NavigationContainer, persist init |
| `src/app/Navigation.tsx` | React Navigation 7.x native-stack, `RootStackParamList` typed stack |

---

## `src/screens/` — Route-level screens

| File | Route | Purpose |
|------|-------|---------|
| `src/screens/HomeScreen.tsx` | Home | Mode selection (Daily/Endless/Random), Hard Mode toggle, LengthPickerModal, top-right icon bar |
| `src/screens/GameScreen.tsx` | Game | GameBoard + Keyboard + ResultModal overlay + Confetti, animation timer, AppState persistence listener |
| `src/screens/LoadingScreen.tsx` | (pre-app) | Branded splash with ActivityIndicator during dictionary load |
| `src/screens/StatsScreen.tsx` | Stats | Config-driven stat cards (overview, by-length table, guess distribution chart), share FAB, pull-to-refresh, entrance animation |
| `src/screens/SettingsScreen.tsx` | Settings | Config-driven toggle rows, Account section (sign-in placeholder, pro status, restore purchases) |
| `src/screens/LeaderboardScreen.tsx` | Leaderboard | Ranking lists (Phase 5) |
| `src/screens/ResultScreen.tsx` | Result | Dead route — replaced by ResultModal overlay in Phase 2, file retained but unused |

| File | Purpose |
|------|---------|
| `src/screens/index.ts` | Barrel re-exports |

---

## `src/components/game/` — Game-specific components

| File | Purpose |
|------|---------|
| `src/components/game/Tile.tsx` | Single letter tile with Reanimated flip animation (rotateX, color interpolation, bounce on correct) |
| `src/components/game/GuessRow.tsx` | Row of Tiles; shake animation on error |
| `src/components/game/GameBoard.tsx` | Grid container; computes dynamic `tileSize` from screen width + word length |
| `src/components/game/Keyboard.tsx` | QWERTY on-screen keyboard with per-key coloring; React.memo isolated subtree |
| `src/components/game/ResultModal.tsx` | Post-game overlay — win/loss, definition, emoji grid, "Play Next" (Endless), share trigger |
| `src/components/game/LengthPickerModal.tsx` | 2×3 grid for length selection (5-10); daily mode shows completed lengths disabled |
| `src/components/game/Confetti.tsx` | Reanimated particle burst (40 particles, 7 colors, gravity + fade + scale) |

| File | Purpose |
|------|---------|
| `src/components/game/index.ts` | Barrel re-exports |

---

## `src/components/ui/` — Reusable shared UI

| File | Purpose |
|------|---------|
| `src/components/ui/Button.tsx` | Base button component |
| `src/components/ui/StatCard.tsx` | Card container for stats sections (surface bg, shadow, title) |
| `src/components/ui/SettingsRow.tsx` | Generic row dispatching on type: toggle, placeholder, info, restore |

| File | Purpose |
|------|---------|
| `src/components/ui/index.ts` | Barrel re-exports |

---

## `src/config/` — UI Configuration Registry

| File | Purpose |
|------|---------|
| `src/config/ui.ts` | Single source of truth — `statsConfig` (card order) + `settingsConfig` (section/row definitions + types). Screens iterate config, no hardcoded layout. |

---

## `src/constants/` — Design tokens and constants

| File | Purpose |
|------|---------|
| `src/constants/colors.ts` | Tile/key colors (correct=#6aaa64, present=#c9b458, absent=#787c7e, etc.) |
| `src/constants/layout.ts` | Base tile/key layout constants (tileGap, keyboardKeyHeight, etc.) |
| `src/constants/config.ts` | Game configuration (base attempts = letterCount+1, word length range 5-10) |
| `src/constants/animations.ts` | Animation timing (TILE_FLIP_DURATION=200ms, stagger=50ms, confetti count, bounce params) |
| `src/constants/typography.ts` | 5-size type scale (32px stat → 12px label) |

| File | Purpose |
|------|---------|
| `src/constants/index.ts` | Barrel re-exports |

---

## `src/stores/` — Zustand state stores

| Store | File | Persistence | Purpose |
|-------|------|-------------|---------|
| gameStore | `src/stores/gameStore.ts` | Session (MMKV save/restore) | Game state — guesses, feedback, currentGuess, keyColors, isRevealing, pendingInputs, session management |
| settingsStore | `src/stores/settingsStore.ts` | MMKV (persist middleware) | hardMode, sound, haptic, isPro toggles |
| statsStore | `src/stores/statsStore.ts` | SQLite (via storage service) | Aggregated stats — total games, win%, streaks, guess distribution, games by length |
| authStore | `src/stores/authStore.ts` | AsyncStorage (persist) | Firebase auth session (Play Games) |
| dictionaryStore | `src/stores/dictionaryStore.ts` | In-memory (static require) | Word list loading, validation, random/daily word selection |

| File | Purpose |
|------|---------|
| `src/stores/index.ts` | Barrel re-exports |

---

## `src/services/` — Pure logic and SDK wrappers

| File | Purpose |
|------|---------|
| `src/services/wordLogic.ts` | Pure functions — `evaluateGuess()`, `validateHardMode()`, `isValidGuess()` |
| `src/services/dailySeed.ts` | DJB2 hash — deterministic daily word from date + length + private seed |
| `src/services/storage.ts` | Typed accessors — MMKV (settings, active game, daily tracking, endless streak) + SQLite (game history) + AsyncStorage (auth) |
| `src/services/sound.ts` | No-op stub with expected API — playKeyPress, playReveal, playWin, playLoss |

| File | Purpose |
|------|---------|
| `src/services/index.ts` | Barrel re-exports |

---

## `src/types/` — TypeScript type definitions

| File | Contents |
|------|----------|
| `src/types/game.ts` | GameMode, GuessFeedback, GameSession, GameResult, PerGuessFeedback |
| `src/types/settings.ts` | AppSettings (hardMode, sound, haptic, isPro) |
| `src/types/stats.ts` | PlayerStats, GuessDistribution, GamesByLength |
| `src/types/auth.ts` | AuthState, UserProfile |
| `src/types/daily.ts` | DailyWords (date + per-length word map) |
| `src/types/leaderboard.ts` | LeaderboardEntry, LeaderboardType |
| `src/types/navigation.ts` | RootStackParamList, ScreenProps generic |

| File | Purpose |
|------|---------|
| `src/types/index.ts` | Barrel re-exports |

---

## `src/utils/` — Utility functions

| File | Purpose |
|------|---------|
| `src/utils/share.ts` | `generateShareText(gameResult)` — Wordle-style emoji grid for clipboard |

---

## `brain/` — Project Wiki (persistent context)

| File | Purpose |
|------|---------|
| `brain/schema.md` | Page format spec (markdown with updated/tags/related fields) |
| `brain/wiki/index.md` | Master index of all 19 wiki pages |
| `brain/wiki/project-overview.md` | What word-guess is, core value, platform, monetization |
| `brain/wiki/tech-stack.md` | Full technology stack with versions, rationale, known issues |
| `brain/wiki/architecture.md` | Layer stack, project structure, key patterns (13 documented) |
| `brain/wiki/storage-strategy.md` | MMKV/SQLite/AsyncStorage three-tier, 5 stores persistence |
| `brain/wiki/dictionary-preprocessing.md` | Build-time script, 18 output files, Metro constraints |
| `brain/wiki/navigation-setup.md` | React Navigation 7.x, 6 screens, NavMenuButton pattern |
| `brain/wiki/planning-patterns.md` | Plan structures, D-XX traceability, checker findings |
| `brain/wiki/daily-seed.md` | DJB2 hash, 6 daily puzzles, UTC handling, seed security |
| `brain/wiki/game-modes.md` | Random/Daily/Endless, Hard Mode rules, tile feedback |
| `brain/wiki/key-risks.md` | Critical/moderate risks with mitigations and fixes |
| `brain/wiki/phase-structure.md` | 6-phase roadmap, dependencies, per-phase details |
| `brain/wiki/google-signin.md` | Play Games → Firebase Auth setup |
| `brain/wiki/animation-system.md` | Reanimated tile flips, timing, input queue |
| `brain/wiki/git-conventions.md` | Tracked/ignored files, brain vs CLAUDE.md |
| `brain/wiki/dev-workflow.md` | Android Studio + Metro coexistence, prebuild caveats |
| `brain/wiki/android-build-setup.md` | AGP pinning, nitro-modules, local.properties |
| `brain/wiki/ui-config-registry.md` | Data-driven composable UI via config arrays |
| `brain/wiki/design-tokens.md` | Spacing scale, typography, color roles, WCAG debt |
| `brain/wiki/monetization.md` | Ad manager, interstitial timing, rewarded ads, Pro IAP |

---

## `.planning/` — GSD planning artifacts (git-tracked)

| Path | Purpose |
|------|---------|
| `.planning/ROADMAP.md` | 6-phase roadmap with dependency graph |
| `.planning/STATE.md` | Current project state, active phase, last action |
| `.planning/phases/01-foundation/` | Phase 1 plans, execution docs, summaries |
| `.planning/phases/02-core-gameplay/` | Phase 2 plans, decisions, evaluations |
| `.planning/phases/03-stats-settings/` | Phase 3 plans (01-03), execution docs, UI-SPEC |
| `.planning/phases/04-monetization/` | Phase 4 context documents (planning stage) |
| `.planning/phases/05-cloud-social/` | Phase 5 (future) |
| `.planning/phases/06-pre-launch/` | Phase 6 (future) |

---

## File counts

| Layer | Files |
|-------|-------|
| Root config | 9 (App.tsx, package.json, tsconfig, babel, metro, app, eas, .gitignore, README) |
| App + Navigation | 2 |
| Screens | 8 (7 screens + 1 barrel) |
| Game components | 8 (7 components + 1 barrel) |
| UI components | 4 (3 components + 1 barrel) |
| Config | 1 (ui.ts) |
| Constants | 6 (5 constants + 1 barrel) |
| Stores | 6 (5 stores + 1 barrel) |
| Services | 5 (4 services + 1 barrel) |
| Types | 8 (7 types + 1 barrel) |
| Utils | 1 (share.ts) |
| Assets | 10 (icons, splash, 18 generated dict files) |
| Brain wiki | 21 (schema + 19 pages + index) |
| Scripts | 1 |
| **Total** | **~90 tracked files** (+ 18 generated dictionary files) |
