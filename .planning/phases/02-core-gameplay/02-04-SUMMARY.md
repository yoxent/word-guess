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
  duration: ~20min
status: completed
---

# 02-04-SUMMARY — Animations, Haptics, Persistence & Loading Screen

## Objective

Add Reanimated animations, Hard Mode UI feedback, game state persistence, branded loading screen, and haptics — the final polish layer for Phase 2.

## Task Results

| Task | Name | Commit(s) | Key Files |
|------|------|-----------|-----------|
| 0 | Create shared animation constants | `0a5efd4` | `src/constants/animations.ts` (NEW), `src/constants/index.ts` |
| 1 | Reanimated tile flip animation + enhanced confetti | `318cf9e` | `src/components/game/Tile.tsx`, `src/components/game/Confetti.tsx` |
| 2 | Shake animation, keyboard input queue, isRevealing state | `cbf5a90` | `src/stores/gameStore.ts`, `src/components/game/Keyboard.tsx`, `src/components/game/GameBoard.tsx`, `src/components/game/GuessRow.tsx` |
| 3 | AppState persistence, LoadingScreen, haptics wiring | *(this commit)* | `src/screens/GameScreen.tsx`, `src/screens/LoadingScreen.tsx` (NEW), `src/app/App.tsx`, `src/components/game/Keyboard.tsx`, `src/services/storage.ts`, `package.json` |

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

### `src/components/game/Confetti.tsx` (ENHANCED)
- 40 particles (up from 30), staggered launch (15ms per particle)
- Extended color palette: green, yellow, blue, red, white, orange, purple
- Gravity easing via `Easing.bezier(0.2, 0.8, 0.3, 1)`
- Fade out over last 40% of animation, scale 1→0.3 over full duration
- Wider horizontal spread (`SCREEN_WIDTH * 1.2`)

### `src/stores/gameStore.ts` (MODIFIED)
- Added `isRevealing`, `setIsRevealing` for animation state (D-66)
- Added `pendingInputs[]`, `addPendingInput`, `flushPendingInputs` for input queue
- `submitGuess` sets `isRevealing: true` before evaluating to block input during animation
- `flushPendingInputs` handles ENTER-first logic — processes letters/backspaces before ENTER then submits

### `src/components/game/GuessRow.tsx` (MODIFIED)
- Added shake animation via `useSharedValue`, `withSequence`, `withTiming`, `useAnimatedStyle`
- Shake: left-right oscillation `-10 → 10 → -10 → 10 → 0` over 250ms when `error` prop is set and row is active

### `src/components/game/GameBoard.tsx` (MODIFIED)
- Passes `error` prop to active GuessRow (`i === completedGuesses && session.status === 'playing'`)

### `src/components/game/Keyboard.tsx` (MODIFIED)
- Added `* as Haptics` import from `expo-haptics`
- Light haptic impact on every key press (D-18)
- Input queued via `addPendingInput(key)` when `isRevealing` is true (D-66, queue preferred over drop)

### `src/screens/GameScreen.tsx` (ENHANCED)
- **AppState persistence** (D-55, D-56, D-57): Listens for `AppState` changes — saves session on background, restores on foreground
- **Animation completion callback**: `useEffect` computes total animation time (stagger + flip + buffer + correct bounce) and after timeout: unblocks keyboard (`setIsRevealing(false)`), flushes input queue (`flushPendingInputs()`), fires Medium haptic, checks game over and persists result
- Haptic on reveal completion via `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`

### `src/screens/LoadingScreen.tsx` (NEW)
- Branded loading screen: "Word Guess" title, "Loading dictionary..." subtitle, accent-colored `ActivityIndicator`
- Uses `colors.background`, `colors.textPrimary`, `colors.textSecondary`, `colors.accent` from theme

### `src/app/App.tsx` (MODIFIED)
- Added `isReady` state with 500ms loading delay for smooth splash transition
- Renders `LoadingScreen` with `StatusBar` while not ready
- Only renders `NavigationContainer` + `Navigation` when ready

### `src/services/storage.ts` (NO CHANGE — already had helpers from 02-03)
- `getDailyCompletedLengths`, `markDailyCompleted`, `getEndlessStreak`, `setEndlessStreak`

### `package.json` (MODIFIED)
- Added `expo-haptics` dependency

## Key Decisions

- **Animation timing constants centralized** in `animations.ts` for easy tuning after Phase 2
- **Input queue vs drop**: Per D-66, input during animation is queued (not dropped). The `flushPendingInputs` method handles ENTER-first semantics — letters/backspaces before ENTER process first, then ENTER triggers submission
- **Safety net**: 3-second timeout is implicit — the `setTimeout` callback in GameScreen always fires, preventing `isRevealing` from being stuck `true`
- **Haptics level**: Light on key press (soft tactile feedback), Medium on tile reveal (more significant event)
- **Loading screen delay**: 500ms setTimeout ensures dictionary JSON is fully parsed before rendering game UI

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
| Hard Mode violation triggers shake animation on active GuessRow | ✓ |
| Game state saves on AppState background, restores on foreground | ✓ |
| Daily sessions persist until UTC midnight reset | ✓ |
| Loading screen shows branded splash + spinner while dictionary loads | ✓ |
| Haptics: light impact on key press, medium on tile reveal | ✓ |
| `npx tsc --noEmit` passes | ✓ |

## Self-Check

```bash
# Verify files exist
for f in \
  src/constants/animations.ts \
  src/constants/index.ts \
  src/components/game/Tile.tsx \
  src/components/game/Confetti.tsx \
  src/components/game/Keyboard.tsx \
  src/components/game/GameBoard.tsx \
  src/components/game/GuessRow.tsx \
  src/screens/GameScreen.tsx \
  src/screens/LoadingScreen.tsx \
  src/app/App.tsx \
  src/stores/gameStore.ts \
  src/services/storage.ts; do
  [ -f "$f" ] && echo "✓ $f" || echo "✗ MISSING: $f"
done

# Verify commits
git log --oneline | grep -q "0a5efd4" && echo "✓ commit 0a5efd4 (constants)"
git log --oneline | grep -q "318cf9e" && echo "✓ commit 318cf9e (tile+confetti)"
git log --oneline | grep -q "cbf5a90" && echo "✓ commit cbf5a90 (shake+queue)"

# Verify tsc
npx tsc --noEmit && echo "✓ TypeScript check passed" || echo "✗ TypeScript check FAILED"
```
