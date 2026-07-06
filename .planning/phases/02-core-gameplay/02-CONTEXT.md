# Phase 2: Core Gameplay - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Full playable word guessing game — all four modes, color-coded tile feedback, on-screen keyboard, animations, Hard Mode, daily seed, sound stubs, haptics, game state persistence.

**Requirements:** GAME-01 through GAME-19

**In scope:**
- All 4 game modes (Free Play, Random, Daily Challenge, Endless)
- Tile feedback per Wordle duplicate-letter rules
- On-screen QWERTY keyboard with per-key color tracking
- Valid word checking against broad dictionary
- Tile reveal animations (Reanimated worklets, 60 FPS)
- Hard Mode toggle (NYT Wordle rules)
- Secure daily seed (multi-source hash, no JNI)
- Game state persistence on suspend/resume
- Loading screen while dictionary initializes
- Sound service structure (no-op stub — sounds deferred)
- Haptic feedback (expo-haptics)
- Result modal with word definition
- Confetti particle burst on win (Reanimated-based)

**Out of scope:**
- Stats tracking (Phase 3)
- Settings persistence beyond Hard Mode toggle (Phase 3)
- Ads, IAP, monetization (Phase 4)
- Google Sign-In, cloud sync, leaderboards (Phase 5)
- Accessibility, Play Store compliance (Phase 6)

</domain>

<decisions>
## Implementation Decisions

### 1. Daily Seed Obfuscation
- **D-25:** Multi-source hash approach — combine package name + app version + non-obvious constant string. No JNI/native layer split.
- **D-26:** ProGuard/R8 minification enabled in production builds to obfuscate the constant.
- **D-27:** Accept that a determined attacker with APK decompilation + debugger can extract the seed. Goal is to block casual cheating, not nation-state threat models.

### 2. Tile Animation Feel
- **D-28:** Fast/snappy timing: 200ms flip duration, tight stagger (50-80ms left-to-right), correct tiles get a scale bounce (1.0 → 1.15 → 1.0) after flip.
- **D-29:** All animations run on UI thread via Reanimated worklets (`useSharedValue` + `withTiming`/`withSequence`).
- **D-30:** Win state: Reanimated-based confetti particle burst (20-30 particles, gravity + fade + scale). Not typegpu — typegpu-confetti v0.3.0 is too early (WebGPU on Android experimental). Re-evaluate typegpu after Phase 6 or when WebGPU on Android stabilizes.
- **D-31:** Animation timing is tunable after Phase 2 — expose shared constants for stagger delay, flip duration, bounce params.

### 3. Sound Effects
- **D-32:** Deferred — no sound files in this phase.
- **D-33:** Create `services/sound.ts` as a no-op stub with the expected API surface (`playKeyPress`, `playReveal`, `playWin`, `playLoss`, `init`, `setEnabled`). This lets components wire up sound calls without blocking on implementation.
- **D-34:** Sound files will be added by the developer later (~4-6 SFX files under 500KB total via expo-av).

### 4. Result Flow (All Modes)
- **D-35:** Result displayed as a **modal overlay** (not navigation to ResultScreen). The existing ResultScreen route can be repurposed or removed.
- **D-36:** Modal shows: win/loss state, target word, word definition, emoji grid of guesses.
- **D-37:** Endless mode: modal has "Play Next" button → starts next word (same word length) immediately. Other modes: "Back to Menu" → navigates to HomeScreen.
- **D-38:** Word definitions sourced from `dictionary.full.enriched.json`, stored as separate `defs-{n}.json` maps per length.

### 5. Length Picker & Mode Flow
- **D-39:** Modal/grid UI for length selection — 6 buttons (5-10) in a 2×3 or 3×2 grid.
- **D-40:** Daily Challenge: each word length (5-10) has its own daily word = 6 daily puzzles per day. Word index computed from `date + length + seed`.
- **D-41:** Daily length is "completed" when a game reaches win or loss state. Once completed, that length is disabled in the picker for the rest of the day (UTC).
- **D-42:** If player exits during an active daily game (before completion), the game session is saved and resumed on return (same daily, same length).
- **D-43:** If continuing play in-session (Endless "Play Next" or same-mode replay), reuse current word length. Going back to HomeScreen resets to length picker.
- **D-44:** Daily picker shows disabled/greyed-out lengths with a checkmark or "Done" label.
- **D-45:** Free Play: pick length, random word from enriched dictionary.
- **D-46:** Random mode: auto-assigned length (5-10), random word from enriched dictionary.
- **D-47:** Endless mode: same-day exclusion — if today's Daily word for a given length is e.g. "APPLE", Endless won't pick "APPLE" as a target word for that length today. Excluded words refresh daily at UTC midnight.

### 6. Dictionary Dual-Source
- **D-48:** `dictionary.full.enriched.json` → source for target words (curated, includes definitions). Preprocessed into `assets/dictionary/{5-10}.json` (target word arrays) + `assets/dictionary/defs-{5-10}.json` (definition maps).
- **D-49:** `dictionary.full.json` → source for valid guess validation. Preprocessed into `assets/dictionary/valid-{5-10}.json` (broader word arrays).
- **D-50:** Both dictionaries filtered with the combined blocklist (profanity + manual). Blocklist maintained as `profanity-blocklist.txt` + `manual-blocklist.txt` (5-10 letters only), read by the preprocessing script at build time.
- **D-51:** Source dictionaries cleaned: 3-4 letter entries removed, blocklisted words removed. Only keys 5-10 remain.

### 7. Endless Mode Target Pool
- **D-52:** Endless target word pool = valid guess words minus today's 1-6 daily words (one per length). Exclusion refreshes at UTC midnight.
- **D-53:** All `dictionary.full.json` words accepted as player guesses (no exclusions).
- **D-54:** TODO: Need a runtime check at game start to compute today's daily words for each length, store in a `todayDailyWords: Set<string>`, and exclude those from Endless/Free Play/Random Random target selection.

### 8. Game State Persistence
- **D-55:** Save current board (guesses array, feedback, keyColors), active row, remaining attempts, mode, extra guesses used, target word, game status on app state change (AppState listener).
- **D-56:** Store in MMKV (settings/active game store, synchronous writes for suspend/resume).
- **D-57:** On app resume: check for saved session → restore full state (board renders exactly as left, keyboard colors intact).
- **D-58:** Daily challenge sessions persist across app restarts until the daily resets (UTC midnight) or the game is completed.

### 9. Hard Mode Validation
- **D-59:** Hard Mode enforced at submit time (not at input time). If a guess violates Hard Mode rules, show a shake animation + "Must reuse confirmed tiles" toast — same as NYT Wordle behavior.
- **D-60:** Hard Mode validation logic extracted as a pure function in a service (testable, 20+ unit test edge cases including duplicate letters).
- **D-61:** Check at submit: (1) all green tiles from previous guess must be in same positions, (2) all yellow tiles must appear somewhere in new guess, (3) duplicate letter edge cases per NYT rules.

### 10. Keyboard Behavior
- **D-62:** Keyboard color update fires AFTER the tile reveal animation completes (not during). Use `withDelay(animationDuration)` or a callback from the last tile's animation.
- **D-63:** Keyboard is a separate component subtree (React.memo) to prevent re-render interference with tile animations.
- **D-64:** Enter submits guess only if valid word (checked against valid word set). Disabled when row empty.
- **D-65:** Backspace removes last letter. Disabled when row empty.
- **D-66:** Keyboard input blocked during tile reveal animation sequence. Queue or drop input — queue preferred to not miss rapid presses.

### Claude's Discretion
- Precise component file structure for game components (GameBoard, GuessRow, Tile, Keyboard, LengthPicker, ResultModal)
- Color hex values — use existing `src/constants/colors.ts`
- Layout spacing details — use existing `src/constants/layout.ts`
- Reusable UI component polish (loading states, error toasts)
- confetti particle count, colors, gravity, spread pattern
- Daily word hash algorithm (DJB2 or similar — must produce good distribution)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Scope
- `.planning/REQUIREMENTS.md` — Full requirement set, GAME-01 through GAME-19 define Phase 2 scope
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, mode

### Research
- `.planning/research/STACK.md` — Technology versions, compatibility matrix
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, build order
- `.planning/research/FEATURES.md` — Feature landscape, edge cases, feature dependencies
- `.planning/research/PITFALLS.md` — Critical and moderate pitfalls (especially Pitfalls 1, 2, 10, 12, 15)

### Prior Phase Decisions
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01 through D-24 carry forward (project structure, storage split, nav flow, path alias)

### Codebase
- `src/types/game.ts` — GameSession, GameMode, TileFeedback types
- `src/stores/gameStore.ts` — Current game store stub (startGame, addLetter, removeLetter, submitGuess placeholder)
- `src/stores/dictionaryStore.ts` — Current dictionary store (isValidWord, getRandomWord — uses enriched words only)
- `src/constants/colors.ts` — Tile and keyboard color constants
- `src/constants/layout.ts` — Tile and keyboard layout constants
- `src/constants/config.ts` — Game config (base attempts, word length range)
- `src/screens/GameScreen.tsx` — Placeholder to be replaced with full game UI
- `src/screens/HomeScreen.tsx` — Mode selection with mode-to-Game navigation
- `src/types/navigation.ts` — RootStackParamList, screen params

### Source Data
- `dictionary.full.json` — Broader dictionary for guess validation (5-10 letters, cleaned)
- `dictionary.full.enriched.json` — Curated target words with definitions (5-10 letters, cleaned)
- `profanity-blocklist.txt` — Profanity filter (5-10 letters only)
- `manual-blocklist.txt` — Manual exclusion list (proper nouns, names, etc.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/constants/colors.ts` — tile/key color constants already defined (tileCorrect, tilePresent, tileAbsent, keyCorrect, etc.)
- `src/constants/layout.ts` — tile/key size constants defined (tileSize, keyboardKeyHeight, gaps, etc.)
- `src/stores/dictionaryStore.ts` — has `isValidWord()` and `getRandomWord()` — needs to be updated for dual-source (valid words vs target words)
- `src/stores/gameStore.ts` — has `startGame`, `addLetter`, `removeLetter`, `submitGuess` (stub), `resetGame` — submitGuess needs real logic
- `src/components/ui/Button.tsx` — Reusable button component
- `assets/dictionary/{5-10}.json` — Preprocessed target word arrays from enriched.json

### Established Patterns
- Zustand stores with explicit actions (D-12, Pattern 2 from ARCHITECTURE.md)
- Type-based directory layout: `src/app/`, `src/screens/`, `src/stores/`, `src/components/`, etc.
- Barrel files (`index.ts`) for re-export
- Services layer for SDK wrappers (storage.ts pattern)
- Reanimated 4.x already installed and configured

### Integration Points
- `src/app/Navigation.tsx` — Register new screens/modals
- `src/app/App.tsx` — Root component, providers, store hydration
- `src/screens/GameScreen.tsx` — Replace placeholder with full game
- `src/screens/HomeScreen.tsx` — Update mode buttons with length picker modals
- `src/stores/gameStore.ts` — Wire submitGuess to real feedback logic
- `src/stores/dictionaryStore.ts` — Add valid word list + definition lookup
- `src/services/storage.ts` — Already has MMKV/SQLite/AsyncStorage — game state persistence hooks here

### Needed New Files
- `src/services/wordLogic.ts` — Pure functions: evaluateGuess, validateHardMode
- `src/services/dailySeed.ts` — Deterministic daily word from date + length + seed
- `src/services/sound.ts` — No-op stub
- `src/components/game/GameBoard.tsx` — Grid of GuessRow components
- `src/components/game/GuessRow.tsx` — Single row of Tiles
- `src/components/game/Tile.tsx` — Single letter tile with flip animation
- `src/components/game/Keyboard.tsx` — On-screen QWERTY with colored keys
- `src/components/game/ResultModal.tsx` — Post-game modal with definition
- `src/components/game/LengthPickerModal.tsx` — Length selection modal
- `src/components/game/Confetti.tsx` — Reanimated particle burst
- `scripts/preprocess-dictionary.mjs` — Needs updates: dual-source, definitions output, read blocklist txt files

</code_context>

<specifics>
## Specific Ideas

- Daily seed hash: `SHA256(date + ':' + length + ':' + appSeed)` truncated to 32-bit int, modulo wordlist length
- Confetti: 30-40 particles, mint green + sunny yellow + accent blue, gravity-pulled downward with scale fade-out, spawned from top-center of screen
- Length picker: 2×3 grid of rounded cards, each showing the number (5-10) and a preview of tile count. Selected length highlighted with accent color. Completed daily lengths show checkmark + disabled state.
- Keyboard row layout: QWERTYUIOP / ASDFGHJKL / ZXCVBNM + [Enter][Backspace]
- Daily reset detection: compare stored daily date in MMKV against today's UTC date on app foreground. If different, clear completed lengths and compute new daily words.

</specifics>

<deferred>
## Deferred Ideas

- **typegpu-confetti** — GPU-accelerated confetti is promising but v0.3.0 is too early (WebGPU on Android experimental). Re-evaluate after Phase 6.
- **Sound files** — Developer will source and add them separately. Sound service stub created now for structure.

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Core Gameplay*
*Context gathered: 2026-07-04*
