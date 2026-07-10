# mixed-driver-animation-crash
updated: 2026-07-10
tags: [animation, bug, react-native, animated, gotcha, anti-pattern]
related: [animation-system, frontend-overhaul]

## Problem
`Animated.parallel` with mixed `useNativeDriver` values (true + false) crashes on subsequent presses:

```
Attempting to run JS driven animation on animated node that has been moved
to "native" earlier by starting an animation with `useNativeDriver: true`
```

## Root cause
React Native locks each `Animated.Value` to a driver on first animation start. When `Animated.parallel` starts both native (scale) and JS (color) animations simultaneously, the parallel wrapper can lock the JS node to native. On the next press, the JS-driven color interpolation fails because the node is already "native."

## Trigger pattern
```tsx
// ❌ CRASHES on second press
const onPressIn = () => {
  Animated.parallel([
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }),
    Animated.timing(bgShift, { toValue: 1, useNativeDriver: false }),
  ]).start();
};
```

## Fix
Run native and JS animations as independent `.start()` calls. Call `stopAnimation()` on both values first to clear any lingering driver lock:

```tsx
// ✅ SAFE — independent starts
const onPressIn = () => {
  scale.stopAnimation();
  bgShift.stopAnimation();
  Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  Animated.timing(bgShift, { toValue: 1, useNativeDriver: false }).start();
};
```

## When this applies
- Any `Animated.Value` used with `useNativeDriver: true` for transform (scale, translate)
- Same value also used with `useNativeDriver: false` for color/opacity interpolation
- Component remounts or reuses the same animated node across presses

## Where it occurred
- `src/components/ui/Button.tsx` — `scale` (native) + `bgShift` (JS color interpolation)
- Triggered by pressing "Back to Menu" in ResultModal after a game

## Prevention
- Never use `Animated.parallel` with mixed `useNativeDriver` on the same or different values in the same component
- If you need both native and JS animations, run them as separate `.start()` calls
- Always `stopAnimation()` before starting new animations on reused components
