# Requirements: word-guess

**Defined:** 2026-07-04
**Core Value:** The daily puzzle must work consistently — every player gets the same word on the same day, and guesses resolve with correct tile feedback. If nothing else ships, the daily challenge is reliable and fun.

## v1 Requirements

### Phase 1: Foundation

- [ ] **FOUND-01**: Expo project scaffolded with TypeScript, ready for development
- [ ] **FOUND-02**: Dictionary preprocessed — `dictionary.full.enriched.json` stripped to word arrays per length (5-10), stored as clean JSON
- [ ] **FOUND-03**: Color palette defined as constants: pastel background, mint green (correct), sunny yellow (present), muted slate (absent), high-contrast primary UI
- [ ] **FOUND-04**: All TypeScript types and data models defined for game session, player stats, app settings, auth state, daily puzzle, leaderboard entry
- [ ] **FOUND-05**: Navigation shell with stack navigator and all screen placeholders (Home, Game, Result, Stats, Settings, Leaderboard)
- [ ] **FOUND-06**: Storage layer decision made and implemented (MMKV for settings, SQLite for game history, AsyncStorage for auth tokens)

### Phase 2: Core Gameplay

- [ ] **GAME-01**: Color-coded tile feedback — correct position = mint green, present in word = sunny yellow, absent = muted slate; handles duplicate letters per Wordle rules (count-based decrement)
- [ ] **GAME-02**: On-screen QWERTY keyboard with per-key color tracking; rows: QWERTYUIOP / ASDFGHJKL / ZXCVBNM + backspace + enter
- [ ] **GAME-03**: Valid word checking — non-dictionary words rejected with shake animation and "Not in word list" toast; uses Set-based O(1) lookup per word length
- [ ] **GAME-04**: Win/loss state detection — win when all tiles green, loss when all attempts exhausted; shows target word on loss
- [ ] **GAME-05**: Tile reveal animation using react-native-reanimated (300ms flip, 100ms stagger left-to-right, correct tiles scale bounce) — runs on UI thread
- [ ] **GAME-06**: Keyboard color update animation after tile reveal completes (delayed to avoid flicker, separate component subtree)
- [ ] **GAME-07**: Dynamic grid rendering based on word length (5-10 tiles per row); scales on small screens
- [ ] **GAME-08**: Attempt counter visibly displayed — base attempts = letterCount + 1; extra guesses from rewarded ads tracked separately
- [ ] **GAME-09**: Daily Challenge mode — same word for all players, deterministic from UTC date + private seed (obfuscated, not plain string); resets at UTC midnight
- [ ] **GAME-10**: Free Play mode — player picks letter count (5-10) before starting; random word from chosen length's dictionary
- [ ] **GAME-11**: Random mode — auto-assigned random letter count each game
- [ ] **GAME-12**: Hard Mode toggle (global setting, applies to any mode) — must reuse confirmed green tiles in same positions and yellow tiles somewhere in next guess; follows NYT Wordle exact rules including duplicate letter handling; validation with 20+ unit-tested edge cases
- [ ] **GAME-13**: Endless mode — after win/loss immediately starts new word; tracks consecutive correct streak
- [ ] **GAME-14**: Game state persists on suspend/resume — saves current board, active row, mode, extra guesses to local storage on app state change
- [ ] **GAME-15**: Loading screen with branded splash while dictionary loads and initializes
- [ ] **GAME-16**: Sound service API surface defined with no-op stub — `init, setEnabled, playKeyPress, playReveal, playWin, playLoss`; actual sound files + expo-av wiring deferred (developer adds via sound service interface)
- [ ] **GAME-17**: Enter (submits guess if valid word) and Backspace (removes last letter) keys on on-screen keyboard; Enter disabled when row empty
- [ ] **GAME-18**: Haptic feedback via expo-haptics on key press (light impact) and tile reveal
- [ ] **GAME-19**: Daily puzzle seed obfuscated via multi-source hash (package name + app version + non-obvious constant string) with ProGuard/R8 minification; no JNI/native layer — blocks casual cheating, determined attacker with APK decompilation can extract (accepted risk)

### Phase 3: Stats & Settings

- [ ] **STAT-01**: Local stats tracking — total games, wins, win %, current streak, max streak, guess distribution (per-number-of-attempts), games by word length; stored in SQLite
- [ ] **STAT-02**: Stats screen displaying all tracked stats with guess distribution bar chart
- [ ] **STAT-03**: Settings screen with Hard Mode toggle, sound on/off, haptic on/off, account section (sign in / profile)
- [ ] **STAT-04**: Share results as emoji text grid (🟩🟨⬛) with mode, attempts, date copied to clipboard
- [ ] **STAT-05**: AsyncStorage used only for lightweight settings (auth tokens, Pro status flag); game history in SQLite

### Phase 4: Monetization

- [ ] **AD-01**: Interstitial ad shown after each completed game (win or loss) for free tier; ad loads at game start, shows after game completion + Continue button press
- [ ] **AD-02**: Rewarded video ad for +1 extra guess (max 2 per game); clear "Watch ad for +1 guess?" dialog with confirm/cancel; button appears when 2 attempts remaining
- [ ] **AD-03**: Pro IAP ($1.99 USD, non-consumable SKU) — removes all interstitial ads permanently; product ID `com.wordguess.pro` stored as constant
- [ ] **AD-04**: Restore Purchases flow — button in Settings calls `getPurchases()` from react-native-iap; re-activates Pro features without re-purchasing
- [ ] **AD-05**: Ad-free gating — `AdsEnabled = !isPro` checked before showing any ad; Pro status stored locally and checked at app startup
- [ ] **AD-06**: Singleton ad manager prevents double-loading — ref-counted lifecycle per ad unit ID; loads at appropriate times (interstitial at game start, rewarded on app launch)
- [ ] **AD-07**: Test ad IDs used during development; real AdMob unit IDs configurable via environment

### Phase 5: Cloud & Social

- [ ] **CLOUD-01**: Google Play Sign-In via `@react-native-google-signin` + Firebase Auth token exchange; three SHA-1 fingerprints registered (debug, upload, Play App Signing)
- [ ] **CLOUD-02**: Cloud-synced stats via Firebase Firestore — local stats sync asynchronously when online; uses event-based incremental sync (not full-state overwrite)
- [ ] **CLOUD-03**: Daily Challenge leaderboard — top players by daily streak; requires sign-in to view
- [ ] **CLOUD-04**: Endless leaderboard — top players by total consecutive correct guesses; separate from daily
- [ ] **CLOUD-05**: Endless leaderboard (total words guessed ever) — separate listing viewable independently
- [ ] **CLOUD-06**: Offline-first sync with write-ahead log — game results appended to sync queue; on connectivity, drain queue with idempotent events; handles 3+ offline games before sync
- [ ] **CLOUD-07**: Deferred score queue — if sign-in not complete at score time, queue score locally; submit when auth succeeds; retry 3× with exponential backoff
- [ ] **CLOUD-08**: Google Sign-In configured with Web client ID (not Android client ID); OAuth consent screen set to External

### Phase 6: Pre-Launch & Polish

- [ ] **LAUNCH-01**: Color blindness support — texture patterns or icons in addition to color on tiles (dots for correct, stripes for present, solid for absent)
- [ ] **LAUNCH-02**: Screen reader support — proper `accessible` props on tiles; TalkBack announces "Position 1: A correct" per tile
- [ ] **LAUNCH-03**: Font size scaling responsive to system settings using PixelRatio
- [ ] **LAUNCH-04**: Reduce motion support — detects `AccessibilityInfo.isReduceMotionEnabled()`, skips tile flip animations, shows instant results
- [ ] **LAUNCH-05**: Android back button handled across all screens/states — blocked during tile animations, ad display, IAP flow; graceful skip-to-final-state on back during animation
- [ ] **LAUNCH-06**: Play Store compliance — ads declared in Play Console, privacy policy URL linked (covers AdMob data collection), content rating completed, ads declaration YES
- [ ] **LAUNCH-07**: Performance profiling — test on mid-range Android device (Moto G Power class); verify tile animations 60 FPS, dictionary load < 500ms, stats read/write < 100ms
- [ ] **LAUNCH-08**: Production AAB build via EAS; internal + closed testing track before production release
- [ ] **LAUNCH-09**: Offline-first verification — app works fully on first launch with no internet (daily word generated locally, no crash)

## v2 Requirements

### Additional Features

- **V2-01**: iOS release — requires separate App Store compliance, IAP setup, Xcode build
- **V2-02**: RevenueCat integration if expanding to iOS or adding subscriptions
- **V2-03**: Server-side daily puzzle validation — verify submitted word matches expected daily word before accepting leaderboard scores
- **V2-04**: Word definitions on result screen — show definition from enriched dictionary after game completes as "learn something new"
- **V2-05**: Daily challenge streak milestones — achievements/badges for streaks (7, 30, 100, 365 days)
- **V2-06**: Custom word lists / themed packs — optional paid DLC word packs

## Out of Scope

| Feature | Reason |
|---------|--------|
| iOS version | Android-only for initial release; iOS deferred to v2 |
| Hint system / reveal letter | Breaks core puzzle loop — the game IS the hint |
| Definition display during gameplay | Would trivialize the puzzle; show after game only (v2) |
| Unlimited ads | One interstitial per game max; Pro removes all |
| Login wall | Play without account; sign-in is optional for leaderboards |
| Push notification spam | Only essential daily challenge notifications |
| Friend challenges / social feed | Scope creep; leaderboards provide enough social comparison |
| Real-time multiplayer / PvP | Completely different game; solo puzzle only |
| Word suggestion / autocomplete | Part of the challenge; defeats the puzzle |
| Alternative languages | English only; would require full new dictionary per language |
| Login rewards / daily bonus coins | Doesn't fit genre; the game IS the reward |
| Timer / speed mode | Thoughtful deduction is core; rush mode is anti-thetical |
| RevenueCat (initial release) | Overkill for single $1.99 non-consumable; evaluate for v2 if iOS added |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| GAME-01 | Phase 2 | Pending |
| GAME-02 | Phase 2 | Pending |
| GAME-03 | Phase 2 | Pending |
| GAME-04 | Phase 2 | Pending |
| GAME-05 | Phase 2 | Pending |
| GAME-06 | Phase 2 | Pending |
| GAME-07 | Phase 2 | Pending |
| GAME-08 | Phase 2 | Pending |
| GAME-09 | Phase 2 | Pending |
| GAME-10 | Phase 2 | Pending |
| GAME-11 | Phase 2 | Pending |
| GAME-12 | Phase 2 | Pending |
| GAME-13 | Phase 2 | Pending |
| GAME-14 | Phase 2 | Pending |
| GAME-15 | Phase 2 | Pending |
| GAME-16 | Phase 2 | Pending |
| GAME-17 | Phase 2 | Pending |
| GAME-18 | Phase 2 | Pending |
| GAME-19 | Phase 2 | Pending |
| STAT-01 | Phase 3 | Pending |
| STAT-02 | Phase 3 | Pending |
| STAT-03 | Phase 3 | Pending |
| STAT-04 | Phase 3 | Pending |
| STAT-05 | Phase 3 | Pending |
| AD-01 | Phase 4 | Pending |
| AD-02 | Phase 4 | Pending |
| AD-03 | Phase 4 | Pending |
| AD-04 | Phase 4 | Pending |
| AD-05 | Phase 4 | Pending |
| AD-06 | Phase 4 | Pending |
| AD-07 | Phase 4 | Pending |
| CLOUD-01 | Phase 5 | Pending |
| CLOUD-02 | Phase 5 | Pending |
| CLOUD-03 | Phase 5 | Pending |
| CLOUD-04 | Phase 5 | Pending |
| CLOUD-05 | Phase 5 | Pending |
| CLOUD-06 | Phase 5 | Pending |
| CLOUD-07 | Phase 5 | Pending |
| CLOUD-08 | Phase 5 | Pending |
| LAUNCH-01 | Phase 6 | Pending |
| LAUNCH-02 | Phase 6 | Pending |
| LAUNCH-03 | Phase 6 | Pending |
| LAUNCH-04 | Phase 6 | Pending |
| LAUNCH-05 | Phase 6 | Pending |
| LAUNCH-06 | Phase 6 | Pending |
| LAUNCH-07 | Phase 6 | Pending |
| LAUNCH-08 | Phase 6 | Pending |
| LAUNCH-09 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 52 total
- Mapped to phases: 52
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-04*
*Last updated: 2026-07-04 after initial definition*
