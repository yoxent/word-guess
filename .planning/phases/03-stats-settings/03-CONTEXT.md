# Phase 3: Stats & Settings — Context

**Gathered:** 2026-07-05
**Status:** Ready for planning

---

<domain>
## Phase Boundary

Players can view persistent statistics, configure game settings, share results, and trust that game state is saved across sessions.

**Requirements:** STAT-01 through STAT-05

**Spec loaded:** UI-SPEC.md — full design contract with 52 edge cases, component contracts, design tokens, color conventions, interaction specs, accessibility requirements.

### In scope
- Local stats tracking — total games, wins, win %, current/max streak, guess distribution (per-number-of-attempts), games by word length; stored in SQLite
- Per-mode streak computation and display (daily, endless, free+random)
- Stats screen with scrolling card sections: Overview, By Word Length, Guess Distribution
- Config-driven settings screen: Hard Mode, sound, haptic toggles; account placeholder
- Share results as emoji text grid (🟩🟨⬛) with mode, attempts, date — copied to clipboard
- UI Configuration Registry (`src/config/ui.ts`) — data-driven composable UI for stats cards + settings rows
- Design tokens in `src/constants/typography.ts` (5-size type scale)
- Stats card entrance animation (fade-in stagger)
- Pull-to-refresh on Stats screen (always enabled)
- Wire game completion → stats recording (missing integration from Phase 2)

### Out of scope
- Ads, IAP, monetization (Phase 4)
- Google Sign-In, cloud sync, leaderboards (Phase 5)
- Accessibility, Play Store compliance (Phase 6)
- Sound files — service API only (deferred in Phase 2, developer adds files separately)
- Auto-copy results on game end — deferred (could be optional toggle in future)
</domain>

<spec_lock>
## Spec Lock

This phase is governed by **`03-UI-SPEC.md`** — a full UI design contract with checker sign-off. The following are locked by the spec and MUST NOT be re-negotiated:

- **Design system:** No new global tokens; references `colors.ts` and `layout.ts`
- **Spacing scale:** xs(4px), sm(8px), md(16px), lg(24px), xl(32px), 2xl(48px)
- **Typography scale:** Stat Value(32px/700), Card Title(18px/700), Settings Row(16px/400), Body(14px/400), Stat Label(12px/600)
- **Color roles:** Dominant(background #f5f5f0), Secondary(surface #ffffff), Accent(#4a9eff for toggle/share ONLY)
- **Chart colors:** tileCorrect(#6aaa64) for active bars, tileEmpty(#d3d6da) for zero-count bars
- **Component contracts:** StatCard, SettingsRow, StatsScreen, SettingsScreen, Share utility — all fully specified
- **Edge cases:** Empty stats, loading, SQLite error, zero wins, single game, very long streak, all lengths played, share with win/loss, first launch, settings during gameplay — 52+ cases covered
- **File inventory:** Which files to create/modify/add

Downstream agents MUST read `03-UI-SPEC.md` before planning or implementing.
</spec_lock>

<decisions>
## Implementation Decisions

### Prior Phase Carry-Forward

The following decisions from prior phases remain in effect for Phase 3:

| Phase | Decisions | Relevance |
|-------|-----------|-----------|
| Phase 1 | D-01–D-24 | Project structure, storage split (MMKV/SQLite/AsyncStorage), nav flow, type-based layout, barrel exports, settings persist via MMKV |
| Phase 2 | D-25–D-66 | Game state management, Zustand pattern, Reanimated worklets, storage service patterns, sound service stub, endless streak MMKV keys |

### Phase 3 Decisions

#### 1. Stats Screen Layout
- **D-67:** Stats displayed in **scrolling card sections** — each group of related stats gets its own card ("Overview" with total games/wins/win%/streaks; "By Word Length" with per-length breakdown; "Guess Distribution" with bar chart).
- **D-68:** Card order, contents, and visibility driven by data config (not hardcoded JSX) — see UI Configuration Registry decision below.

#### 2. Guess Distribution Chart
- **D-69:** Use **`react-native-chart-kit`** for the bar chart rendering guess distribution (per-number-of-attempts histogram).
- **D-70:** Chart driven by the same data config registry — if the stat card definition includes a chart, the screen renders it generically.

#### 3. Settings Screen Account Section
- **D-71:** Placeholder label: **"Sign in — coming in Phase 5"** instead of a functional sign-in button. This placeholder is a rendered row type from the UI config registry, to be swapped to a functional sign-in row in Phase 5.

#### 4. Share Results
- **D-72:** **Manual share button in the Stats screen** — user taps a button to copy the emoji grid (🟩🟨⬛) to clipboard. Not automatic on game completion.
- **D-73:** Shared format includes: mode display name, number of attempts, and date alongside the emoji grid.

#### 5. Streak Calculation & Display
- **D-74:** **Per-mode streak tracking** — Daily Challenge streak tracked separately from Endless streak (which already exists in MMKV). Free Play and Random modes share same streak tracking as non-daily modes.
- **D-75:** **Streak resets on `lost` state** — reaching a loss in any game resets that mode's streak to 0. Endless streak uses its own MMKV-based win/loss logic (Phase 2 implementation).
- **D-76:** The "current streak" in the stats overview reflects the last-played mode's streak when viewed generically; per-mode streaks displayed in detailed breakdown within the same phase.
- **D-85:** **Per-mode streaks displayed in Phase 3** — data collection (wiring `gameStore.submitGuess` → `statsStore.recordGame()`) is part of Phase 3 work. Since we're collecting the data, we also compute and show per-mode streaks now (in a sub-section of the Overview card or as a dedicated section).

#### 6. UI Configuration Registry
- **D-77:** Create **`src/config/ui.ts`** as a single source of truth for composable UI definitions. This file exports configuration arrays that drive rendering in StatsScreen and SettingsScreen — the screens become iterators, not hardcoded layouts.
- **D-78:** Stats config: array of card definitions, each with id, title, and the stats/chart it renders. Cards render in config order; reorder/remove/add by editing the array.
- **D-79:** Settings config: array of sections, each with rows typed by a union (`toggle`, `placeholder`, `info`). Each row declares its store binding (which Zustand field it toggles).
- **D-80:** This pattern extends to future phases — Phase 4 (monetization) appends ad/IAP toggles; Phase 5 swaps the placeholder to sign-in; Phase 6 adds accessibility toggles.
- **D-81:** No heavyweight abstraction — the config is a plain TypeScript array. The screen component maps over it with a simple switch on row type. Low ceremony, high maintainability.

#### 7. Stats Card Entrance Animation
- **D-82:** Cards animate in on mount — fade-in (opacity 0→1) + slide-up (translateY 10→0), 300ms duration, staggered per card by 80ms (left-to-right, top-to-bottom). Implemented with React Native `Animated` API. No Reanimated needed for this simple entrance.

#### 8. Share Button Placement
- **D-83:** **Floating action button** — fixed position at bottom of Stats screen, overlaying the ScrollView content. Uses `position: 'absolute', bottom: screenPadding + safeAreaInset.bottom`. Primary variant (`colors.accent` background, white text "Share Results").

#### 9. Typography Constants File
- **D-84:** Extract 5-size type scale to **`src/constants/typography.ts`** as a typed object, following the pattern established by `colors.ts` and `layout.ts`. Each size exports: `fontSize`, `fontWeight`, `lineHeight`, `color` (role reference). Screens import and reference these constants rather than inlining StyleSheet values.

#### 10. Pull-to-Refresh on Stats
- **D-86:** Pull-to-refresh **always enabled** on StatsScreen ScrollView. When pulled, re-runs `statsStore.loadStats()` to re-query SQLite. Uses React Native's `RefreshControl` component with `colors.accent` tint. Not limited to error state — always available.

### Claude's Discretion
- Precise card layout styling (border radius 12px, shadow params) — follow UI-SPEC contract exactly
- react-native-chart-kit integration details (chart height 200px, bar border radius 3px, no grid lines) — per UI-SPEC
- Share emoji grid implementation (generateShareText pure function) — per UI-SPEC format
- Stats screen empty/loading/error states — per UI-SPEC edge cases
- Settings row divider and spacing details — hairline 1px tileEmpty, 4px vertical margin per UI-SPEC
- Toggle track/thumb colors — accent active, tileEmpty inactive per UI-SPEC

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — Full requirement set, STAT-01 through STAT-05 define Phase 3 scope
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, mode (mvp)
- `.planning/phases/03-stats-settings/03-UI-SPEC.md` — **Locked spec for this phase** — full design contract, 52 edge cases, component contracts, design tokens

### Prior Phase Decisions
- `.planning/phases/02-core-gameplay/02-CONTEXT.md` — D-25 through D-66 (game state, storage patterns, animation constants, endless streak keys, keyboard behavior)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01 through D-24 (project structure, storage split, nav flow, type-based layout, barrel exports)

### Brain (wiki context)
- `brain/wiki/ui-config-registry.md` — Config types, component contracts, extension pattern
- `brain/wiki/design-tokens.md` — Spacing scale, typography, color conventions, WCAG
- `brain/wiki/phase-structure.md` — Phase 3 overview, UI-SPEC status
- `brain/wiki/architecture.md` — UI Config Registry, screen architecture, Phase 3 additions
- `brain/wiki/storage-strategy.md` — Stats aggregation SQL queries, per-mode streak computation, 3 persistence triggers

### Codebase — Key Integration Points
- `src/screens/StatsScreen.tsx` — Placeholder to be replaced with data-driven card layout + floating share button
- `src/screens/SettingsScreen.tsx` — Placeholder to be replaced with config-driven settings rows
- `src/stores/statsStore.ts` — Has `loadStats()` and `recordGame()` — needs full stat computation (streaks, distribution, per-mode aggregation). `recordGame()` is NOT wired from gameStore yet (Phase 3 must add that integration)
- `src/stores/settingsStore.ts` — Fully functional with MMKV persist, `toggleHardMode()`, `toggleSound()`, `toggleHaptic()`, `setPro()`
- `src/services/storage.ts` — SQLite `game_history` table exists, `getStats()` returns stub (zeros for streaks/distribution) — needs full SQL aggregation queries
- `src/types/stats.ts` — `PlayerStats` has basic fields, needs per-mode streak fields added
- `src/types/settings.ts` — `AppSettings` interface (hardModeEnabled, soundEnabled, hapticEnabled, isPro)
- `src/screens/GameScreen.tsx` — Animation completion callback handles daily/endless persistence but does NOT call `statsStore.recordGame()` — this integration must be added in Phase 3
- `src/components/ui/Button.tsx` — Reusable button with primary/secondary/danger variants
- `src/constants/colors.ts` — Full color palette (tileCorrect, tilePresent, tileAbsent, tileEmpty, surface, background, textPrimary, textSecondary, accent, etc.)
- `src/constants/layout.ts` — Spacing/layout constants (screenPadding: 6px, tileGap, etc.)

### Dependencies to Add
- `react-native-chart-kit` ^6.12.0 — Guess distribution bar chart
- `react-native-svg` ^13.9.0 — Peer dep of chart-kit
- `expo-clipboard` (SDK 57) — Copy share text to clipboard

### Files to Create
- `src/config/ui.ts` — UI Configuration Registry (config arrays for stats cards + settings sections)
- `src/components/ui/StatCard.tsx` — Reusable card container for stat sections
- `src/components/ui/SettingsRow.tsx` — Generic settings row renderer (toggle/placeholder/info variants)
- `src/utils/share.ts` — `generateShareText()` pure function for emoji grid generation
- `src/constants/typography.ts` — Shared type scale constants (5 sizes)

### Files to Modify
- `src/screens/StatsScreen.tsx` — Replace placeholder with config-driven card layout + floating share button + pull-to-refresh + entrance animation
- `src/screens/SettingsScreen.tsx` — Replace placeholder with config-driven section list
- `src/screens/GameScreen.tsx` — Wire animation completion → `statsStore.recordGame()` for game results
- `src/stores/statsStore.ts` — Add per-mode streak computation, full aggregation, expose per-mode streaks
- `src/services/storage.ts` — Full `getStats()` with streak calculation, per-mode SQL aggregation queries
- `src/types/stats.ts` — Add per-mode streak fields to `PlayerStats`

</canonical_refs>

<code_context>
## Existing Code Insights

### Current State of Phase 3 Targets

| File | Status | What's Needed |
|------|--------|---------------|
| `src/screens/StatsScreen.tsx` | Placeholder — "Stats will display here (Phase 3)" | Full rewrite: config-driven cards, floating share FAB, entrance animation, pull-to-refresh, empty/loading/error states |
| `src/screens/SettingsScreen.tsx` | Placeholder — "Settings will display here (Phase 3)" | Full rewrite: config-driven sections (Gameplay, Audio & Haptics, Account) with toggle/placeholder rows |
| `src/stores/statsStore.ts` | Has `loadStats()` / `recordGame()` — needs expansion | Add per-mode aggregation, streak computation from SQLite queries |
| `src/stores/settingsStore.ts` | Fully functional — MMKV persist, toggle actions | No changes needed (config registry reads this store directly) |
| `src/services/storage.ts` | SQLite table exists, `getStats()` returns stub | Full SQL aggregation: per-mode streaks, guess distribution histogram, games-by-length table |
| `src/types/stats.ts` | Basic `PlayerStats` — no per-mode streaks | Add `perModeStreaks: Record<string, { current: number; max: number }>` |
| `src/screens/GameScreen.tsx` | Handles daily/endless persistence — NO stats recording | Add `statsStore.recordGame()` call in animation completion callback when game ends |

### Integration Point: Game Completion → Stats Recording

The critical missing wire:
```
GameScreen animation complete (status === 'won' | 'lost')
  → currently: clears active game, marks daily, updates endless streak
  → needs to ALSO: call statsStore.recordGame({ id, mode, word, letterCount, guesses, won, hardMode, extraGuessesUsed, completedAt })
```

This makes `recordGame` the single entry point. Once called, `statsStore.recordGame()` delegates to `storage.saveGameResult()`, then re-queries `getStats()` for fresh aggregation.

### Integration Point: GameCompletionResult Type

The game store's `session` already has all fields needed to construct the `recordGame` payload. The GameScreen animation completion callback has access to `currentSession` via `useGameStore.getState().session`. Mapping:

| recordGame field | session field |
|-----------------|---------------|
| id | session.id |
| mode | session.mode |
| word | session.word |
| letterCount | session.letterCount |
| guesses | session.guesses.length |
| won | session.status === 'won' |
| hardMode | session.hardMode |
| extraGuessesUsed | session.extraGuessesUsed |
| completedAt | session.completedAt (set by submitGuess) |

### Per-Mode Streak SQL Query

```sql
-- Per-mode streaks computed in application code:
-- 1. Query games for a mode ordered by completed_at DESC
-- 2. Count consecutive rows with won = 1 until first won = 0
-- 3. max_streak = max of all streak counts across all time (query all, scan)

-- Aggregate stats (existing):
SELECT mode, COUNT(*) as total, SUM(won) as wins FROM game_history GROUP BY mode;

-- Guess distribution (for bar chart):
SELECT guesses, COUNT(*) as count FROM game_history WHERE won = 1 GROUP BY guesses ORDER BY guesses;
```

### Important Note: screenPadding Value

`src/constants/layout.ts` defines `screenPadding: 6` (from Phase 2 keyboard-optimized layout). UI-SPEC uses `screenPadding: 16` for Stats/Settings screens. StatsScreen and SettingsScreen should use their own padding (16px) for content spacing, not the game-optimized 6px constant. Consider using a phase-specific constant or the design token `md = 16px` from the UI-SPEC.

### Settings Config — Phase 3 Rows

| Section | Row ID | Type | Label | Store Key / Notes |
|---------|--------|------|-------|-------------------|
| Gameplay | `hardMode` | toggle | "Hard Mode" | `hardModeEnabled` |
| Audio & Haptics | `sound` | toggle | "Sound Effects" | `soundEnabled` |
| Audio & Haptics | `haptic` | toggle | "Haptic Feedback" | `hapticEnabled` |
| Account | `signIn` | placeholder | "Sign in" | "Sign in — coming in Phase 5" |

</code_context>

<specifics>
## Specific Ideas

- **Stats card structure:** "Overview" (total games, wins, win %, current streak, max streak, per-mode streak mini-section), "By Word Length" (5-10 table), "Guess Distribution" (bar chart card). All driven by `ui.ts` config array.
- **Settings sections:** "Gameplay" (Hard Mode toggle), "Audio & Haptics" (sound, haptic toggles), "Account" (sign-in placeholder). All driven by `ui.ts` config sections.
- **Share format:** Header "Word Guess - {Mode Name}", date line, blank line, emoji rows (🟩🟨⬛), attempt counter "{N}/{M}" or "X/{M}", footer "Play Word Guess!"
- **Config registry structure:** Plain TypeScript arrays of typed config objects. The screen imports and iterates. Future phases import and extend.
- **StatsScreen header:** Uses existing NavMenuButton pattern from Phase 1/2 (headerRight with Stats, Leaderboard, Settings icons). No custom header.
- **Per-mode streak display:** Tiny sub-section inside Overview card showing: "Daily: 5 streak" / "Endless: 12 streak" / "Free Play: 3 streak" as small stat rows.

</specifics>

<deferred>
## Deferred Ideas

- **Auto-copy results on game end** — Decision was manual share button in Stats screen. Auto-copy was discussed and deferred (could be added as optional toggle in future phase).
- **Per-mode streak detailed view beyond Phase 3** — Displaying per-mode streaks in this phase is sufficient. Dedicated per-mode breakdown screen deferred to future if needed.

</deferred>

---

*Phase: 3-Stats & Settings*
*Context gathered: 2026-07-05*
*Prior phases carried forward: Phase 1 (D-01–D-24), Phase 2 (D-25–D-66)*
*Decisions this phase: D-67 through D-86*
