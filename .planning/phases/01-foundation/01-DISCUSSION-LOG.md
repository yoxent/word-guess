# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 1-Foundation
**Areas discussed:** Project Scaffolding, Dictionary Preprocessing, Project Structure & Conventions, Navigation Flow, Storage Layer Division

---

## 1. Project Scaffolding Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Managed Expo (no prebuild) | `npx create-expo-app`, no native builds during Phase 1; transition to dev builds later | |
| Expo + dev-client prebuild from start | Generate `android/` native directory now; native modules drop in cleanly later | ✓ |
| Expo Router (file-based routing) | `app/` directory maps to routes automatically; extra abstraction | |
| React Navigation (native-stack) | Manual navigation component; industry standard, transfers to any RN project | ✓ |
| TypeScript strict mode | `"strict": true` in tsconfig from day one | ✓ |
| TypeScript standard | Default Expo TS config | |
| EAS configured now | `eas.json` set up from the start | ✓ |
| EAS later | Configure in Phase 6 before launch | |

**User's choice:** Expo + dev-client prebuild from start; React Navigation; TypeScript strict mode; EAS configured now
**Notes:** User leaning towards prebuild from start. Clarified difference between Expo (framework), Expo Router (file-based routing on top of React Navigation), and React Navigation (industry standard library). User agreed React Navigation is the right choice for a simple 6-screen stack. Will handle TypeScript annotations for strict mode.

---

## 2. Dictionary Preprocessing

| Option | Description | Selected |
|--------|-------------|----------|
| Build-time Node.js script | Preprocess once on dev machine, commit generated files | ✓ |
| Runtime preprocessing | Load 34MB at startup, strip in-memory, cache | |
| Committed to git | Generated files visible in repo | |
| `.gitignore` + postinstall | Generated files stay local, regenerate on `npm install` | ✓ |
| Keep definitions/synonyms | Full enriched data in bundle | |
| Strip to clean word arrays | Only 5-10 letter words, no metadata | ✓ |
| No offensive word filter | Keep dictionary as-is | |
| Apply clean filter | Remove slurs, proper nouns, archaic words | ✓ |
| Flat single file | All words in one array | |
| Per-length files | Separate files for 5,6,7,8,9,10 letter words | ✓ |

**User's choice:** Build-time Node.js script; `.gitignore` + postinstall (after initial cleanup); clean filter; per-length files
**Notes:** User clarified the script runs on dev machine only, never on device. Confirmed `.gitignore` approach is easily migratable to committed files later. Order of operations: cleanup first, generate files, then add to `.gitignore` and wire postinstall.

---

## 3. Project Structure & Conventions

| Option | Description | Selected |
|--------|-------------|----------|
| Type-based layout | `screens/`, `components/`, `stores/` by type | ✓ |
| Feature-based layout | `game/`, `stats/`, `settings/` by feature | |
| One file per component | Each component in its own file | ✓ |
| Grouped files | Multiple small components in one file | |
| Barrel files | `index.ts` re-exports in each directory | ✓ |
| Direct imports | Import directly from component file | |
| Path alias `@/` | `@/components/Tile` instead of relative paths | ✓ |
| No path alias | Standard relative imports | |

**User's choice:** Type-based layout; one file per component; barrel files; `@/` path alias

---

## 4. Navigation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Wordle pattern (Result → Home) | Always return to Home after game completes | |
| Game loop with persistent bar | Endless auto-advances, Free/Random/Daily return to Home | ✓ |
| Navigation from Home only | Icons/buttons only on Home screen | |
| Navigation from every screen | Header/menu button on all screens | ✓ |
| Settings as modal | Slides up from bottom, dismiss downward | |
| Settings as full-screen push | Same push transition as other screens | ✓ |
| Leaderboard: placeholder screen | "Sign in to see leaderboards" | ✓ |
| Leaderboard: redirect to sign-in | Auto-navigate to sign-in flow | |

**User's choice:** Game loop with persistent bar; nav from every screen; Settings as full-screen push; leaderboard placeholder
**Notes:** Discussed auto sign-in pattern — user wants the standard Play Games silent auto-sign-in pattern. Leaderboard always accessible, shows conditional content based on auth state. Sign-in handled in Phase 5.

---

## 5. Storage Layer Division

| Option | Description | Selected |
|--------|-------------|----------|
| SQLite: full per-game data | Every guess persisted; enables replay | |
| SQLite: summary only | Total games, wins, streak, distribution | ✓ |
| MMKV: settings only | Only lightweight config values | |
| MMKV: settings + active game state | Also stores current board for suspend/resume | ✓ |
| expo-sqlite | Built-in Expo module, SQL queries | ✓ |
| react-native-quick-sqlite | Faster but extra dependency | |
| Direct storage calls in stores | Each store imports MMKV/SQLite directly | |
| Typed `storage.ts` accessor | Single service file with typed methods | ✓ |

**User's choice:** Summary-only stats in SQLite; MMKV for settings + active game state; AsyncStorage for auth tokens; expo-sqlite; typed `storage.ts` wrapper
**Notes:** Recommended MMKV + AsyncStorage two-way split over three-way (simpler, only two native storage backends). Recommended typed accessor pattern for compile-time safety and easy backend swaps.

---

## Claude's Discretion

- Implementation details within the decisions above (precise props, error handling, loading states) are open to standard patterns.
- Daily seed algorithm and obfuscation technique (defers to Phase 2 planning, but types/models should accommodate it).

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
