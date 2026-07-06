# Roadmap: word-guess

**Core Value:** The daily puzzle must work consistently — every player gets the same word on the same day, and guesses resolve with correct tile feedback. If nothing else ships, the daily challenge is reliable and fun.

**Project Mode:** mvp — each phase delivers an end-to-end vertical slice of working functionality.

**Phase Count:** 6
**Granularity:** Standard
**Created:** 2026-07-04

---

## Phases

- [x] **Phase 1: Foundation** — Scaffold, dictionary, theme, types, navigation, storage
- [x] **Phase 2: Core Gameplay** — Full game loop: tile feedback, keyboard, all modes, animations, sounds, Hard Mode, daily seed
- [x] **Phase 3: Stats & Settings** — Persistent stats, settings screen, share results, local persistence
- [ ] **Phase 4: Monetization** — Interstitial ads, rewarded video, Pro IAP, restore purchases
- [ ] **Phase 5: Cloud & Social** — Google Sign-In, cloud sync, daily/endless leaderboards
- [ ] **Phase 6: Pre-Launch & Polish** — Accessibility, Play Store compliance, performance, production build

---

## Phase Details

### Phase 1: Foundation
**Goal:** Project scaffolded with all foundational infrastructure — navigation shell, preprocessed dictionary, color theme, types/models, storage layer ready for feature development.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06
**Success Criteria** (what must be TRUE):
1. Developer can run `npx expo start` and see the app with navigation working across all placeholder screens
2. Dictionary files exist per word length (5–10 letters) as clean JSON arrays, loadable synchronously at startup
3. Color palette constants are defined and usable by all components — pastel background, mint green, sunny yellow, muted slate, high-contrast primary UI
4. All TypeScript types and data models are defined (GameSession, PlayerStats, AppSettings, AuthState, DailyPuzzle, LeaderboardEntry)
5. Storage layer implemented — MMKV for lightweight settings, SQLite for game history/stats, AsyncStorage for auth tokens
6. Stack navigator routes between Home → Game → Result → Stats → Settings → Leaderboard (all placeholder screens render)
**Plans:** 3 plans (01-01, 01-02, 01-03)
**UI hint:** yes

### Phase 2: Core Gameplay
**Goal:** Full playable word guessing game with all four modes, color-coded tile feedback, on-screen keyboard, smooth animations, sound effects, haptics, secure daily seed, and Hard Mode toggle.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** GAME-01, GAME-02, GAME-03, GAME-04, GAME-05, GAME-06, GAME-07, GAME-08, GAME-09, GAME-10, GAME-11, GAME-12, GAME-13, GAME-14, GAME-15, GAME-16, GAME-17, GAME-18, GAME-19
**Success Criteria** (what must be TRUE):
1. Player can guess words and see correct (mint green), present (sunny yellow), absent (muted slate) tile feedback per Wordle duplicate-letter rules
2. On-screen QWERTY keyboard shows per-key color tracking; Enter submits valid guesses, Backspace deletes last letter; Enter disabled when row empty
3. Non-dictionary words rejected with shake animation and "Not in word list" toast
4. Win/loss detection works — win when all tiles green (confetti/celebration), loss when attempts exhausted (target word revealed)
5. Tile reveal animation plays at 60 FPS (300ms flip, 100ms left-to-right stagger, correct tiles scale bounce); keyboard color update fires after reveal completes
6. Dynamic grid renders correctly for word lengths 5–10; scales on small screens; attempt counter = letterCount + 1
7. Daily Challenge mode — same word for all players, deterministic from UTC date + private obfuscated seed, resets at UTC midnight
8. Free Play mode — player picks letter count (5–10) before starting, random word from chosen length
9. Random mode — auto-assigned random letter count each game
10. Hard Mode toggle — must reuse confirmed green tiles in same positions and yellow tiles somewhere; validated with 20+ edge cases including duplicate letters
11. Endless mode — after win/loss immediately starts new word; consecutive correct streak tracked
12. Game state persists on suspend/resume — player returns to same board position after app is backgrounded and reopened
13. Sound service API surface defined with no-op stub (playKeyPress, playReveal, playWin, playLoss); actual sound files + expo-av wiring deferred (developer adds via sound service); haptic feedback (light impact on key press and tile reveal) via expo-haptics
14. Loading screen with branded splash shows while dictionary loads and initializes
15. Daily puzzle seed obfuscated via multi-source hash (package name + app version + non-obvious constant) with ProGuard/R8; no JNI/native layer — blocks casual cheating, determined attacker with APK decompilation can extract (accepted risk)
**Plans:** 4 plans (02-01, 02-02, 02-03, 02-04)
**Plan list:**
1. **02-01** (Wave 1) — Dictionary preprocessing update (valid-{N}.json + defs-{N}.json), wordLogic.ts (evaluateGuess, validateHardMode), dailySeed.ts, sound.ts stub, dictionaryStore dual-source, gameStore real submitGuess
2. **02-02** (Wave 2) — Tile/GuessRow/GameBoard components, Keyboard (QWERTY + per-key colors + Enter/Backspace), GameScreen full replacement, ResultModal basic, Confetti
3. **02-03** (Wave 2) — LengthPickerModal, HomeScreen mode routing (Free/Random/Daily/Endless), daily completion tracking, Endless "Play Next", definition display
4. **02-04** (Wave 3) — Reanimated tile animations (200ms flip, 50ms stagger, correct bounce), keyboard color update delay, input queue, Hard Mode shake/toast, AppState persistence, LoadingScreen, haptics
**UI hint:** yes

### Phase 3: Stats & Settings
**Goal:** Players can view persistent statistics, configure game settings, share results, and trust that game state is saved across sessions.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** STAT-01, STAT-02, STAT-03, STAT-04, STAT-05
**Success Criteria** (what must be TRUE):
1. Stats tracked locally in SQLite — total games played, wins, win %, current streak, max streak, guess distribution (per-number-of-attempts), games by word length
2. Stats screen displays all tracked stats with a guess distribution bar chart
3. Settings screen allows toggling Hard Mode (default on), sound on/off, haptic on/off; shows account section (sign in/profile)
4. Player can share results as emoji text grid (🟩🟨⬛) with mode, attempts, date — copied to clipboard on tap
5. AsyncStorage used only for lightweight settings (auth tokens, Pro status flag); game history and stats in SQLite
**Plans:** TBD
**UI hint:** yes

### Phase 4: Monetization
**Goal:** Free-to-play monetization layer with AdMob interstitials after each game, rewarded video for extra guesses, and Pro IAP ($1.99) to remove ads permanently.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** AD-01, AD-02, AD-03, AD-04, AD-05, AD-06, AD-07
**Success Criteria** (what must be TRUE):
1. Free tier player sees interstitial ad after each completed game (ad pre-loads at game start, shows after Continue button press)
2. Player can watch rewarded video for +1 extra guess (max 2 per game); dialog with confirm/cancel appears when 2 attempts remaining
3. Player can purchase Pro version ($1.99 USD, non-consumable) — removes all interstitial ads permanently
4. Player can restore purchases from Settings — `getPurchases()` reactivates Pro features without re-purchasing
5. Ad-free gating works correctly — ads shown only when `!isPro`; Pro status stored locally and checked at app startup
6. Singleton ad manager prevents double-loading; ads use test IDs during development; real AdMob unit IDs configurable via environment
**Plans:** 3 plans (04-01, 04-02, 04-03)
**Plan list:**
1. **04-01** (Wave 1) — Install deps + config plugins, split maxExtraGuesses, create adStore + remoteConfig service, app init wiring
2. **04-02** (Wave 2) — Extend Settings UI config with restore/purchase rows, implement restore + Pro purchase flows in SettingsScreen
3. **04-03** (Wave 2) — Rewarded ad button in ResultModal, interstitial on result transition, extra guess mechanics in gameStore, frequency capping
**UI hint:** yes

### Phase 5: Cloud & Social
**Goal:** Optional Google Sign-In enables cloud-synced stats and competitive leaderboards for Daily Challenge and Endless modes.
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** CLOUD-01, CLOUD-02, CLOUD-03, CLOUD-04, CLOUD-05, CLOUD-06, CLOUD-07, CLOUD-08
**Success Criteria** (what must be TRUE):
1. Player can sign in with Google Play account (optional — gameplay works without sign-in); three SHA-1 fingerprints registered (debug, upload, Play App Signing)
2. Player's stats sync to cloud via Firebase Firestore asynchronously when online — event-based incremental sync, not full-state overwrite
3. Player can view Daily Challenge leaderboard — top players by daily streak (requires sign-in)
4. Player can view Endless leaderboard — top players by total consecutive correct guesses
5. Player can view Endless leaderboard (total words guessed ever) — separate listing viewable independently
6. Offline game results are appended to sync queue; on connectivity, drain queue with idempotent events; handles 3+ offline games
7. Scores submitted before sign-in complete are queued locally; submitted when auth succeeds; retry 3× with exponential backoff
**Plans:** TBD
**UI hint:** yes

### Phase 6: Pre-Launch & Polish
**Goal:** Production-ready app submitted to Google Play Store — accessible to all players, performant on mid-range devices, compliant with Play Store policies.
**Mode:** mvp
**Depends on:** Phase 5
**Requirements:** LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05, LAUNCH-06, LAUNCH-07, LAUNCH-08, LAUNCH-09
**Success Criteria** (what must be TRUE):
1. Color blindness support — tiles show texture patterns/icons (dots for correct, stripes for present, solid for absent) in addition to color
2. Screen reader (TalkBack) announces each tile's position and state; proper `accessible` props on all interactive elements
3. Font sizes scale with system accessibility settings (PixelRatio); Reduce Motion detected via `AccessibilityInfo` — skips tile flip animations, shows instant results
4. Android back button handled correctly on all screens — blocked during tile animations, ad display, and IAP flow; graceful skip-to-final-state on back during animation
5. App runs at 60 FPS on mid-range Android device (Moto G Power class); dictionary load < 500ms; stats read/write < 100ms
6. Production AAB build via EAS Build; internal + closed testing track completed before production release
7. App works fully on first launch with no internet connection — daily word generated locally, no crash on missing network
8. Play Store compliance complete — ads declared in Play Console, privacy policy URL linked (covers AdMob data collection), content rating completed
**Plans:** TBD
**UI hint:** yes

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| Phase 1: Foundation | 3/3 | ✅ Complete | 2026-07-04 |
| Phase 2: Core Gameplay | 4/4 | ✅ Complete | 2026-07-05 |
| Phase 3: Stats & Settings | 3/3 | ✅ Complete | 2026-07-06 |
| Phase 4: Monetization | 0/0 | ❄️ Not started | — |
| Phase 5: Cloud & Social | 0/0 | ❄️ Not started | — |
| Phase 6: Pre-Launch & Polish | 0/0 | ❄️ Not started | — |

---

## Dependencies Between Phases

```
Phase 1 (Foundation)
  └── Phase 2 (Core Gameplay)
        └── Phase 3 (Stats & Settings)
              └── Phase 4 (Monetization)
                    └── Phase 5 (Cloud & Social)
                          └── Phase 6 (Pre-Launch & Polish)
```

Each phase depends on the previous phase being complete. No parallel phases — sequential delivery fits solo developer workflow.

---

## Requirement Coverage

| Category | Count | Assigned To | Status |
|----------|-------|-------------|--------|
| Foundation | 6 | Phase 1 | ✓ |
| Core Gameplay | 19 | Phase 2 | ✓ |
| Stats & Settings | 5 | Phase 3 | ✓ |
| Monetization | 7 | Phase 4 | ✓ |
| Cloud & Social | 8 | Phase 5 | ✓ |
| Pre-Launch & Polish | 9 | Phase 6 | ✓ |
| **Total v1** | **52** | | **100% ✓** |
