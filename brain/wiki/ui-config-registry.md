# ui-config-registry
updated: 2026-07-08 (Phase 6 additions — colorBlindMode, reduceMotion, theme selector row types)
tags: [architecture, patterns, UI, config-driven, D-77, D-78, D-79, D-80, D-81, D-110, accessibility]
related: [architecture, phase-structure, storage-strategy, monetization, accessibility]

## What
Data-driven UI architecture: screens render from TypeScript config arrays instead of hardcoded JSX. Config is the single source of truth for what appears, in what order, and how it behaves.

## Motivation (D-77)
- Phase 3 (Stats & Settings) needs composable stat cards + settings rows
- Future phases add rows: Phase 4 (ad/IAP toggles), Phase 5 (swap placeholder → sign-in), Phase 6 (accessibility toggles)
- Without config: each addition edits component JSX tree
- With config: each addition appends to an array

## File location
`src/config/ui.ts` — single file, exported arrays, no runtime deps.

## Stats config (D-78)
```typescript
interface StatsCardConfig {
  id: string;
  title: string;
  stats?: string[];          // stat keys to display
  render?: 'lengthTable' | 'barChart';  // special renderers
}

const statsConfig: StatsCardConfig[] = [
  { id: 'overview', title: 'Overview', stats: ['totalGames', 'wins', 'winRate', 'currentStreak', 'maxStreak'] },
  { id: 'byLength', title: 'By Word Length', render: 'lengthTable' },
  { id: 'distribution', title: 'Guess Distribution', render: 'barChart' },
];
```
- Cards render in array order
- Reorder by moving entries
- Add/remove by editing array
- StatsScreen is a dumb iterator

## Settings config (D-79, extended in UI-SPEC)
```typescript
type SettingsRowConfig =
  | { type: 'toggle'; id: string; label: string; description?: string; storeKey: keyof AppSettings }
  | { type: 'placeholder'; id: string; label: string; description: string }
  | { type: 'info'; id: string; label: string; value: string }
  | { type: 'restore'; id: string; label: string; description?: string }  // Phase 4 addition (D-110)
  | { type: 'purchase'; id: string; label: string; description?: string; productId: string };  // Phase 4 addition (purchase flow)
```

### Row type renderers
| Type | Renders | Behavior |
|------|---------|----------|
| `toggle` | Label (left) + RN Switch (right) | Switch bound to settingsStore[storeKey]; track=accent when on, tileEmpty when off |
| `placeholder` | Label (left) + "Coming soon" text (right) | Non-interactive; swapped to `signInButton` in Phase 5 |
| `info` | Label (left) + value string (right) | Read-only display, no interaction |
| `restore` | Tappable row (left) + action text (right) | Calls `getAvailablePurchases()` → sets `isPro` → color-coded toast. Hidden when `isPro === true` (D-100) |
| `purchase` | Tappable row with price label + subtitle | Calls `requestPurchase()` → `purchaseUpdatedListener` → `finishTransaction` → `setPro(true)` → toast. Hidden when `isPro === true` |

### Phase 4 sections (from config, Account)
| Section | Rows |
|---------|------|
| Gameplay | `hardMode` (toggle) |
| Audio & Haptics | `sound` (toggle), `haptic` (toggle) |
| Account | `signIn` (placeholder) + `proStatus` (info) + `removeAds` (purchase) + `restorePurchases` (restore) — D-110, D-111 |

Rows separated by hairline divider: `1px solid tileEmpty`, 4px vertical margin.

## Screen contract
Screens receive config, iterate, render:
```
StatsScreen: reads statsConfig → maps over cards → renders each card
SettingsScreen: reads settingsConfig → maps over sections → renders setting rows
```
No hardcoded layout logic — screens are pure renderers.

## Extension pattern (D-80)
| Phase | Operation |
|-------|-----------|
| Phase 4 | Added `restore` + `purchase` row types to SettingsRowConfig union; Account section extended with pro status info, purchase row, restore row (D-110, D-111). All implemented. |
| Phase 5 | Swap placeholder → signInButton row in settingsConfig |
| Phase 6 | Added `colorBlindMode` toggle, `reduceMotion` toggle, `themeSelector` segmented control. New 

## UI components (Phase 3 additions)

### StatCard (`src/components/ui/StatCard.tsx`)
Reusable card container for stat sections. Driven by config array.

| Prop | Type | Required |
|------|------|----------|
| title | string | Yes |
| children | ReactNode | Yes |

Vis: surface bg (#fff), borderRadius 12, shadow `{elevation:3, opacity:0.08}`, padding 24px, marginBottom 16px. Title: 18px bold textPrimary.

### SettingsRow (`src/components/ui/SettingsRow.tsx`)
Generic row renderer dispatching on `SettingsRowConfig.type`. Single file switch/if-else. Renders toggle, placeholder, info, restore, or purchase (Phase 4).

### Share utility (`src/utils/share.ts`)
Pure function `generateShareText(gameResult)` → emoji grid string. Input: GameResult with mode, word, attempts, won, guesses[][], date. Output: Wordle-style emoji grid with header + date + rows + footer.

## Component contracts (edge cases)
| Scenario | Behavior |
|----------|----------|
| Empty stats | Centered card: "No games played yet." → "Complete a game to see your stats!" |
| Stats loading | ActivityIndicator (accent), centered, not empty state |
| SQLite error | Error card + pull-to-refresh to retry |
| Zero wins | Chart shows flat bars at 0, Win % = 0%, streak = 0 |
| Share no games | Button hidden when totalGames === 0 |
| Share win vs loss | Footer: "5/6" (win) / "X/6" (loss) |
| First launch no settings | Defaults: hardMode=true, sound=true, haptic=true, isPro=false |

## Screen behavior (Phase 3 decisions)
| Screen | Feature | Behavior |
|--------|---------|----------|
| Stats | Entrance animation | Cards fade-in + slide-up (opacity 0→1, translateY 10→0), 300ms, 80ms stagger per card (D-82) |
| Stats | Share button | Floating action button, `position: absolute` at bottom, overlay on ScrollView (D-83) |
| Stats | Pull-to-refresh | Always enabled via `RefreshControl`, re-runs `statsStore.loadStats()` (D-86) |

## Typography constants (D-84)
5-size type scale extracted to `src/constants/typography.ts` — follows `colors.ts`/`layout.ts` pattern. Screens import constants instead of inline StyleSheet values. See [design-tokens](design-tokens.md) for scale.

## Constraints (D-81)
- Plain TypeScript arrays — no heavy abstraction, no DI framework
- Simple switch/if-else in screen component for row type dispatch
- Low ceremony, high maintainability
- Config is the architecture — screens just iterate it
