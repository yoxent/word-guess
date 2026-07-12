# Storage Strategy
updated: 2026-07-12 (SQLite singleflight, random_* streaks, guess dist bins 1–14)
tags: [storage, persistence, sqlite, mmkv]
related: [architecture, tech-stack, phase-structure, game-modes, stats-and-share]

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
  guess_distribution[1..14]  # fixed bins: max length 10 + 1 base + Pro extras
  games_by_length{5..10: {played, won}}
  perModeStreaks: daily_*/endless_*/random_* × normal|hard
```

## SQLite init (singleflight — 2026-07-12)
- `initDatabase()` opens once; concurrent callers await shared `dbInitPromise`
- `ensureDb()` = `db ?? initDatabase()` — used by reads/writes
- App startup also calls `initDatabase()` so first `saveGameResult` is not a no-op
- **Do not** re-open the DB on every write — caused `NativeDatabase.execAsync` NPE races
- On init failure: clear `db` + `dbInitPromise` so a later call can retry
- Stats write path / dedupe: [stats-and-share](stats-and-share.md)

## Active game keys (hard-mode-aware, 2026-07-11)
- Hard and normal mode games stored under separate MMKV keys:
  - `wordguess.activeGame_normal` — hardMode=false
  - `wordguess.activeGame_hard` — hardMode=true
- `getActiveGame(hardMode)`, `clearActiveGame(hardMode)` require the flag
- `saveActiveGame(game)` derives key from `game.hardMode`

## Endless streak keys (hard-mode-aware, 2026-07-11)
- `endless_streak_normal` / `endless_streak_hard` — separate streak counters per difficulty
- `getEndlessStreak(hardMode)`, `setEndlessStreak(streak, hardMode)`

## Stats per-mode streaks split (2026-07-11 / UI labels 2026-07-12)
- `computePerModeStreaks()` splits each mode into `_normal` and `_hard` sub-groups
- 6 groups: `daily_normal`, `daily_hard`, `endless_normal`, `endless_hard`, `random_normal`, `random_hard`
- SQL for random: `mode IN ('free', 'random')` — legacy Free Play rows roll into Random
- Stats Overview UI columns: Daily / Endless / **Random** (not “Free”)
- `getStats()` last-game detection reads `hard_mode` column from SQLite
- `game_history` table always had `hard_mode` column; queries now use it

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
| settingsStore | Yes — MMKV (sync), **partial** | MMKV via Zustand adapter. `hardModeEnabled` **excluded** from persist (v3) — session-only on Home pill |
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
- Query `completed_at DESC`, group by mode + hard_mode (see keys above)
- Daily / Endless / Random (incl. legacy `free`) each have normal + hard current/max
- Endless play-session streak also uses MMKV `endless_streak_*` keys for in-run display
- Streak resets to 0 on first `won = 0` row in the consecutive chain

### Game persistence (3 triggers)
| Trigger | Action | When |
|---------|--------|------|
| AppState background | `saveActiveGame()` | App goes to background (phone lock, switch apps) |
| Back navigation | `saveActiveGame()` | User taps back arrow from GameScreen (via `handleBack`) |
| Component unmount | `saveActiveGame()` | Android hardware back, swipe gesture, or screen unmount |

Restore: GameScreen init uses `shouldRestoreActiveGame()` from `src/utils/activeGame.ts` — random mode ignores route `letterCount`; other modes require match.

Clear: `clearActiveGame()` on game completion, explicit "New Game", or `startGame()` for a fresh instance.

### Rewarded hint fields (session-scoped)
`extraGuessesUsed`, `letterHintUsed`, and boosted `maxAttempts` live on `GameSession` in MMKV while `status === 'playing'`. They restore only when continuing the **same** in-progress game — never when starting a new instance (Home clears save or `startGame()` clears first).

### Continue game prompt
Home screen uses `shouldOfferContinue()` when user selects a mode:
- **Daily:** `mode` + `letterCount` + progress → auto-continue (no modal)
- **Random:** any saved random game with progress → modal; letter count of new roll ignored
- **Endless:** `mode` + `letterCount` + progress → modal
- Progress = guesses submitted, or rewarded hints used (`extraGuessesUsed` / `letterHintUsed`)
- Uses `navigateWithContinueCheck()` in HomeScreen.tsx
