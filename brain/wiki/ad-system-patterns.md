# ad-system-patterns
updated: 2026-07-11
tags: [ads, monetization, rewarded, interstitial, preloading, gotcha]
related: [monetization, fabric-crash-patterns]

## Ad preloading strategy
| Ad type | Preload location | Timing |
|---------|-----------------|--------|
| Interstitial | App.tsx startup + GameScreen init | On app start, after Remote Config fetch |
| Rewarded | App.tsx startup + GameScreen init | On app start, after Remote Config fetch |

**Rationale:** Ads take time to load. Preloading at startup ensures they're ready by the time user navigates to Game screen.

## Rewarded ad callback gotcha
```typescript
// ❌ WRONG — listener cleaned up before EARNED_REWARD fires
const unsubscribe = ad.addAdEventListener(EARNED_REWARD, () => onRewarded());
await ad.show();
unsubscribe(); // too early!

// ✅ CORRECT — let CLOSED handler clean up
const earnedUnsubscribe = ad.addAdEventListener(EARNED_REWARD, () => {
  rewardEarned = true;
  onRewarded();
});
const closedUnsubscribe = ad.addAdEventListener(CLOSED, () => {
  earnedUnsubscribe();
  closedUnsubscribe();
  // cleanup + preload next
});
await ad.show();
```

## Ad reward callback deferral
```typescript
// ❌ WRONG — state update during ad transition causes Fabric crash
await adStore.showRewarded(() => {
  useGameStore.getState().addExtraGuess(); // immediate!
});

// ✅ CORRECT — defer to after ad fully closes
await adStore.showRewarded(() => {
  setTimeout(() => {
    useGameStore.getState().addExtraGuess(); // deferred
  }, 100);
});
```

## Store structure (adStore.ts)
- Module-level ad instances (not serializable, outside Zustand)
- Event listener cleanup on re-preload
- Lazy preloading after ad dismissal
- `gamesSinceLastAd` counter for interstitial timing

## Button disable logic
```typescript
disabled={!rewardedLoaded}
style={[styles.hintButton, !rewardedLoaded && styles.hintButtonDisabled]}
```
- Buttons disabled until `rewardedLoaded` is true
- Early preloading in App.tsx reduces wait time
