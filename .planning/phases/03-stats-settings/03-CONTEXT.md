# Phase 3: Stats & Settings - Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Players can view persistent statistics, configure game settings, share results, and trust that game state is saved across sessions.

**Requirements:** STAT-01 through STAT-05

**In scope:**
- Local stats tracking — total games, wins, win %, current streak, max streak, guess distribution (per-number-of-attempts), games by word length; stored in SQLite
- Stats screen displaying all tracked stats with guess distribution bar chart
- Settings screen with Hard Mode toggle, sound on/off, haptic on/off, account section placeholder
- Share results as emoji text grid (🟩🟨⬛) with mode, attempts, date — copied to clipboard on tap
- AsyncStorage used only for lightweight settings (auth tokens, Pro status flag); game history and stats in SQLite

**Out of scope:**
- Ads, IAP, monetization (Phase 4)
- Google Sign-In, cloud sync, leaderboards (Phase 5)
- Accessibility, Play Store compliance (Phase 6)
- Sound files — service API only (deferred in Phase 2, developer adds files separately)

</domain>

<decisions>
## Implementation Decisions

### 1. Stats Screen Layout
- **D-67:** Stats displayed in **scrolling card sections** — each group of related stats gets its own card (e.g., "Overview" card with total games, wins, win %, current/max streak; "By Word Length" card with per-length breakdown; "Guess Distribution" card with bar chart).
- **D-68:** Card order, contents, and visibility driven by data config (not hardcoded JSX) — see UI Configuration Registry decision below.

### 2. Guess Distribution Chart
- **D-69:** Use **`react-native-chart-kit`** for the bar chart rendering guess distribution (per-number-of-attempts histogram).
- **D-70:** Chart driven by the same data config registry — if the stat card definition includes a chart, the screen renders it generically.

### 3. Settings Screen Account Section
- **D-71:** Placeholder label: **"Sign in — coming in Phase 5"** instead of a functional sign-in button. This placeholder is a rendered row type from the UI config registry, to be swapped to `type: "signInButton"` in Phase 5.

### 4. Share Results
- **D-72:** **Manual share button in the Stats screen** — user taps a button to copy the emoji grid (🟩🟨⬛) to clipboard. Not automatic on game completion.
- **D-73:** Shared format includes: mode, number of attempts, and date alongside the emoji grid.

### 5. Streak Calculation
- **D-74:** **Per-mode streak tracking** — Daily Challenge streak tracked separately from Endless streak (which already exists in MMKV, tracked separately). Free Play and Random modes share same streak tracking as non-daily modes.
- **D-75:** **Streak resets on `lost` state** — reaching a loss in any game resets that mode's streak to 0. Endless streak continues to use its own win/loss logic (already implemented in Phase 2 MMKV storage).
- **D-76:** The "current streak" in the stats overview reflects the last-played mode's streak when viewed generically; per-mode streaks shown in detailed views.

### 6. UI Configuration Registry
- **D-77:** Create **`src/config/ui.ts`** as a single source of truth for composable UI definitions. This file exports configuration arrays that drive rendering in StatsScreen and SettingsScreen — the screens become iterators, not hardcoded layouts.
- **D-78:** Stats config: array of card definitions, each with id, title, and the stats/chart it renders. Cards render in config order; reorder/remove/add by editing the array.
- **D-79:** Settings config: array of sections, each with rows typed by a union (`toggle`, `placeholder`, later `button`, `signInButton`). Each row declares its store binding (which Zustand field it toggles).
- **D-80:** This pattern extends to future phases — Phase 4 (monetization) appends ad/IAP toggles; Phase 5 swaps the placeholder to sign-in; Phase 6 adds accessibility toggles. Game mode selection menu, home screen layout, and navigation can later adopt the same approach.
- **D-81:** No heavyweight abstraction — the config is a plain TypeScript array. The screen component maps over it with a simple switch on row type. Low ceremony, high maintainability.

### Claude's Discretion
- Precise card layout styling (border radius, shadow, padding) — use existing `colors.ts` and `layout.ts` constants
- react-native-chart-kit color scheme (mint green, sunny yellow, slate palette from `colors.ts`)
- Emoji grid generation format (standard Wordle-style row layout)
- Animation/transition details for card rendering (simple fade-in or none — this is a data screen)
- Stats screen tab/scroll behavior (vertical ScrollView, sticky section headers optional)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — Full requirement set, STAT-01 through STAT-05 define Phase 3 scope
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, mode

### Prior Phase Decisions
- `.planning/phases/02-core-gameplay/02-CONTEXT.md` — D-25 through D-66 carry forward (game state management, storage patterns, component architecture, animation constants)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01 through D-24 (project structure, storage split, nav flow, path alias)

### Codebase — Key Integration Points
- `src/screens/StatsScreen.tsx` — Placeholder to be replaced with data-driven card layout
- `src/screens/SettingsScreen.tsx` — Placeholder to be replaced with config-driven settings rows
- `src/stores/statsStore.ts` — Existing store with `loadStats()` and `recordGame()` — needs stat computation (streaks, distribution) added
- `src/stores/settingsStore.ts` — Existing store with toggle actions — persists via MMKV
- `src/services/storage.ts` — SQLite init, `game_history` table, `getStats()`, `saveGameResult()`, daily completion tracking, endless streak storage
- `src/types/stats.ts` — `PlayerStats` interface — may need extension for per-mode streaks
- `src/types/settings.ts` — `AppSettings` interface — used by settingsStore
- `src/constants/colors.ts` — Color palette for chart and card theming
- `src/constants/layout.ts` — Spacing and sizing constants
- `src/components/ui/Button.tsx` — Reusable button component for share action

### To Be Created
- `src/config/ui.ts` — UI Configuration Registry (D-77)
- New component(s) in `src/components/ui/` for config-driven setting rows

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/stores/statsStore.ts` — Already calls `getStats()` and `saveGameResult()` from storage service. Needs expansion for streak computation, per-mode aggregation.
- `src/stores/settingsStore.ts` — Already has toggle actions for `hardModeEnabled`, `soundEnabled`, `hapticEnabled`, `isPro`. Config registry will reference these by key.
- `src/services/storage.ts` — SQLite schema already has `game_history` table with correct columns. `getStats()` returns current stub stats — needs full query with streak calculation.
- `src/screens/StatsScreen.tsx` / `SettingsScreen.tsx` — Empty placeholders ready to be replaced.
- `src/components/ui/Button.tsx` — Reusable button component for share-to-clipboard.
- `src/constants/colors.ts` / `layout.ts` — Design tokens for card and chart styling.

### Established Patterns
- Zustand stores with explicit actions (D-12) — settingsStore already follows this.
- Services layer for SDK wrappers (storage.ts pattern) — statsStore delegates to storage service.
- Type-based directory layout with barrel exports.
- MMKV for synchronous settings writes (D-21), SQLite for structured history (D-22).

### Integration Points
- StatsScreen taps into statsStore `loadStats()` on mount, displays reactively.
- SettingsScreen reads settingsStore directly, each toggle binds to its store action.
- Game store (`gameStore.submitGuess`) should call `statsStore.recordGame()` on win/loss to persist results — this may need wiring if not already present.
- share-to-clipboard uses `expo-clipboard` (already in tech stack, see tech-stack.md).

### Needed New / Modified Files
- `src/config/ui.ts` — NEW: UI Configuration Registry (stats card config, settings section config)
- `src/screens/StatsScreen.tsx` — REWRITE: data-driven card layout
- `src/screens/SettingsScreen.tsx` — REWRITE: config-driven settings rows
- `src/stores/statsStore.ts` — MODIFY: full stat computation (streak, distribution, per-mode aggregation)
- `src/services/storage.ts` — MODIFY: `getStats()` needs full SQL aggregation queries
- `src/types/stats.ts` — MODIFY: may need per-mode streak fields
- `src/components/ui/` — NEW: generic `SettingRow` component(s)

</code_context>

<specifics>
## Specific Ideas

- **Stats card structure** — "Overview" (total games, wins, win %, streak), "By Word Length" (per-length table), "Guess Distribution" (bar chart card). All driven by `ui.ts` config array.
- **Settings sections** — "Gameplay" (Hard Mode toggle), "Audio & Haptics" (sound, haptic toggles), "Account" (sign-in placeholder). All driven by `ui.ts` config sections.
- **Share format** — Standard emoji grid per game: mode, row of tiles per guess (🟩🟨⬛), date. Multi-line text copied to clipboard.
- **Config registry structure** — Plain TypeScript arrays of typed config objects. The screen imports and iterates. Future phases import and extend.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-copy results on game end** — Decision was to use manual share button in Stats screen. Auto-copy was discussed and deferred for now (could be added as optional toggle in future).

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 3-Stats & Settings*
*Context gathered: 2026-07-05*
