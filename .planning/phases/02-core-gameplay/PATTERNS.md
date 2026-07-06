# Phase 2: Core Gameplay — Pattern Assignments

> Each entry maps a new/modified file to the closest existing codebase analog, with concrete excerpts to copy from. Follow the analog's structure first, then apply the key differences listed.

---

## 1. EXISTING CODEBASE PATTERNS (Canonical Reference)

### 1.1 File & Directory Structure (D-12, D-13, D-14)

```
src/
├── app/
│   ├── App.tsx          # Root component, providers
│   └── Navigation.tsx   # Stack navigator, screen registration
├── screens/             # One file per screen, barrel re-export
├── components/
│   └── ui/              # Reusable UI primitives
│       ├── Button.tsx
│       └── index.ts     # Barrel re-export
├── stores/              # Zustand stores, barrel re-export
├── services/            # SDK wrappers, barrel re-export
├── types/               # TypeScript interfaces, barrel re-export
├── constants/           # App-wide constants, barrel re-export
├── hooks/               # Custom hooks (currently empty)
└── utils/               # Pure utility functions (currently empty)
```

**Convention:** One file per component/screen/store. Barrel `index.ts` per subdirectory. Path alias `@/` → `src/`.

### 1.2 Component Pattern (Button.tsx reference)

```typescript
// Import pattern
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

// Interface for props
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}

// Named export, not default export
export function Button({ title, onPress, variant = 'primary', ... }: ButtonProps) {
  // Inline dynamic styles, static styles via StyleSheet.create
  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: bgColor }, style]} ...>
      <Text style={[styles.text, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );
}

// StyleSheet.create outside component (static, not re-created on render)
const styles = StyleSheet.create({
  button: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, ... },
  text: { fontSize: 16, fontWeight: '700' },
});
```

**Key traits:**
- Named exports only (no `export default`)
- Props interface above the component
- `StyleSheet.create` outside component
- Color/layout from `@/constants/*` not inline
- `colors.background` for container backgrounds
- `TouchableOpacity` with `activeOpacity={0.7}`

### 1.3 Zustand Store Pattern (gameStore.ts reference)

```typescript
import { create } from 'zustand';
import type { GameSession, GameMode, GuessFeedback, TileFeedback } from '@/types';

interface GameState {
  // State fields
  session: GameSession | null;
  currentGuess: string;
  // Actions (named functions, no dispatch)
  startGame: (mode: GameMode, word: string, letterCount: number, hardMode: boolean) => void;
  addLetter: (letter: string) => void;
  submitGuess: (guesses: string[], ...) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()((set, get) => ({
  session: null,
  currentGuess: '',

  // Action pattern: get() for current state, set() for immutable update
  startGame: (mode, word, letterCount, hardMode) => {
    const session: GameSession = { ... };
    set({ session, currentGuess: '' });
  },

  addLetter: (letter) => {
    const { session, currentGuess } = get();
    if (!session || session.status !== 'playing') return;
    set({ currentGuess: currentGuess + letter });
  },
  // ...
}));
```

**With persist middleware (settingsStore.ts reference):**

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvZustandStorage } from '@/services/storage';

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hardModeEnabled: true,
      toggleHardMode: () => set((s) => ({ hardModeEnabled: !s.hardModeEnabled })),
      // ...
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => mmkvZustandStorage),
    }
  )
);
```

**With async actions (statsStore.ts reference):**

```typescript
export const useStatsStore = create<StatsState>()((set, get) => ({
  stats: null,
  isLoading: true,
  loadStats: async () => {
    try {
      await initDatabase();
      const stats = await getStats();
      set({ stats, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
```

### 1.4 Screen Pattern (GameScreen.tsx / HomeScreen.tsx reference)

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ScreenProps, RootStackParamList } from '@/types';
import { colors } from '@/constants/colors';

// Screen that receives route params:
type Props = ScreenProps<'Game'>;        // Props from navigation
export function GameScreen({ route }: Props) {
  const { mode, letterCount } = route.params;
  return ( ... );
}

// Screen that navigates (no route params):
type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;
export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const startGame = (mode: GameMode, letterCount?: number) => {
    navigation.navigate('Game', { mode, letterCount });
  };
  return ( ... );
}

const styles = StyleSheet.create({ ... });
```

### 1.5 Navigation Registration Pattern (Navigation.tsx reference)

```typescript
import { HomeScreen, GameScreen, ... } from '@/screens';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={{ ... }}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: '...', headerRight: ... }} />
      <Stack.Screen name="Game" component={GameScreen} options={{ headerShown: false }} />
      ...
    </Stack.Navigator>
  );
}
```

### 1.6 Constants Pattern (colors.ts / layout.ts reference)

```typescript
export const colors = {
  tileCorrect: '#6aaa64',
  tilePresent: '#c9b458',
  tileAbsent: '#787c7e',
  // ...
} as const;

export const layout = {
  tileSize: 56,
  tileGap: 4,
  tileBorderRadius: 6,
  keyboardKeyHeight: 48,
  // ...
} as const;
```

### 1.7 Service Layer Pattern (storage.ts reference)

```typescript
import { createMMKV } from 'react-native-mmkv';
// Direct library imports bounded to this file
// Typed accessor functions exported

export function getSettings(): AppSettings | null {
  const raw = mmkv.getString(SETTINGS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveSettings(settings: AppSettings): void {
  mmkv.set(SETTINGS_KEY, JSON.stringify(settings));
}
```

**Pattern:** Service files wrap SDKs/libraries. Stores never import storage libraries directly. Single file to swap backends if needed (D-24).

### 1.8 Barrel Export Pattern

Each subdirectory has `index.ts`:

```typescript
// stores/index.ts
export { useSettingsStore } from './settingsStore';
export { useGameStore } from './gameStore';
// ...

// types/index.ts
export * from './game';
export * from './stats';
// ...
```

---

## 2. NEW FILE PATTERN ASSIGNMENTS

### `src/services/wordLogic.ts` (NEW)
- **Role:** service (pure utility functions)
- **Data flow:** stateless synchronous — called by game store at submit time
- **Function(s):** `evaluateGuess(target, guess) → GuessFeedback[]`, `validateHardMode(prevFeedback, newGuess) → { valid: boolean, reason?: string }`
- **Analog:** `src/services/storage.ts` (service layer pattern)
- **Pattern to follow:**
  ```typescript
  import type { GuessFeedback, TileFeedback } from '@/types';

  // Pure function — no side effects, no state
  export function evaluateGuess(
    target: string,
    guess: string
  ): GuessFeedback[] {
    // Wordle duplicate-letter rules (correct → present → absent pass)
    // 1. Mark exact matches first (correct)
    // 2. Count remaining target letters
    // 3. Mark present/absent with remaining counts
    // Returns GuessFeedback[] of same length
  }

  export function validateHardMode(
    previousFeedback: GuessFeedback[][],
    newGuess: string
  ): { valid: boolean; reason?: string } {
    // (1) All green tiles from previous guess in same positions
    // (2) All yellow tiles appear somewhere in new guess
    // (3) Duplicate letter edge cases per NYT rules
  }
  ```
- **Error handling pattern:** Pure function, no try/catch. Invalid input returns empty array or `{ valid: false, reason }`. Tested with 20+ unit tests for duplicate letter edge cases.
- **Key differences:** Stateless utility vs. storage.ts which has side effects. No imports from react-native or libraries.
- **Imports to copy:** `import type { GuessFeedback, TileFeedback } from '@/types';`

---

### `src/services/dailySeed.ts` (NEW)
- **Role:** service (pure utility)
- **Data flow:** stateless synchronous — computes deterministic daily word index
- **Analog:** `src/services/storage.ts` (service layer)
- **Pattern to follow:**
  ```typescript
  // Multi-source hash: SHA256(date + ':' + length + ':' + appSeed)
  // truncated to 32-bit int, modulo wordlist length (D-25)
  const APP_SEED = 'wg-v1-seed-2026'; // obfuscated via ProGuard minification

  export function getDailyWordIndex(date: string, length: number, wordCount: number): number {
    // DJB2 or SHA256-based hash
    // Deterministic: same inputs → same index
    // Returns 0 <= index < wordCount
  }

  export function getDailyDateString(date?: Date): string {
    // Returns YYYY-MM-DD in UTC
  }
  ```
- **Error handling pattern:** Pure function, no error states. `wordCount` must be > 0 (caller validates).
- **Key differences:** No library imports needed (uses built-in crypto or simple DJB2). No I/O.
- **Imports to copy:** none (no external dependencies needed)

---

### `src/services/sound.ts` (NEW)
- **Role:** service (no-op stub per D-33)
- **Data flow:** fire-and-forget calls from components
- **Analog:** `src/services/storage.ts` (service pattern)
- **Pattern to follow:**
  ```typescript
  // No-op stub — developer adds real sound files later (D-32, D-33, D-34)
  // Expected API surface:
  
  let _enabled = true;
  
  export function setEnabled(enabled: boolean): void {
    _enabled = enabled;
  }
  
  export async function init(): Promise<void> {
    // Future: load sound assets via expo-av
  }
  
  export function playKeyPress(): void {
    if (!_enabled) return;
    // Future: await sound.replayAsync()
  }
  
  export function playReveal(): void { ... }
  export function playWin(): void { ... }
  export function playLoss(): void { ... }
  ```
- **Error handling pattern:** Empty function bodies guard on `_enabled`. All calls are fire-and-forget.
- **Key differences:** No I/O, no library imports (yet). Uses module-level `_enabled` flag.

---

### `src/stores/dictionaryStore.ts` (MODIFY)
- **Role:** store — add dual-source support (D-48, D-49, D-50), definition lookup
- **Analog:** Current `src/stores/dictionaryStore.ts` (extend, don't rewrite)
- **Pattern to follow:** Keep existing structure. Add:
  ```typescript
  // Import valid word lists (broader dictionary for guess validation)
  const validWords5: string[] = require('../../assets/dictionary/valid-5.json');
  // ... for 6-10
  
  const VALID_WORD_LISTS: Record<number, string[]> = {
    5: validWords5, 6: validWords6, ...
  };
  
  // Import definition maps
  const defs5: Record<string, string> = require('../../assets/dictionary/defs-5.json');
  // ... for 6-10
  
  const DEFS: Record<number, Record<string, string>> = { ... };
  ```
- **New actions to add:**
  - `isValidWord(length, word) → boolean` — already exists, keep using WORD_LISTS for target word validation. Optionally add a separate `isValidGuess(length, word)` against VALID_WORD_LISTS.
  - `getDefinition(length, word) → string | undefined` — new, lookup in DEFS
  - `getTodayDailyWords(date) → string[]` — new, compute 6 daily words (one per length)
- **Error handling pattern:** Missing length → return `false` / `undefined`. Word not found locally → return `undefined`.
- **Key differences:** Adds second dictionary source (VALID_WORD_LISTS) and definition maps (DEFS). Keep `getRandomWord` using TARGET_WORD_LISTS (enriched).

---

### `src/stores/gameStore.ts` (MODIFY)
- **Role:** store — wire `submitGuess` with real logic, add persistence (D-55, D-56, D-57)
- **Analog:** Current `src/stores/gameStore.ts` (extend)
- **Imports to copy (new):**
  ```typescript
  import { evaluateGuess, validateHardMode } from '@/services/wordLogic';
  import { useDictionaryStore } from '@/stores/dictionaryStore';
  import { saveActiveGame, clearActiveGame } from '@/services/storage';
  ```
- **Pattern to follow (new submitGuess):**
  ```typescript
  submitGuess: () => {
    const { session, currentGuess } = get();
    if (!session || session.status !== 'playing') return;
    const word = session.word;
    const guess = currentGuess;
    
    // Validate guess is in dictionary
    if (!useDictionaryStore.getState().isValidWord(session.letterCount, guess)) {
      // Set error state — triggers "Not in word list" toast
      set({ error: 'Not in word list' });
      return;
    }
    
    // Hard Mode validation (D-59, D-60, D-61)
    if (session.hardMode && session.guesses.length > 0) {
      const hardModeCheck = validateHardMode(session.feedback, guess);
      if (!hardModeCheck.valid) {
        set({ error: hardModeCheck.reason });
        return;
      }
    }
    
    // Evaluate feedback
    const feedback = evaluateGuess(word, guess);
    const newGuesses = [...session.guesses, guess];
    const newFeedback = [...session.feedback, feedback];
    
    // Update key colors
    const newKeyColors = { ...session.keyColors };
    // Merge colors: correct > present > absent priority
    
    const isWon = guess === word;
    const isLost = newGuesses.length >= session.maxAttempts;
    
    const updatedSession = { ...session, guesses: newGuesses, feedback: newFeedback, keyColors: newKeyColors, ... };
    set({
      session: updatedSession,
      currentGuess: '',
      error: null,
    });
    
    // Persist after each submit (D-55)
    saveActiveGame(updatedSession);
  }
  ```
- **Persistence on suspend/resume:**
  ```typescript
  // Add restoreSession action
  restoreSession: (session: GameSession) => {
    set({ session, currentGuess: '' });
  }
  ```
  Wire in `GameScreen` via `AppState` listener or in a `useEffect`.
- **Error handling pattern:** `error` field in store state (string | null). Set by submitGuess on invalid word / Hard Mode violation. Read by GameScreen to show toast/shake animation.
- **Key differences:** New `error` state field. New `restoreSession` action. submitGuess is now real logic (not placeholder).

---

### `src/screens/GameScreen.tsx` (MODIFY — full replacement)
- **Role:** screen — orchestrates GameBoard + Keyboard + ResultModal + loading state
- **Analog:** Current `src/screens/GameScreen.tsx` (replace) + `src/screens/HomeScreen.tsx` (navigation pattern)
- **Pattern to follow:**
  ```typescript
  import React, { useEffect, useCallback } from 'react';
  import { View, StyleSheet, AppState } from 'react-native';
  import { useNavigation } from '@react-navigation/native';
  import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
  import type { ScreenProps, RootStackParamList } from '@/types';
  import { colors } from '@/constants/colors';
  import { layout } from '@/constants/layout';
  import { useGameStore } from '@/stores';
  import { useDictionaryStore } from '@/stores';
  import { GameBoard } from '@/components/game/GameBoard';
  import { Keyboard } from '@/components/game/Keyboard';
  import { ResultModal } from '@/components/game/ResultModal';
  import { getActiveGame, saveActiveGame } from '@/services/storage';
  
  type Props = ScreenProps<'Game'>;
  type Nav = NativeStackNavigationProp<RootStackParamList, 'Game'>;
  
  export function GameScreen({ route }: Props) {
    const navigation = useNavigation<Nav>();
    const { mode, letterCount } = route.params;
    const session = useGameStore((s) => s.session);
    const startGame = useGameStore((s) => s.startGame);
    // ...
    
    useEffect(() => {
      // Check for saved session (D-55, D-57)
      const saved = getActiveGame();
      if (saved) { restoreSession(saved); }
      else { startGame(mode, targetWord, length, hardMode); }
    }, []);
    
    useEffect(() => {
      // AppState listener for suspend/resume persistence
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'background') { saveActiveGame(session); }
      });
      return () => sub.remove();
    }, [session]);
    
    return (
      <View style={styles.container}>
        {/* Game header: mode, attempts, back button */}
        <View style={styles.boardArea}>
          <GameBoard />
        </View>
        <Keyboard />
        <ResultModal />  {/* Controlled by game status */}
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    boardArea: { flex: 1, justifyContent: 'center', paddingHorizontal: layout.screenPadding },
  });
  ```
- **Key differences:** Screen is now fully interactive with game logic. `headerShown: false` in Navigation.tsx means GameScreen manages its own header. Result is a modal overlay, not a navigation (D-35, D-36).
- **Reanimated usage pattern (new):**
  ```typescript
  import Animated, { useSharedValue, withTiming, withSequence, withDelay, useAnimatedStyle, FadeIn, FadeOut } from 'react-native-reanimated';
  
  // Per-tile flip: useSharedValue for flip progress
  // withTiming for flip animation (200ms)
  // withSequence for bounce (1.0 → 1.15 → 1.0)
  // stagger via multiplying index * 50ms in withDelay
  ```

---

### `src/screens/HomeScreen.tsx` (MODIFY)
- **Role:** screen — add length picker modal trigger, Hard Mode toggle
- **Analog:** Current `src/screens/HomeScreen.tsx`
- **Changes needed:**
  - Free Play mode → show `LengthPickerModal` instead of navigating directly (D-39)
  - Daily Challenge mode → show `LengthPickerModal` with daily completion state (D-40, D-41, D-44)
  - Add Hard Mode toggle via settings store: `useSettingsStore((s) => s.hardModeEnabled)`
- **Pattern to follow:** Keep existing structure. Add modal state:
  ```typescript
  const [showLengthPicker, setShowLengthPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<GameMode>('free');
  const hardModeEnabled = useSettingsStore((s) => s.hardModeEnabled);
  
  const handleModePress = (mode: GameMode) => {
    if (mode === 'random') {
      // Auto-assign length, navigate immediately (D-46)
      startGame('random', randomLength);
    } else {
      setPickerMode(mode);
      setShowLengthPicker(true);
    }
  };
  ```
- **Key differences:** Adds modal state management for length picker. Reads from settings store for Hard Mode.

---

### `src/components/game/GameBoard.tsx` (NEW)
- **Role:** component — renders grid of GuessRow components
- **Data flow:** reads session.guesses and session.feedback from gameStore
- **Analog:** `src/components/ui/Button.tsx` (component structure)
- **Pattern to follow:**
  ```typescript
  import React, { useMemo } from 'react';
  import { View, StyleSheet } from 'react-native';
  import Animated, { FadeIn } from 'react-native-reanimated';
  import { useGameStore } from '@/stores';
  import { layout } from '@/constants/layout';
  import { GuessRow } from './GuessRow';
  
  export function GameBoard() {
    const session = useGameStore((s) => s.session);
    const currentGuess = useGameStore((s) => s.currentGuess);
    const error = useGameStore((s) => s.error);
    
    // Build rows from session.guesses + current + empty
    const rows = useMemo(() => {
      const result: { guess: string; feedback: GuessFeedback[]; isActive: boolean }[] = [];
      const filled = session?.guesses ?? [];
      const allFeedback = session?.feedback ?? [];
      for (let i = 0; i < maxAttempts; i++) { ... }
      return result;
    }, [session, currentGuess]);
    
    return (
      <Animated.View entering={FadeIn.duration(300)} style={styles.board}>
        {rows.map((row, i) => (
          <GuessRow key={i} guess={row.guess} feedback={row.feedback} isActive={row.isActive} error={error} />
        ))}
      </Animated.View>
    );
  }
  
  const styles = StyleSheet.create({
    board: { gap: layout.tileGap, alignItems: 'center' },
  });
  ```
- **Error handling pattern:** `error` prop passed down to active row for shake animation. Rows gracefully handle missing/null session.
- **Reusable UI components to use:** None directly — this is a game-specific composite.
- **Key differences:** Uses `useMemo` for computed rows (performance). Animated entering.

---

### `src/components/game/GuessRow.tsx` (NEW)
- **Role:** component — single row of Tile components
- **Data flow:** props: `guess: string`, `feedback: GuessFeedback[]`, `isActive: boolean`, `error: string | null`
- **Analog:** `src/components/ui/Button.tsx` (component structure)
- **Pattern to follow:**
  ```typescript
  import React from 'react';
  import { View, StyleSheet } from 'react-native';
  import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
  import { layout } from '@/constants/layout';
  import { Tile } from './Tile';
  
  interface GuessRowProps {
    guess: string;
    feedback?: GuessFeedback[];
    isActive: boolean;
    error: string | null;
    rowIndex: number;
  }
  
  export function GuessRow({ guess, feedback, isActive, error, rowIndex }: GuessRowProps) {
    const letters = guess.padEnd(rowLength, ' ').split('');
    
    return (
      <Animated.View entering={FadeIn.duration(200)} style={styles.row}>
        {letters.map((letter, i) => (
          <Tile
            key={i}
            letter={letter}
            feedback={feedback?.[i]?.feedback ?? 'empty'}
            index={i}
            isRevealing={!isActive && !!feedback}
          />
        ))}
      </Animated.View>
    );
  }
  
  const styles = StyleSheet.create({
    row: { flexDirection: 'row', gap: layout.tileGap },
  });
  ```
- **Key differences:** Acts as mapper between data and Tile components. Manages reveal animation sequencing.

---

### `src/components/game/Tile.tsx` (NEW)
- **Role:** component — single letter tile with flip animation
- **Data flow:** props: `letter: string`, `feedback: TileFeedback`, `index: number`, `isRevealing: boolean`
- **Analog:** `src/components/ui/Button.tsx` (component structure) + Reanimated worklet pattern
- **Pattern to follow:**
  ```typescript
  import React, { useEffect } from 'react';
  import { StyleSheet, Text } from 'react-native';
  import Animated, { useSharedValue, withTiming, withSequence, withDelay, useAnimatedStyle, interpolate } from 'react-native-reanimated';
  import { colors } from '@/constants/colors';
  import { layout } from '@/constants/layout';
  
  interface TileProps {
    letter: string;
    feedback: TileFeedback;
    index: number;
    isRevealing: boolean;
  }
  
  // Color map (D-28, colors.ts values)
  const FEEDBACK_COLORS: Record<string, string> = {
    correct: colors.tileCorrect,   // #6aaa64
    present: colors.tilePresent,   // #c9b458
    absent: colors.tileAbsent,     // #787c7e
    empty: colors.tileEmpty,       // #d3d6da
  };
  
  export function Tile({ letter, feedback, index, isRevealing }: TileProps) {
    const flipProgress = useSharedValue(0);
    const scale = useSharedValue(1);
    
    useEffect(() => {
      if (!isRevealing) return;
      // Stagger: 50-80ms left-to-right (D-28)
      flipProgress.value = withDelay(
        index * 50,
        withTiming(1, { duration: 200 })
      );
      // Correct tiles get scale bounce after flip (D-28)
      if (feedback === 'correct') {
        scale.value = withDelay(
          index * 50 + 200,
          withSequence(
            withTiming(1.15, { duration: 100 }),
            withTiming(1.0, { duration: 100 })
          )
        );
      }
    }, [isRevealing]);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { rotateX: `${interpolate(flipProgress.value, [0, 1], [0, 90])}deg` },
        { scale: scale.value },
      ],
      backgroundColor: interpolateColor(
        flipProgress.value,
        [0, 0.5, 1],
        [colors.tileEmpty, colors.tileEmpty, FEEDBACK_COLORS[feedback]]
      ),
    }));
    
    const textStyle = useAnimatedStyle(() => ({
      opacity: flipProgress.value > 0.5 ? 1 : 0,
    }));
    
    return (
      <Animated.View style={[styles.tile, animatedStyle]}>
        <Animated.Text style={[styles.letter, textStyle]}>{letter}</Animated.Text>
      </Animated.View>
    );
  }
  
  const styles = StyleSheet.create({
    tile: {
      width: layout.tileSize,
      height: layout.tileSize,
      borderRadius: layout.tileBorderRadius,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.tileEmpty,
      borderWidth: 1,
      borderColor: colors.tileBorder,
    },
    letter: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textInverse,
      textTransform: 'uppercase',
    },
  });
  ```
- **Error handling pattern:** Empty letters (spaces) render invisible empty tiles. No error states.
- **Key differences:** This is the most animation-heavy component. Uses Reanimated worklets (`useSharedValue`, `withTiming`, `withSequence`, `useAnimatedStyle`) — unique pattern not found in existing codebase. The `interpolate` / `interpolateColor` pattern is the standard Reanimated approach.
- **Imports to copy (new pattern for codebase):**
  ```typescript
  import Animated, { useSharedValue, withTiming, withSequence, withDelay, useAnimatedStyle, interpolate, interpolateColor } from 'react-native-reanimated';
  ```

---

### `src/components/game/Keyboard.tsx` (NEW)
- **Role:** component — on-screen QWERTY with per-key color tracking (D-62, D-63)
- **Data flow:** reads session.keyColors from gameStore, fires addLetter/removeLetter/submitGuess
- **Analog:** `src/components/ui/Button.tsx` (TouchableOpacity pattern) + subscription to store
- **Pattern to follow:**
  ```typescript
  import React, { useCallback, memo } from 'react';
  import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
  import { useGameStore } from '@/stores';
  import { colors } from '@/constants/colors';
  import { layout } from '@/constants/layout';
  
  const ROWS = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['ENTER','Z','X','C','V','B','N','M','BACKSPACE'],
  ];
  
  function KeyboardComponent() {
    const keyColors = useGameStore((s) => s.session?.keyColors ?? {});
    const addLetter = useGameStore((s) => s.addLetter);
    const removeLetter = useGameStore((s) => s.removeLetter);
    const submitGuess = useGameStore((s) => s.submitGuess);
    const currentGuess = useGameStore((s) => s.currentGuess);
    const session = useGameStore((s) => s.session);
    
    const isBlocked = session?.status !== 'playing';
    
    const handlePress = useCallback((key: string) => {
      if (isBlocked) return;
      if (key === 'ENTER') { submitGuess(); }
      else if (key === 'BACKSPACE') { removeLetter(); }
      else { addLetter(key); }
    }, [isBlocked, submitGuess, removeLetter, addLetter]);
    
    // Per-key background color from keyColors map
    const getKeyColor = (key: string) => colorMap[keyColors[key] ?? 'unused'];
    
    return (
      <View style={styles.container}>
        {ROWS.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.key, { backgroundColor: i === 2 && key.length > 1 ? colors.keySpecial : getKeyColor(key) }]}
                onPress={() => handlePress(key)}
                disabled={isBlocked}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, { fontSize: key.length > 1 ? 12 : 16 }]}>
                  {key === 'BACKSPACE' ? '⌫' : key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  }
  
  export const Keyboard = memo(KeyboardComponent); // D-63: React.memo
  ```
- **Error handling pattern:** Input blocked during animation (D-66). `isBlocked` flag checked in handlePress. Empty states: keyboard renders all keys in "unused" color.
- **Key differences:** Uses `React.memo` (first in codebase). Enter/Backspace are special action keys, not letter keys. Key colors update after tile reveal completes (D-62) — controlled by a `keyboardUpdate` flag in store or delayed setState.
- **Imports to copy:** Standard React imports + store selectors.

---

### `src/components/game/ResultModal.tsx` (NEW)
- **Role:** component — modal overlay showing win/loss result, definition, emoji grid (D-35, D-36, D-37, D-38)
- **Data flow:** reads session status from gameStore
- **Analog:** `src/components/ui/Button.tsx` (component structure) + React Native `Modal`
- **Pattern to follow:**
  ```typescript
  import React from 'react';
  import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
  import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
  import { useGameStore } from '@/stores';
  import { useDictionaryStore } from '@/stores';
  import { colors } from '@/constants/colors';
  import { Button } from '@/components/ui';
  import { Confetti } from './Confetti';
  
  export function ResultModal() {
    const session = useGameStore((s) => s.session);
    const resetGame = useGameStore((s) => s.resetGame);
    const definition = useDictionaryStore((s) => s.getDefinition)(session?.letterCount ?? 5, session?.word ?? '');
    
    // Only show when game is complete
    if (!session || session.status === 'playing') return null;
    
    const isWin = session.status === 'won';
    const isEndless = session.mode === 'endless';
    
    return (
      <Modal visible transparent animationType="fade">
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.overlay}>
          {isWin && <Confetti />}
          <View style={styles.modal}>
            <Text style={styles.title}>{isWin ? 'You Won!' : 'Game Over'}</Text>
            <Text style={styles.word}>{session.word}</Text>
            {definition && <Text style={styles.definition}>{definition}</Text>}
            {/* Emoji grid */}
            <Button
              title={isEndless ? 'Play Next' : 'Back to Menu'}
              onPress={() => {
                if (isEndless) { /* start next word */ }
                else { resetGame(); navigation.navigate('Home'); }
              }}
            />
          </View>
        </Animated.View>
      </Modal>
    );
  }
  ```
- **Error handling pattern:** `if (!session || session.status === 'playing') return null;` — returns null for incomplete games.
- **Key differences:** Uses React Native `Modal` (first in codebase for this screen). Conditionally shows Confetti on win. Reads definition from dictionaryStore. Endless mode shows "Play Next" button (D-37).

---

### `src/components/game/LengthPickerModal.tsx` (NEW)
- **Role:** component — modal/grid for selecting word length 5-10 (D-39, D-40, D-41)
- **Data flow:** props: `visible`, `mode`, `onSelect(length)`, `onClose`, `completedLengths`
- **Analog:** `src/components/ui/Button.tsx` (component structure) + Modal pattern from ResultModal
- **Pattern to follow:**
  ```typescript
  import React from 'react';
  import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
  import Animated, { FadeIn } from 'react-native-reanimated';
  import { colors } from '@/constants/colors';
  import { layout } from '@/constants/layout';
  
  interface LengthPickerModalProps {
    visible: boolean;
    mode: GameMode;
    onSelect: (length: number) => void;
    onClose: () => void;
    completedLengths: number[];
  }
  
  const LENGTHS = [5, 6, 7, 8, 9, 10];
  
  export function LengthPickerModal({ visible, mode, onSelect, onClose, completedLengths }: LengthPickerModalProps) {
    return (
      <Modal visible transparent animationType="fade">
        <Animated.View entering={FadeIn} style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Choose word length</Text>
            <View style={styles.grid}>
              {LENGTHS.map((len) => {
                const isCompleted = completedLengths.includes(len);
                return (
                  <TouchableOpacity
                    key={len}
                    style={[styles.lengthBtn, isCompleted && styles.completed]}
                    onPress={() => !isCompleted && onSelect(len)}
                    disabled={isCompleted}
                  >
                    <Text style={styles.lengthText}>{len}</Text>
                    {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    );
  }
  ```
- **Error handling pattern:** `visible` prop controls mount/unmount via Modal. Disabled state for completed daily lengths.
- **Key differences:** Interactive with selection callback. Grid layout (2×3 or 3×2). Daily challenge shows completion state (D-44).

---

### `src/components/game/Confetti.tsx` (NEW)
- **Role:** component — Reanimated particle burst on win (D-30)
- **Data flow:** fires once when mounted, auto-animates, auto-cleans up
- **Analog:** `Tile.tsx` animation pattern (Reanimated worklets)
- **Pattern to follow:**
  ```typescript
  import React, { useEffect } from 'react';
  import { Dimensions, StyleSheet } from 'react-native';
  import Animated, { useSharedValue, withTiming, withDelay, useAnimatedStyle, interpolate, Easing } from 'react-native-reanimated';
  import { colors } from '@/constants/colors';
  
  const PARTICLE_COUNT = 30;
  const COLORS = ['#6aaa64', '#c9b458', '#4a9eff', '#e74c3c', '#ffffff'];
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  
  // Particle component (internal)
  function Particle({ index }: { index: number }) {
    const progress = useSharedValue(0);
    
    useEffect(() => {
      progress.value = withDelay(
        index * 20,
        withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) })
      );
    }, []);
    
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [0, (Math.random() - 0.5) * SCREEN_WIDTH]) },
        { translateY: interpolate(progress.value, [0, 1], [0, 400 + Math.random() * 200]) },
        { scale: interpolate(progress.value, [0, 0.8, 1], [1, 1.2, 0]) },
      ],
      opacity: interpolate(progress.value, [0, 0.7, 1], [1, 1, 0]),
    }));
    
    const size = 6 + Math.random() * 8;
    const color = COLORS[index % COLORS.length];
    
    return (
      <Animated.View
        style={[
          styles.particle,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          animatedStyle,
        ]}
      />
    );
  }
  
  export function Confetti() {
    return (
      <View style={styles.container} pointerEvents="none">
        {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
          <Particle key={i} index={i} />
        ))}
      </View>
    );
  }
  
  const styles = StyleSheet.create({
    container: { ...StyleSheet.absoluteFillObject },
    particle: { position: 'absolute', top: -20, left: '50%' },
  });
  ```
- **Error handling pattern:** `pointerEvents="none"` so confetti doesn't block touches. Particles auto-remove when animation completes (useSharedValue driven, no cleanup needed).
- **Key differences:** Same Reanimated worklet pattern as Tile.tsx. Pure visual effect with `pointerEvents="none"`. No interactions.

---

### `src/components/game/index.ts` (NEW — barrel)
- **Role:** barrel re-export for game components
- **Analog:** `src/components/ui/index.ts`
- **Content:**
  ```typescript
  export { GameBoard } from './GameBoard';
  export { GuessRow } from './GuessRow';
  export { Tile } from './Tile';
  export { Keyboard } from './Keyboard';
  export { ResultModal } from './ResultModal';
  export { LengthPickerModal } from './LengthPickerModal';
  export { Confetti } from './Confetti';
  ```

---

### `src/hooks/useGameController.ts` (NEW — optional)
- **Role:** hook — encapsulates GameScreen orchestration logic (start, restore, AppState, input queue)
- **Data flow:** bridges gameStore, dictionaryStore, storage, AppState
- **Analog:** stores follow Zustand patterns; hooks are new territory for this codebase
- **Pattern to follow:**
  ```typescript
  import { useEffect, useCallback, useRef } from 'react';
  import { AppState } from 'react-native';
  import { useGameStore } from '@/stores';
  import { useDictionaryStore } from '@/stores/dictionaryStore';
  import { getActiveGame, saveActiveGame, clearActiveGame } from '@/services/storage';
  import type { GameMode } from '@/types';
  
  export function useGameController(mode: GameMode, letterCount: number) {
    const startGame = useGameStore((s) => s.startGame);
    const restoreSession = useGameStore((s) => s.restoreSession);
    const session = useGameStore((s) => s.session);
    const inputQueue = useRef<string[]>([]);
    
    // Initialize or restore
    useEffect(() => {
      const saved = getActiveGame();
      if (saved && saved.mode === mode) {
        restoreSession(saved);
      } else {
        const word = useDictionaryStore.getState().getRandomWord(letterCount);
        startGame(mode, word, letterCount, hardMode);
      }
    }, []);
    
    // Persist on AppState change
    useEffect(() => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state === 'background' || state === 'inactive') {
          const s = useGameStore.getState().session;
          if (s) saveActiveGame(s);
        }
      });
      return () => sub.remove();
    }, []);
    
    // Clear saved game when completed
    useEffect(() => {
      if (session?.status === 'won' || session?.status === 'lost') {
        clearActiveGame();
      }
    }, [session?.status]);
    
    return { session, /* ... */ };
  }
  ```

---

## 3. REUSABLE UI COMPONENTS FOR GAME COMPONENTS

| Game Component | Should Use Button? | Notes |
|---|---|---|
| `GameBoard` | No | Custom composite of GuessRow + Tile |
| `GuessRow` | No | Maps data, no user interaction |
| `Tile` | No | Touch handled by Keyboard, not tiles |
| `Keyboard` | No | Custom TouchableOpacity per key |
| `ResultModal` | **Yes** — `Button` | "Play Next" / "Back to Menu" buttons |
| `LengthPickerModal` | **Yes** — `Button` | Close/Cancel button; length buttons are custom TouchableOpacity |
| `Confetti` | No | Pure visual, no interactions |

**Always import from barrel:**
```typescript
import { Button } from '@/components/ui';
// NOT: import { Button } from '@/components/ui/Button';
```

---

## 4. SUMMARY OF ALL PHASE 2 FILES

| File | Action | Analog File | Key Pattern |
|---|---|---|---|
| `src/services/wordLogic.ts` | NEW | `src/services/storage.ts` | Service layer, pure functions |
| `src/services/dailySeed.ts` | NEW | `src/services/storage.ts` | Service layer, pure function |
| `src/services/sound.ts` | NEW | `src/services/storage.ts` | Service layer, no-op stub |
| `src/stores/gameStore.ts` | MODIFY | Existing gameStore.ts | Zustand actions + persist pattern |
| `src/stores/dictionaryStore.ts` | MODIFY | Existing dictionaryStore.ts | Zustand, add dual-source + defs |
| `src/screens/GameScreen.tsx` | MODIFY | HomeScreen.tsx pattern | Screen with navigation + hooks |
| `src/screens/HomeScreen.tsx` | MODIFY | Existing HomeScreen.tsx | Add modal state + settings store |
| `src/components/game/Tile.tsx` | NEW | Button.tsx + Reanimated docs | Component + worklet animation |
| `src/components/game/GuessRow.tsx` | NEW | Button.tsx | Component, maps Tile children |
| `src/components/game/GameBoard.tsx` | NEW | Button.tsx | Component, maps GuessRow children |
| `src/components/game/Keyboard.tsx` | NEW | Button.tsx + React.memo | Component, store subscription |
| `src/components/game/ResultModal.tsx` | NEW | Button.tsx + RN Modal | Component + Modal + store |
| `src/components/game/LengthPickerModal.tsx` | NEW | Button.tsx + RN Modal | Component + Modal + grid |
| `src/components/game/Confetti.tsx` | NEW | Tile.tsx animation pattern | Reanimated particles |
| `src/components/game/index.ts` | NEW | `src/components/ui/index.ts` | Barrel re-export |
| `src/hooks/useGameController.ts` | NEW (optional) | statsStore.ts (async pattern) | Custom React hook |
