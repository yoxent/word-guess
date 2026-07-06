# Walking Skeleton — Phase 1: Foundation

> **MODE:** mvp (Walking Skeleton)
> **Goal:** Scaffolded project with navigation shell, dictionary, storage, types, and theme — ready for Phase 2 (Core Gameplay).

---

## What a Walking Skeleton Is

A fully integrated end-to-end slice of the infrastructure that will support the entire game. It's not "just scaffolding" — it's **runnable code** that demonstrates:

1. The app starts without crashing
2. Navigation works between all screens
3. The dictionary can be loaded
4. Storage layer accepts and returns data
5. Types and theme are consumable by components

---

## Architecture Overview

```
App.tsx
├── SQLiteProvider          ← expo-sqlite (game history)
├── NavigationContainer     ← React Navigation 7.x
│   └── NativeStackNavigator
│       ├── HomeScreen      ← Mode selection entry
│       ├── GameScreen      ← Placeholder (Phase 2 full)
│       ├── ResultScreen    ← Placeholder (Phase 2 full)
│       ├── StatsScreen     ← Placeholder (Phase 3 full)
│       ├── SettingsScreen  ← Placeholder (Phase 3 full)
│       └── LeaderboardScreen ← Placeholder (Phase 5 full)
├── Zustand stores (hydrated)
│   ├── settingsStore       ← persist via MMKV adapter
│   ├── statsStore          ← persist via SQLite
│   ├── authStore           ← persist via AsyncStorage
│   ├── gameStore           ← session-only (no persist)
│   └── dictionaryStore     ← session-only (loaded word lists)
```

---

## What Each Plan Delivers

| Plan | Wave | Requirement | Deliverables |
|------|------|-------------|--------------|
| 01-01-PLAN | 1 | FOUND-01, FOUND-02, FOUND-03, FOUND-04 | Expo project, types, colors, constants, dictionary script (run) |
| 01-02-PLAN | 2 | FOUND-06 | Storage service (MMKV/SQLite/AsyncStorage adapters), Zustand stores |
| 01-03-PLAN | 2 | FOUND-05 | Navigation shell, 6 placeholder screens, App.tsx wiring |

---

## File Structure (After Phase 1)

```
word-guess/
├── assets/
│   └── dictionary/
│       ├── 5.json          ← 2,540 words (gitignored, ~35KB)
│       ├── 6.json          ← 2,588 words
│       ├── 7.json          ← 2,439 words
│       ├── 8.json          ← 2,105 words
│       ├── 9.json          ← 1,602 words
│       └── 10.json         ← 1,045 words
├── scripts/
│   └── preprocess-dictionary.mjs   ← Build-time preprocessing
├── src/
│   ├── app/
│   │   ├── App.tsx                 ← Root: providers + navigation
│   │   └── Navigation.tsx          ← Stack navigator (6 screens)
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── GameScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   ├── StatsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── LeaderboardScreen.tsx
│   ├── components/
│   │   └── ui/
│   │       ├── Button.tsx          ← Reusable themed button
│   │       └── index.ts
│   ├── stores/
│   │   ├── gameStore.ts            ← Game session (no persist)
│   │   ├── settingsStore.ts        ← Persistent via MMKV
│   │   ├── statsStore.ts           ← Persistent via expo-sqlite
│   │   ├── authStore.ts            ← Persistent via AsyncStorage
│   │   ├── dictionaryStore.ts      ← Word list loader (no persist)
│   │   └── index.ts                ← Barrel
│   ├── types/
│   │   ├── game.ts                 ← GameSession, GuessFeedback, GameMode
│   │   ├── stats.ts                ← PlayerStats
│   │   ├── settings.ts             ← AppSettings
│   │   ├── auth.ts                 ← AuthState
│   │   ├── daily.ts                ← DailyPuzzle
│   │   ├── leaderboard.ts          ← LeaderboardEntry, LeaderboardData
│   │   ├── navigation.ts           ← RootStackParamList
│   │   └── index.ts                ← Barrel
│   ├── services/
│   │   └── storage.ts              ← Typed accessor (MMKV/SQLite/AsyncStorage)
│   └── constants/
│       ├── colors.ts               ← Palette (mint, yellow, slate, pastel)
│       ├── layout.ts               ← Sizing/spacing
│       └── config.ts               ← App config
├── app.json                         ← Expo config
├── tsconfig.json                   ← Strict mode + @/ alias
├── eas.json                        ← EAS Build profiles
├── .gitignore                      ← Includes assets/dictionary/
└── package.json                    ← Dependencies + postinstall script
```

---

## Key Wiring Points

| Connection | What It Does | Pattern |
|-----------|--------------|---------|
| `storage.ts` → MMKV | Settings + active game state | `MMKV` constructor with `{ id }` option |
| `storage.ts` → expo-sqlite | Game history / stats | `SQLiteProvider` + `useSQLiteContext` |
| `storage.ts` → AsyncStorage | Auth tokens | Standard `getItem/setItem/removeItem` |
| `mmkvZustandStorage` → Zustand persist | Store persistence | `createJSONStorage(() => mmkvZustandStorage)` |
| `App.tsx` → Navigation | Root navigation | `NavigationContainer` wrapping stack |
| `Navigation.tsx` → Screens | Route registration | `createNativeStackNavigator<RootStackParamList>()` |
| `App.tsx` → SQLiteProvider | DB init | Wrap in `<SQLiteProvider databaseName="wordguess.db">` |
| Script → `assets/dictionary/*.json` | Preprocessed output | `writeFileSync` per word length |

---

## Verification

After executing all 3 plans:

1. **Build check:** `npx tsc --noEmit` passes with strict mode
2. **Dictionary check:** `assets/dictionary/5.json` through `10.json` exist, non-empty arrays of strings
3. **Navigation check:** App renders all 6 screens via stack navigator
4. **Storage check:** MMKV, SQLite, and AsyncStorage instances initialize without errors
5. **Type safety:** All screens use `NativeStackScreenProps<RootStackParamList, 'ScreenName'>`
6. **Theme check:** All screens import and use `colors` from `@/constants/colors`

---

## Phase 1 → Phase 2 Transition

After Phase 1 completes, Phase 2 (Core Gameplay) will:

1. Implement `GameBoard`, `GuessRow`, `Tile` components in `src/components/game/`
2. Implement on-screen `Keyboard` component
3. Wire `gameStore.submitGuess()` → `WordLogicService.evaluateGuess()`
4. Add tile flip animations via react-native-reanimated
5. Implement Daily Challenge seed logic
6. Add sound effects and haptics

The skeleton ensures Phase 2 can focus on game logic without fighting infrastructure.
