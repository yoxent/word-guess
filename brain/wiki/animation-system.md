# animation-system
updated: 2026-07-10 (Phase 4-7: TILE_BOUNCE_MAX 1.2, keyboard spring press, modal scale+fade, ResultModal bounce, Button haptic)
tags: [animation, reanimated, tile-flip, confetti, stagger, reduce-motion]
related: [architecture, game-modes, tech-stack, accessibility]

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
| TILE_BOUNCE_MAX | 1.2 | Scale bounce peak value (was 1.15, bumped Phase 4) |
| TILE_BOUNCE_NORMAL | 1.0 | Resting scale value |
| ANIMATION_COMPLETION_BUFFER | 50ms | Safety buffer after animation ends |
| TILE_CORRECT_BOUNCE_EXTRA | 200ms | Extra time when guess has correct tiles |
| CONFETTI_PARTICLE_COUNT | 40 | Number of confetti particles |
| CONFETTI_DURATION | 1500ms | Confetti animation duration |
| CONFETTI_STAGGER_DELAY | 15ms | Delay between particle launches |
| HOME_STAGGER_DELAY | 80ms | Stagger between home screen element groups (Phase 6) |
| HOME_STAGGER_DURATION | 300ms | Fade+slide duration per element group |

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
- Three shared values: `flipProgress(0)`, `scale(1)`, `textOpacity(0 or 1)`
  - `textOpacity` initial: `feedback === 'empty' ? 1 : 0` — typing tiles always visible from first render
- `useEffect` on `isRevealing`:
  - stagger = `index * TILE_STAGGER_DELAY`
  - Flip: `withDelay(stagger, withTiming(1, {duration: TILE_FLIP_DURATION, easing: Easing.inOut(Easing.ease)}))`
  - Correct: `withDelay(stagger + TILE_FLIP_DURATION, withSequence(withTiming(1.15, {d:100}), withTiming(1.0, {d:100})))`
  - Text opacity (normal): `withDelay(stagger + TILE_FLIP_DURATION/2, withTiming(1, {duration: TILE_FLIP_DURATION/2}))` — letter hidden during first half, reveals over second half
  - Text opacity (reduceMotion): `withDelay(stagger, withTiming(1, {duration: 0}))` — instant after stagger delay, left-to-right progression preserved
- `useAnimatedStyle()` — `interpolateColor` for background, `interpolate` for rotateX (0→-90→0), `interpolate` for scale (bounce)
- `textOpacity` applied via separate Animated.Text style (not part of flip animation) — text stays upright, only opacity animates
- **Safety-net setTimeout** — forces `flipProgress=1`, `scale=1`, `textOpacity=1` after worst-case animation duration, guaranteeing final state even if worklet interrupted
- `isFirstRender` ref **removed** (2026-07-10) — was broken (set flag but didn't early-return). Key-based remount (see GuessRow) handles fresh-instance-on-revisit correctly.
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

## GuessRow key-based Tile remount (FIXED 2026-07-10)
- Old: `key={i}` (position-only) — React reused Tile instance when active row became completed row, carrying stale shared values
- New: `key={\`${i}-${tileFeedback}\`}` — includes feedback type (empty/correct/present/absent). Tile REMOUNTS on transition from active typing to revealed state. Fresh instance = fresh shared values = animation runs from scratch.
- This was the root cause of the "text missing" bug: the reused instance's flipProgress was stuck at 0 from the early-return in the `!isRevealing` path, and the rotateX at -90deg made the text edge-on (invisible)

## GameBoard hooks violation (FIXED 2026-07-10)
- `useMemo` for tileSize was called AFTER an early return (`if (!session) return <Loading/>`)
- This violates React Rules of Hooks — hook called conditionally
- On certain re-renders (e.g. AppState transition), hook tracking corrupted, causing downstream components to render with stale shared values or undefined behavior
- Fix: move `useMemo` before the early return, with default wordLength when session is null
- Rule: all hooks must execute in the same order on every render, regardless of early returns

## Input queue bug (FIXED 2026-07-05)
- `flushPendingInputs()` originally processed only 1 queued item per call (P14).
- Fix: `setTimeout(() => get().flushPendingInputs(), 0)` after each non-ENTER input — recursively drains queue on next tick.
- ENTER: processed once, then stops (ENTER triggers new submitGuess → new animation → `flushPendingInputs()` called again after animation completes).
- Now fully drains rapid typing during animation.

## Home screen stagger entrance (Phase 3)
- Sequential stagger: title (0ms) → subtitle+icons (50ms) → cards (80ms stagger each) → preview (40ms) → hard mode (40ms)
- Each element: fade-in + slide-up (translateY 12→0), 300ms, via RN Animated API
- When reduceMotion ON: all elements appear instantly

## Reduce motion
- Settings toggle `reduceMotion`, OFF by default
- When ON: tile flip, confetti, stat entrance, home stagger, modal animations all skip

## Phase 4 — Keyboard spring press
- `KeyboardKey` subcomponent: per-key `Animated.Value` spring (scale 0.92)
- `friction: 5, tension: 50` — snappy but not jarring
- BACKSPACE uses MaterialIcons `backspace` icon

## Phase 4 — Game screen error toast
- Spring slide-in: translateY -16→0 + opacity 0→1, `friction: 6, tension: 60`
- Coral bg, borderRadius 12, MaterialIcons warning icon

## Phase 7 — Modal open/close animations
- HowToPlayModal: card scale 0.9→1.0 spring + fade 0→1, resets on each open
- LengthPickerModal: same pattern
- ResultModal: card scale 0.8→1.0 spring + fade 0→1 (more dramatic for celebration)
- All use `friction: 5, tension: 50`, `useNativeDriver: true`
- Triggered by `useEffect` on `visible` prop

## Phase 7 — Button haptic
- `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on onPressIn
- Gated by `useSettingsStore.hapticEnabled`
- Keyboard already has same pattern (Phase 4)

## Mixed driver crash (Phase 4 fix)
- Bug: `Animated.parallel` with `useNativeDriver: true` (scale) + `useNativeDriver: false` (bgShift) crashes on subsequent presses
- Root cause: React Native locks animated nodes to a driver on first use; parallel start locks both to mixed drivers
- Fix: run native/JS animations as independent `.start()` calls, call `stopAnimation()` on both values first
- See [mixed-driver-animation-crash](mixed-driver-animation-crash.md)

## typegpu-confetti (evaluated, deferred)
- v0.3.0, WebGPU on Android experimental
- Re-evaluate after Phase 6 or when WebGPU on Android stabilizes
