# hooks-order-discipline
updated: 2026-07-10
tags: [react, hooks, gotcha, anti-pattern, rules-of-hooks]
related: [mixed-driver-animation-crash]

## Rule
ALL hooks must be called BEFORE any conditional returns. No exceptions.

## Error message
```
Rendered more hooks than during the previous render.
```

## Trigger pattern
```tsx
function Component() {
  const data = useStore((s) => s.data);

  if (!data) return null;  // ← early return

  // ❌ CRASHES — these hooks only run when data exists
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { /* ... */ }, [scale]);
}
```

React tracks hooks by call order. When `data` transitions from null→set, the hook count changes → crash.

## Fix
Move ALL hooks above the early return:

```tsx
function Component() {
  const data = useStore((s) => s.data);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { /* ... */ }, [scale]);

  if (!data) return null;  // ← safe — hooks already called
}
```

Use optional chaining for data-dependent computations:
```tsx
const rows = data?.items?.map(...) ?? [];
```

## Occurrences in this project
| File | Line | Hooks moved |
|------|------|-------------|
| `ResultModal.tsx` | ~270 | `useRef` (cardScale, cardOpacity), `useEffect` (animation) |
| `GameScreen.tsx` | ~430 | `useSettingsStore`, `useAdStore`, `useCallback` (handleWatchAd, handleLetterHint) |

## Prevention checklist
- Every `if (...) return null;` — verify no hooks appear after it
- ESLint rule: `react-hooks/rules-of-hooks` (should catch this)
- When adding new hooks to a component with early returns, add them ABOVE the return
