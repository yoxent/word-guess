# daily-seed
updated: 2026-07-04
tags: [daily-puzzle, seed, cryptography, offline]
related: [architecture, game-modes, dictionary-preprocessing, tech-stack]

## Purpose
Deterministic daily word generation — same word for all players on same day, no server needed, works offline.

## Implementation (Phase 2, D-25/D-26/D-27)
**Multi-source hash** with DJB2 (not SHA256 — `crypto` not available in React Native Hermes).

```
APP_SEED = 'wg-v1-seed-2026'  # fixed before first release, immutable after
hashInput = APP_SEED + ":" + dateStr + ":" + length
hash = DJB2(hashInput)  # 32-bit integer
dailyIndex = Math.abs(hash) % wordList[length].length
word = wordList[length][dailyIndex]
```

**DJB2 hash function** (in `src/services/dailySeed.ts`):
```typescript
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // 32-bit int
  }
  return Math.abs(hash);
}
```

**API surface** (exports from `src/services/dailySeed.ts`):
- `getDailyDateString(date?: Date): string` — UTC YYYY-MM-DD
- `getDailyWordIndex(dateStr: string, length: number, wordCount: number): number` — DJB2 hash → modulo

**Structured daily words** — `getTodayDailyWords()` on dictionaryStore returns `{ date: string, words: Record<number, string> }` (6 words, one per length 5-10). Callers use `result.words[length]`.

## 6 daily puzzles per day
One daily word per word length (5-10). Same seed, different `length` in hash → different word per length.

## Seed security
- Multi-source hash with constant string `wg-v1-seed-2026` + ProGuard/R8 minification
- No JNI/native layer (D-27: accepted risk for determined attacker with APK decompilation)
- **Goal:** block casual cheating, not nation-state threats
- **Future:** server-side validation (Phase 5+) to verify submitted daily word

## Per-length daily tracking
- Each length (5-10) independently playable once per day
- Completed = win or loss state reached
- Completed length disabled in picker (greyed + checkmark) for rest of UTC day
- In-progress game persists in MMKV, resumes on return (if daily hasn't reset)
- Completed lengths tracked in MMKV per UTC date via `markDailyCompleted(date, length)`

## UTC handling (critical)
- Always `Date.UTC()`, never device local time
- Normalize: `new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))`
- Clock skew >30 min → warn or fall back to cached
- Grace period: accept yesterday's word 30min after UTC midnight

## Once set, immutable
Seed `wg-v1-seed-2026` fixed before first release. Changing it breaks "same word for everyone" — all daily words shift.

## Endless mode exclusion
Today's 1-6 daily words (computed via `getTodayDailyWords()`) excluded from Endless target pool. Exclusion refreshes at UTC midnight. Same-day exclusion only.

## Previous approach (Phase 1, superseded)
Phase 1 planned JNI native layer split (Kotlin/C++ + app signing key). Phase 2 simplified to multi-source hash + ProGuard — adequate for casual cheating prevention without native complexity.

## Implementation location
- `src/services/dailySeed.ts` — pure JS functions (no RN/expo imports, testable)
- Called by `dictionaryStore.getTodayDailyWords()` at game start
- Seed constant `APP_SEED` defined as module-level constant in dailySeed.ts
