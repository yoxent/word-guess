# Phase 3: Stats & Settings - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-05
**Phase:** 3-Stats & Settings
**Areas discussed:** Stats Screen Layout, Guess Distribution Chart, Settings Account Section, Share Results, Streak Calculation, Data-Driven Architecture

---

## Stats Screen Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Card sections | Grouped scrolling cards per stat category (Overview, By Length, Distribution) | ✓ |
| Single list | Flat scrollable list of all stats | |
| Compact grid | Dense grid layout | |

**User's choice:** Card sections
**Notes:** Cards are driven by a UI Configuration Registry (see Data-Driven Architecture area).

---

## Guess Distribution Chart

| Option | Description | Selected |
|--------|-------------|----------|
| Custom Views | Build bars with React Native Views (zero deps) | |
| react-native-chart-kit | Add charting library for bar chart | ✓ |
| victory-native | Alternative charting library | |

**User's choice:** react-native-chart-kit
**Notes:** Chart embedded inside a stats card, driven by config registry.

---

## Settings Account Section

| Option | Description | Selected |
|--------|-------------|----------|
| Functional sign-in | Wire up Google Sign-In now (Phase 5 scope) | |
| Placeholder | Show "Sign in — coming in Phase 5" label | ✓ |

**User's choice:** Placeholder
**Notes:** Placeholder is a row type in the UI config registry, easily swapped to `signInButton` in Phase 5.

---

## Share Results

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-copy from ResultModal | Copy emoji grid automatically on game end | |
| Manual in Stats screen | Share button in Stats screen taps to copy | ✓ |
| Both | Offer both auto and manual | |

**User's choice:** Manual share button in Stats screen
**Notes:** Uses expo-clipboard.

---

## Streak Calculation

| Option | Description | Selected |
|--------|-------------|----------|
| Cross-mode streak | Same streak across all modes | |
| Per-mode streaks | Separate streaks per game mode | ✓ |

**User's choice:** Per-mode streaks
**Notes:** Endless streak (already in MMKV from Phase 2) stays separate. Daily/Free/Random share a streak bucket. Streak resets on `lost` state.

---

## Data-Driven Architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Stats-only config | Config registry for stats cards only | |
| Settings-only config | Config registry for settings rows only | |
| Unified UI Configuration Registry | Single `src/config/ui.ts` driving both screens, extensible to future phases | ✓ |

**User's choice:** Unified UI Configuration Registry (`src/config/ui.ts`)
**Rationale:** Phase 4 (monetization) appends toggles; Phase 5 swaps account placeholder to sign-in; Phase 6 adds accessibility toggles. No refactoring needed — just extend the config array.

---

## Claude's Discretion

- Card layout styling (border radius, shadow, padding) — use existing `colors.ts` and `layout.ts`
- react-native-chart-kit color scheme
- Emoji grid format
- Scroll behavior and transitions

## Deferred Ideas

- Auto-copy results on game end — considered but user preferred manual share button in Stats screen for Phase 3.
