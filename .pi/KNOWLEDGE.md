# word-guess — KNOWLEDGE.md
updated: 2026-07-06
tags: [knowledge, lessons, patterns, rules]

## Project status
- **Phase 4 (Monetization):** Context gathered, ready for planning
- **Phase 3 (Stats & Settings):** Complete — all 5 requirements, 3 plans, 3 waves
- **Phase 2 (Core Gameplay):** Complete — 19 requirements, 4 plans, 3 waves
- **Phase 1 (Foundation):** Complete — 6 requirements, 3 plans, 2 waves

---

## Patterns & architecture decisions

### UI Configuration Registry (Phase 3, proven pattern)
Screens driven by TypeScript config arrays from `src/config/ui.ts`, not hardcoded JSX. Screens iterate config → render. Reorder/add/remove by editing config array. Extension pattern: Phase 4 adds `restore` row type, Phase 5 swaps placeholder → signInButton.

### Three-tier storage
1. MMKV — synchronous key-value for settings + active game (Zustand persist middleware)
2. expo-sqlite — ACID for game history table (aggregated stats via queries)
3. AsyncStorage — auth tokens (Firebase SDK convention)

### Single-owner state lifecycle
For shared state fields (e.g. `isRevealing`), only one plan adds field definition + lifecycle management. Other plans reference as already-existing. Violation causes merge conflicts.

### Cross-plan data contract alignment
When 2+ plans in same wave modify the same store/service: agree on exact function signatures, return types, and import paths before execution. Plan checker must verify all cross-plan call sites are compatible.

### Animation completion timing formula
```
lastTileDelay = (letterCount - 1) * TILE_STAGGER_DELAY
totalTime = lastTileDelay + TILE_FLIP_DURATION + ANIMATION_COMPLETION_BUFFER
if (any correct tile in guess) totalTime += TILE_CORRECT_BOUNCE_EXTRA
```
Keyboard color update fires after `setTimeout(totalTime)`. Input blocked via `isRevealing` flag, queued in `pendingInputs`, drained after animation completes.

### Dynamic tile sizing
`tileSize` computed from `screenWidth`, `wordLength`, `tileGap`, container padding. Passed as prop GameBoard → GuessRow → Tile. Font = `tileSize × 0.48`. Caps at 56px max, floors at 32px min. Works for all word lengths 5-10.

### Per-mode streak tracking
- Daily Challenge: separate streak from non-daily modes
- Random + Free Play: share a streak (Free Play removed, type preserved)
- Endless: separate MMKV key (`getEndlessStreak`/`setEndlessStreak`)
- Streak reset: consecutive wins until first loss, ordered by `completed_at DESC`
- SQL aggregation: queries order by `completed_at DESC`, group by `mode`

---

## Known bugs & fixes

### Dictionary case sensitivity (FIXED 2026-07-05)
Preprocessing outputs words in **lowercase**. Lookups must use `.toLowerCase()`. Definition map keys are **UPPERCASE**, use `.toUpperCase()`. Bug: `isValidGuess` used `.toUpperCase()` against lowercase lists → all guesses rejected as "Not in word list".

### Input queue drain (FIXED 2026-07-05)
`flushPendingInputs()` originally processed only 1 queued item per call. Fix: `setTimeout(() => get().flushPendingInputs(), 0)` after each non-ENTER input — recursively drains queue on next tick. ENTER stops draining (triggers new animation → submission path handles re-flush).

### TextSecondary WCAG debt (UNFIXED)
`textSecondary` (#787c7e) on `surface` (#fff) = 4.09:1 contrast ratio. Fails WCAG AA for normal text (<18px). Affects stat labels (12px) and secondary text on white backgrounds. Fix: darken to ~#6b6b6b (~4.7:1), or accept for v1.

### White confetti invisible on dark overlay (UNFIXED)
`Confetti.tsx` PARTICLE_COLORS includes `#ffffff`. ResultModal renders inside `rgba(0,0,0,0.5)` overlay → ~1/7 particles invisible. Fix: remove `#ffffff` or replace with bright color (e.g. `#f1c40f`).

### Yellow tile contrast failure (UNFIXED)
Present tiles/keys `#c9b458` with `textInverse` `#ffffff` → ~1.5:1 contrast. Fix: use dark text `#1a1a2e` on yellow tiles/keys, or darken present color.

---

## Build & SDK rules

### Always use `npx expo install` for Expo SDK packages
Never `npm install expo-*` directly. `npx expo install` handles version alignment with installed Expo SDK major. Run `npx expo install --check` after any package.json changes to verify.

### Known SDK version mismatches (before fix)
- expo-sqlite@15.2.14 → 57.0.0 (incompatible with SDK 57, causes NoClassDefFoundError)
- react-native-gesture-handler@3.0.2 → 2.32.0
- react-native-reanimated@4.5.1 → 4.5.0
- react-native-safe-area-context@5.8.0 → 5.7.0
- @react-native-async-storage/async-storage@3.1.1 → 2.2.0

### Prebuild --clean wipes local.properties
After `npx expo prebuild --clean`, must recreate `android/local.properties`:
```
sdk.dir=C:\\Users\\Xent\\AppData\\Local\\Android\\Sdk
```

### AGP version pinning
React Native 0.86 ships AGP 8.12.0 via version catalog. Pin to 8.9.1 in `android/build.gradle` if Android Studio doesn't support 8.12.x. Warning is cosmetic after pinning.

### react-native-nitro-modules is a peer dep
`react-native-mmkv@4.3.2` needs `react-native-nitro-modules` installed separately: `npx expo install react-native-nitro-modules && npx expo prebuild`. Without this, Gradle fails with "Project with path ':react-native-nitro-modules' could not be found".

### Static require() only
Metro cannot resolve dynamic `require()` with template literals or TypeScript path aliases. All word list files bundled via static `require()` with relative paths. `@/` alias removed 2026-07-05.

---

## Monetization decisions (Phase 4 context)

### Ad model
- Interstitial at ResultModal → next-screen transition (Flappy Bird-style), never during play
- Frequency: Daily = every game, Endless/Random = every 2nd (session-local counter)
- Rewarded ad: ResultModal loss state only, +1 extra guess per ad, max 2 free / 3 Pro
- Pro IAP: `com.vorithstudio.wordguess.pro`, $1.99, removes interstitials only (rewarded still available as gameplay mechanic)

### Ad manager architecture
Zustand store (`adStore` — singleton, ref-counted lifecycle per ad unit ID). Not a service singleton or React Context. Prevents double-loading.

### Remote Config for ad IDs
Firebase Remote Config (`@react-native-firebase/remote-config`) — keys: `admob_interstitial_id`, `admob_rewarded_id`, `admob_interstitial_frequency_override`. Fallback to test IDs on fetch failure. Single build serves all environments.

### Restore purchases edge cases
- Button in Settings → Account section, hidden when `isPro === true`
- Fresh install on new device: `isPro` starts `false` → button visible → restore → hides
- App data cleared: `isPro` resets → button re-appears
- Color-coded toast: green for success, red for failure

---

## Brain/wiki conventions
- `brain/wiki/index.md` is the master index — every page must be registered there
- Pages use `updated:`, `tags:`, `related:` front-matter fields
- One concept per page, <400 lines, token-efficient
- Cross-link via `related:` field referencing other page titles
- Schema defined in `brain/schema.md`
