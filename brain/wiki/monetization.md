# monetization
updated: 2026-07-06
tags: [ads, iap, monetization, phase-4, remote-config]
related: [phase-structure, tech-stack, ui-config-registry, key-risks, architecture]

## Business model
Free-to-play with interstitial ads, rewarded video, Pro IAP $1.99. Pro removes interstitials only — rewarded ads remain available to Pro users (gameplay mechanic, not annoyance gate).

## Ad manager (Zustand store)
Singleton `adStore` with ref-counted lifecycle per ad unit ID. Prevents double-loading.

- `preloadInterstitial()` — called at game start
- `preloadRewarded()` — called on app launch
- `showInterstitial()` — at ResultModal→menu/next transition
- `showRewarded(onRewarded)` — returns `boolean` (shown/not)
- Tracks `gamesSinceLastAd` counter for frequency capping

Architecture: `src/stores/adStore.ts` — Zustand store (D-103), not service singleton or React Context.

## Interstitial timing (Flappy Bird-style)
Shows at **transition from ResultModal to next screen** (Back to Menu / Play Next). Never during active gameplay (D-87).

### Frequency per mode (D-88)
| Mode | Frequency |
|------|-----------|
| Daily Challenge | Every game (1 per length per day — low volume) |
| Endless | Every 2nd game |
| Random | Every 2nd game (same as Endless) |

- Counter resets after each interstitial is shown
- Session-local counter (not persisted across app restarts)

## Rewarded ads
| Aspect | Detail |
|--------|--------|
| Entry point | Button at bottom of ResultModal, **loss state only** (D-89, D-90) |
| Flow | Tap button → watch rewarded ad → modal closes → game resumes with +1 attempt slot (D-91) |
| Max free tier | 2 extra guesses per game (`maxExtraGuessesFree` in config.ts) |
| Max Pro tier | 3 extra guesses per game (`maxExtraGuessesPro` in config.ts) |
| Code | `session.maxAttempts++`, `session.extraGuessesUsed++` in gameStore |

Pro users can still watch rewarded ads (D-93). The Pro purchase removes interstitials only — rewarded ads are a gameplay mechanic, not an annoyance. This is a common pattern (e.g. Wordscapes) — voluntary ad viewing for game advantage is different UX from forced interstitials.

## Pro IAP
| Aspect | Detail |
|--------|--------|
| Product ID | `com.vorithstudio.wordguess.pro` (prefixed with package name, D-95) |
| Price | $1.99 USD (D-96) |
| Type | Non-consumable (restorable, D-97) |
| Library | react-native-iap (D-98, RevenueCat ruled out Phase 1) |
| Payment flow | rn-iap `requestPurchase()` → Play Store dialog → verify with `getPurchases()` |

## Restore purchases
- Button in **Settings → Account section** (D-99)
- **Hidden when `isPro === true`** (D-100)
- Edge case safety: fresh install on new device → `isPro` starts `false` → button visible → restore → `isPro = true` → button hides. App data cleared resets `isPro` → button re-appears (D-102).
- Feedback: **color-coded toast** — green for success ("Pro restored!"), red for failure ("No purchases found to restore") (D-101)

## Ad unit ID configuration (Firebase Remote Config)
| Aspect | Detail |
|--------|--------|
| Tool | `@react-native-firebase/remote-config` (D-106) |
| Fetch | On app launch, cache locally (D-107) |
| Fallback | Compiled-in test ad IDs if fetch fails (D-108) |
| Keys | `admob_interstitial_id`, `admob_rewarded_id`, `admob_interstitial_frequency_override` (optional, D-109) |
| Build strategy | Single build — no dev/prod split needed. Remote Config serves different IDs per environment remotely. |

Chosen over build-time env vars, config file flags, or EAS profiles — Remote Config allows one build to serve all environments and supports runtime switching (D-106).

## Settings config extension
- Phase 3's `SettingsRowConfig` union gains a `restore` type
- Phase 3 `SettingsRow.tsx` switch gets a new `restore` case
- Account section in `src/config/ui.ts` gains: pro status info row, remove ads description row, restore purchases button
- Phase 3 placeholder "Sign in — coming in Phase 5" stays alongside new rows (D-111)

### Row types added for Phase 4
| Type | Renders | Behavior |
|------|---------|----------|
| `restore` | Tappable row (left) | Calls `RNIap.getPurchases()` → sets `isPro` → shows toast → hides button |
| `info` (pro status) | "Pro" left / "Active" or "—" right | Read-only, non-interactive |

### Remove Ads price display (D-112)
Both elements present, independently removable:
- Row label: "Remove Ads · $1.99"
- Description subtitle: "One-time purchase, removes all ads forever"

## Extra guesses per tier (config.ts)
Split `maxExtraGuesses` into two values (D-94):
```typescript
maxExtraGuessesFree: 2,
maxExtraGuessesPro: 3,
```
`gameStore` reads appropriate value based on `settingsStore.getState().isPro` when granting extra guesses.

## Key risks
- P3: Play Store rejection (ad/IAP compliance) — declare ads in Play Console, privacy policy, test ads first
- P6: Interstitial double-loading — mitigated by Zustand ad store ref-counted lifecycle
- P7: Missing IAP restore flow — implemented from day one (D-99–D-102)
- P11: Android back button during ad — blocked via BackHandler listener during critical states

## Dependencies added
- `react-native-google-mobile-ads` (16.x) — AdMob ads
- `react-native-iap` (15.x) — Play Store IAP
- `@react-native-firebase/remote-config` — Remote config for ad IDs

See [tech-stack](tech-stack.md) for exact versions.
