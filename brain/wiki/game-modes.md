# Game Modes
updated: 2026-07-04
tags: [gameplay, modes, game-design]
related: [architecture, daily-seed, project-overview]

## Four modes

### Free Play
- Player picks letter count 5-10 before game
- Random word from chosen length's dictionary
- Unlimited plays, no daily reset
- Streak tracked separately? (deferred — v1 treats as standalone)

### Random
- Auto-assigned random letter count each game
- Discovery mechanic — player tries lengths they wouldn't pick
- All other mechanics identical to Free Play

### Daily Challenge
- One word per day, same for all players
- Deterministic from UTC date + private seed (see daily-seed.md)
- Resets at UTC midnight
- Same word shown regardless of letter count selection? TBD — could rotate or fix to one length
- Streak tracked per player (cloud-synced)
- Leaderboard ranking by daily streak

### Endless
- After win/loss, immediately start new word
- Tracks consecutive correct streak
- Separate leaderboard for consecutive correct + total words ever
- No daily reset

## Universal toggle: Hard Mode
- Applies to ANY mode (toggle in settings, per-game in Free Play)
- Must reuse green tiles in same position
- Must include yellow tiles somewhere in guess
- NYT Wordle exact rules (including duplicate letter handling)
- 20+ unit test edge cases required before integration
- Invalid guess blocked at submit time (not silently accepted)

## Attempt system
| Factor | Value |
|--------|-------|
| Base attempts | letterCount + 1 |
| Rewarded ad bonus | +1 per ad, max 2/game |
| Total max (10 letters) | 11 + 2 = 13 |

## Tile feedback rules (Wordle)
1. First pass: mark exact position matches GREEN
2. Second pass: for remaining letters, mark in-word YELLOW (decrementing count per occurrence)
3. Remaining: GRAY
4. Duplicate handling: if guess has 3 'O's but answer has 1, only 1 'O' shows yellow/green
