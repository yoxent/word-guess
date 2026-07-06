# Phase 1: Foundation - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffolded with all foundational infrastructure — navigation shell, preprocessed dictionary, color theme, types/models, storage layer ready for feature development.

**Requirements:** FOUND-01 through FOUND-06

**In scope:**
- Expo project scaffolded with TypeScript, dev-client prebuild, EAS configured
- Dictionary preprocessed to clean word arrays per length (5-10), definitions/synonyms/antonyms stripped, offensive words filtered
- Color palette constants defined (pastel background, mint green, sunny yellow, muted slate, high-contrast primary UI)
- All TypeScript types and data models defined (GameSession, PlayerStats, AppSettings, AuthState, DailyPuzzle, LeaderboardEntry)
- Navigation shell with stack navigator and 6 screen placeholders (Home, Game, Result, Stats, Settings, Leaderboard)
- Storage layer: MMKV (settings + active game state), expo-sqlite (game history/stats), AsyncStorage (auth tokens) with typed accessor service

**Out of scope:**
- Any game logic, tile feedback, or keyboard UI (Phase 2)
- Any stats/settings UI beyond placeholder screens (Phase 3)
- Any monetization features (Phase 4)
- Any cloud/auth features (Phase 5)
- Any accessibility/polish/build pipeline (Phase 6)

</domain>

<decisions>
## Implementation Decisions

### 1. Project Scaffolding (FOUND-01)
- **D-01:** Use Expo SDK 57 with `npx create-expo-app --template blank-typescript`
- **D-02:** Run `npx expo prebuild` from day one to generate android/ native directory — avoids transition friction when native modules are needed in Phase 2
- **D-03:** EAS Build configured now (`eas.json` with dev/preview/production profiles)
- **D-04:** React Navigation (`@react-navigation/native-stack`), NOT Expo Router — simpler for linear stack flow, transfers to any RN project
- **D-05:** TypeScript strict mode enabled from day one
- **D-06:** Path alias `@/` → `src/` configured in tsconfig

### 2. Dictionary Preprocessing (FOUND-02)
- **D-07:** Build-time Node.js script (`scripts/preprocess-dictionary.mjs`) reads `dictionary.full.enriched.json` and outputs per-length JSON arrays
- **D-08:** Generated files stored at `assets/dictionary/{5-10}.json`
- **D-09:** Files added to `.gitignore` — regenerated via `"postinstall"` script in package.json
- **D-10:** Clean filter applied — offensive/slur words removed, proper nouns filtered, definitions/synonyms/antonyms stripped
- **D-11:** Only 5-10 letter English words included

### 3. Project Structure & Conventions (FOUND-01, FOUND-05)
- **D-12:** Type-based directory layout:
  ```
  src/
  ├── app/           # Entry, providers, navigation
  ├── screens/       # Screen components (one per route)
  ├── components/    # Reusable UI components
  ├── stores/        # Zustand state stores
  ├── types/         # TypeScript types/interfaces
  ├── utils/         # Pure utility functions
  ├── hooks/         # Custom React hooks
  ├── services/      # Storage, ads, IAP, cloud wrappers
  └── constants/     # App-wide constants (colors, layout, config)
  ```
- **D-13:** One file per component
- **D-14:** Barrel files (`index.ts`) for re-exporting from each directory
- **D-15:** Path alias `@/` maps to `src/`

### 4. Navigation Shell (FOUND-05)
- **D-16:** Stack navigator with 6 screens: Home → Game → Result → Stats → Settings → Leaderboard
- **D-17:** Game loop flow: Home → Game → Result → Home (Free/Random/Daily) or auto-advance to next Game (Endless mode)
- **D-18:** Navigation to Stats/Settings/Leaderboard accessible from every screen via header/menu button
- **D-19:** Settings as full-screen push (consistent transition with other screens)
- **D-20:** Leaderboard shows "Sign in with Google Play to see leaderboards" placeholder before auth (Phase 5 handles auto sign-in)

### 5. Storage Layer (FOUND-06)
- **D-21:** MMKV for settings (AppSettings) + active game state (GameSession) — synchronous writes for suspend/resume
- **D-22:** `expo-sqlite` for game history — summary-only stats (total games, wins, streaks, guess distribution, games per word length)
- **D-23:** AsyncStorage for auth tokens (matching Firebase/Google Sign-In SDK conventions)
- **D-24:** Typed `services/storage.ts` accessor — stores never import storage libraries directly; single file to swap backends if needed

### Claude's Discretion
- Implementation details (precise component props, error handling approach, loading states) are open to standard patterns unless user specifies otherwise

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` — Project overview, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — Full requirement set, FOUND-01 through FOUND-06 define Phase 1 scope
- `.planning/ROADMAP.md` — Phase 1 goal, mode, success criteria, dependency structure

### Technology stack research
- `.planning/research/STACK.md` — Recommended technology versions, installation, compatibility matrix
- `.planning/research/ARCHITECTURE.md` — Architecture patterns and recommendations
- `.planning/research/FEATURES.md` — Feature research and design considerations

### Configuration
- `.planning/config.json` — GSD workflow configuration

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dictionary.full.enriched.json` — Source dictionary (34MB, enriched with definitions/synonyms/antonyms); preprocessing script will strip to clean word arrays

### Established Patterns
- No existing codebase — greenfield project. All patterns established during Phase 1 will be conventions for subsequent phases.

### Integration Points
- App entry point (`src/app/App.tsx`) wires up: navigation container, MMKV provider, SQLite init, Zustand store hydration
- `services/storage.ts` is the single integration point for all persistent storage
- Navigation stack (`src/app/Navigation.tsx`) is where all screen routes are registered

</code_context>

<specifics>
## Specific Ideas

- Auto sign-in pattern (Phase 5): Silent Google Sign-In on app startup using whatever Google account is on device; manual "Sign in" button in Settings as fallback. Leaderboard screen shows conditional content based on auth state.
- Daily puzzle seed: Deterministic from UTC date + private app seed (Phase 2, but the seed strategy should be designed with Phase 1 types/models in mind)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-07-04*
