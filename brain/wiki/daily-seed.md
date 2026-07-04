# daily-seed
updated: 2026-07-04
tags: [daily-puzzle, seed, cryptography, offline]
related: [architecture, game-modes, dictionary-preprocessing]

## Purpose
Deterministic daily word generation — same word for all players on same day, no server needed, works offline.

## Current approach (Phase 2 decision)
**Multi-source hash** — combine package name + app version + non-obvious constant string. No JNI/native layer.

```
dailyWord(dateStr, length, wordList):
  seed = packageName + ":" + appVersion + ":" + SECRET_CONSTANT
  hash = SHA256(dateStr + ":" + length + ":" + seed)
  index = abs(hash32) % wordList[length].length
  return wordList[length][index]
```

## 6 daily puzzles per day
One daily word per word length (5-10). Each uses the same seed but different `length` in the hash → different word per length.

## Seed security
- Multi-source hash — seed is NOT a single string, derived from package identity
- ProGuard/R8 minification enabled in production builds
- No JNI/native layer (Phase 1 plan was JNI — SIMPLIFIED Phase 2)
- **Accepts:** determined attacker with APK decompilation + debugger CAN extract
- **Goal:** block casual cheating, not nation-state threats
- **Future:** server-side validation (Phase 5+) to verify submitted daily word

## Per-length daily tracking
- Each length (5-10) independently playable once per day
- Completed = reached win or loss state
- Completed length disabled in picker for the day (UTC)
- In-progress game persists and resumes on return (if daily hasn't reset)
- Completed lengths tracked in MMKV per UTC date

## UTC handling (critical)
- Always use Date.UTC() — never device local time
- Normalize: `new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))`
- Cache computed words + date string on device
- Handle clock skew: 30+ minutes off → warn user or fall back to cached
- Grace period: accept yesterday's word for 30min after UTC midnight

## Once set, immutable
Changing the seed after shipping breaks "same word for everyone" invariant. Seed must be fixed before first release.

## Endless mode exclusion
Today's 1-6 daily words excluded from Endless target pool. Exclusion refreshes at UTC midnight.

## Previous approach (Phase 1 plan, superseded)
Phase 1 planned JNI native layer split (part in Kotlin/C++, part from app signing key). Phase 2 simplified to multi-source hash — adequate for blocking casual cheating without native complexity.
