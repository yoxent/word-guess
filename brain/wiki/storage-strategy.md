# Storage Strategy
updated: 2026-07-05 (3 persistence triggers, continue-game prompt)
tags: [storage, persistence, sqlite, mmkv]
related: [architecture, tech-stack, phase-structure, game-modes]

## Three-tier split
| Store | Technology | Why |
|-------|-----------|-----|
| Settings + active game session | react-native-mmkv | Synchronous writes (critical for suspend/resume), 30x faster than AsyncStorage |
| Game history + aggregated stats | expo-sqlite | ACID transactions, partial updates, fast queries. 1 row/game. |
| Auth tokens | AsyncStorage | Matches Firebase/Google Sign-In SDK conventions. Lightweight. |

## Why not AsyncStorage for everything
- AsyncStorage serializes to single file → 50KB+ reads cause 100-500ms freeze
- No ACID → concurrent writes can corrupt
- No partial updates → load/edit/save entire blob per operation
- SQLite handles structured data, MMKV handles KV

## Data model (SQLite)
```
game_history:
  id TEXT PK           # UUID
  mode TEXT            # 'daily' | 'free' | 'random' | 'endless'
  word TEXT            # target word
  word_length INT
  won BOOLEAN
  guesses INT          # number of guesses used
  guess_distribution TEXT  # JSON array of per-guess feedback
  played_at TEXT       # ISO timestamp

stats (computed from queries, cached):
  total_games, wins, win_pct
  current_streak, max_streak
  guess_distribution[1..11]  # per-number-of-attempts
  games_by_length{5..10: {played, won}}
```

## Access pattern
```
services/storage.ts — typed accessors
  - stores never import MMKV/SQLite/AsyncStorage directly
  - single file to swap backends
  - init() called at app startup, registers all stores
```

## Zustand MMKV persist adapter
MMKV works as Zustand persist middleware storage via `StateStorage` interface:
```typescript
import { StateStorage } from 'zustand/middleware';
import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV({ id: 'settings-storage' });

export const zustandStorage: StateStorage = {
  setItem: (name, value) => mmkv.set(name, value),
  getItem: (name) => mmkv.getString(name) ?? null,
  removeItem: (name) => mmkv.remove(name),
};
```
Settings store uses persist middleware with this adapter. Game store is session-only (no persist). Stats store uses SQLite, not persist. Auth store uses AsyncStorage persist.

## 5 stores persistence strategy
| Store | Persist | Backend |
|-------|---------|--------|
| settingsStore | Yes — MMKV (sync) | MMKV via Zustand adapter |
| statsStore | No — SQLite-backed (async) | expo-sqlite via storage service |
| authStore | Yes — AsyncStorage (async) | AsyncStorage via Zustand adapter |
| gameStore | No — session only | MMKV (active game save/restore via AppState listener) |
| dictionaryStore | No — in-memory from static require | Pre-bundled JSON at build time |

## MMKV keys added in Phase 2
| Key | Type | Purpose |
|-----|------|---------|
| `daily_completed_<YYYY-MM-DD>` | `number[]` (JSON) | Per-date array of completed daily challenge lengths |
| `endless_streak` | `number` | Consecutive correct Endless streak count |

### Storage helper functions (in `src/services/storage.ts`)
- `getDailyCompletedLengths(dateStr): number[]` — reads MMKV, returns array
- `markDailyCompleted(dateStr, length): void` — appends to array, deduplicates
- `getEndlessStreak(): number` — reads MMKV number, defaults 0
- `setEndlessStreak(streak): void` — writes to MMKV

## Stats aggregation queries (Phase 3)
Stats computed from SQLite `game_history` table at query time, cached in statsStore:

```sql
-- Total games, wins, win %
SELECT COUNT(*) as total_games, SUM(won) as total_wins FROM game_history;

-- Guess distribution (per-number-of-attempts)
SELECT guesses, COUNT(*) as count FROM game_history WHERE won = 1 GROUP BY guesses ORDER BY guesses;

-- Games by word length
SELECT letter_count, COUNT(*) as played, SUM(won) as won FROM game_history GROUP BY letter_length ORDER BY letter_count;

-- Current streak (consecutive wins by last game date descending)
-- Computed in application code: query recent games ordered by completed_at DESC,
-- count consecutive wins until first loss.
```

### Per-mode streak computation
- Query `completed_at DESC`, group by `mode`
- Daily Challenge: filter `mode = 'daily'`, count consecutive wins
- Non-daily (Random + Free Play — Free Play removed from UI but type preserved): filter `mode IN ('free', 'random')`, count consecutive wins
- Endless: uses separate MMKV `endless_streak` key (not SQLite)
- Streak resets to 0 on first `won = 0` row in the consecutive chain

### Game persistence (3 triggers)
| Trigger | Action | When |
|---------|--------|------|
| AppState background | `saveActiveGame()` | App goes to background (phone lock, switch apps) |
| Back navigation | `saveActiveGame()` | User taps back arrow from GameScreen (via `handleBack`) |
| Component unmount | `saveActiveGame()` | Android hardware back, swipe gesture, or screen unmount |

Restore: GameScreen init checks `getActiveGame()` for saved session matching `mode`. If found, restores via `restoreSession()`.

Clear: `clearActiveGame()` called on game completion (win/loss) or explicit "New Game" from Home prompt.

### Continue game prompt
Home screen checks for saved game when user selects a mode+length. If saved game exists with matching `mode` + `letterCount` + `status === 'playing'`, shows Alert:
> Continue Game? [Continue] [New Game] [Cancel]
- **Continue** → navigates, GameScreen restores saved session
- **New Game** → `clearActiveGame()` then navigates fresh
