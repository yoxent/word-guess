# game-modes
updated: 2026-07-12 (share two-line header; stats Random columns; ResultModal share/record)
tags: [gameplay, modes, game-design]
related: [architecture, daily-seed, project-overview, dictionary-preprocessing, animation-system, storage-strategy, navigation-setup, stats-and-share]

## Three modes

**Free Play removed (2026-07-05):** Functionally identical to Endless (pick length, unlimited plays). Merged into Endless mode.

### Random
- Auto-assigned random letter count (5-10) each **new** game
- Target word from enriched dictionary
- Discovery mechanic — player tries lengths they wouldn't pick
- **Single active slot:** any in-progress random game counts as one instance — letter count is ignored for continue/resume (see `src/utils/activeGame.ts`)

### Daily Challenge
- **6 puzzles per day** (one per word length 5-10)
- Deterministic from UTC date + length + private seed (see daily-seed)
- Length picker shown with already-completed lengths disabled (greyed + checkmark)
- Completed = reached win or loss state → consumed for the day
- In-progress game persists on exit, resumes on return (same daily, same length)
- Resets at UTC midnight

### Endless
- After win/loss, result modal with centered **Play Next** + full-width **Back to Menu**
- **Play Next** → immediately starts new word (same length)
- **Back to Menu** → Home (interstitial gated like other exits)
- Tracks consecutive correct streak (displayed in header)
- Target word pool = full dictionary words **minus today's daily words** (1-6 words)
- Same-day exclusion only — daily words return to pool next UTC day
- Player guesses validated against full dictionary (no exclusions)

## Continue game prompt
When selecting a game mode from Home, if a saved in-progress game exists:
- **Daily mode:** auto-continues without prompt when `mode` + `letterCount` + progress match — daily puzzle slot is consumed for the day
- **Random mode:** show Continue / New Game modal when **any** saved random game has progress (`guesses`, rewarded hints, or extra attempts used) — **not** keyed by newly rolled letter count. Continue uses saved `letterCount`; New Game clears save and rolls fresh length
- **Endless mode:** Continue / New Game when `mode` + `letterCount` match
- Tap outside modal dismisses (cancel)
- Implemented via `navigateWithContinueCheck()` + `shouldOfferContinue()` in `src/utils/activeGame.ts`
- **Continue:** navigates to Game → `shouldRestoreActiveGame()` restores MMKV session
- **New Game:** `clearActiveGame()` then navigates; `startGame()` also clears persisted slot
- Saved on back nav, unmount cleanup, and AppState background
- Starting fresh without continue always calls `clearActiveGame()` first so rewarded hints (`extraGuessesUsed`, `letterHintUsed`, boosted `maxAttempts`) do not leak into a new instance

## Streak tracking (per-mode, Phase 3)
- **Per-mode × difficulty:** Daily / Endless / Random each have normal + hard streaks in SQLite (`daily_*`, `endless_*`, `random_*`; legacy `free` rows count as random).
- **Reset:** Streak resets to 0 when player reaches `lost` state. Win keeps streak going; loss breaks it.
- **Endless in-run:** Consecutive correct words also use MMKV `endless_streak_*` for the current Endless run UI.
- **Overview UI:** Three columns Daily / Endless / Random (each showing normal + hard).
- **Write path:** ResultModal + `recordGameIfNeeded` — see [stats-and-share](stats-and-share.md).

## Universal toggle: Hard Mode
- Home screen **Hard Mode** pill toggle — applies to the current session's games
- **Default: OFF (normal mode)** on every app launch
- **Not persisted** — excluded from settingsStore MMKV `partialize` (v3); resets when app quits
- Enforced at submit time (not input time) — shake + toast on violation
- Must reuse green tiles in same position (most recent guess only — earlier greens are implicitly carried forward)
- Must include yellow tiles somewhere in guess
- NYT Wordle exact rules (including duplicate letter handling)
- 20+ unit test edge cases required before integration
- Pure function in `services/wordLogic.ts` — trivially testable

### Validation: required count per letter = max-per-row (NOT cumulative)
Bug fixed 2026-07-11: Previous implementation counted yellow letters cumulatively across ALL feedback rows. If letter S appeared yellow in guess 2 AND guess 3, the function required S×2 in the next guess — even when the target only has one S.

**Fix:** Required count per letter = MAXIMUM number of times that letter appears as `present` OR `correct` in any single feedback row. This matches NYT Wordle behavior:
- Confirming a letter is in the word once is enough — re-confirming it in a later guess doesn't increase the count
- If a letter appears as BOTH `correct` AND `present` in the SAME row (duplicate letter in target), the row captures count = 2, correctly requiring both instances

**Code location:** `validateHardMode()` in `src/services/wordLogic.ts`, Rule 2

## Result flow (all modes — Phase 2 change)
- Result displayed as **modal overlay** (not navigation to ResultScreen)
- Shows: win/loss state, target word, word definition, emoji grid
- Win: share icon copies emoji grid (`Word Guess` / `{Mode} · {N}-letter` header lines) via toast feedback
- Win confetti renders **in front of** the modal card (`zIndex` above card)
- Endless: centered **Play Next** + **Back to Menu** (secondary)
- Other modes: **Back to Menu** only
- Stats row written via `recordGameIfNeeded` when modal settles

## Attempt system
| Factor | Value |
|--------|-------|
| Base attempts | letterCount + 1 |
| Rewarded ad bonus | +1 attempt per ad, max 2/game free / 3 pro (during gameplay via GameScreen hint row) |
| Total max (10 letters) | 11 + 2 = 13 |

## Tile feedback rules (Wordle)
1. First pass: mark exact position matches GREEN
2. Second pass: for remaining letters, mark in-word YELLOW (decrementing count per occurrence)
3. Remaining: GRAY
4. Duplicate handling: if guess has 3 'O's but answer has 1, only 1 'O' shows yellow/green

## Animation timing (implemented via constants in src/constants/animations.ts)
| Action | Duration | Detail |
|--------|----------|--------|
| Tile flip | 200ms | Rotate-X via interpolate(progress, [0,0.5,1], [0,-90,0]), Easing.inOut(Easing.ease) |
| Stagger | 50ms | Left-to-right per tile, `index * TILE_STAGGER_DELAY` |
| Correct tile bounce | 100ms up + 100ms down | `withSequence(withTiming(1.15), withTiming(1.0))` after flip |
| Keyboard update | After last reveal | setTimeout matching total animation time; calls setIsRevealing(false) + flushPendingInputs |
| Confetti (win) | ~1.5-1.8s | 40 particles, staggered by 15ms, gravity easing, 7 colors |
| Haptics (key press) | Instant | Haptics.impactAsync(Light) on every key press, fire-and-forget |
| Haptics (tile reveal) | After animation | Haptics.impactAsync(Medium) after last tile flips |
