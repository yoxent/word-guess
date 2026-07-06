# Phase 3: Stats & Settings — Discussion Log

**Date:** 2026-07-05
**Status:** Context captured

---

## Questions Asked

### 1. Stats Card Entrance Animation
- **Options:** Animated fade-in (opacity 0→1, translateY 10→0, 300ms, 80ms stagger) vs instant render
- **Chosen:** With animation (D-82)

### 2. Share Button Placement
- **Options:** Floating action button (fixed at bottom) vs inline bottom-of-list button
- **Chosen:** Floating action button (D-83)

### 3. Typography Constants File
- **Options:** Extract 5-size type scale to `src/constants/typography.ts` vs inline StyleSheet values
- **Chosen:** Extract to constants file (D-84)

### 4. Per-Mode Streak Display
- **Options:** Display in Phase 3 (if data is being collected) vs defer to future
- **Decision:** Data collection IS part of Phase 3 (game completion → stats recording wire is missing from Phase 2). Since we're collecting it, compute and display per-mode streaks now (D-85).

### 5. Pull-to-Refresh on Stats
- **Options:** Always enabled vs error-only
- **Chosen:** Always enabled (D-86)

---

## Deferred Ideas

- **Auto-copy results on game end** — manual share button preferred; optional toggle deferred to future
- **Dedicated per-mode streak breakdown screen** — Phase 3 display is sufficient

---

## Notes

- CONTEXT.md updated from D-67 through D-86 (20 decisions total for Phase 3)
- UI-SPEC.md serves as the locked spec for this phase — downstream agents must read it
- Key missing wire identified: GameScreen → statsStore.recordGame() must be added
- Existing codebase fully scouted: StatsScreen/SettingsScreen are placeholders, storage has stub getStats(), statsStore has loadStats/recordGame but no per-mode aggregation
