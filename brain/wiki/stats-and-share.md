# Stats & Share
updated: 2026-07-12 (share header: brand / mode on separate lines)
tags: [stats, share, sqlite, toast, ux, phase-3]
related: [storage-strategy, ui-config-registry, architecture, game-modes, cloud-sync]

## Stats write path (2026-07-12)
Primary record happens in **ResultModal** on win/loss (same moment as endless MMKV streak updates). GameScreen keeps a backup call.

| Mechanism | Purpose |
|-----------|---------|
| `statsStore.recordGameIfNeeded(result)` | Idempotent; module-level `recordedSessionIds` Set keyed by session `id` |
| `storage.ensureDb()` / `initDatabase()` singleflight | One open+migrate promise — concurrent callers share it |
| App startup `initDatabase()` | Warm DB before first write (avoids “never opened” no-op) |

**Gotcha:** Re-calling `openDatabaseAsync` / re-init on every write raced and crashed with `NativeDatabase.execAsync` NPE. Never re-open when `db` is already set; reset `dbInitPromise` only on init failure.

**Cloud:** Local SQLite is source of truth for personal stats offline. Leaderboard/cloud sync remains Phase 5 / [cloud-sync](cloud-sync.md).

## Stats UI
| Area | Behavior |
|------|----------|
| Overview streaks | 3 columns: **Daily / Endless / Random** (UI label; storage keys `random_*`; legacy SQL `free` rolls into random) |
| Each column | Normal + hard sub-streaks |
| Guess distribution | Custom Wordle-style **horizontal bars** (not chart-kit). Fixed bins **1–14** (10-letter base + Pro extras) |
| Share FAB on Stats | **Removed** — share lives on ResultModal only |

## Share (ResultModal, wins only)
- Icon top-right of result card → `generateShareText` → `expo-clipboard`
- Feedback: **toast** (~2.2s), not `Alert.alert`
- Header: `Word Guess` on its own line, then `{Mode} · {N}-letter`, then date, emoji rows, `attempts/max` or `X/max`, footer

```
Word Guess
Endless · 5-letter
2026-07-12

🟩⬛🟨⬛⬛
…
3/6

Play Word Guess!
```

Input requires `letterCount` on `GameResultForShare` (`src/utils/share.ts`).

## Transient feedback convention
Prefer **toast / tooltip** over native `Alert` for non-blocking copy/help:
| Surface | Pattern |
|---------|---------|
| ResultModal share | Success/error toast on modal overlay |
| SettingsScreen IAP/auth | Existing toast |
| Settings help `(?)` | Anchored tooltip Modal (auto-dismiss ~3.5s / tap outside) — see [ui-config-registry](ui-config-registry.md) |

No `Alert.alert` remaining under `src/` (as of 2026-07-12).
