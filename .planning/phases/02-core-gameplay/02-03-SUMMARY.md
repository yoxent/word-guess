---
phase: 02-core-gameplay
plan: 03
subsystem: game-modes
tags: [modes, routing, daily, endless, length-picker, definitions]
dependency-graph: |
  02-01 (dict/seed) → 02-02 (game-ui) → 02-03 (mode-routing)
tech-stack: react-native, zustand, mmkv, typescript
metrics:
  files-changed: 7
  commits: 3
  tasks: 3
  duration: ~15min
status: completed
---

# 02-03-SUMMARY — Game Mode Routing

## Objective

Implement all 4 game modes (Free Play, Random, Daily Challenge, Endless) with proper length selection, mode routing, daily challenge completion tracking, and Endless "Play Next" flow.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create LengthPickerModal with daily completion state | `13820b3` | `src/components/game/LengthPickerModal.tsx`, `src/components/game/index.ts` |
| 2 | Update HomeScreen with mode routing, length picker, daily completion state | `20672f2` | `src/screens/HomeScreen.tsx`, `src/services/storage.ts`, `src/services/index.ts` |
| 3 | Enhance ResultModal with definitions, Endless flow, daily tracking | `c003eea` | `src/components/game/ResultModal.tsx` |

## Changes by File

### `src/components/game/LengthPickerModal.tsx` (NEW)
- 2×3 grid of length buttons (5-10) with Modal overlay
- Mode-specific titles: "Choose word length", "Daily Challenge", "Endless — Choose length"
- Daily mode: completed lengths greyed (`rgba(120,124,126,0.3)`), disabled, green ✓ checkmark
- Cancel button → calls `onClose()`
- Props: `visible`, `mode`, `onSelect`, `onClose`, `completedLengths`

### `src/components/game/index.ts` (MODIFIED)
- Added `export { LengthPickerModal } from './LengthPickerModal'`

### `src/screens/HomeScreen.tsx` (REWRITTEN)
- **Free Play**: Opens LengthPickerModal → navigate Game with `mode='free'`
- **Random**: Auto-randomizes length (5-10) → navigate Game immediately
- **Daily Challenge**: Opens LengthPickerModal (daily mode) → navigate Game
- **Endless**: Opens LengthPickerModal → navigate Game
- Hard Mode toggle row connected to `settingsStore.hardModeEnabled` + `toggleHardMode`
- Reads daily completed lengths from MMKV on mount via `getDailyCompletedLengths(dateStr)`
- Stats/Settings/Leaderboard buttons preserved

### `src/services/storage.ts` (MODIFIED)
- `getDailyCompletedLengths(dateStr)`: reads `daily_completed_<date>` from MMKV
- `markDailyCompleted(dateStr, length)`: persists completed daily length to MMKV
- `getEndlessStreak()`: reads `endless_streak` from MMKV
- `setEndlessStreak(streak)`: persists endless streak to MMKV

### `src/services/index.ts` (MODIFIED)
- Exported new storage functions: `getDailyCompletedLengths`, `markDailyCompleted`, `getEndlessStreak`, `setEndlessStreak`

### `src/components/game/ResultModal.tsx` (ENHANCED)
- **Definition display**: Shows italic definition from `dictionaryStore.getDefinition()` below target word
- **Daily completion tracking**: `useEffect` calls `markDailyCompleted()` when daily game ends
- **Endless "Play Next"**: Button starts new game — word pool excludes today's daily word for that length
- **Endless streak**: Increments on win, resets on loss, displayed in ResultModal
- **Active game clearing**: Calls `clearActiveGame()` on game completion

### `src/stores/dictionaryStore.ts` (NO CHANGE — already had `getTodayDailyWords` and `getDefinition` from prior plan)

## Key Decisions

- **Daily completions stored per UTC date** in MMKV as `daily_completed_YYYY-MM-DD` JSON array — deterministic date key ensures same behavior for all players
- **Endless word pool exclusion** uses `getTodayDailyWords()` to get today's daily word per length, filters it out of target pool — exclusion is same-day only
- **Hard Mode** read from `settingsStore.hardModeEnabled` at game start via `getState()` (non-reactive call in Play Next handler is fine since hard mode toggle is a user preference, not session-dynamic)
- **ResultModal reads definition via `useMemo`** since dictionary data is static at module level

## Known Stubs

None — all functionality is wired end-to-end.

## Threat Flags

None identified beyond the accepted risks in the plan's threat model (T-04 date key overflow, T-05 local MMKV tampering — both accepted).

## Success Criteria

| Criterion | Status |
|-----------|--------|
| All 4 modes playable from HomeScreen through game completion | ✓ |
| Length picker works for Free/Daily/Endless modes | ✓ |
| Random mode auto-assigns length | ✓ |
| Daily challenge shows completed lengths as disabled with checkmarks | ✓ |
| ResultModal shows word definition from defs-{N}.json | ✓ |
| Endless mode "Play Next" starts next word (same length) | ✓ |
| Endless mode excludes today's daily word from target pool | ✓ |
| Daily completions persisted in MMKV | ✓ |
| Endless streak tracked in MMKV | ✓ |
| `npx tsc --noEmit` passes | ✓ |

## Deviations

None — plan executed exactly as written.

## Self-Check: PASSED

```bash
[ -f src/components/game/LengthPickerModal.tsx ] && echo "FOUND: LengthPickerModal"
[ -f src/components/game/ResultModal.tsx ] && echo "FOUND: ResultModal"
[ -f src/components/game/index.ts ] && echo "FOUND: game/index.ts"
[ -f src/screens/HomeScreen.tsx ] && echo "FOUND: HomeScreen"
[ -f src/stores/dictionaryStore.ts ] && echo "FOUND: dictionaryStore"
[ -f src/services/storage.ts ] && echo "FOUND: storage.ts"
[ -f src/services/index.ts ] && echo "FOUND: services/index"
git log --oneline | grep -q "13820b3" && echo "FOUND: commit 13820b3"
git log --oneline | grep -q "20672f2" && echo "FOUND: commit 20672f2"
git log --oneline | grep -q "c003eea" && echo "FOUND: commit c003eea"
```
