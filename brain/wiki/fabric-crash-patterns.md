# fabric-crash-patterns
updated: 2026-07-11
tags: [fabric, crash, animation, reanimated, gotcha, anti-pattern]
related: [marquee-background, animation-system, mixed-driver-animation-crash]

## Crash signature
```
java.lang.AssertionError: Assertion failed
  at SurfaceMountingManager.overridePropsReadableMap
  at SurfaceMountingManager.updateProps
```
Fabric's mounting system tries to update props on a view that's in an invalid/unmounted state.

## Root causes discovered

### 1. Too many simultaneous animated views
- Grid marquee with 100+ MaterialIcons + wrapper Views overwhelmed Fabric
- Each icon = 1 View + 1 MaterialIcons = 200+ native views
- **Fix:** Reduce view count, use Reanimated for UI-thread animations

### 2. State updates during ad transitions
- `EARNED_REWARD` listener fires while ad is still showing
- State update (e.g., `addExtraGuess()`) triggers Fabric view update mid-transition
- **Fix:** Defer reward callbacks with `setTimeout(() => {...}, 100)`

### 3. Rapid component mounting (Confetti)
- Confetti's 40 particles mount simultaneously with ResultModal
- Fabric can't handle rapid mount + animation start
- **Fix:** Delay Confetti mounting until modal animation completes

## Mitigation patterns

| Pattern | When to use | Implementation |
|---------|-------------|----------------|
| Defer state updates | Ad callbacks, rapid transitions | `setTimeout(() => setState(), 100)` |
| Delay Confetti | Modal + celebration combo | `useState(false)` + `setTimeout(true, 100)` in animation callback |
| Reduce view count | Grid/list with many items | Limit columns/rows, remove wrapper Views |
| Use Reanimated | Any animation >10 views | `useSharedValue` + `withRepeat` on UI thread |
| Pre-fill positions | Rain/scroll effects | Compute initial positions to avoid scroll-in effect |

## Anti-patterns
- ❌ `Animated.loop(Animated.parallel([...]))` with different durations — axes desync
- ❌ Adding/removing event listeners inside Promise wrapper — race conditions
- ❌ Mounting 40+ animated views simultaneously — Fabric assertion failure
- ❌ Calling Zustand state updates inside ad SDK callbacks — view hierarchy conflict

## Related crashes
- `mixed-driver-animation-crash` — RN Animated with mixed `useNativeDriver` crashes on remount
- `hooks-order-discipline` — hooks before conditional returns prevents React crash
