# architecture
updated: 2026-07-05
tags: [architecture, patterns, project-structure]
related: [tech-stack, storage-strategy, daily-seed, dictionary-preprocessing, game-modes, animation-system, phase-structure]

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
├── layout.ts       # Tile/key dimensions (tileSize, keyboardKeyHeight, gaps)
├── config.ts       # Game config (base attempts = letterCount+1, word length range 5-10)
├── animations.ts   # Animation timing (TILE_FLIP_DURATION=200, TILE_STAGGER_DELAY=50, bounce params, confetti count)
└── index.ts        # Barrel re-export
```

Animation constants tunable after Phase 2 per D-31 — change values in one file, all components pick up new timing.

## Project structure
```
src/
├── app/           # App.tsx (loading state → NavigationContainer), providers, Navigation.tsx
├── screens/       # Home, Game, Loading, Stats, Settings, Leaderboard
├── components/
│   ├── game/      # Tile, GuessRow, GameBoard, Keyboard, ResultModal, LengthPickerModal, Confetti
│   ├── ui/        # Button, NavMenuButton, etc.
├── stores/        # gameStore, statsStore, authStore, settingsStore, dictionaryStore
├── services/      # storage.ts, wordLogic.ts, dailySeed.ts, sound.ts (stub)
├── constants/     # colors.ts, layout.ts, config.ts, animations.ts
└── assets/        # dictionary/ (generated .json), sounds/, images/
```

**Conventions:**
- Type-based layout (not feature-based)
- One file per component
- Barrel files (`index.ts`) re-export from each directory
- Path alias `@/` maps to `src/`

## Key patterns
1. **Pure game logic separation** — evaluateGuess(), validateHardMode() as pure functions in services/wordLogic.ts. No side effects, trivially testable.
2. **Zustand explicit actions** — stores expose action methods, not direct mutation. Actions enforce invariants ("can't submit when game over").
3. **Service singletons** — every SDK (AdMob, IAP, Firebase) wrapped behind a service interface. Swap providers by changing one file.
4. **Component composition** — screens compose small single-responsibility components. GameScreen → GameBoard + Keyboard.
5. **Offline-first optimistic writes** — local write immediate, cloud sync async. Write-ahead log for game results.
6. **Barrel files** — each directory has `index.ts` re-exporting all exports. Import via `@/components`, `@/types`, etc.
7. **Static require() for bundled assets** — Metro cannot resolve dynamic require() or @/ alias. Always use static require() with relative paths.
8. **Separate component subtrees** — Keyboard isolated as distinct subtree (React.memo) to prevent re-render interference with tile reveal animations.

## Screens
| Screen | Route | Composed of |
|--------|-------|-------------|
| Home | / | Mode buttons (Free/Random/Daily/Endless), Hard Mode toggle, LengthPickerModal, nav to Stats/Settings/Leaderboard |
| Game | /game | GameBoard, Keyboard, AttemptCounter, ResultModal (overlay), Confetti |
| Loading | (pre-app) | Branded splash with ActivityIndicator, shown while dictionary loads |
| Stats | /stats | StatsCard, GuessDistribution |
| Settings | /settings | ToggleRow, AccountSection, RestoreButton |
| Leaderboard | /leaderboard | LeaderboardRow[], AuthPrompt |
| Result | (unused) | Replaced by ResultModal overlay — screen file exists but never navigated to |

## Game components (Phase 2)
| Component | Role | Communication |
|-----------|------|---------------|
| GameBoard | Grid of GuessRow components | Reads guesses, feedback, currentGuess, error from gameStore |
| GuessRow | Single row of Tiles | Receives letter array, feedback array; shake animation on error |
| Tile | Single letter tile with flip animation | Reanimated worklet: flipProgress (0→1), scale (1→1.15→1), interpolateColor, rotateX |
| Keyboard | On-screen QWERTY with per-key color | Calls addLetter/removeLetter/submitGuess; React.memo; input queue during isRevealing; haptics on press |
| ResultModal | Post-game overlay | Shows win/loss, target word, definition (defs-{N}.json), emoji grid; Endless "Play Next"; daily completion tracking |
| LengthPickerModal | Length selection grid (5-10) | 2×3 grid, daily mode shows completed lengths disabled with checkmark |
| Confetti | Win-state particle burst | 40 particles, staggered launch, gravity fall, wide spread, 7 colors |

## Services (Phase 2 additions)
| Service | File | Responsibility |
|---------|------|----------------|
| WordLogic | services/wordLogic.ts | evaluateGuess (pure), validateHardMode (pure), isValidGuess |
| DailySeed | services/dailySeed.ts | getDailyWord(date, length, wordList), getTodaysDailyWords() |
| Sound | services/sound.ts | No-op stub with expected API (playKeyPress, playReveal, playWin, playLoss). Sound files added later by developer |

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
  → Endless: "Play Next" → next word (same length)
  → Other: "Back to Menu" → HomeScreen
```

## Animation architecture
- All tile animations on UI thread via Reanimated worklets
- Keyboard color update fires AFTER last tile reveal completes (not during)
- Keyboard input blocked during animation sequence (queue preferred)
- Confetti: Reanimated-based particle system (~30 particles, gravity + fade + scale)
- typegpu-confetti evaluated (v0.3.0) but deferred — WebGPU on Android too experimental
