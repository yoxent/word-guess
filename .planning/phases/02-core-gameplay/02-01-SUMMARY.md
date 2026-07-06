---
phase: 02-core-gameplay
plan: 01
subsystem: services, stores, preprocessing
tags: [dictionary, word-logic, daily-seed, hard-mode, dual-source, game-loop, zustand]
requires:
  - phase: 01-foundation-03
    provides: Project structure, types, storage services, dictionary sources
provides:
  - Updated preprocessing script producing 18 dictionary files (target/valid/defs per length)
  - wordLogic service (evaluateGuess, validateHardMode, isValidGuess)
  - dailySeed service (getDailyDateString, getDailyWordIndex with DJB2)
  - sound service no-op stub (full API surface)
  - dictionaryStore with dual-source word lists + definition lookup + daily words
  - gameStore with real submitGuess, error state, restoreSession
affects:
  - 02-04 (game state persistence — uses restoreSession)
  - 03-01 (stats tracking — uses completed game results)
  - UI components (GameBoard, Keyboard — consume gameStore)
  - Daily challenge flow (uses getTodayDailyWords)

tech-stack:
  added: []
  patterns:
    - "Pure service functions in services/ (no RN/expo imports)"
    - "Zustand stores import services via @/ path alias"
    - "Static require() for bundled dictionary JSON assets"

key-files:
  created:
    - src/services/wordLogic.ts
    - src/services/dailySeed.ts
    - src/services/sound.ts
  modified:
    - scripts/preprocess-dictionary.mjs
    - src/services/index.ts
    - src/stores/dictionaryStore.ts
    - src/stores/gameStore.ts

key-decisions:
  - "DJB2 hash over SHA256 for daily seed — crypto unavailable in Hermes"
  - "Dual-source dictionary: enriched.json→target words, full.json→valid guesses"
  - "evaluateGuess uses two-pass count-based algorithm for duplicate letters"
  - "validateHardMode checks green positions from last guess + yellow presence from all"
  - "Key color accumulation uses priority: correct > present > absent > empty"
  - "submitGuess reads currentGuess from store state (no arguments)"
  - "APP_SEED = 'wg-v1-seed-2026' — immutable post-release"

patterns-established:
  - "Service pattern: pure functions with no RN/expo imports, typed exports, barrel re-export"
  - "Store pattern: Zustand create with explicit action functions, get()/set() for state"
  - "Dictionary assets: static require() with relative path from store to assets/
---

# 02-01-SUMMARY.md — Core Game Logic Services

## Objective

Create all core game logic services and update stores so the game has working word feedback, dual-source dictionary, daily seed generation, Hard Mode validation, and sound structure — ready for the UI layer to consume.

## Completed

### Task 1: Dictionary Preprocessing (0e4de70)

Updated `scripts/preprocess-dictionary.mjs` to produce three output files per word length (5-10):

| File | Source | Purpose |
|------|--------|---------|
| `{N}.json` (existing) | `dictionary.full.enriched.json` | Target word selection |
| `valid-{N}.json` (NEW) | `dictionary.full.json` | Player guess validation (broader) |
| `defs-{N}.json` (NEW) | `dictionary.full.enriched.json` | Word definition lookup |

Blocklist combines `profanity-blocklist.txt` (2,767 entries), `manual-blocklist.txt` (826 entries), and hardcoded fallback (18 entries) = 3,597 unique. Applied to both enriched and full outputs. All valid-{N}.json files are larger than corresponding {N}.json files. All defs-{N}.json files contain non-empty definition maps.

**Output counts:** 12,319 target words, 183,364 valid guess words, 12,319 definitions.

### Task 2: Service Files (4895010)

**`src/services/wordLogic.ts`** — Pure game logic functions:
- `evaluateGuess(target, guess)` — Two-pass Wordle duplicate-letter counting. First pass marks exact matches green and decrements remaining count. Second pass marks present/absent based on remaining counts. Returns `GuessFeedback[]` or `[]` for invalid input.
- `validateHardMode(previousFeedback, newGuess)` — Checks (1) all green tiles from most recent guess remain in same positions, (2) all yellow tiles from all guesses appear at least required count in new guess. Returns `{ valid, reason? }`.
- `isValidGuess(word, validWordList)` — Case-insensitive Set lookup.

**`src/services/dailySeed.ts`** — Deterministic daily word computation:
- `getDailyDateString(date?)` — Returns UTC YYYY-MM-DD using `Date.UTC()`.
- `getDailyWordIndex(dateStr, length, wordCount)` — DJB2 hash of `APP_SEED + ':' + dateStr + ':' + length`, then `Math.abs(hash) % wordCount`. No crypto import — Hermes compatible.
- `APP_SEED = 'wg-v1-seed-2026'` — Fixed before first release.

**`src/services/sound.ts`** — No-op stub with full API:
- `init()`, `setEnabled()`, `playKeyPress()`, `playReveal()`, `playWin()`, `playLoss()`
- Module-level `_enabled` and `_initialized` state. No RN/expo imports.

**`src/services/index.ts`** — Updated barrel with all new exports.

### Task 3: Store Updates (c79dcfc)

**`src/stores/dictionaryStore.ts`** — Dual-source + definitions + daily words:
- Added static `require()` for `valid-{N}.json` → `VALID_LISTS` and `defs-{N}.json` → `DEFS`
- `isValidGuess(length, word)` — checks against broad dictionary (case-insensitive Set)
- `getDefinition(length, word)` — UPPERCASE lookup in definition maps
- `getTodayDailyWords()` — computes 6 daily words via `getDailyDateString()` + `getDailyWordIndex()`
- Preserves existing `getWordList`, `getRandomWord`, `isValidWord`

**`src/stores/gameStore.ts`** — Real game logic:
- Imports `evaluateGuess`, `validateHardMode`, `useDictionaryStore`
- `submitGuess()` now reads `currentGuess` from state, validates word length → dictionary check → Hard Mode check → feedback evaluation → keyColor accumulation → win/loss detection
- Key color priority: correct (3) > present (2) > absent (1) > empty (0)
- `error` state for invalid word / Hard Mode violation
- `restoreSession(session)` — restores persisted game state
- `clearError()` — clears error state

## Deviations

None — plan executed exactly as written.

## Auth Gates

None encountered — all build-time operations, no authentication needed.

## Known Stubs

- `src/services/sound.ts` — All functions are no-op stubs per D-32/D-33. Real sound implementation deferred.
- `src/services/storage.ts` — `getStats()` returns placeholder stats (`currentStreak: 0`, `maxStreak: 0`, etc.). Real stats aggregation deferred to Phase 3.

## Threat Flags

None — threat model T-01 (daily seed constant) accepted per D-27. T-02 (preprocessing script) mitigated as build-time only.

## Validation

```bash
# TypeScript check
npx tsc --noEmit → PASSED (no errors)

# Preprocessing script
node scripts/preprocess-dictionary.mjs → 18 files generated, all valid JSON

# Output verification
all valid-{N}.json > {N}.json in word count
all defs-{N}.json have non-empty definition maps
```

## Commits

| Hash | Message |
|------|---------|
| 0e4de70 | feat(02-01): update dictionary preprocessing for dual-source + defs + blocklist |
| 4895010 | feat(02-01): create wordLogic, dailySeed, sound services |
| c79dcfc | feat(02-01): update dictionaryStore and gameStore with real game logic |

## Self-Check: PASSED

- [x] Preprocessing produces valid-{N}.json + defs-{N}.json
- [x] wordLogic.ts exports evaluateGuess, validateHardMode, isValidGuess
- [x] dailySeed.ts exports getDailyWordIndex (DJB2) + getDailyDateString (UTC)
- [x] sound.ts exports no-op stub with full API surface, no RN/expo imports
- [x] dictionaryStore has dual sources + definitions + daily words
- [x] gameStore has real submitGuess, error state, restoreSession
- [x] `npx tsc --noEmit` passes
- [x] All 3 tasks committed individually with proper format
- [x] No staged files remaining
