# fabric-crash-patterns
updated: 2026-07-12 (letter hint moved to ghost tile; keyboard pulse retired)
tags: [fabric, crash, animation, reanimated, gotcha, anti-pattern]
related: [home-background, animation-system, mixed-driver-animation-crash, tile-component]

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

### 4. Result modal mounting during tile reveal
- `ResultModal` mounted its `<Modal>` the instant `status` flipped to won/lost,
  which overlaps with the tile-flip Reanimated prop flush on the just-submitted row
- Reproduced after ad-rewarded extra rows enlarged the board (more animated tiles
  alive when the modal mount batch hit) → `SurfaceMountingManager` AssertionError
- **Fix:** Gate `ResultModal` rendering on `!isRevealing` so the modal (and
  Confetti) mount only after the reveal animation finishes — no mount/animation
  collision. Also restores the card-bounce entrance (was running invisibly during
  'playing' due to an `isWin` declared-after-use hooks-order bug)

### 5. Tile key-based remount on guess submission
- `GuessRow` keyed each `Tile` as `${i}-${tileFeedback}` to force a remount when
  an active row (feedback='empty') became a completed row, working around a
  missing-text bug from stale `textOpacity` shared-value state
- Every guess submission therefore unmounted + remounted ~7 `Animated.View`s,
  each carrying Reanimated `useAnimatedStyle` prop overrides
- Crash signature differs from #4: the stack goes through
  `FabricUIManager$DispatchUIFrameCallback.doFrameGuarded` →
  `IntBufferBatchMountItem.execute` → `updateProps` (a React commit mount batch),
  NOT Reanimated's `NativeProxy.performOperations` flush
- When React unmounts a view that Reanimated still holds a prop override on,
  `SurfaceMountingManager.overridePropsReadableMap` asserts
- **Fix:** Use stable `key={i}` in `GuessRow` so the `Tile` instance is reused
  (no mount/unmount churn). Fix the original missing-text bug at its source by
  resetting `textOpacity.value = 0` in the Tile's reveal `useEffect` before
  scheduling the fade-in — the shared value no longer needs a fresh instance to
  start hidden.

### 6. Win/loss status flip during tile reveal
- `submitGuess` set `status: 'won'|'lost'` in the same update as `isRevealing: true`
- While tiles were still flipping, that status change unmounted hint buttons and
  other `session.status === 'playing'` UI, and fired `ResultModal` side effects
  (`playWin`/`playLoss`) even though the modal render was gated on `!isRevealing`
- Any native unmount batch overlapping Reanimated tile prop flushes can trigger
  `overridePropsReadableMap` — especially on large boards after ad-rewarded rows
- **Fix:** Keep `status: 'playing'` during reveal; store outcome in
  `session.pendingStatus` and promote via `finalizeRevealOutcome()` when the
  reveal timer completes (or back-button skip). Gate the active typing row on
  `!pendingStatus` so the board layout stays correct for the final guess.

### 7. Every completed row re-triggering flip animation
- `GuessRow` passed `isRevealing={!isActive && !!feedback}` — true for **every**
  completed row, not just the row being submitted
- On each new guess, all prior completed rows (~7 tiles × N rows) restarted
  Reanimated flip worklets simultaneously with the new row's flip and keyboard
  color updates → 50–70+ concurrent `useAnimatedStyle` prop overrides on large
  boards (e.g. after ad +2 rows) → Fabric `overridePropsReadableMap` assertion
- **Fix:** Pass `isRevealingRow` from `GameBoard` (only when
  `isRevealing && i === completedGuesses - 1`). Render `StaticTile` (plain
  `View`, no Reanimated) for all non-revealing rows so at most ~7 animated
  tiles exist during a flip. Defer `keyColors` to `pendingKeyColors` applied in
  `finalizeRevealOutcome()` (Wordle-accurate keyboard timing).

### 8. Hint-key opacity blink + board update on same frame
- Letter-hint used `Animated.loop` on key **opacity** (native driver) while
  tapping the hinted key updated the tile board and cleared hint state in one
  frame — stopping the loop + style teardown collided with Fabric prop updates
- **Fix (historical):** Pulse hint via alternating `key.hint` / `key.hintDim`
  background colors (JS interval, no opacity animation).
- **Current (2026-07-12):** Letter hint is a ghost letter on the active guess
  row tile (`hintTile`), not a keyboard key highlight — avoids keyboard style
  teardown races entirely. Clear `hintTile` on successful `submitGuess`.

### 9. Startup SIGSEGV in MountingCoordinator (home marquee)
- Not the Java `AssertionError` — native `Fatal signal 11 (SIGSEGV)` on
  `mqt_v_js` during first Fabric surface commit (~11s process uptime)
- Stack: `MountingCoordinator::pullTransaction` →
  `FabricUIManagerBinding::schedulerDidFinishTransaction` →
  `ShadowTree::tryCommit` → `UIManager::completeSurface`
- Correlated with HomeScreen mounting `MarqueeBackground` (~42 Reanimated
  `Animated.View` + MaterialIcons) in the same initial commit as the rest of
  the home UI
- SplashScreen / window-focus soft exceptions in the same log are noise
- **Bisect:** Replaced animated `MarqueeBackground` with `HomeBackground` — see
  `home-background.md`. Initial fix was a static cover `Image`; later upgraded to
  UV-scroll (one `Animated.View` + tiled `Image` grid, no per-icon worklets).
  Do not reintroduce multi-view Reanimated rain on home mount without deferred
  mount + heavy reduction.

## Mitigation patterns

| Pattern | When to use | Implementation |
|---------|-------------|----------------|
| Defer state updates | Ad callbacks, rapid transitions | `setTimeout(() => setState(), 100)` |
| Delay Confetti | Modal + celebration combo | `useState(false)` + `setTimeout(true, 100)` in animation callback |
| Defer modal mount past animation | Result modal after guess submit | Gate render on `!isRevealing` so heavy mount batch doesn't collide with tile-flip prop flush |
| Stable keys for animated list items | Tiles/rows with `useAnimatedStyle` that change state | Don't encode transient state (e.g. feedback) in the key — resetting shared values in `useEffect` avoids remount churn that triggers Fabric assertions |
| Defer win/loss status | Guess submit + tile reveal | Keep `status: 'playing'` during reveal; set `pendingStatus` and call `finalizeRevealOutcome()` when animation completes |
| Static tiles for idle rows | Board with many completed rows | Only the submitting row uses Reanimated `Tile`; all others use plain `StaticTile` (~7 worklets max) |
| Defer keyboard colors | Guess submit + tile reveal | Store `pendingKeyColors` on submit; merge in `finalizeRevealOutcome()` |
| Reduce view count | Grid/list with many items | Limit columns/rows, remove wrapper Views |
| Use Reanimated | Any animation >10 views | `useSharedValue` + `withRepeat` on UI thread |
| Pre-fill positions | Rain/scroll effects | Compute initial positions to avoid scroll-in effect |

## Anti-patterns
- ❌ `Animated.loop(Animated.parallel([...]))` with different durations — axes desync
- ❌ Adding/removing event listeners inside Promise wrapper — race conditions
- ❌ Mounting 40+ animated views simultaneously — Fabric assertion failure
- ❌ Mounting a heavy subtree (Modal) while a Reanimated prop flush is in flight on a large sibling tree — AssertionError in `SurfaceMountingManager.updateProps`
- ❌ Encoding transient state (e.g. tile feedback) in a React `key` for an `Animated.View` with `useAnimatedStyle` — forces unmount/remount every state change; React unmounts the view while Reanimated still holds a prop override → `overridePropsReadableMap` assertion. Reset shared values in `useEffect` instead and keep keys stable.
- ❌ Referencing a `const` before its declaration line (after an early return) in a component — TDZ/hooks-order hazard masked by `const`→`var` hoisting; side effects fire at wrong times
- ❌ Calling Zustand state updates inside ad SDK callbacks — view hierarchy conflict

## Related crashes
- `mixed-driver-animation-crash` — RN Animated with mixed `useNativeDriver` crashes on remount
- `hooks-order-discipline` — hooks before conditional returns prevents React crash
