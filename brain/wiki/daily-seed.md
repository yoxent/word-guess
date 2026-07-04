# Daily Seed
updated: 2026-07-04
tags: [daily-puzzle, seed, cryptography, offline]
related: [architecture, game-modes, phase-structure]

## Purpose
Deterministic daily word generation — same word for all players on same day, no server needed, works offline.

## Algorithm
```
dailyWord(dateStr, wordList, length):
  seed = dateStr + ":" + PRIVATE_APP_SEED   # e.g., "2026-07-04:wordguess-s3cr3t!"
  hash = DJB2(seed)                          # good distribution, fast
  index = abs(hash) % wordList[length].length
  return wordList[length][index]
```

## Seed security (critical)
Private seed in JS source is trivially extractable via APK decompilation (apktool + strings). Mitigations:
- Split seed across multiple sources
- Part in native code (JNI/Kotlin)
- Part derived from app signing key fingerprint at runtime
- ProGuard/R8 minification enabled
- Avoid plain strings — compute from multiple sources
- Server-side validation (Phase 5+): verify submitted word matches expected before accepting leaderboard scores

## UTC handling (critical)
- Always use Date.UTC() — never device local time
- Normalize: `new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))`
- Cache computed word + date string on device
- Handle clock skew: 30+ minutes off → warn user
- Grace period: accept yesterday's word for 30min after UTC midnight

## Once set, immutable
Changing the seed after shipping breaks "same word for everyone". Seed must be fixed before first release.

## Edge cases
- UTC midnight boundary mid-game: current game finishes, next day's word loads after
- Time zone transitions: player crossing timezones mid-day still gets correct word
- Device clock wrong: use cached daily word if discrepancy > 30min
