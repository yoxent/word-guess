# game-modes
updated: 2026-07-04
tags: [gameplay, modes, game-design]
related: [architecture, daily-seed, project-overview, dictionary-preprocessing]

## Four modes

### Free Play
- Player picks letter count 5-10 via modal/grid picker before game
- Random target word from enriched dictionary (curated, clean)
- Guess validated against full dictionary (broader, permissive)
- Unlimited plays, no daily reset

### Random
- Auto-assigned random letter count (5-10) each game
- Target word from enriched dictionary
- Discovery mechanic — player tries lengths they wouldn't pick

### Daily Challenge
- **6 puzzles per day** (one per word length 5-10)
- Deterministic from UTC date + length + private seed (see daily-seed)
- Length picker shown with already-completed lengths disabled (greyed + checkmark)
- Completed = reached win or loss state → consumed for the day
- In-progress game persists on exit, resumes on return (same daily, same length)
- Resets at UTC midnight

### Endless
- After win/loss, result modal with "Play Next" → immediately starts new word
- Tracks consecutive correct streak (displayed in header)
- Target word pool = full dictionary words **minus today's daily words** (1-6 words)
- Same-day exclusion only — daily words return to pool next UTC day
- Player guesses validated against full dictionary (no exclusions)

## Universal toggle: Hard Mode
- Applies to ANY mode (per-game toggle)
- Enforced at submit time (not input time) — shake + toast on violation
- Must reuse green tiles in same position
- Must include yellow tiles somewhere in guess
- NYT Wordle exact rules (including duplicate letter handling)
- 20+ unit test edge cases required before integration
- Pure function in `services/wordLogic.ts` — trivially testable

## Result flow (all modes — Phase 2 change)
- Result displayed as **modal overlay** (not navigation to ResultScreen)
- Shows: win/loss state, target word, word definition, emoji grid
- Endless: "Play Next" button → next word (same length)
- Other modes: "Back to Menu" → HomeScreen

## Attempt system
| Factor | Value |
|--------|-------|
| Base attempts | letterCount + 1 |
| Rewarded ad bonus | +1 per ad, max 2/game (Phase 4) |
| Total max (10 letters) | 11 + 2 = 13 |

## Tile feedback rules (Wordle)
1. First pass: mark exact position matches GREEN
2. Second pass: for remaining letters, mark in-word YELLOW (decrementing count per occurrence)
3. Remaining: GRAY
4. Duplicate handling: if guess has 3 'O's but answer has 1, only 1 'O' shows yellow/green

## Animation timing
| Action | Duration | Detail |
|--------|----------|--------|
| Tile flip | 200ms | Rotate-X, UI thread (Reanimated worklet) |
| Stagger | 50-80ms | Left-to-right per tile |
| Correct tile bounce | 1.0→1.15→1.0 | After flip, scale bounce |
| Keyboard update | After last reveal | Delayed to avoid flicker |
| Confetti (win) | ~1.5s | Reanimated particle burst, gravity + fade |
