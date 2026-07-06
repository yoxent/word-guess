# Phase 4: Monetization — Research

**Researched:** 2026-07-06
**Domain:** AdMob interstitial/rewarded ads, Play Store IAP, Firebase Remote Config
**Confidence:** HIGH

## Summary

Phase 4 adds three external dependencies and wires them into the existing architecture. All three libraries are mature, widely-adopted, and have Expo config plugins. Ad store follows Zustand patterns from prior phases. Rewarded ad and restore purchase flows slot into existing ResultModal and SettingsScreen components via config registry extension.

**Primary recommendation:** Use `useInterstitialAd` hook for simplicity, `RewardedAd` with event listeners for the rewarded flow (needs reward callback), and `react-native-iap` `getAvailablePurchases` for restore.

## User Constraints (from CONTEXT.md)

### Locked Decisions
D-87 through D-112 as documented in 04-CONTEXT.md — all locked before research.

### Claude's Discretion
- Rewarded ad button styling in ResultModal
- Toast component placement (absolute overlay vs inline)
- Ad store state machine transitions (loading, loaded, showing, shown, error)
- Firebase Remote Config fetch timing
- ResultModal layout adjustment for new button
- New `restore` row type in SettingsRowConfig

### Deferred Ideas (OUT OF SCOPE)
- Server-side receipt validation
- RevenueCat or purchase SDK middleware
- Interstitial during app open / splash
- Ad-free game mode without purchase (watch N ads to earn)

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-native-google-mobile-ads | 16.4.0 | Interstitial + rewarded video ads | Official Google AdMob wrapper, Easiest Expo integration |
| react-native-iap | 15.3.6 | Play Store IAP, non-consumable purchase, restore | Lightweight, no middleware fees, direct Play Store integration |
| @react-native-firebase/remote-config | 25.1.0 | Remote ad unit ID configuration | Already using Firebase ecosystem, single build for all environments |

### Dependencies added
| Package | Version | Verified |
|---------|---------|----------|
| `react-native-google-mobile-ads` | 16.4.0 | npm view ([VERIFIED]) |
| `react-native-iap` | 15.3.6 | npm view ([VERIFIED]) |
| `@react-native-firebase/remote-config` | 25.1.0 | npm view ([VERIFIED]) |
| `@react-native-firebase/app` | 25.x | Required peer dep of remote-config. May already be present if Firebase was initialized in Phase 5 planning. Since it's Phase 4 now, install it. |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Verdict |
|---------|----------|-----|-----------|---------|
| react-native-google-mobile-ads | npm | 5+ yrs | 500K+/wk | OK — official Invertase |
| react-native-iap | npm | 7+ yrs | 200K+/wk | OK — mature, active |
| @react-native-firebase/remote-config | npm | 6+ yrs | 400K+/wk | OK — official Invertase |
| @react-native-firebase/app | npm | 6+ yrs | 600K+/wk | OK — required peer dep |

## Architecture Patterns

### Ad Store (Zustand, D-103)
```
adStore (Zustand singleton)
├── interstitialLoaded, rewardedLoaded: boolean
├── gamesSinceLastAd: number (frequency counter)
├── preloadInterstitial() — called at game start
├── preloadRewarded() — called on app launch
├── showInterstitial() → Promise<boolean> — returns whether ad was shown
└── showRewarded(onRewarded) → Promise<boolean> — returns whether ad was shown
```

Wraps `useInterstitialAd` hook / `RewardedAd` event listeners behind Zustand. Components import `useAdStore`, not directly from react-native-google-mobile-ads.

### Config Registry Extension (D-110)
Add `restore` type to existing `SettingsRowConfig` union. New switch case in `SettingsRow.tsx`. Account section gains three new rows: pro status info, remove ads description, restore purchases button.

### Remote Config Service
```
src/services/remoteConfig.ts
├── fetchAdUnitIds() — calls RemoteConfig fetch + activate
├── getInterstitialAdId() → returns Remote Config value or test ID fallback
└── getRewardedAdId() → returns Remote Config value or test ID fallback
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ad lifecycle management | Custom ad loading logic | react-native-google-mobile-ads hooks/event listeners | Handles load/error/close lifecycle, test IDs, impression tracking |
| IAP purchase validation | Custom receipt parsing | react-native-iap `getAvailablePurchases` | Wraps Play Store Billing Library, handles all purchase states |
| Remote config fetching | Custom config service | @react-native-firebase/remote-config | Caching, fetch intervals, default values, ready-made |

## Common Pitfalls

### Pitfall: Double interstitial loading
**What goes wrong:** Calling `load()` on an already-loaded interstitial throws an error
**How to avoid:** Check `isLoaded` before loading; Zustand ad store tracks loaded state (D-104)

### Pitfall: Interstitial shown during animation
**What goes wrong:** Interstitial overlaps tile reveal animation
**How to avoid:** Always show interstitial at ResultModal dismissal, not during gameplay (D-87)

### Pitfall: Restore button visible when Pro already active
**What goes wrong:** User taps restore thinking they need to re-purchase
**How to avoid:** Hide button when `isPro === true` (D-100)

### Pitfall: Rewarded ad button available on win state
**What goes wrong:** Player watches ad for extra guess they can't use (game already won)
**How to avoid:** Only show the button on loss state result (D-89)

## Code Examples

### Interstitial Ad with useInterstitialAd Hook
```tsx
// Source: Invertase react-native-google-mobile-ads docs
import { useInterstitialAd, TestIds } from 'react-native-google-mobile-ads';

const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyyyyyy';

function AdConsumer() {
  const { isLoaded, isClosed, load, show } = useInterstitialAd(adUnitId);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isClosed) {
      // Navigate after ad closes
      navigation.navigate('NextScreen');
    }
  }, [isClosed]);

  return (
    <Button title="Continue" onPress={() => {
      if (isLoaded) show(); else navigation.navigate('NextScreen');
    }} />
  );
}
```

### Rewarded Ad with Event Listeners
```tsx
// Source: Invertase react-native-google-mobile-ads docs
const rewarded = RewardedAd.createForAdRequest(TestIds.REWARDED);

rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true));
rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
  // Grant extra guess
});
rewarded.load();
```

### Restore Purchases
```tsx
// Source: react-native-iap docs
import { getAvailablePurchases } from 'react-native-iap';

const purchases = await getAvailablePurchases();
const hasPro = purchases.some(p => p.productId === 'com.vorithstudio.wordguess.pro');
```

### Config Plugin Setup (app.json)
```json
{
  "expo": {
    "plugins": [
      "expo-sqlite",
      "react-native-iap",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-xxxxxxxx~xxxxxxxx",
          "iosAppId": "ca-app-pub-xxxxxxxx~xxxxxxxx"
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "kotlinVersion": "2.2.0"
          }
        }
      ]
    ]
  }
}
```

## Assumptions Log

No claims tagged `[ASSUMED]` — all packages and patterns verified via npm registry and official docs.

## Open Questions

None — all decisions locked in CONTEXT.md.

## Validation Architecture

Nyquist validation not applicable — this phase adds no pure-logic units comparable to wordLogic.ts. Verification is integration-test heavy (ad rendering, IAP flow). Manual Play Store testing required for IAP/ad lifecycle.

## Sources

### Primary (HIGH confidence)
- `/invertase/react-native-google-mobile-ads` — ad lifecycle, hooks, config plugin
- `/hyochan/react-native-iap` — purchase/restore API, config plugin
- npm registry — version verification for all three packages
- CONTEXT.md — D-87 through D-112

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three packages verified on npm, official docs reviewed
- Architecture: HIGH — Zustand pattern repeats Phase 3, config registry extension per D-80
- Pitfalls: HIGH — documented in key-risks.md and CONTEXT.md

**Research date:** 2026-07-06
**Valid until:** 2026-08-06
