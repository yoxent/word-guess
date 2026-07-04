# Architecture
updated: 2026-07-04
tags: [architecture, patterns, project-structure]
related: [tech-stack, storage-strategy, daily-seed]

## Layer stack
```
Navigation (React Navigation 7.x stack)
  → Screens (6 route-level components)
    → Feature Components (GameBoard, Tile, Keyboard, etc.)
      → State Layer (Zustand, 4 stores)
        → Service Layer (pure logic + SDK wrappers)
          → Persistence (MMKV / SQLite / AsyncStorage / Firestore)
```

## Project structure
```
src/
├── app/           # App.tsx, providers, Navigation.tsx
├── screens/       # Home, Game, Result, Stats, Settings, Leaderboard
├── components/    # Tile, TileGrid, Keyboard, GameBoard, NavMenuButton, etc.
├── stores/        # gameStore, statsStore, authStore, settingsStore, dictionaryStore
├── types/         # game.ts, stats.ts, settings.ts, auth.ts, daily.ts, leaderboard.ts
├── utils/         # wordUtils, seedUtils, colors
├── hooks/         # useGame, useKeyboard
├── services/      # storage.ts — MMKV/SQLite/AsyncStorage wrappers
├── constants/     # colors.ts, layout.ts, config.ts
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

## Screens
| Screen | Route | Composed of |
|--------|-------|-------------|
| Home | / | ModeSelector, DailyCard, StatsSummary |
| Game | /game | GameBoard, Keyboard, AttemptCounter |
| Result | /result | TileGrid, StatsUpdate, ShareButton, AdBanner |
| Stats | /stats | StatsCard, GuessDistribution |
| Settings | /settings | ToggleRow, AccountSection, RestoreButton |
| Leaderboard | /leaderboard | LeaderboardRow[], AuthPrompt |

## Data flow (game loop)
```
Player types → handleKeyPress (Keyboard)
  → Letter added to currentGuess (local state)
  → ENTER → store.submitGuess(guess)
    → wordLogic.evaluateGuess(guess, target)
    → store updates guesses[], feedback[][], keyColors
    → Tile reveal animation (Reanimated, UI thread, 300ms flip)
    → Keyboard color update (after animation completes)
    → Win/loss check → Result screen → Interstitial ad (free tier)
```
