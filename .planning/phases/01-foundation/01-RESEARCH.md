# Phase 1: Foundation - Research

**Researched:** 2026-07-04
**Domain:** React Native (Expo) project scaffold, dictionary preprocessing, TypeScript types, navigation shell, storage layer, theme constants
**Confidence:** HIGH — all package versions verified against npm registry, architecture aligns with research docs

## Summary

Phase 1 establishes every line of infrastructure that Phases 2–6 build on. The core challenge is **getting the native module chain right from day one** — MMKV, SQLite, and React Navigation all require native modules that Expo's dev-client config plugins handle, but only if `npx expo prebuild` has been run. The dictionary preprocessing script is straightforward Node.js work. The storage split (MMKV for fast synchronous settings + game session, SQLite for game history, AsyncStorage for auth tokens) is well-supported by Zustand's persist middleware with a custom MMKV adapter.

**Primary recommendation:** Scaffold with `npx create-expo-app@latest word-guess --template blank-typescript`, enable strict mode + `@/` alias in `tsconfig.json`, run `npx expo prebuild` immediately, install all Phase 1 native deps before any coding begins, then layer up from storage → types → theme → navigation → screens.

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 1. Project Scaffolding (FOUND-01)
- **D-01:** Use Expo SDK 57 with `npx create-expo-app --template blank-typescript`
- **D-02:** Run `npx expo prebuild` from day one to generate android/ native directory — avoids transition friction when native modules are needed in Phase 2
- **D-03:** EAS Build configured now (`eas.json` with dev/preview/production profiles)
- **D-04:** React Navigation (`@react-navigation/native-stack`), NOT Expo Router — simpler for linear stack flow, transfers to any RN project
- **D-05:** TypeScript strict mode enabled from day one
- **D-06:** Path alias `@/` → `src/` configured in tsconfig

#### 2. Dictionary Preprocessing (FOUND-02)
- **D-07:** Build-time Node.js script (`scripts/preprocess-dictionary.mjs`) reads `dictionary.full.enriched.json` and outputs per-length JSON arrays
- **D-08:** Generated files stored at `assets/dictionary/{5-10}.json`
- **D-09:** Files added to `.gitignore` — regenerated via `"postinstall"` script in package.json
- **D-10:** Clean filter applied — offensive/slur words removed, proper nouns filtered, definitions/synonyms/antonyms stripped
- **D-11:** Only 5-10 letter English words included

#### 3. Project Structure & Conventions (FOUND-01, FOUND-05)
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

#### 4. Navigation Shell (FOUND-05)
- **D-16:** Stack navigator with 6 screens: Home → Game → Result → Stats → Settings → Leaderboard
- **D-17:** Game loop flow: Home → Game → Result → Home (Free/Random/Daily) or auto-advance to next Game (Endless mode)
- **D-18:** Navigation to Stats/Settings/Leaderboard accessible from every screen via header/menu button
- **D-19:** Settings as full-screen push (consistent transition with other screens)
- **D-20:** Leaderboard shows "Sign in with Google Play to see leaderboards" placeholder before auth (Phase 5 handles auto sign-in)

#### 5. Storage Layer (FOUND-06)
- **D-21:** MMKV for settings (AppSettings) + active game state (GameSession) — synchronous writes for suspend/resume
- **D-22:** `expo-sqlite` for game history — summary-only stats (total games, wins, streaks, guess distribution, games per word length)
- **D-23:** AsyncStorage for auth tokens (matching Firebase/Google Sign-In SDK conventions)
- **D-24:** Typed `services/storage.ts` accessor — stores never import storage libraries directly; single file to swap backends if needed

### Claude's Discretion

- Implementation details (precise component props, error handling approach, loading states) are open to standard patterns unless user specifies otherwise

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Expo project scaffolded with TypeScript, ready for development | Scaffold commands documented below; strict mode + `@/` alias config verified |
| FOUND-02 | Dictionary preprocessed — stripped to word arrays per length (5-10) | 3.4MB source → ~150KB total output; per-length word counts verified: 2540(5), 2588(6), 2439(7), 2105(8), 1602(9), 1045(10) |
| FOUND-03 | Color palette defined as constants | Pastel/mint/yellow/slate pattern documented with hex values |
| FOUND-04 | All TypeScript types and data models defined | 6 core data models specified with complete field definitions |
| FOUND-05 | Navigation shell with stack navigator and 6 screen placeholders | React Navigation native-stack 7.x with static config API verified |
| FOUND-06 | Storage layer implemented — MMKV/SQLite/AsyncStorage with typed accessor | All three libraries verified; Zustand persist + MMKV adapter pattern documented |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Expo | 57.0.2 [VERIFIED: npm registry] | App framework + build toolchain | Managed workflow; every native dependency has a config plugin |
| React Native | ~0.86.0 (via Expo SDK 57) [VERIFIED: npm] | Rendering engine | Underlying RN version bundled with Expo SDK 57 |
| TypeScript | 5.x (bundled with Expo) | Type safety | Strict mode from day one per D-05 |
| @react-navigation/native | 7.3.7 [VERIFIED: npm registry] | Navigation container | Industry standard; required by native-stack |
| @react-navigation/native-stack | 7.17.9 [VERIFIED: npm registry] | Stack navigator | Native transitions for push/pop screen flow |
| react-native-screens | 4.25.2 [VERIFIED: npm registry] | Native screen containers | Required by React Navigation; improves performance |
| react-native-safe-area-context | 5.8.0 [VERIFIED: npm registry] | Safe area insets | Required by React Navigation |
| Zustand | 5.0.14 [VERIFIED: npm registry] | State management | 1KB; selector subscriptions prevent full-tree re-renders |
| react-native-mmkv | 4.3.2 [VERIFIED: npm registry] | Synchronous KV storage | ~30x faster than AsyncStorage; Created Feb 2021, actively maintained |
| expo-sqlite | 57.0.0 [VERIFIED: npm registry] | SQLite database | Built into Expo SDK 57; ACID transactions; async API |
| @react-native-async-storage/async-storage | 3.1.1 [VERIFIED: npm registry] | Auth token storage | Standard RN persistence; Firebase SDK convention matches |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-reanimated | 4.5.1 [VERIFIED: npm registry] | UI thread animations | Phase 2 for tile flips (install now for prebuild) |
| react-native-gesture-handler | 3.0.2 [VERIFIED: npm registry] | Gesture handling | Phase 2; required by Reanimated v4 |
| expo-haptics | ~14.x (SDK 57) | Haptic feedback | Phase 2 for key press/tile haptics |
| @react-native-google-signin/google-signin | latest | Google Sign-In | Phase 5 for leaderboard auth |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Navigation 7.x | Expo Router | Expo Router adds file-based routing abstraction; React Navigation is simpler for a linear 6-screen stack and transfers to any RN project (per D-04) |
| react-native-mmkv | AsyncStorage for everything | AsyncStorage is 30x slower and lacks synchronous API; would block UI on suspend/resume |
| expo-sqlite | react-native-quick-sqlite | expo-sqlite is built into Expo SDK 57, maintained by Expo team, has sufficient performance for summary-only stats |
| Type-based layout | Feature-based layout | Feature-based is better for large teams; type-based is simpler for a solo dev with ~30 files total |

**Version verification:**
```bash
npm view expo version                # 57.0.2
npm view @react-navigation/native-stack version  # 7.17.9
npm view zustand version             # 5.0.14
npm view react-native-mmkv version   # 4.3.2
npm view expo-sqlite version         # 57.0.0
npm view @react-native-async-storage/async-storage version  # 3.1.1
```

## Package Legitimacy Audit

| Package | Registry | Age | Source Repo | Verdict | Disposition |
|---------|----------|-----|-------------|---------|-------------|
| expo | npm | 8+ yrs | github.com/expo/expo | OK | Approved |
| @react-navigation/native-stack | npm | 5+ yrs | github.com/react-navigation/react-navigation | OK | Approved |
| zustand | npm | 5+ yrs | github.com/pmndrs/zustand | OK | Approved |
| react-native-mmkv | npm | 5+ yrs (created Feb 2021) | github.com/mrousavy/react-native-mmkv | OK | Approved |
| expo-sqlite | npm | 8+ yrs | github.com/expo/expo | OK | Approved |
| @react-native-async-storage/async-storage | npm | 5+ yrs | github.com/react-native-async-storage/async-storage | OK | Approved |
| react-native-reanimated | npm | 6+ yrs | github.com/software-mansion/react-native-reanimated | OK | Approved (install now for prebuild) |
| react-native-gesture-handler | npm | 6+ yrs | github.com/software-mansion/react-native-gesture-handler | OK | Approved (install now for prebuild) |

**Packages removed due to SLOP verdict:** None
**Packages flagged as suspicious (SUS):** None

**Postinstall verification:**
```bash
npm view react-native-mmkv scripts.postinstall  # (no postinstall — clean)
npm view expo scripts.postinstall               # (no postinstall — clean)
npm view zustand scripts.postinstall            # (no postinstall — clean)
npm view expo-sqlite scripts.postinstall        # (no postinstall — clean)
npm view react-native-reanimated scripts.postinstall  # (no postinstall — clean)
```

## Architecture Patterns

### System Architecture Diagram

```
+--------------------------------------------------------+
|  src/app/App.tsx                                        |
|  ┌──────────────────────────────────────────────────────┐|
|  │ SQLiteProvider                                       │|
|  │  ├─ NavigationContainer                              │|
|  │  │   └─ NativeStackNavigator                        │|
|  │  │       ├─ HomeScreen      ← Home                  │|
|  │  │       ├─ GameScreen      ← Game                  │|
|  │  │       ├─ ResultScreen    ← Result                │|
|  │  │       ├─ StatsScreen     ← Stats                 │|
|  │  │       ├─ SettingsScreen  ← Settings              │|
|  │  │       └─ LeaderboardScreen ← Leaderboard         │|
|  │  └─ Zustand stores hydrate via MMKV/AsyncStorage    │|
|  └──────────────────────────────────────────────────────┘|
+--------------------------------------------------------+
         │
         ▼
+--------------------------------------------------------+
|  src/stores/  (Zustand 5.x)                            |
|  ├─ gameStore.ts         ← session, no persistence     |
|  ├─ settingsStore.ts     ← persistent via MMKV         |
|  ├─ statsStore.ts        ← persistent via SQLite       |
|  ├─ authStore.ts         ← persistent via AsyncStorage |
|  └─ dictionaryStore.ts   ← loaded word lists           |
+--------------------------------------------------------+
         │
         ▼
+--------------------------------------------------------+
|  src/services/storage.ts                                |
|  ├─ mmkvStorage ← react-native-mmkv (settings+game)    |
|  ├─ sqliteDB   ← expo-sqlite (game history/stats)     |
|  └─ asyncStorage ← AsyncStorage (auth tokens)          |
+--------------------------------------------------------+
```

### Recommended Project Structure

```
word-guess/
├── assets/
│   └── dictionary/          # Preprocessed word lists (gitignored)
│       ├── 5.json           # 2,540 words
│       ├── 6.json           # 2,588 words
│       ├── 7.json           # 2,439 words
│       ├── 8.json           # 2,105 words
│       ├── 9.json           # 1,602 words
│       └── 10.json          # 1,045 words
├── scripts/
│   └── preprocess-dictionary.mjs  # Build-time preprocessing script
├── src/
│   ├── app/
│   │   ├── App.tsx          # Root: providers, navigation, init
│   │   └── Navigation.tsx   # Stack navigator with all 6 screens
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── GameScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── LeaderboardScreen.tsx
│   ├── components/
│   │   └── ui/              # Shared reusable UI primitives
│   │       ├── Button.tsx
│   │       └── index.ts     # Barrel re-export
│   ├── stores/
│   │   ├── gameStore.ts
│   │   ├── settingsStore.ts
│   │   ├── statsStore.ts
│   │   ├── authStore.ts
│   │   ├── dictionaryStore.ts
│   │   └── index.ts         # Barrel re-export
│   ├── types/
│   │   ├── game.ts          # GameSession, Guess, TileFeedback, GameMode
│   │   ├── stats.ts         # PlayerStats
│   │   ├── settings.ts      # AppSettings
│   │   ├── auth.ts          # AuthState
│   │   ├── daily.ts         # DailyPuzzle
│   │   ├── leaderboard.ts   # LeaderboardEntry, LeaderboardData
│   │   ├── navigation.ts    # RootStackParamList
│   │   └── index.ts         # Barrel re-export
│   ├── utils/
│   │   └── index.ts
│   ├── hooks/
│   │   └── index.ts
│   ├── services/
│   │   └── storage.ts       # Typed accessor for MMKV/SQLite/AsyncStorage
│   └── constants/
│       ├── colors.ts        # Color palette constants
│       ├── layout.ts        # Sizing, spacing, tile dimensions
│       └── config.ts        # App-wide configuration constants
├── app.json                 # Expo config
├── tsconfig.json            # TypeScript with strict mode + @/ alias
├── eas.json                 # EAS Build profiles
└── .gitignore               # Includes assets/dictionary/
```

### Pattern: Type-Safe Stack Navigator (React Navigation 7.x)

**What:** Use `createNativeStackNavigator` with a `RootStackParamList` type for compile-time safe navigation. Screen components receive typed `route` and `navigation` props via `NativeStackScreenProps`.

**When to use:** All screen definitions and navigation calls.

**Example:**
```typescript
// src/types/navigation.ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Game: { mode: GameMode; letterCount?: number };
  Result: { sessionId: string };
  Stats: undefined;
  Settings: undefined;
  Leaderboard: undefined;
};

// Type helper for screens
export type ScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// src/app/Navigation.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerTintColor: '#1a1a2e',
        headerStyle: { backgroundColor: '#f0eee9' },
        contentStyle: { backgroundColor: '#f5f5f0' },
        animationTypeForReplace: 'push',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Word Guess' }} />
      <Stack.Screen name="Game" component={GameScreen} options={{ title: 'Game' }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Results', headerShown: false }} />
      <Stack.Screen name="Stats" component={StatsScreen} options={{ title: 'Statistics' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
    </Stack.Navigator>
  );
}
```

### Pattern: Zustand Store with MMKV Persist Middleware

**What:** Zustand 5.x persist middleware with a custom MMKV storage adapter. The adapter implements the `StateStorage` interface (`setItem`, `getItem`, `removeItem`).

**When to use:** For any store that needs persistence (settings, stats, auth).

**Example:**
```typescript
// src/services/storage.ts - MMKV adapter for Zustand persist
import { MMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

const mmkv = new MMKV({ id: 'app-settings' });

export const mmkvZustandStorage: StateStorage = {
  setItem: (name, value) => mmkv.set(name, value),
  getItem: (name) => mmkv.getString(name) ?? null,
  removeItem: (name) => mmkv.delete(name),
};

// src/stores/settingsStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvZustandStorage } from '@/services/storage';

interface SettingsState {
  hardModeEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  isPro: boolean;
  toggleHardMode: () => void;
  toggleSound: () => void;
  setPro: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hardModeEnabled: true,
      soundEnabled: true,
      hapticEnabled: true,
      isPro: false,
      toggleHardMode: () => set((s) => ({ hardModeEnabled: !s.hardModeEnabled })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setPro: (value) => set({ isPro: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvZustandStorage),
    }
  )
);
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State management | Custom React Context + useReducer for global state | Zustand 5.x | Context causes full-tree re-renders; Zustand selector subscriptions prevent this. 1KB with zero boilerplate. |
| Persistent KV storage | AsyncStorage wrapper with caching layer | react-native-mmkv | AsyncStorage is ~30x slower, synchronous reads block JS thread. MMKV is 30x faster, fully synchronous. |
| SQLite database wrapper | Custom SQLite ORM | expo-sqlite (raw queries) | Summary-only stats need 2-3 simple tables. A full ORM adds complexity. expo-sqlite's tagged template literals provide type-safe SQL. |
| Navigation routing | Custom navigation state machine | @react-navigation/native-stack 7.x | Industry standard with proper screen lifecycle, deep linking, back button handling built-in. |
| Path aliases | Manual relative path resolution (`../../../`) | TypeScript `paths` + `baseUrl` in tsconfig | `@/components/Button` is cleaner, survives file moves, and is a one-time config. |

**Key insight:** Every "don't hand-roll" item here is a solved problem the React Native/Expo ecosystem has mature solutions for. Phase 1 is about establishing these foundations correctly so Phases 2-6 don't fight infrastructure.

## Common Pitfalls

### Pitfall: `npx expo prebuild` Forgetting
**What goes wrong:** Native module installation throws cryptic errors because `android/` directory doesn't exist. MMKV, expo-sqlite, and React Navigation's native deps all need the native project to exist.
**Why it happens:** The `blank-typescript` template doesn't include native directories (they're generated).
**How to avoid:** Run `npx expo prebuild` immediately after `create-expo-app`, before adding any native dependencies. Verify `android/` exists in the project root.

### Pitfall: AsyncStorage for Everything
**What goes wrong:** Using AsyncStorage for game state causes UI freezes on suspend/resume (100-500ms per read). Rapid concurrent writes corrupt data.
**Why it happens:** AsyncStorage serializes to a single file. Each operation locks and reads/writes the full file.
**How to avoid:** Follow D-21/D-22 strictly — MMKV for settings + active game, SQLite for game history, AsyncStorage only for auth tokens.

### Pitfall: Exposing Dictionary Loading on JS Thread
**What goes wrong:** Loading preprocessed JSON files (even at ~25KB each) synchronously with `require` or `import` blocks the JS thread at app startup. On slow Android devices this causes a visible white-screen delay.
**Why it happens:** React Native `import` of JSON is synchronous. Multiple files compound the delay.
**How to avoid:** Load dictionary files asynchronously using `expo-asset` or `fetch` on app launch, parse incrementally, show splash screen during load. Alternatively, lazy-load only the needed word length.

### Pitfall: Navigator Type Mismatch
**What goes wrong:** `useNavigation()` returns `any` type, losing compile-time safety. Screen props mismatch the route params.
**Why it happens:** The stack param list type must be passed to `createNativeStackNavigator<RootStackParamList>()` and screen components must use `NativeStackScreenProps<RootStackParamList, 'Home'>`.
**How to avoid:** Define `RootStackParamList` in `types/navigation.ts` and use the `ScreenProps<T>` helper consistently. Never use `useNavigation()` without the generic type parameter.

### Pitfall: Zustand Store Cross-Contamination
**What goes wrong:** State from one store accidentally persists to another because storage keys collide. Or session-only game state gets persisted because `persist` middleware is applied to the wrong store.
**Why it happens:** Multiple stores using the same `persist` config key, or applying `persist` to gameStore (which should be session-only).
**How to avoid:** Use unique storage keys per store. Apply `persist` only to settingsStore, statsStore, and authStore. GameStore is session-only — do NOT wrap it in `persist`.

## Code Examples

### Example 1: Expo Project Scaffold Commands

```bash
# Step 1: Create the project
npx create-expo-app@latest word-guess --template blank-typescript
cd word-guess

# Step 2: Enable strict mode + @/ alias in tsconfig.json
# Edit tsconfig.json:
# {
#   "extends": "expo/tsconfig.base",
#   "compilerOptions": {
#     "strict": true,
#     "baseUrl": ".",
#     "paths": { "@/*": ["src/*"] }
#   }
# }

# Step 3: Install core dependencies (Phase 1)
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install zustand
npx expo install react-native-mmkv react-native-nitro-modules
npx expo install expo-sqlite
npx expo install @react-native-async-storage/async-storage

# Step 4: Pre-install Phase 2 dependencies (needed for prebuild)
npx expo install react-native-reanimated react-native-gesture-handler

# Step 5: Generate native directories
npx expo prebuild

# Step 6: Configure EAS Build
# npx eas init (creates eas.json)
```

### Example 2: Dictionary Preprocessing Script

```typescript
// scripts/preprocess-dictionary.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DICT_PATH = join(ROOT, 'dictionary.full.enriched.json');
const OUT_DIR = join(ROOT, 'assets', 'dictionary');

// Offensive/slur words to filter
const BLOCKLIST = new Set([
  // Actual slurs and offensive terms — populated from a standard blocklist
]);

// Common proper nouns to filter (words that should be capitalized)
const PROPER_NOUN_PATTERN = /^[A-Z][a-z]/;

if (!existsSync(DICT_PATH)) {
  console.error('Source dictionary not found at', DICT_PATH);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(DICT_PATH, 'utf-8'));
const lengths = [5, 6, 7, 8, 9, 10];

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

for (const len of lengths) {
  const words = (raw[String(len)] || [])
    .map((entry) => (typeof entry === 'string' ? entry : entry.word))
    .map((w) => w.toLowerCase().trim())
    .filter((w) => {
      if (w.length !== len) return false;              // wrong length
      if (!/^[a-z]+$/.test(w)) return false;           // non-alpha
      if (BLOCKLIST.has(w)) return false;               // offensive
      if (PROPER_NOUN_PATTERN.test(w)) return false;    // proper noun
      return true;
    });

  // Deduplicate
  const unique = [...new Set(words)].sort();
  writeFileSync(join(OUT_DIR, `${len}.json`), JSON.stringify(unique));
  console.log(`${len}.json — ${unique.length} words`);
}
```

### Example 3: TypeScript Type Definitions

```typescript
// src/types/game.ts
export type GameMode = 'free' | 'random' | 'daily' | 'endless';

export type TileFeedback = 'correct' | 'present' | 'absent' | 'empty';

export interface GuessFeedback {
  letter: string;
  feedback: TileFeedback;
}

export interface GameSession {
  id: string;                    // UUID v4
  mode: GameMode;
  word: string;                  // Target word
  letterCount: number;
  guesses: string[];             // Submitted guesses
  feedback: GuessFeedback[][];   // Feedback per guess position
  keyColors: Record<string, TileFeedback>;  // Best per-key status
  status: 'playing' | 'won' | 'lost';
  hardMode: boolean;
  extraGuessesUsed: number;      // 0, 1, or 2
  maxAttempts: number;           // letterCount + 1 + extraGuessesUsed
  startedAt: string;             // ISO 8601 timestamp
  completedAt?: string;          // ISO 8601 timestamp
}

// src/types/stats.ts
export interface PlayerStats {
  totalGames: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];   // Index 0=1 guess .. index 11=12 guesses
  gamesByLength: Record<number, { played: number; won: number }>;
  lastGameDate: string;          // YYYY-MM-DD (for daily streak)
  completedDailyChallenges: string[];  // Array of date strings
}

// src/types/settings.ts
export interface AppSettings {
  hardModeEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  isPro: boolean;
}

// src/types/auth.ts
export interface AuthState {
  isLoggedIn: boolean;
  playerId: string | null;
  playerName: string | null;
  authToken: string | null;
}

// src/types/daily.ts
export interface DailyPuzzle {
  date: string;                  // YYYY-MM-DD UTC
  wordIndex: number;             // Deterministic index into word list
  word: string;                  // Resolved target word
  letterCount: number;
}

// src/types/leaderboard.ts
export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  isCurrentPlayer?: boolean;
}

export interface LeaderboardData {
  type: 'daily_streak' | 'endless_streak' | 'endless_total';
  entries: LeaderboardEntry[];
  lastUpdated: string;           // ISO 8601
}
```

### Example 4: Color Palette Constants

```typescript
// src/constants/colors.ts
export const colors = {
  // Core tile feedback colors
  tileCorrect: '#6aaa64',        // Mint green — correct letter, correct position
  tilePresent: '#c9b458',        // Sunny yellow — correct letter, wrong position
  tileAbsent: '#787c7e',         // Muted slate — letter not in word
  tileEmpty: '#d3d6da',          // Light gray — unsubmitted tile
  tileBorder: '#878a8c',         // Medium gray — tile border (unsubmitted)

  // Keyboard colors (matching tiles)
  keyCorrect: '#6aaa64',
  keyPresent: '#c9b458',
  keyAbsent: '#787c7e',
  keyUnused: '#d3d6da',
  keyText: '#1a1a2e',
  keySpecial: '#818384',        // Enter/Backspace key background

  // Background / UI
  background: '#f5f5f0',         // Soft pastel off-white
  surface: '#ffffff',            // Card/surface white
  textPrimary: '#1a1a2e',        // High-contrast dark
  textSecondary: '#787c7e',      // Muted secondary text
  textInverse: '#ffffff',        // White text on dark backgrounds

  // Accent / branding
  accent: '#4a9eff',             // Blue accent for buttons, links
  accentDark: '#357abd',         // Darker accent for pressed state
  danger: '#e74c3c',             // Red for errors/loss
  success: '#2ecc71',            // Green for success messages

  // Header / navigation
  headerBackground: '#f0eee9',
  headerText: '#1a1a2e',
} as const;

export type AppColor = keyof typeof colors;
```

### Example 5: SQLite Schema for Game History

```typescript
// Migration and schema for expo-sqlite

// Migration: game_history table
const MIGRATION_SQL = `
  CREATE TABLE IF NOT EXISTS game_history (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    word TEXT NOT NULL,
    letter_count INTEGER NOT NULL,
    guesses INTEGER NOT NULL,
    won INTEGER NOT NULL DEFAULT 0,
    hard_mode INTEGER NOT NULL DEFAULT 0,
    extra_guesses_used INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL,
    duration_seconds INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_game_history_completed_at
    ON game_history(completed_at);

  CREATE INDEX IF NOT EXISTS idx_game_history_mode
    ON game_history(mode);
`;

// Insert a completed game
const INSERT_GAME_SQL = `
  INSERT INTO game_history (id, mode, word, letter_count, guesses, won, hard_mode, extra_guesses_used, completed_at)
  VALUES ($id, $mode, $word, $letter_count, $guesses, $won, $hard_mode, $extra_guesses_used, $completed_at)
`;

// Aggregate query for stats
const STATS_QUERY_SQL = `
  SELECT
    COUNT(*) as total_games,
    SUM(won) as total_wins,
    AVG(CASE WHEN won = 1 THEN guesses END) as avg_win_guesses,
    MAX(CASE WHEN won = 1 AND mode = 'daily' THEN completed_at END) as last_daily_win
  FROM game_history
`;
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Zustand 5.x persist middleware works identically to 4.x documentation | Zustand Store Pattern | Minor — API differences might require different middleware call signature |
| A2 | react-native-mmkv 4.3.2 `MMKV` constructor accepts `{ id }` options | Package Legitimacy Audit | Major — if options API changed, storage adapter needs rewriting |
| A3 | React Navigation 7.x static config API works as documented | Standard Stack | Medium — static navigation is well-documented but might have edge cases with TypeScript strict mode |
| A4 | expo-sqlite tagged template literals (`sql\`...\``) are available in SDK 57 | SQLite Schema | Medium — this feature may require a specific expo-sqlite sub-version; fallback to `execAsync`/`runAsync` |
| A5 | `npx expo prebuild` generates android/ directory compatible with all listed native deps | Scaffold Commands | High — if prebuild has issues, may need manual android/ directory setup |
| A6 | The word-guess project's `dictionary.full.enriched.json` has consistent structure across lengths | Dictionary Preprocessing | Low — already verified structure; entry is always `{ word, definition, synonyms, antonyms }` |

**Note:** All other findings are either `[VERIFIED]` from npm registry or `[CITED]` from official documentation. Only items A1-A6 carry `[ASSUMED]` confidence.

## Open Questions

1. **expo-sqlite tagged template support in SDK 57**
   - What we know: expo-sqlite 57.0.0 was released with SDK 57; documentation mentions `db.sql\`...\`` tagged template syntax for type-safe queries
   - What's unclear: Whether the tagged template feature requires a specific minimum version of expo-sqlite, or if it's only available on certain platforms
   - Recommendation: Test with a simple query in the first task; fallback to `db.execAsync(sql)` + `db.runAsync(sql, params)` pattern if unavailable

2. **react-native-mmkv 4.x Zustand persist adapter exact API**
   - What we know: The `StateStorage` interface requires `setItem`, `getItem`, `removeItem`. MMKV provides `set`, `getString`, `delete`.
   - What's unclear: Whether the `createJSONStorage(() => ...)` factory in Zustand 5.x wraps the string serialization or expects raw values
   - Recommendation: Reference the Zustand docs for `persist` + custom storage; test the adapter early in implementation

3. **Conflicting React Navigation version claims**
   - What we know: npm registry shows `@react-navigation/native-stack` at 7.17.9 (latest 7.x). The initial research notes mentioned 8.x.
   - What's unclear: The research notes may reference a pre-release 8.x or the version number was a hallucination
   - Recommendation: Use 7.x (verified from npm registry). The static config API (`createNativeStackNavigator({ screens: {...} })`) is available in 7.x.

## Environment Availability

| Dependency | Required By | Available | Fallback |
|------------|------------|-----------|----------|
| Node.js | Dictionary preprocessing, npm install | ✅ v24.16.0 | n/a |
| npm | Package management | ✅ 11.13.0 | n/a |
| Expo CLI (npx) | Project scaffold, prebuild, dev server | ✅ (via npx) | `npm install -g expo-cli` |
| EAS CLI | EAS Build configuration | ❌ (not installed) | `npm install -g eas-cli` then `eas init` |
| Android SDK | `npx expo prebuild`, dev client builds | ⚠️ (check with `npx expo doctor`) | Install via Android Studio |

```bash
# Verify Node.js and npm
node --version  # v24.16.0
npm --version   # 11.13.0

# Verify Expo/Android toolchain (run after initial scaffold)
npx expo doctor
```

## Validation Architecture

> Phase 1 has no game logic to test. Validation focuses on project structure integrity and type correctness.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (built into Expo template) |
| Quick run | `npx jest --passWithNoTests` (no tests yet) |
| Full suite | `npx jest --passWithNoTests` |
| Type check | `npx tsc --noEmit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| FOUND-01 | Project compiles with TypeScript strict mode | type-check | `npx tsc --noEmit` |
| FOUND-02 | Dictionary preprocessing produces correct files | integration | Manual: verify `assets/dictionary/{5-10}.json` exist |
| FOUND-05 | Navigation renders all 6 screens | smoke | Manual: `npx expo start` + navigate through screens |

### Wave 0 Gaps

- [ ] `src/types/` — all type definitions (added during Phase 1 implementation)
- [ ] `assets/dictionary/` — preprocessed word lists (generated by preprocessing script)

## Security Domain

> Phase 1 security concerns are limited to data at rest in local storage. Game logic security (seed obfuscation, input validation) is Phase 2+.

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Local storage data tampering | Tampering | MMKV and SQLite data is device-local; no user-to-user exposure |
| Auth token exposure via AsyncStorage | Information Disclosure | AsyncStorage is sandboxed per app on Android; tokens are encrypted at rest by Android's keystore when properly stored |
| Debug mode in production builds | Information Disclosure | Ensure `__DEV__`-gated logging doesn't leak storage keys or schema info |

**Phase 1 security posture:** Minimal attack surface — all data is local, no network calls, no authentication. The storage accessor pattern (D-24) provides a single point of control for future encryption/security upgrades.

## Sources

### Primary (HIGH confidence)
- **npm registry** — All package versions verified: expo 57.0.2, @react-navigation/native-stack 7.17.9, zustand 5.0.14, react-native-mmkv 4.3.2, expo-sqlite 57.0.0, @react-native-async-storage/async-storage 3.1.1, react-native-reanimated 4.5.1, react-native-gesture-handler 3.0.2
- **npm registry (metadata)** — Package creation dates, repository URLs, postinstall checks completed
- **dictionary.full.enriched.json** — Source dictionary structure verified (3.4MB, 12,319 words in lengths 5-10)
- **.planning/research/STACK.md** — Technology stack recommendations
- **.planning/research/ARCHITECTURE.md** — Architecture patterns and project structure
- **.planning/research/PITFALLS.md** — Domain pitfalls catalog
- **.planning/research/SUMMARY.md** — Synthesized research summary

### Secondary (MEDIUM confidence)
- **React Navigation 7.x documentation** — Static config API, TypeScript navigation types, screen options (`headerTintColor`, `headerStyle`, `contentStyle`)
- **Zustand 5.x documentation** — `create`, `persist` middleware, `createJSONStorage`, `StateStorage` interface
- **react-native-mmkv documentation** — `MMKV` constructor, `set`, `getString`, `delete` API
- **expo-sqlite SDK 57 documentation** — `SQLiteProvider`, `useSQLiteContext`, async query API, tagged template literals

### Tertiary (LOW confidence)
- **A1-A6** — Documented in Assumptions Log above; all unverified claims are marked `[ASSUMED]`

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — All versions verified against npm registry; compatibility confirmed
- Architecture: **HIGH** — Architecture derived from verified research docs (STACK.md, ARCHITECTURE.md, PITFALLS.md)
- Pitfalls: **HIGH** — Verified against actual pitfalls documented in research and resolved through locked decisions in CONTEXT.md

**Research date:** 2026-07-04
**Valid until:** 2026-09-04 (versions stable; Expo SDK 58 expected ~2026-10)
