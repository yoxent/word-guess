# Phase 4: Monetization — Context

**Gathered:** 2026-07-06
**Status:** Ready for planning

---

<domain>
## Phase Boundary

Free-to-play monetization layer for Word Guess — interstitial ads, rewarded video for extra guesses, Pro IAP ($1.99) to remove interstitials, purchase restore flow.

**Requirements:** AD-01 through AD-07

### In scope
- Interstitial ad after completed games — Flappy Bird style (shows at transition from ResultModal back to menu / next game)
- Frequency-capped interstitials — Daily: every game; Endless/Random: every 2nd game
- Rewarded video ad: button in ResultModal (loss state only), +1 extra guess per ad
- Pro IAP ($1.99, non-consumable) — removes all interstitial ads permanently; product ID `com.vorithstudio.wordguess.pro`
- Restore Purchases in Settings Account section — hidden when `isPro` already active
- Singleton ad manager (Zustand store) — ref-counted lifecycle, prevents double-loading
- Ad unit IDs via Firebase Remote Config — single build, fetch on launch, cache locally
- Settings config registry extension: add Restore Purchases button + Remove Ads info in Account section
- Toast feedback (color-coded) for restore success/failure

### Out of scope
- Google Sign-In, cloud sync, leaderboards (Phase 5)
- Accessibility, Play Store compliance (Phase 6)
- Sound files (deferred — dev adds separately)
- Server-side receipt validation (future if needed)
- RevenueCat or other purchase SDK middleware (react-native-iap only)

</domain>

<decisions>
## Implementation Decisions

### Prior Phase Carry-Forward

| Phase | Decisions | Relevance |
|-------|-----------|-----------|
| Phase 1 | D-01–D-24 | Project structure, storage split (MMKV/SQLite/AsyncStorage), settings store with MMKV persist, config constants pattern, app.json |
| Phase 2 | D-25–D-66 | Game state (extraGuessesUsed, maxAttempts = letterCount + 1), sound service stub pattern, Zustand store patterns, Reanimated worklet isolation |
| Phase 3 | D-67–D-86 | Config-driven settings UI (`src/config/ui.ts` — SettingsSectionConfig, SettingsRowConfig), `setPro()` in settingsStore, `lastGameResult` in statsStore, barrel export pattern |

### Phase 4 Decisions

#### 1. Interstitial Ad Timing
- **D-87:** Flappy Bird-style — interstitial shows at **transition from ResultModal to the next screen** (back to menu, or "Play Next" in Endless mode). Never during active gameplay.

#### 2. Interstitial Ad Frequency
- **D-88:** Frequency capped per mode:
  - **Daily Challenge:** every game (1 per length per day — low volume)
  - **Endless mode:** every 2nd game
  - **Random mode:** every 2nd game (same as Endless)

#### 3. Rewarded Ad UX
- **D-89:** Rewarded ad button appears only in **ResultModal on loss state** (not during active gameplay, not on win).
- **D-90:** Button placed at the **bottom of the ResultModal**, below the emoji grid and action buttons.
- **D-91:** Tapping the button → watches rewarded video → game resumes where it left off with the board showing the failed state + one more attempt slot added to `maxAttempts`. The modal closes, extra guess is live.

#### 4. Extra Guesses Per Tier
- **D-92:** Maximum extra guesses per game via rewarded ads:
  - **Free tier:** 2 (`maxExtraGuessesFree`)
  - **Pro tier:** 3 (`maxExtraGuessesPro`)
- **D-93:** Pro users CAN still watch rewarded ads for extra guesses. Pro entitlement removes interstitials only, not the rewarded video mechanic.
- **D-94:** Split `maxExtraGuesses` in `config.ts` into `maxExtraGuessesFree: 2` and `maxExtraGuessesPro: 3`.

#### 5. Pro IAP Product
- **D-95:** Product ID: `com.vorithstudio.wordguess.pro` (prefixed with package name `com.vorithstudio.wordguess`)
- **D-96:** Price: $1.99 USD
- **D-97:** Non-consumable purchase (restorable)
- **D-98:** Library: `react-native-iap` (already decided in Phase 1 research)

#### 6. Restore Purchases UX
- **D-99:** Restore Purchases button in **Settings → Account section** (replacing/replacing-around the Phase 3 placeholder `"Sign in — coming in Phase 5"`)
- **D-100:** Button **hidden when `isPro === true`** — no need to restore what's already active
- **D-101:** On tap → calls `getPurchases()` → if valid Pro purchase found, sets `isPro = true` and shows **color-coded toast**: green for success ("Pro restored!"), red for failure ("No purchases found to restore")
- **D-102:** Edge case: fresh install on new device. `isPro` starts false → Restore button visible → user taps Restore → purchases found → Pro activated → button hidden. Clean loop.

#### 7. Ad Manager Architecture
- **D-103:** **Zustand store** — `adStore.ts` — singleton with ref-counted ad lifecycle per unit ID.
- **D-104:** Interstitial pre-loaded at game start; rewarded pre-loaded on app launch.
- **D-105:** `adStore` exposes: `isInterstitialLoaded`, `showInterstitial()`, `isRewardedLoaded`, `showRewarded(onRewarded: callback)`, `preloadAll()`.

#### 8. Ad Unit ID Configuration
- **D-106:** **Firebase Remote Config** — ad unit IDs fetched remotely, cached locally.
- **D-107:** Add `@react-native-firebase/remote-config` as Phase 4 dependency. Firebase is already in the project (Firestore for Phase 5), so adding Remote Config alongside is a lightweight addition.
- **D-108:** Fallback: if Remote Config fetch fails, use **compiled-in test ad IDs** (so development never blocks on network).
- **D-109:** Default Remote Config keys: `admob_interstitial_id`, `admob_rewarded_id`, `admob_interstitial_frequency_override` (optional future use).

#### 9. Settings Config Integration (Phase 3 Registry)
- **D-110:** Add rows to the existing **Account section** in `src/config/ui.ts`:
  - Pro status info row (type: `info`, shows "Pro" / value "Active" or "—")
  - Remove Ads row with price description (type description TBD — see Claude's Discretion)
  - Restore Purchases button (type: `restore` — add to SettingsRowConfig union)
- **D-111:** The Phase 3 placeholder `"Sign in — coming in Phase 5"` stays in Account section alongside the monetization rows.

#### 10. Remove Ads Price Display
- **D-112:** Default to **both** — row label shows "Remove Ads · $1.99" and a description subtitle shows "One-time purchase, removes all ads forever". Both elements are easy to remove/swap independently (config data, not hardcoded JSX).

### Claude's Discretion
- Precise rewarded ad button styling inside ResultModal (consistent with existing modal buttons)
- Toast component placement (absolute overlay vs inline)
- Ad store state machine exact transitions (loading, loaded, showing, shown, error)
- Firebase Remote Config fetch timing (on app launch with cache)
- ResultModal layout adjustment for the new rewarded ad button position
- The new `restore` row type in SettingsRowConfig — it needs a new case in the switch in `SettingsRow.tsx`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — AD-01 through AD-07 define Phase 4 scope
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, mode (mvp)

### Prior Phase Decisions
- `.planning/phases/03-stats-settings/03-CONTEXT.md` — D-67 through D-86 (config registry pattern, settingsStore.setPro(), config-driven settings UI, barrel exports)
- `.planning/phases/02-core-gameplay/02-CONTEXT.md` — D-25 through D-66 (game state management, extraGuessesUsed, maxAttempts, result modal, sound service pattern)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01 through D-24 (project structure, storage split, settingsStore, config constants, app.json)

### Brain (wiki context)
- `brain/wiki/tech-stack.md` — Dependencies: react-native-google-mobile-ads (16.x), react-native-iap (15.x), Firebase, and anti-picks (RevenueCat)
- `brain/wiki/phase-structure.md` — Phase 4 overview, requirements, deployment flow
- `brain/wiki/key-risks.md` — P3 (Play Store rejection), P6 (interstitial double-loading), P7 (missing IAP restore flow), P11 (back button during ad/IAP)
- `brain/wiki/architecture.md` — Service singleton pattern, Zustand store pattern, UI config registry extension pattern
- `brain/wiki/ui-config-registry.md` — D-80 extension pattern for Phase 4 (append ad/IAP toggles), SettingsRowConfig type union

### Codebase — Key Integration Points
- `src/constants/config.ts` — `maxExtraGuesses: 2` to be split into per-tier values
- `src/stores/settingsStore.ts` — Has `setPro()` and `isPro`, persisted via MMKV. Monetization reads `isPro` for gating.
- `src/config/ui.ts` — Account section config to extend with monetization rows
- `src/components/ui/SettingsRow.tsx` — Toggle/placeholder/info dispatch — needs a new `restore` row type
- `src/components/game/ResultModal.tsx` — Where rewarded ad button will be placed (loss state)
- `src/screens/GameScreen.tsx` — Animation completion callback — already has daily/endless persistence + stats recording. Needs adStore integration (show interstitial at transition).
- `src/stores/gameStore.ts` — `session.maxAttempts`, `session.extraGuessesUsed`, `session.status` — all relevant for extra guess logic

### Dependencies to Add
- `@react-native-firebase/remote-config` — Firebase Remote Config for remote ad unit IDs
- `react-native-google-mobile-ads` (16.x) — Already in tech-stack as pending Phase 4, now installing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`ResultModal.tsx`** (`src/components/game/ResultModal.tsx`) — Already handles win/loss display, emoji grid, "Back to Menu" / "Play Next" buttons. Adding a rewarded ad button on loss state slots into existing layout.
- **`SettingsRow.tsx`** (`src/components/ui/SettingsRow.tsx`) — Switch-dispatch renderer for toggle/placeholder/info. Adding a `restore` case is one more branch.
- **`config/ui.ts`** (`src/config/ui.ts`) — Account section defined as `{ type: 'placeholder', id: 'signIn', ... }`. Monetization rows get added alongside it. The section becomes: sign-in placeholder + pro status info + remove ads description + restore purchases button.
- **`settingsStore.ts`** (`src/stores/settingsStore.ts`) — `setPro()` and `isPro` already exist. Ad gating is as simple as `if (!settingsStore.getState().isPro) showAd()`.
- **`constants/config.ts`** (`src/constants/config.ts`) — `maxExtraGuesses: 2` to be split into per-tier values. Also storage keys defined here.

### Established Patterns
- **Service singleton** (from `storage.ts`): `init()` called at startup + typed accessors. The `adStore` can follow this pattern (as a Zustand store, not a class, per D-103).
- **Config-driven UI** (from Phase 3): Adding settings rows = editing an array. No JSX changes in SettingsScreen needed.
- **Firebase module pattern**: Firebase Auth/Firestore will be added in Phase 5. Adding Remote Config now follows the same `@react-native-firebase/*` pattern.

### Integration Points
- **ResultModal → rewarded ad:** Loss state result → new "Watch ad for +1" button → `adStore.showRewarded()` → ad completes → `gameStore.addExtraGuess()` → `maxAttempts++` → modal closes → game continues.
- **GameScreen result transition → interstitial:** After ResultModal dismissal (Back to Menu / Play Next) → `adStore.showInterstitial()` (if frequency allows) → interstitial shown → then navigation/next game.
- **Settings → Firebase Remote Config:** On app launch, `remoteConfig().fetchAndActivate()` populates ad unit IDs. Falls back to test IDs on failure.
- **Settings → Restore Purchases:** Button in Account section → `RNIap.getPurchases()` → if valid `com.vorithstudio.wordguess.pro` found → `settingsStore.setPro(true)` → toast shown → button hides.
- **GameStore → extraGuessesUsed:** Already tracked. Extra guess flow: `session.maxAttempts++` + `session.extraGuessesUsed++`. Input queue must not interfere.

### Ad Store Zustand State Shape (starting point for planning)
```typescript
interface AdState {
  interstitialLoaded: boolean;
  interstitialLoading: boolean;
  rewardedLoaded: boolean;
  rewardedLoading: boolean;
  gamesSinceLastAd: number;  // for frequency capping

  preloadInterstitial: () => Promise<void>;
  preloadRewarded: () => Promise<void>;
  showInterstitial: () => Promise<boolean>;  // returns whether ad was shown
  showRewarded: (onRewarded: () => void) => Promise<boolean>;
}
```

### Frequency Counter
- `gamesSinceLastAd` increments on each game completion
- Interstitial shown only when `gamesSinceLastAd >= threshold` (2 for Endless/Random, 1 for Daily)
- Resets to 0 after interstitial is shown
- Not persisted across sessions (session-local counter is fine — interstitial frequency doesn't need cross-session memory)

</code_context>

<specifics>
## Specific Ideas

- **Flappy Bird-style interstitial timing** — ad shows at transition from results to next screen, not during gameplay. Frequency-capped.
- **Rewarded ad in ResultModal footer** — loss-only, bottom of modal, closes modal on completion, game resumes with +1 attempt.
- **Restore hidden when Pro active** — button visible only when `isPro === false`. Fresh install on new device shows it; after restore success, button hides.
- **Firebase Remote Config for ad IDs** — fetch on launch, cache locally, fallback to test IDs. Single build serves dev and prod.
- **Config registry pattern extension** — new `restore` SettingsRowConfig type. Phase 3's SettingsScreen iterates unchanged — just a new switch case in SettingsRow.tsx.

</specifics>

<deferred>
## Deferred Ideas
- **Server-side receipt validation** — not needed for MVP. Client-side check via `react-native-iap.getPurchases()` is sufficient for v1.
- **RevenueCat or purchase SDK middleware** — ruled out in Phase 1 (anti-pick: 25% fee on $1.99 IAP). react-native-iap direct is fine.
- **Interstitial during app open / splash** — not scoped. Interstitials only post-game.
- **Ad-free game mode without purchase** (e.g., watch N ads to earn temporary ad-free period) — not scoped, future idea.

</deferred>

---

*Phase: 4-Monetization*
*Context gathered: 2026-07-06*
*Prior phases carried forward: Phase 1 (D-01–D-24), Phase 2 (D-25–D-66), Phase 3 (D-67–D-86)*
*Decisions this phase: D-87 through D-112*
