# animation-system
updated: 2026-07-05 (input queue bug)
tags: [animation, reanimated, tile-flip, confetti, performance]
related: [architecture, game-modes, tech-stack]

## Principles (D-28/D-29)
- All animations on UI thread via Reanimated 4.x worklets — never JS thread
- Fast/snappy: 200ms flip, 50ms stagger, correct tiles get scale bounce
- Keyboard color update fires AFTER last tile reveal completes (delayed)
- Keyboard input queued (not dropped) during animation (D-66)
- Tunable via single constants file (D-31)

## Animation constants (`src/constants/animations.ts`)
| Constant | Value | Description |
|----------|-------|-------------|
| TILE_FLIP_DURATION | 200ms | Single tile flip duration |
| TILE_STAGGER_DELAY | 50ms | Delay between consecutive tiles, left-to-right |
| TILE_BOUNCE_SCALE_UP | 100ms | Correct tile scale-up duration (1.0→1.15) |
| TILE_BOUNCE_SCALE_DOWN | 100ms | Correct tile scale-down duration (1.15→1.0) |
| TILE_BOUNCE_TOTAL | 200ms | Combined correct bounce duration |
| TILE_BOUNCE_MAX | 1.15 | Scale bounce peak value |
| TILE_BOUNCE_NORMAL | 1.0 | Resting scale value |
| ANIMATION_COMPLETION_BUFFER | 50ms | Safety buffer after animation ends |
| TILE_CORRECT_BOUNCE_EXTRA | 200ms | Extra time when guess has correct tiles |
| CONFETTI_PARTICLE_COUNT | 40 | Number of confetti particles |
| CONFETTI_DURATION | 1500ms | Confetti animation duration |
| CONFETTI_STAGGER_DELAY | 15ms | Delay between particle launches |

## Tile flip sequence
```
[letter index 0] |---200ms flip---|--bounce(if correct)--|
[letter index 1]  |---200ms flip---|--bounce--|           stagger 50ms
[letter index 2]   |---200ms flip---|--bounce--|          stagger 100ms
...                                                       ...
                                                          ↓
                                          Keyboard color update fires here
                                          isRevealing = false (unblock input)
                                          Haptics.medium fires here
```

## Animation completion timing
```
lastTileDelay = (letterCount - 1) * TILE_STAGGER_DELAY
totalTime = lastTileDelay + TILE_FLIP_DURATION + ANIMATION_COMPLETION_BUFFER
if (any correct tile in guess) totalTime += TILE_CORRECT_BOUNCE_EXTRA
```

## Implementation details

### Tile (Reanimated worklet)
- `useSharedValue(0)` for `flipProgress`, `useSharedValue(1)` for `scale`
- `useEffect` on `isRevealing`:
  - stagger = `index * TILE_STAGGER_DELAY`
  - Flip: `withDelay(stagger, withTiming(1, {duration: TILE_FLIP_DURATION, easing: Easing.inOut(Easing.ease)}))`
  - Correct: `withDelay(stagger + TILE_FLIP_DURATION, withSequence(withTiming(1.15, {d:100}), withTiming(1.0, {d:100})))`
- `useAnimatedStyle()` — `interpolateColor` for background (empty→feedback color midway), `interpolate` for rotateX (0→-90→0)
- Text opacity: `interpolate(progress, [0,0.5,1], [0,0,1])` — invisible during flip, visible after
- Uses `isFirstRender` ref to skip initial animation trigger
- Animated.View + Animated.Text

### Confetti (Reanimated particle burst)
- 40 particles, each a colored circle (6-14px random)
- Colors: `['#6aaa64', '#c9b458', '#4a9eff', '#e74c3c', '#ffffff', '#f39c12', '#9b59b6']`
- Each particle: `withTiming(1, { duration: 1500 })` for progress
- Stagger: each particle starts with `index * 15ms` delay
- Horizontal spread: `(Math.random() - 0.5) * SCREEN_WIDTH * 1.2`
- Fall distance: 400-700px from top
- `pointerEvents="none"` — doesn't block touches

### Keyboard color update delay
- After last tile animation completes, call `setIsRevealing(false)` + `flushPendingInputs()`
- Keyboard wrapped in `React.memo` to prevent re-render during tile animations (D-63)
- Input keys disabled via `isRevealing` flag check in store (D-66)

## State management
- `gameStore.isRevealing: boolean` — true during animation sequence
- `gameStore.setIsRevealing(revealing)` — set by GameScreen animation timer
- `gameStore.pendingInputs` — queued keystrokes during animation (if queue preferred over drop)
- `gameStore.flushPendingInputs()` — process queue after animation completes
- Timer managed via `setTimeout` in GameScreen `useEffect` (with `clearTimeout` cleanup)

## Input queue bug (FIXED 2026-07-05)
- `flushPendingInputs()` originally processed only 1 queued item per call (P14).
- Fix: `setTimeout(() => get().flushPendingInputs(), 0)` after each non-ENTER input — recursively drains queue on next tick.
- ENTER: processed once, then stops (ENTER triggers new submitGuess → new animation → `flushPendingInputs()` called again after animation completes).
- Now fully drains rapid typing during animation.

## typegpu-confetti (evaluated, deferred)
- v0.3.0, WebGPU on Android experimental
- Re-evaluate after Phase 6 or when WebGPU on Android stabilizes
