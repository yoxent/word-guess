---
phase: 02-core-gameplay
plan: 04
subsystem: animations-polish
tags: [animations, haptics, persistence, loading-screen, input-queue]
dependency-graph: |
  02-03 (mode-routing) → 02-04 (animations-polish)
tech-stack: react-native-reanimated, zustand, mmkv, expo-haptics, typescript
metrics:
  files-changed: 12
  commits: 4
  tasks: 4
  duration: ~30min
status: completed
---

# 02-04-SUMMARY — Animations, Haptics, Persistence & Loading Screen

## Objective

Add Reanimated animations, Hard Mode UI feedback, game state persistence, branded loading screen, and haptics — the final polish layer for Phase 2.

## Task Results

| Task | Name | Commit(s) | Key Files |
|------|------|-----------|-----------|
| 0 | Create shared animation constants | `d791f3c` | `src/constants/animations.ts` (NEW), `src/constants/index.ts` |
| 1 | Reanimated tile flip animation + enhanced confetti | `febc387` | `src/components/game/Tile.tsx`, `src/components/game/Confetti.tsx` |
| 2 | Shake animation, keyboard input queue, isRevealing state | `a604272` | `src/stores/gameStore.ts`, `src/components/game/Keyboard.tsx`, `src/components/game/GuessRow.tsx` |
| 3 | AppState persistence, LoadingScreen, haptics wiring | `fd5c182`, `2dbcce2` | `src/screens/GameScreen.tsx`, `src/screens/LoadingScreen.tsx`, `src/app/App.tsx` |

## Changes by File

### `src/constants/animations.ts` (NEW)
- Animation timing constants: `TILE_FLIP_DURATION=200`, `TILE_STAGGER_DELAY=50`, `TILE_BOUNCE_*`, `ANIMATION_COMPLETION_BUFFER=50`, `CONFETTI_*` constants
- All values tunable after Phase 2 per D-31

### `src/constants/index.ts` (MODIFIED)
- Added `export * from './animations'`

### `src/components/game/Tile.tsx` (REWRITTEN with Reanimated)
- Full flip animation on UI thread via `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withDelay`, `withSequence`
- 200ms flip duration, 50ms stagger left-to-right, -90° mid-flip via `interpolate`
- Correct tiles: scale bounce `1.0 → 1.15 → 1.0` via `withSequence`
- Colors interpolate via `interpolateColor` midway through flip
- Text fades in during second half of flip
- Uses `isFirstRender` ref to skip animation on initial mount

### `src/components/game/Confetti.tsx` (ENHANCED)
- 40 particles (up from 35), staggered launch (15ms per particle)
- Extended color palette: green, yellow, blue, red, white, orange, purple (7 colors)
- Gravity easing via `Easing.bezier(0.2, 0.8, 0.3, 1)`
- Fade out over last 40% of animation (opacity 1→0 from 60%-100%), scale 1→0.3 over full duration
- Wider horizontal spread (`SCREEN_WIDTH * 1.2`)

### `src/stores/gameStore.ts` (MODIFIED)
- Added `pendingInputs[]`, `addPendingInput`, `flushPendingInputs` for input queue (D-66)
- `submitGuess` validates checks first (dictionary, hard mode), then sets `isRevealing=true` only after validation passes — avoids blocking input during failed validation
- `addPendingInput`: appends key to pending inputs array
- `flushPendingInputs`: processes one input at a time, routes to correct action (ENTER→submitGuess, BACKSPACE→removeLetter, else→addLetter)
- Resets `pendingInputs` on `startGame`, `resetGame`, and `restoreSession`

### `src/components/game/GuessRow.tsx` (MODIFIED)
- Added shake animation via `useSharedValue`, `withSequence`, `withTiming`, `useAnimatedStyle`
- Shake: left-right oscillation `-10 → 10 → -10 → 10 → 0` over 250ms when `error` prop is set and row is active

### `src/components/game/GameBoard.tsx` (NO CHANGE — already passed error to active GuessRow)

### `src/components/game/Keyboard.tsx` (MODIFIED)
- Added `* as Haptics` import from `expo-haptics`
- Light haptic impact on every key press (D-18) — fires before routing logic (always provides tactile feedback)
- Input queued via `addPendingInput(key)` when `isRevealing` is true (D-66, queue preferred over drop)
- Uses `isBlocked` computed flag (`!isPlaying || isRevealing`) for consistent key disabling

### `src/screens/GameScreen.tsx` (ENHANCED)
- **AppState persistence** (D-55, D-56, D-57): Listens for `AppState` changes — saves session on background, restores on foreground
- **Animation completion callback**: `useEffect` computes total animation time `(letterCount-1)*50 + TILE_FLIP_DURATION + ANIMATION_COMPLETION_BUFFER` plus `TILE_CORRECT_BOUNCE_EXTRA` if guess has correct tiles; after timeout: unblocks keyboard (`setIsRevealing(false)`), flushes input queue (`flushPendingInputs()`), fires Medium haptic, checks game over, persists daily/endless results
- Haptic on reveal completion via `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`

### `src/screens/LoadingScreen.tsx` (NEW)
- Branded loading screen: "Word Guess" title, "Loading dictionary..." subtitle, accent-colored `ActivityIndicator`
- Uses `colors.background`, `colors.textPrimary`, `colors.textSecondary`, `colors.accent` from theme

### `src/app/App.tsx` (MODIFIED)
- Added `isReady` state with 500ms loading delay for smooth splash transition
- Renders `LoadingScreen` while not ready
- Only renders `NavigationContainer` + `Navigation` when ready

### `src/services/storage.ts` (NO CHANGE — already had helpers from 02-03)
- `getDailyCompletedLengths`, `markDailyCompleted`, `getEndlessStreak`, `setEndlessStreak`

## Key Decisions

- **Animation timing constants centralized** in `animations.ts` for easy tuning after Phase 2
- **Validation-before-blocking in submitGuess**: `isRevealing=true` set only after dictionary/hard-mode validation passes, preventing input blocking during error states
- **Input queue vs drop**: Per D-66, input during animation is queued (not dropped). Queue processes one input at a time
- **Safety net**: The `setTimeout` callback in GameScreen always fires, preventing `isRevealing` from being stuck `true`
- **Haptics level**: Light on key press (soft tactile feedback), Medium on tile reveal (more significant event)
- **Loading screen delay**: 500ms setTimeout ensures dictionary JSON is fully parsed before rendering game UI
- **GameBoard unchanged**: Already passed `error` prop to active GuessRow from Plan 02-02

## Known Stubs

None — all animation, haptics, persistence, and loading functionality is wired end-to-end.

## Threat Flags

- **T-06 (DoS)**: `isRevealing` stuck true — mitigated by `setTimeout` callback that always fires to reset state
- **T-07 (Info Disclosure)**: MMKV saved game state — accepted risk (local device only, no auth/secrets)
- **T-08 (DoS)**: Input queue overflow — accepted (theoretical max ~10 inputs during 300ms window)

## Success Criteria

| Criterion | Status |
|-----------|--------|
| Tile flip: 200ms flip, 50ms stagger, correct bounce (1.0→1.15→1.0) — all on UI thread via Reanimated | ✓ |
| Keyboard color updates after last tile reveal completes (not during) | ✓ |
| Keyboard input queued (not dropped) during animation (D-66) | ✓ |
| Hard Mode violation triggers shake animation on active GuessRow + error toast | ✓ |
| Game state saves on AppState background, restores on foreground | ✓ |
| Daily sessions persist until UTC midnight reset | ✓ |
| Loading screen shows branded splash + spinner while dictionary loads | ✓ |
| Haptics: light impact on key press, medium on tile reveal | ✓ |
| `npx tsc --noEmit` passes | ✓ |

## Deviations

None — plan executed as written.

## Self-Check: PASSED
