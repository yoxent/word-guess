# Architecture Patterns

**Project:** word-guess --- React Native word guessing game (Android)
**Researched:** 2026-07-04
**Confidence:** MEDIUM (architecture derived from React Native 0.86 ecosystem best practices; no running code verified)

---

## Recommended Architecture Overview

```
+-----------------------------------------------------------------------+
|                      NAVIGATION (React Navigation 7.x)                |
|  Home ---> Game ---> Result ---> Stats ---> Settings ---> Leaderboard |
+-----------------------------------------------------------------------+
                                  |
+-----------------------------------------------------------------------+
|                      SCREENS (per route)                              |
|  HomeScreen, GameScreen, ResultScreen, StatsScreen,                   |
|  SettingsScreen, LeaderboardScreen                                    |
+-----------------------------------------------------------------------+
                                  |
+-----------------------------------------------------------------------+
|                    FEATURE COMPONENTS (shared)                        |
|  GameBoard, GuessRow, Tile, Keyboard, StatsCard,                     |
|  ModeSelector, AdBanner, LeaderboardRow                              |
+-----------------------------------------------------------------------+
                                  |
+-----------------------------------------------------------------------+
|                        STATE LAYER (Zustand)                          |
|  +----------+ +-----------+ +----------+ +------------+              |
|  |GameStore | |StatsStore | |AuthStore | |SettingsStore|              |
|  |(per sess)| |(persistent)| |(session) | |(persistent) |             |
|  +----------+ +-----------+ +----------+ +------------+              |
+-----------------------------------------------------------------------+
                                  |
+-----------------------------------------------------------------------+
|                      SERVICE LAYER                                    |
|  +---------+ +-----------+ +------------+ +-----------------+        |
|  |WordLogic| |AdService  | |IAPService  | |SyncService      |        |
|  |(pure fn)| |(AdMob)    | |(IAP)       | |(offline->cloud) |        |
|  +---------+ +-----------+ +------------+ +-----------------+        |
|  +---------------+ +--------------------+                            |
|  |DailySeedService| |LeaderboardService  |                            |
|  +---------------+ +--------------------+                            |
+-----------------------------------------------------------------------+
                                  |
+-----------------------------------------------------------------------+
|                     PERSISTENCE LAYER                                 |
|  +---------------------------+ +----------------------------------+   |
|  |AsyncStorage (local)       | |Firebase/Google Cloud (remote)    |   |
|  | - stats cache             | | - cloud stats                    |   |
|  | - settings                | | - leaderboard scores             |   |
|  | - auth tokens             | +----------------------------------+   |
|  | - game history            |                                       |
|  +---------------------------+                                       |
+-----------------------------------------------------------------------+
```

## Component Boundaries

### 1. Screens (route-level components)

| Screen | Responsibility | Communicates With | Notes |
|--------|---------------|-------------------|-------|
| HomeScreen | Mode selection, daily challenge entry, nav to screens | GameStore, SettingsStore, Navigation | Shows Daily card, Free Play / Random / Endless buttons |
| GameScreen | Main game loop: display board, accept input, feedback | GameStore, WordLogic, AdService, IAPService | Core gameplay screen |
| ResultScreen | Win/loss animation, stats update | GameStore, StatsStore, AdService | Post-game; triggers interstitial ad |
| StatsScreen | Display player statistics, guess distribution | StatsStore | Read-only view |
| SettingsScreen | Hard Mode toggle, sound, account, IAP store | SettingsStore, AuthStore, IAPService | |
| LeaderboardScreen | Daily and Endless leaderboards | LeaderboardService, AuthStore | Requires auth |

### 2. Feature Components (reusable UI)

| Component | Responsibility | Props / Input | Emits To |
|-----------|---------------|---------------|----------|
| GameBoard | Renders grid of letter tiles | guesses, feedback, animate | -- (pure display) |
| GuessRow | Single guess row with reveal animation | letters, feedback, isActive | -- (pure display) |
| Tile | Single letter tile with flip animation + color | letter, feedback, delay | -- (pure display) |
| Keyboard | On-screen QWERTY with colored keys | keyColors, onKeyPress | onKeyPress |
| StatsCard | Stat display widget | label, value | -- (pure display) |
| GuessDistribution | Bar chart of guess counts | distribution[] | -- (pure display) |
| ModeSelector | Game mode picker | onSelect | onSelect |
| AdBanner | Banner ad placeholder | unitId | -- (pure display) |
| LeaderboardRow | Single leaderboard entry | rank, name, score, isPlayer | -- (pure display) |

### 3. State Stores (Zustand)

| Store | Scope | Key State | Key Actions | Persistence |
|-------|-------|-----------|-------------|-------------|
| GameStore | Per-session | mode, word, guesses[], feedback[][], status, letterCount, hardMode, extraGuessesUsed | submitGuess, setMode, resetGame, addExtraGuess | Session only (resets on game end) |
| StatsStore | Persistent | totalGames, wins, currentStreak, maxStreak, guessDistribution[6], gamesByLength | recordGame, syncFromCloud | AsyncStorage + Cloud |
| SettingsStore | Persistent | hardModeEnabled, soundEnabled, hapticEnabled, isPro | toggleHardMode, toggleSound, toggleHaptic, setPro | AsyncStorage |
| AuthStore | Session | isLoggedIn, playerId, playerName, authToken | signIn, signOut, restoreSession | AsyncStorage (token) |

### 4. Services (pure logic + side-effect wrappers)

| Service | Responsibility | Dependencies | Testable? |
|---------|---------------|--------------|-----------|
| WordLogicService | Validate guesses, compute feedback, filter dictionary | Word list data | YES -- pure functions |
| DailySeedService | Compute daily word index from UTC date + private seed | Private seed constant | YES -- deterministic |
| AdService | Load/show interstitial, rewarded ads | react-native-google-mobile-ads | Partial (mock) |
| IAPService | Purchase/restore Pro, validate receipts | react-native-iap | Partial (mock) |
| SyncService | Monitor connectivity, push local stats to cloud | StatsStore, AuthStore | Partial (mock) |
| LeaderboardService | Submit scores, fetch leaderboard data | AuthStore | Partial (mock) |


## Data Flow

### Game Loop (core flow)

```
Player taps "Daily Challenge" on HomeScreen
  |
  v
Navigation.navigate('Game', { mode: 'daily' })
  |
  v
GameScreen mounts -> GameStore.setMode('daily')
  |
  v
GameStore calls DailySeedService.getTodaysWord(length)
  |   hash = SHA256(UTC_DATE + PRIVATE_SEED)
  |   index = hash % wordList[length].length
  |   word = wordList[length][index]
  |
  v
GameStore.setState({ word, mode: 'daily', ... })
  |
  v
GameBoard renders empty grid
Keyboard renders uncolored keys
  |
  v
Player types word -> Keyboard -> handleKeyPress(key)
  |   Letter: add to current guess
  |   BACKSPACE: remove last letter
  |   ENTER: submit guess (if valid)
  |
  v
GameStore.submitGuess(guess)
  |
  v
WordLogicService.evaluateGuess(guess, targetWord)
  |   guess[i] === target[i] -> GREEN
  |   guess[i] in target -> YELLOW
  |   else -> GRAY
  |
  v
GameStore updates:
  - guesses[] <- append guess
  - feedback[][] <- append feedback
  - keyColors <- merge per-key best feedback
  - guess === target -> status = 'won'
  - guesses.length >= maxAttempts -> status = 'lost'
  |
  v
Re-render: tiles flip with animation, keyboard updates colors
  |
  v
If game over:
  |   If free tier -> AdService.showInterstitial()
  |   StatsStore.recordGame(...)
  |   Navigation.navigate('Result', ...)
  |
  v
If rewarded ad for extra guess:
  |   AdService.showRewarded() -> GameStore.addExtraGuess()
```

### Stats Sync Flow (offline-first)

```
StatsStore.recordGame(...)
  |
  v
Update AsyncStorage immediately (optimistic)
  |
  v
SyncService.onlineState === true?
  |
  +-- YES -> Push to cloud -> StatsStore.setState(merged)
  |
  +-- NO  -> Queue pending sync (listens for NetInfo)
  |
  v
When online restored:
    Read queue -> Push to cloud -> Pull merged stats
```

### IAP Flow

```
Player taps "Go Pro" in Settings
  |
  v
IAPService.requestPurchase('pro_version')
  |
  v
Google Play purchase dialog -> payment
  |
  v
IAPService.validateReceipt() (local validation)
  |
  v
SettingsStore.setPro(true) -> AdService.setAdsDisabled(true)
  |
  v
UI updates: ads hidden, "Pro" badge shown
```

### Leaderboard Flow

```
Player completes Daily with streak
  |
  v
LeaderboardService.submitDailyStreak(streak)
  |   Requires AuthStore.isLoggedIn
  |
  +-- Logged in -> Submit to GPG leaderboard
  +-- Not logged in -> Prompt sign-in
  |
  v
LeaderboardScreen on mount:
  fetch daily + endless streak + endless total leaderboards
  |
  v
Display ranked list with pagination
```


## Data Models

### Core Types

```
// Game Types

type GameMode = 'free' | 'random' | 'daily' | 'endless';

type TileFeedback = 'correct' | 'present' | 'absent' | 'empty';

interface GuessFeedback {
  letter: string;
  feedback: TileFeedback;
}

interface GameSession {
  id: string;                     // UUID
  mode: GameMode;
  word: string;                   // Target word
  letterCount: number;
  guesses: string[];              // Submitted guesses
  feedback: GuessFeedback[][];    // Feedback per guess
  keyColors: Record<string, TileFeedback>;  // Best per-key status
  status: 'playing' | 'won' | 'lost';
  hardMode: boolean;
  extraGuessesUsed: number;       // 0, 1, or 2
  maxAttempts: number;            // letterCount + 1 + extraGuessesUsed
  startedAt: string;              // ISO timestamp
  completedAt?: string;
}

// Player Stats

interface PlayerStats {
  totalGames: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];    // Per-number-of-attempts counts
  gamesByLength: Record<number, { played: number; won: number }>;
  lastGameDate: string;           // YYYY-MM-DD (for daily streak)
  completedDailyChallengeDates: string[];
}

// Settings

interface AppSettings {
  hardModeEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  isPro: boolean;
  lastSyncAt?: string;
}

// Auth

interface AuthState {
  isLoggedIn: boolean;
  playerId: string | null;
  playerName: string | null;
  authToken: string | null;
}

// Daily Puzzle

interface DailyPuzzle {
  date: string;       // YYYY-MM-DD UTC
  wordIndex: number;  // Index into wordList[letterCount]
  word: string;       // Resolved target word
  letterCount: number;
}

// Leaderboard Entry

interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  isCurrentPlayer?: boolean;
}

interface LeaderboardData {
  type: 'daily_streak' | 'endless_streak' | 'endless_total';
  entries: LeaderboardEntry[];
  lastUpdated: string;
}
```


## Project Structure

```
src/
  app/
    App.tsx                     # Root component: providers, navigation
    providers.tsx               # Store providers, theme, ad init
  navigation/
    RootNavigator.tsx           # Stack navigator configuration
    types.ts                    # Navigation param types
    linking.ts                  # Deep linking config (future use)
  screens/
    HomeScreen.tsx
    GameScreen.tsx
    ResultScreen.tsx
    StatsScreen.tsx
    SettingsScreen.tsx
    LeaderboardScreen.tsx
  components/
    game/
      GameBoard.tsx
      GuessRow.tsx
      Tile.tsx
      Keyboard.tsx
    stats/
      StatsCard.tsx
      GuessDistribution.tsx
    leaderboard/
      LeaderboardRow.tsx
    ui/
      Button.tsx
      Modal.tsx
      Toast.tsx
    ads/
      AdBanner.tsx
  state/
    gameStore.ts                # Zustand -- game session
    statsStore.ts               # Zustand -- player stats (persisted)
    authStore.ts                # Zustand -- auth state
    settingsStore.ts            # Zustand -- settings (persisted)
    middleware/
      persistMiddleware.ts      # AsyncStorage persistence wrapper
  services/
    wordLogic.ts                # Guess validation, feedback (pure)
    dailySeed.ts                # Deterministic daily word selection
    adService.ts                # AdMob interstitial & rewarded
    iapService.ts               # In-app purchase management
    syncService.ts              # Offline-first cloud sync
    leaderboardService.ts       # Google Play leaderboard integration
  data/
    words/
      words-5.json              # Clean word list (length 5)
      words-6.json
      words-7.json
      words-8.json
      words-9.json
      words-10.json
    dictionary.ts               # Word list loader & lookup
  utils/
    constants.ts                # Game constants, colors, seed value
    colors.ts                   # Theme colors
    animations.ts               # Shared animation configs
    formatters.ts               # Number/date formatting helpers
  hooks/
    useGame.ts                  # Game orchestration hook
    useKeyboard.ts              # Keyboard input handling
    useConnectivity.ts          # NetInfo wrapper
    useAds.ts                   # Ad lifecycle hook
  types/
    index.ts                    # Shared TypeScript types
  theme/
    colors.ts                   # Color palette (mint, yellow, slate, pastel)
    typography.ts               # Font sizes, weights
  assets/
    fonts/
    sounds/
```


## Patterns to Follow

### Pattern 1: Pure Game Logic Separation

**What:** Extract all word-guessing logic into pure functions that take input and return output without side effects.

**Why:** Game logic is the core value proposition. Pure functions are trivially testable, have no platform dependencies, and can't corrupt state.

**When:** All feedback computation, guess validation, and daily seed computation.

**Example (evaluateGuess):**
- Input: guess string, target string
- Output: TileFeedback[] (correct/present/absent per position)
- Algorithm: Two-pass approach. First pass marks exact matches (green). Second pass marks present-but-wrong-position (yellow) for remaining letters. Consumed letters are removed from target tracking to handle duplicates correctly.

### Pattern 2: Zustand Stores with Explicit Actions

**What:** Each Zustand store exposes clear action methods rather than allowing arbitrary state mutation. Components call actions; they don't set state directly.

**Why:** Makes data flow auditable. Actions contain validation, enforce invariants (e.g., "can't submit guess when game is over"), and trigger side effects.

**When:** All state management.

### Pattern 3: Services as Singleton Adapters

**What:** Wrap third-party SDKs (AdMob, IAP, Google Play Games) behind service interfaces. The rest of the app imports the service, never the SDK directly.

**Why:** If an SDK breaks, changes API, or you swap providers, you only change one file. Also makes mocking for tests straightforward.

**When:** All external SDK integrations.

### Pattern 4: Daily Seed Determinism

**What:** The daily puzzle word is computed from UTC date + private seed using a deterministic hash. No server needed. Every player gets the same word per day.

**Why:** Serverless daily challenge. No database. No API costs. Works offline.

**When:** Daily Challenge mode startup.

**Implementation approach:**
- PRIVATE_SEED is a hardcoded string in source
- dailyWordIndex(dateStr, wordCount) computes hash = dateStr + ':' + seed
- Uses DJB2-style hash algorithm for good distribution across word list
- Returns Math.abs(hash) % wordCount as the deterministic index

**CRITICAL:** Once the seed is set and the app ships, changing the seed changes every daily word, breaking the "same word for everyone" invariant. The seed must be fixed before the first release.

### Pattern 5: Offline-First with Optimistic Updates

**What:** Stats and settings write to local AsyncStorage immediately. Cloud sync happens asynchronously when connectivity is available.

**Why:** Game must work fully offline. No player is blocked by network issues.

**When:** Stats tracking, settings persistence.

**Flow:**
- User completes game -> StatsStore.recordGame()
- AsyncStorage.setItem('stats', JSON.stringify(stats)) -- immediate
- SyncService.enqueue({ type: 'stats', payload: stats }) -- queue
- When online: SyncService.flush() -> push to cloud

### Pattern 6: Component Composition over Configuration

**What:** Build screens by composing small, single-responsibility components. Avoid monolithic screen components with dozens of props.

**Why:** Easier to test, reuse, and animate individual pieces.

**Example:**
- GameScreen composes GameBoard + Keyboard
- GameScreen doesn't contain tile rendering or keyboard layout logic
- Each subcomponent is independently testable


## Anti-Patterns to Avoid

### Anti-Pattern 1: Redux for Game State
**What:** Using Redux Toolkit for the game session state.
**Why bad:** Over-engineered for this scope. Game session is temporary (resets per game). Zustand's simpler API reduces boilerplate by approximately 60%.
**Instead:** Use Zustand for game state. Reserve Redux only if the app grows massively in scope (unlikely for a word game).

### Anti-Pattern 2: Server-Side Daily Puzzle
**What:** Running a server to serve daily words.
**Why bad:** Adds hosting costs, latency, and a failure point for what can be pure client-side computation. The app is meant to work fully offline.
**Instead:** Deterministic seed-based generation on the client.

### Anti-Pattern 3: Inline Game Logic in Components
**What:** Putting evaluateGuess logic inside GameScreen.tsx or a custom hook.
**Why bad:** Untestable without rendering React components. Harder to verify correctness of the core game mechanic.
**Instead:** Extract to services/wordLogic.ts as pure functions.

### Anti-Pattern 4: Mixing Persistent and Session State in One Store
**What:** Having one giant store that contains both game session data (resets each game) and persistent stats.
**Why bad:** Game-over reset would need to selectively clear fields. Easy to accidentally wipe stats during a state reset.
**Instead:** Separate GameStore (session, no persistence) from StatsStore (persistence via middleware) from SettingsStore (persistence).

### Anti-Pattern 5: Direct SDK Calls in Components
**What:** Calling InterstitialAd.createAd() or RNIap.requestPurchase() directly in component code.
**Why bad:** Ties UI to SDK lifecycle. Makes migration painful if an SDK changes or breaks.
**Instead:** Wrap in AdService / IAPService singletons.

### Anti-Pattern 6: Hardcoding Full Enriched Dictionary in Bundle
**What:** Importing the full enriched JSON directly into the app bundle.
**Why bad:** The enriched JSON has definitions, synonyms, antonyms -- approximately 3.4MB of data for features we don't use. Larger bundle size.
**Instead:** Pre-process the dictionary to extract only the word list per length. Store as clean arrays (roughly 100KB total for all ~12K words).

---

## Scalability Considerations

| Concern | 1 user | 1K DAU | 100K DAU |
|---------|--------|--------|----------|
| Word list loading | Local JSON in bundle at app start | Same -- no server dependency | Same -- zero server cost |
| Daily puzzle | Client-side deterministic hash | Same -- players self-validate | Same -- zero server cost |
| Stats storage | AsyncStorage (unlimited for single user) | AsyncStorage per device -- no issue | AsyncStorage per device -- still local-only |
| Cloud stats sync | Firebase Firestore (free tier) | Firestore (cost grows with reads/writes) | May need custom backend or Firestore scaling |
| Leaderboard | Google Play Games (free) | Free tier of GPG | Free tier of GPG -- Google handles scaling |
| Ads | AdMob single user | AdMob normal | AdMob scales automatically |
| IAP | Direct Play Store | Play Store handles all | Play Store handles all |

**Key insight:** The architecture is fundamentally client-side. The only server dependencies are cloud stats sync and leaderboards, both of which can use Google-managed services that scale without developer effort.

---

## Suggested Build Order

**Phase 1: Foundation**
- Project scaffold (React Native + TypeScript + navigation + Zustand)
- Dictionary pre-processing script (extract word lists per length)
- Theme and color constants
- Data types / TypeScript definitions

**Phase 2: Core Game (offline, no ads, no auth)**
- WordLogicService (pure feedback computation -- test immediately)
- GameStore (session state)
- GameBoard + GuessRow + Tile components
- Keyboard component
- GameScreen (wire everything together)
- DailySeedService
- HomeScreen (mode selection)
- ResultScreen
- Game loop complete and testable

**Phase 3: Stats and Settings**
- StatsStore (persistent, local)
- StatsScreen + GuessDistribution chart
- SettingsStore
- SettingsScreen (Hard Mode toggle, sound toggle)
- Stats tracking on game end

**Phase 4: Monetization**
- AdService wrapper (AdMob)
- Interstitial ads after game end
- Rewarded ads for extra guesses
- IAPService wrapper
- Pro purchase flow
- Restore purchase flow
- Ad-free gating logic

**Phase 5: Cloud Features**
- AuthStore + Google Play Sign-In
- SyncService (offline-first stats sync)
- Cloud Firestore setup
- LeaderboardService
- LeaderboardScreen
- End-to-end sync tested

**Build dependencies:**
- Phase 2 depends on Phase 1 (scaffolding + word data)
- Phase 3 depends on Phase 2 (needs completed games to record stats from)
- Phase 4 depends on Phase 2 (ads shown after games end)
- Phase 5 depends on Phase 3 (stats exist to sync) and indirectly on Phase 4 (pro users skip ads but still sync)

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand (3-4 stores) | Lightest weight for this scope; Redux is overkill |
| Navigation | React Navigation 7.x (Stack) | De facto standard; simple screen stack suffices |
| Local storage | AsyncStorage | Simple key-value; no SQL needed for flat data |
| Cloud sync | Firebase Firestore | Managed NoSQL; free tier sufficient for this scale |
| Auth | Google Play Sign-In | Required for leaderboards; single sign-on |
| Animations | react-native-reanimated 4.x | Best RN animation library; needed for tile flip sequences |
| Ads | react-native-google-mobile-ads | Official Google AdMob RN package |
| IAP | react-native-iap | Mature, maintained; handles Play Store IAP |
| Word data | Pre-processed JSON arrays per length | Approximately 100KB total; trivial to load at startup |
| Daily seed | Client-side deterministic hash | No server; works offline; same word for all players |

---

## Sources

- [ASSUMED] React Native 0.86 project structure and best practices -- based on React Native documentation patterns (facebook.github.io/react-native)
- [ASSUMED] Zustand 5.x patterns for state management -- based on Zustand documentation (github.com/pmndrs/zustand)
- [ASSUMED] React Navigation 7.x stack navigator -- based on React Navigation docs (reactnavigation.org)
- [ASSUMED] react-native-google-mobile-ads 16.x -- based on npm package documentation
- [ASSUMED] react-native-iap 15.x -- based on npm package documentation
- [VERIFIED] Dictionary contains approximately 12,319 words across lengths 5-10 -- confirmed by parsing the actual JSON file
- [ASSUMED] Wordle-style tile feedback algorithm -- standard greens/yellows/grays approach widely documented
- [ASSUMED] Daily seed via deterministic hash -- common pattern in Wordle clones, no server needed