# monetization
updated: 2026-07-10
tags: [ads, iap, monetization, phase-4, remote-config, ad-hints]
related: [phase-structure, tech-stack, ui-config-registry, key-risks, architecture, planning-patterns, hooks-order-discipline]

## Business model
Free-to-play with interstitial ads, rewarded video, Pro IAP $1.99. Pro removes interstitials only — rewarded ads remain available to Pro users (gameplay mechanic, not annoyance gate).

## Phase 4 execution (completed 2026-07-06)
3 plans, 2 waves, 12 implementation commits. TypeScript compiles clean.

| Plan | Wave | What it built |
|------|------|---------------|
| 04-01 | 1 | Deps install, config plugins, split maxExtraGuesses, adStore (Zustand), remoteConfig service, app wiring |
| 04-02 | 2 | Settings — restore + Pro purchase flows, UI config extension (restore/purchase row types) |
| 04-03 | 2 | Game — interstitial preload + frequency capping, rewarded ad button in ResultModal, addExtraGuess in gameStore |

- Wave 2 plans (04-02, 04-03) share config.ts (04-02 writes proProductId, 04-03 reads) — executed sequentially
- Plan checker caught AD-03 purchase flow missing — added `purchase` row type + `requestPurchase()` before execution
- Deps installed: react-native-google-mobile-ads@16.4.0, react-native-iap@15.3.6, @react-native-firebase/remote-config@25.1.0, @react-native-firebase/app@25.x
- Config plugins added to app.json: `react-native-google-mobile-ads` (with placeholder androidAppId), `react-native-iap`, `expo-build-properties` (kotlinVersion 2.2.0)
- UI-SPEC approved: 5/6 dimensions PASS, 1 FLAG (toast contrast deferred to Phase 6)

## Extra guess mechanics (gameStore.addExtraGuess)
- Only works from `status === 'lost'` state (D-89)
- Sets status back to `'playing'`, increments `maxAttempts++` and `extraGuessesUsed++`
- Gated by per-tier max: `maxExtraGuessesFree: 2`, `maxExtraGuessesPro: 3`
- Reads `isPro` from settingsStore to determine cap (D-92, D-93, D-94)

## Purchase flow (SettingsScreen)
| Aspect | Detail |
|--------|--------|
| Row type | `purchase` in SettingsRowConfig (productId field) |
| Action | `requestPurchase({ skus: [productId] })` |
| Listener | `purchaseUpdatedListener` checks product ID match |
| Completion | `finishTransaction({ purchase, isConsumable: false })` + `setPro(true)` |
| Hidden when | `isPro === true` (same pattern as restore) |
| Product ID | `com.vorithstudio.wordguess.pro` in config.ts |

### SettingsRowConfig types (Phase 4)
| Type | Renders | Behavior |
|------|---------|----------|
| `restore` | Tappable row | Calls `getAvailablePurchases()` → sets `isPro` → toast |
| `purchase` | Tappable row with price | Calls `requestPurchase()` → purchaseUpdatedListener → `setPro(true)` |
| `info` (pro status) | 

## Ad manager (Zustand store)
Singleton `adStore` with ref-counted lifecycle per ad unit ID. Prevents double-loading.

- `preloadInterstitial()` — called at game start
- `preloadRewarded()` — called on app launch
- `showInterstitial()` — at ResultModal→menu/next transition
- `showRewarded(onRewarded)` — returns `boolean` (shown/not)
- Tracks `gamesSinceLastAd` counter for frequency capping

Architecture: `src/stores/adStore.ts` — Zustand store (D-103), not service singleton or React Context.

**Implementation details:**
- InterstitialAd/RewardedAd instances stored as **module-level variables** outside Zustand (not serializable)
- Zustand tracks only boolean flags: loaded, loading
- `preloadInterstitial`/`preloadRewarded` check `interstitialLoaded || interstitialLoading` before creating — prevents double-loading (P6)
- Lazy preload: on CLOSED event, auto-preloads next ad so next show() call has a ready ad
- One-shot EARNED_REWARD listener: attached just before showRewarded(), cleaned up after callback fires — prevents stale references
- Error handling: if ad fails to load, flags reset to allow retry; callers never crash

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

## Rewarded ads — ad hints during gameplay

**Strategy:** Watch ad → get gameplay advantage during active game. Two hint types:

### Hint 1: +1 Row
| Aspect | Detail |
|--------|--------|
| Button | "Watch Ad · +1 Row" (sky blue, primary color) |
| Location | Between GameBoard and Keyboard |
| Visibility | `session.status === 'playing' && extraGuessesUsed < maxExtra` |
| Effect | `maxAttempts++`, `extraGuessesUsed++` — adds new empty row |
| Max uses | 2 (free) / 3 (pro) per game |
| Code | `gameStore.addExtraGuess()` — works during 'playing' status |

### Hint 2: Letter Hint
| Aspect | Detail |
|--------|--------|
| Button | "Letter Hint" (orange, secondary color, lightbulb icon) |
| Location | Next to +1 Row button |
| Visibility | `session.status === 'playing' && !session.letterHintUsed` |
| Effect | Highlights random unguessed letter on keyboard (blinking animation) |
| Max uses | 1 per game |
| Code | `gameStore.useLetterHint()` — sets `hintLetter` state + `letterHintUsed: true` |

### Letter hint mechanics
- Picks random letter from word that hasn't been guessed correctly yet
- If all letters guessed, picks any letter from word
- Keyboard key blinks via opacity animation (1→0.3→1, 500ms loop)
- Hint stops blinking once key gets color feedback (correct/present/absent)

### GameSession fields
| Field | Type | Purpose |
|-------|------|--------|
| `extraGuessesUsed` | number | Count of +1 Row hints used |
| `letterHintUsed` | boolean | Whether letter hint has been used |
| `maxAttempts` | number | Base + extra rows |

### gameStore actions
| Action | Triggers |
|--------|----------|
| `addExtraGuess()` | +1 Row ad reward — allows during 'playing' or 'lost' |
| `useLetterHint()` | Letter hint ad reward — only during 'playing', once per game |

### State management
- `hintLetter: string | null` in gameStore — tracks which letter is blinking
- Reset to `null` on `resetGame()` and `restoreSession()`

### Button styling
- Both buttons in horizontal row: `[+1 Row] [💡 Letter Hint]`
- Disabled/dimmed when ad not loaded (`!rewardedLoaded`)
- `+1 Row` shows remaining count: "(+2 left)" → "(+1 left)"
- `Letter Hint` hidden after use (not just disabled)

Pro users can still watch rewarded ads (D-93). The Pro purchase removes interstitials only — rewarded ads are a gameplay mechanic, not an annoyance.

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
| Dev mode | `getInterstitialAdId()`/`getRewardedAdId()` return `TestIds.*` directly when `__DEV__` is true — no Remote Config dependency in development |

Chosen over build-time env vars, config file flags, or EAS profiles — Remote Config allows one build to serve all environments and supports runtime switching (D-106).

## Settings config extension
- Phase 3's `SettingsRowConfig` union gains a `restore` type
- Phase 3 `SettingsRow.tsx` switch gets a new `restore` case
- Account section in `src/config/ui.ts` gains: pro status info row, remove ads description row, restore purchases button
- Phase 3 placeholder "Sign in — coming in Phase 5" stays alongside new rows (D-111)

### Row types added for Phase 4
| Type | Renders | Behavior |
|------|---------|----------|
| `restore` | Tappable row | Calls `getAvailablePurchases()` → checks `com.vorithstudio.wordguess.pro` → sets `isPro` → green toast "Pro restored!" / red toast "No purchases found to restore" → button hides |
| `purchase` | Tappable row with price + subtitle | Calls `requestPurchase({ skus: [productId] })` → `purchaseUpdatedListener` checks product ID match → `finishTransaction({ purchase, isConsumable: false })` → `setPro(true)` → green toast → row hides |
| `info` (pro status) | "Pro" left / "Active" or "—" right | Value is dynamic: reads `isPro` from settingsStore and overrides config at render time via useMemo in SettingsScreen. Non-interactive |

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
