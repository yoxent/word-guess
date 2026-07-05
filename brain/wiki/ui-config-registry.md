# ui-config-registry
updated: 2026-07-05
tags: [architecture, patterns, UI, config-driven, D-77, D-78, D-79, D-80, D-81]
related: [architecture, phase-structure, storage-strategy]

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

## Settings config (D-79)
```typescript
type SettingRow = ToggleRow | PlaceholderRow | ButtonRow;

interface ToggleRow {
  type: 'toggle';
  id: string;            // matches settingsStore key
  label: string;
  storeKey: keyof AppSettings;
}

interface PlaceholderRow {
  type: 'placeholder';
  label: string;
}

const settingsConfig: SettingSection[] = [
  { id: 'gameplay', title: 'Gameplay', rows: [
    { type: 'toggle', id: 'hardMode', label: 'Hard Mode', storeKey: 'hardModeEnabled' },
  ]},
  { id: 'audio', title: 'Audio & Haptics', rows: [
    { type: 'toggle', id: 'sound', label: 'Sound Effects', storeKey: 'soundEnabled' },
    { type: 'toggle', id: 'haptic', label: 'Haptic Feedback', storeKey: 'hapticEnabled' },
  ]},
  { id: 'account', title: 'Account', rows: [
    { type: 'placeholder', label: 'Sign in — coming in Phase 5' },
  ]},
];
```

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
| Phase 4 | Append ad/IAP toggle rows to settingsConfig |
| Phase 5 | Swap placeholder → signInButton row in settingsConfig |
| Phase 6 | Append accessibility toggle rows to settingsConfig |
| Future | Extend pattern to home screen layout, game mode menus, nav |

## Constraints (D-81)
- Plain TypeScript arrays — no heavy abstraction, no DI framework
- Simple switch/if-else in screen component for row type dispatch
- Low ceremony, high maintainability
- Config is the architecture — screens just iterate it
