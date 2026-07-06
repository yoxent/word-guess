# architecture
updated: 2026-07-06 (Phase 4 additions — adStore, remoteConfig, interstitial/rewarded ad flow)
tags: [architecture, patterns, project-structure]
related: [tech-stack, storage-strategy, daily-seed, dictionary-preprocessing, game-modes, animation-system, phase-structure, ui-config-registry, design-tokens]

## Layer stack
```
App (LoadingScreen → NavigationContainer)
  → Navigation (React Navigation 7.x stack)
    → Screens (route-level)
      → Feature Components (GameBoard, Keyboard, ResultModal, LengthPickerModal, Confetti)
        → State Layer (Zustand, 5 stores)
          → Service Layer (pure logic + SDK wrappers)
            → Persistence (MMKV / SQLite / AsyncStorage / Firestore)
```

## Constants layer
```
src/constants/
├── colors.ts       # Tile/key colors (correct=#6aaa64, present=#c9b458, absent=#787c7e, etc.)
├── layout.ts       # Base tile/key constants (tileGap, tileBorderRadius, keyboardKeyHeight, gaps). Actual tileSize computed dynamically per-word-length
├── config.ts       # Game config (base attempts = letterCount+1, word length range 5-10)
├── animations.ts   # Animation timing (TILE_FLIP_DURATION=200, TILE_STAGGER_DELAY=50, bounce params, confetti count)
└── index.ts        # Barrel re-export
```

Animation constants tunable after Phase 2 per D-31 — change values in one file, all components pick up new timing.

## Project structure
```
root/App.tsx       # Re-exports from src/app/App.tsx — required by expo/AppEntry.js at project root
src/
├── app/           # App.tsx (loading state → NavigationContainer), providers, Navigation.tsx
├── screens/       # Home, Game, Loading, Stats, Settings, Leaderboard
├── components/
│   ├── game/      # Tile, GuessRow, GameBoard, Keyboard, ResultModal, LengthPickerModal, Confetti
│   ├── ui/        # Button, NavMenuButton, SettingRow, etc.
├── stores/        # gameStore, statsStore, authStore, settingsStore, dictionaryStore, adStore
├── services/      # storage.ts, wordLogic.ts, dailySeed.ts, sound.ts (stub), remoteConfig.ts
├── config/        # ui.ts — UI Configuration Registry (D-77, Phase 3)
├── constants/     # colors.ts, layout.ts, config.ts, animations.ts
├── types/         # game.ts, stats.ts, settings.ts, auth.ts, daily.ts, navigation.ts, monetization.ts
└── assets/        # dictionary/ (generated .json), sounds/, images/
```

**Phase 3 addition:** `src/config/` layer for composable UI definitions. Screens read config arrays and render accordingly — no hardcoded layout logic. See [ui-config-registry](ui-config-registry.md).

**Phase 4 addition:** `adStore` (Zustand) singleton wrapping react-native-google-mobile-ads for interstitial/rewarded ad lifecycle. `remoteConfig` service for Firebase Remote Config (ad unit IDs). `monetization.ts` types for AdState, RestoreResult. See [monetization](monetization.md).

**Conventions:**
- Type-based layout (not feature-based)
- One file per component
- Barrel files (`index.ts`) re-export from each directory
- ~~Path alias `@/` maps to `src/`~~ (removed 2026-07-05 — Metro can't resolve TypeScript aliases; use relative imports)

## Key patterns
1. **Pure game logic separation** — evaluateGuess(), validateHardMode() as pure functions in services/wordLogic.ts. No side effects, trivially testable.
2. **Zustand explicit actions** — stores expose action methods, not direct mutation. Actions enforce invariants ("can't submit when game over").
3. **Service singletons** — every SDK (AdMob, IAP, Firebase) wrapped behind a service interface. Swap providers by changing one file.
4. **Component composition** — screens compose small single-responsibility components. GameScreen → GameBoard + Keyboard.
5. **Offline-first optimistic writes** — local write immediate, cloud sync async. Write-ahead log for game results.
6. **Barrel files** — each directory has `index.ts` re-exporting all exports. Import via relative paths (no `@/` alias — Metro can't resolve TypeScript path aliases).
7. **Static require() for bundled assets** — Metro cannot resolve dynamic require(). Always use static require() with relative paths.
8. **Separate component subtrees** — Keyboard isolated as distinct subtree (React.memo) to prevent re-render interference with tile reveal animations.
9. **Keyboard flex layout** — Keys use `flex: 1` distribution (not minWidth/justifyContent:center). Row fills width evenly, action keys get `flex: 1.5`. Row 2 (9 keys) uses a `flex: 0.5` spacer for QWERTY centering. `screenPadding` reduced to 6px for more game space.
10. **Tile text visibility during flip** — Opacity interpolation `[0, 0.5, 1] → [1, 0, 1]` — letter visible before flip (progress 0, active typing), hidden mid-flip (progress 0.5, rotation orthogonal), visible after (progress 1, revealed). `isEmpty` only checks letter value, not feedback status — active row tiles show letters even with `feedback='empty'`.
11. **UI Configuration Registry** — Screens driven by data config arrays from `src/config/ui.ts`, not hardcoded JSX. Stats cards and settings rows defined as typed config objects. Screens iterate config → render. Reorder/add/remove by editing config array, not component tree. See [ui-config-registry](ui-config-registry.md).
12. **Dynamic tile sizing** — `tileSize` not a fixed constant. Computed in GameBoard from `screenWidth`, `wordLength`, `tileGap`, and container padding. Passed as prop through `GameBoard → GuessRow → Tile`. Font scales proportionally (`tileSize × 0.48`). Caps at 56px max, floors at 32px min. Fits all word lengths 5-10 on any screen width.
13. **Safe area insets** — Home and Game screens use `useSafeAreaInsets()` from `react-native-safe-area-context`. Top offset for status bar, bottom for gesture bar. Container applies `paddingHorizontal: 20` centrally (GameScreen) or `padding: 24` (HomeScreen). Headers use negative margins to span full-width behind the padding.

## Screens
| Screen | Route | Composed of |
|--------|-------|-------------|
| Home | / | Mode buttons (Daily/Endless/Random), Hard Mode toggle, LengthPickerModal, nav to Stats/Leaderboard/Settings via top-right icon bar (medal, leaderboard, settings) |
| Game | /game | GameBoard, Keyboard, AttemptCounter, ResultModal (overlay), Confetti |
| Loading | (pre-app) | Branded splash with ActivityIndicator, shown while dictionary loads |
| Stats | /stats | StatsCard, GuessDistribution |
| Settings | /settings | ToggleRow, AccountSection, RestoreButton |
| Leaderboard | /leaderboard | LeaderboardRow[], AuthPrompt |
| Result | (unused) | Replaced by ResultModal overlay — screen file exists but never navigated to |

## Game components (Phase 2)
| Component | Role | Communication |
|-----------|------|---------------|
| GameBoard | Grid of GuessRow components | Reads guesses, feedback, currentGuess, error from gameStore. Computes dynamic `tileSize` from screen width + wordLength + tileGap. Passes to GuessRow. |
| GuessRow | Single row of Tiles | Receives letter array, feedback array, `tileSize` prop. Shake animation on error. |
| Tile | Single letter tile with flip animation | Reanimated worklet: flipProgress (0→1), scale (1→1.15→1), interpolateColor, rotateX. Uses `tileSize` prop for width/height + font size. |
| Keyboard | On-screen QWERTY with per-key color | Calls addLetter/removeLetter/submitGuess; React.memo; input queue during isRevealing; haptics on press. Error toast overlaid above by GameScreen (absolutely positioned, doesn't affect layout). |
| ResultModal | Post-game overlay | Shows win/loss, target word, definition, emoji grid; Endless "Play Next"; daily completion tracking. Phase 4: rewarded ad button on loss state (addExtraGuess); interstitial before playNext/backToMenu navigation |
| LengthPickerModal | Length selection grid (5-10) | 2×3 grid, daily mode shows completed lengths disabled with checkmark |
| Confetti | Win-state particle burst | 40 particles, staggered launch, gravity fall, wide spread, 7 colors |

## Services (Phase 2 additions)
| Service | File | Responsibility |
|---------|------|----------------|
| WordLogic | services/wordLogic.ts | evaluateGuess (pure), validateHardMode (pure), isValidGuess |
| DailySeed | services/dailySeed.ts | getDailyWord(date, length, wordList), getTodaysDailyWords() |
| Sound | services/sound.ts | No-op stub with expected API (playKeyPress, playReveal, playWin, playLoss). Sound files added later by developer |
| RemoteConfig | services/remoteConfig.ts | Firebase Remote Config — fetchAdUnitIds (fire-and-forget on launch), typed accessors for ad unit IDs, TestIds fallback in __DEV__ |

## Two-tier dictionary (Phase 2 decision)
- **Target word selection:** enriched dictionary (curated, clean words)
- **Guess validation:** full dictionary (broader, accepts more words)
- Definitions stored in separate `defs-{N}.json` maps
- Endless mode: exclude today's daily words from target pool

## Data flow (game loop)
```
Player picks mode + length → LengthPickerModal
  → GameScreen mounts → gameStore.startGame(mode, word, length, hardMode)
    → GameBoard renders empty grid
    → Keyboard renders uncolored keys

Player types → handleKeyPress (Keyboard)
  → Letter: gameStore.addLetter()
  → BACKSPACE: gameStore.removeLetter()
  → ENTER: wordLogic.isValidGuess()? → gameStore.submitGuess()

store.submitGuess(guess):
  → wordLogic.evaluateGuess(guess, target) → feedback[][] + keyColors
  → update guesses[], feedback[][], keyColors
  → Tile reveal animation (Reanimated, UI thread, 200ms flip, 50ms stagger)
  → (after last tile) → Keyboard color update
  → Win/loss check
  → If game over: ResultModal overlay with definition
  → Loss state: rewarded ad button (addExtraGuess → status back to 'playing', maxAttempts++)
  → Before navigation: interstitial ad (gated by isPro + frequency cap)
  → Endless: "Play Next" → next word (same length)
  → Other: "Back to Menu" → HomeScreen
```

## Animation architecture
- All tile animations on UI thread via Reanimated worklets
- Keyboard color update fires AFTER last tile reveal completes (not during)
- Keyboard input blocked during animation sequence (queue preferred)
- Confetti: Reanimated-based particle system (~30 particles, gravity + fade + scale)
- typegpu-confetti evaluated (v0.3.0) but deferred — WebGPU on Android too experimental
