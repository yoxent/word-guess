# Research Summary: Word-Guess (Wordle-Style Word Guessing Game)

**Synthesized:** 2026-07-04
**Research Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md
**Synthesis Confidence:** HIGH — all four research files align on core recommendations with no contradictory findings.

---

## Executive Summary

Word-Guess is an Android word puzzle game (React Native via Expo) inspired by NYT Wordle, differentiated by multi-length support (5–10 letters), four game modes (Daily/Free/Random/Endless), and a freemium model with $1.99 Pro IAP. The combined research recommends **Expo SDK 57 (managed + dev client)** as the app framework, **Zustand 5.x** for state management, **react-native-reanimated 4.x** for UI-thread tile flip animations, and **Firebase Firestore** for cloud sync and leaderboards.

The architecture is fundamentally **client-side and offline-first** — the daily puzzle is generated deterministically from a date seed (no server needed), stats sync to the cloud is asynchronous and event-based, and the core game loop works without any network connection. Monetization via AdMob interstitials and rewarded video ads is layered on top, gated by a one-time Pro purchase.

**Key risks to mitigate upfront:** (1) Tile animations must run on the UI thread via Reanimated worklets — JS-thread animations will stutter on mid-range Android devices and produce negative reviews. (2) The daily puzzle seed must be obfuscated across native layers (not a plain string in JS) to prevent APK decompilation from revealing all future daily words. (3) Google Sign-In configuration is notoriously fragile — three SHA-1 fingerprints (debug, upload, Play App Signing) must all be registered in Firebase before the first production build. (4) Offline-first sync must use event-based incremental updates, not full-state overwrites, to prevent data corruption when multiple games complete offline.

---

## Key Findings

### From STACK.md: Technology Recommendations (Confidence: HIGH)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Expo SDK 57 (managed + dev client) | Solo developer; every needed native module has an Expo config plugin. No native project maintenance. `eas build` for AABs, `eas update` for OTA JS pushes. |
| **Navigation** | @react-navigation/native-stack 7.x | Simple stack (Home → Game → Result → Stats/Leaderboard). No tabs needed. |
| **State** | Zustand 5.x (4 stores) | 1 KB, zero boilerplate, selector-based subscriptions prevent full-tree re-renders. Avoids Redux overkill. |
| **Animations** | react-native-reanimated 4.x | UI-thread worklet-driven tile flips at 60 FPS. Critical for polished feel. |
| **Cloud** | @react-native-firebase/firestore 25.x | Battle-tested with Expo; real-time listeners; offline persistence. Solo dev doesn't need custom backend. |
| **Auth** | @react-native-google-signin 16.x + Firebase Auth | Google Play Sign-In for leaderboards. Two-step: GoogleSignIn → Firebase Auth token exchange. |
| **Ads** | react-native-google-mobile-ads 16.x | Official AdMob RN package. Handles interstitial and rewarded video. |
| **IAP** | react-native-iap 15.x | Lightweight; no third-party fee (unlike RevenueCat). |
| **Dictionary** | Pre-processed JSON arrays per length (~150KB gzipped) | Strip enriched JSON at build time to just word arrays. Load synchronously at startup. |

**Critical version compatibilities:** Reanimated 4.x requires RN 0.83–0.86 (Expo SDK 57 uses ~0.86.0). Firebase 25.x and Google Mobile Ads 16.x all have Expo config plugins built in. `react-native-iap` 15.x requires `react-native-nitro-modules` ^0.35.0.

### From FEATURES.md: Feature Landscape (Confidence: HIGH)

**Table Stakes (15 features, must-ship):**
- Color-coded tile feedback, on-screen QWERTY keyboard with per-key color tracking, valid word checking (Set-based O(1) lookup), win/loss detection, tile reveal animation (300ms flip, 100ms stagger), keyboard update animation, dynamic grid per word length, attempt counter, Daily Challenge mode (seeded from date), local stats tracking, share results (emoji grid), sound effects, Enter/Backspace keys, state persistence on suspend/resume, loading screen during dictionary init.

**Differentiators (12 features, competitive advantage):**
- Free Play mode (pick length 5–10), Random mode (auto-assigned length), Endless mode (consecutive words with streak), Hard Mode toggle (applies to any mode, not a separate game type), multi-length dictionary (5–10 letters, ~12K words total), Daily Challenge leaderboard, Endless leaderboard, cloud-synced stats via Google Sign-In, rewarded video for +1 extra guess (max 2/game), $1.99 Pro IAP (removes all interstitials), pastel soft aesthetic (mint/yellow/slate), haptic feedback on key press and tile reveal.

**Anti-Features (deliberately excluded):**
- Hint/reveal system, definition display during gameplay, unlimited ads, login wall, push notification spam, friend challenges / social feed, real-time PvP multiplayer, word suggestion/autocomplete, alternative languages, login rewards/daily bonus coins, timer/speed mode.

**Accessibility:** Color blindness support (patterns/icons in addition to color), screen reader support (TalkBack), font size scaling, reduce motion setting (detect via `AccessibilityInfo`).

### From ARCHITECTURE.md: Architecture Patterns (Confidence: MEDIUM)

**Architecture Layers:**
1. **Navigation** — React Navigation 7.x stack (6 screens: Home, Game, Result, Stats, Settings, Leaderboard)
2. **Screens** — Route-level components composing feature components
3. **Feature Components** — GameBoard, GuessRow, Tile, Keyboard, StatsCard, ModeSelector, AdBanner, LeaderboardRow
4. **State Layer (Zustand)** — GameStore (session), StatsStore (persistent), AuthStore (session/token), SettingsStore (persistent)
5. **Service Layer** — WordLogicService (pure functions), DailySeedService (deterministic hash), AdService (singleton adapter), IAPService (purchase/restore), SyncService (offline-first push), LeaderboardService (score submission)
6. **Persistence** — AsyncStorage/MMKV (local), Firebase Firestore (cloud)

**Key Architecture Patterns:**
| Pattern | Description | Why |
|---------|-------------|-----|
| Pure Game Logic Separation | `evaluateGuess()` as pure function, no side effects | Trivially testable; no platform dependencies |
| Zustand Explicit Actions | Stores expose action methods, not direct mutation | Auditable data flow; invariant enforcement |
| Services as Singleton Adapters | Wrap SDKs behind service interfaces | Swap providers without touching app code |
| Daily Seed Determinism | SHA-256(date + seed) % wordList.length | Serverless daily challenge; works offline |
| Offline-First Optimistic Updates | Local write then async cloud sync | Game works fully offline; no blocking |
| Component Composition | Compose screens from small single-responsibility components | Testable, reusable, animatable |

**Data Models:** `GameSession`, `PlayerStats`, `AppSettings`, `AuthState`, `DailyPuzzle`, `LeaderboardEntry` — all defined in shared TypeScript types.

**Project Structure:** `src/{app,navigation,screens,components,state,services,data,utils,hooks,types,theme,assets}` — standard Expo/RN structure.

### From PITFALLS.md: Domain Pitfalls (Confidence: HIGH)

**Critical Pitfalls** (cause rewrites, store rejection, or player abandonment):

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| P1 | Animating tiles on JS thread → stuttering | Use Reanimated worklets from day one; batch state updates before triggering animation sequence | Core Gameplay |
| P2 | Daily seed discovered via APK decompilation | Obfuscate seed across native layers; enable ProGuard; derive seed from app signing key | Daily Challenge |
| P3 | Play Store rejection for ad/IAP compliance | Declare ads in Play Console; privacy policy URL; test ads FIRST; IAP product IDs must match exactly | Monetization |
| P4 | Google Sign-In DEVELOPER_ERROR (SHA-1/config) | Register 3 SHA-1 fingerprints; use Web client ID in `configure()`; test release builds on real devices | Cloud Features |
| P5 | Offline data corruption from race conditions | Event-based sync (not full-state); idempotent operations; write-ahead log for game results | Cloud Features |

**Moderate Pitfalls:**
- P6: Interstitial ads double-loading / wrong timing → singleton ad manager; load at game start, show on completion
- P7: IAP product ID mismatch / no restore → centralized constants; implement restore from day one
- P8: Large dictionary blocks JS thread at startup → strip at build time; lazy-load by word length
- P9: Leaderboard score submission before sign-in completes → deferred score queue; retry with backoff
- P10: Keyboard flickers during tile reveal → separate component trees; delayed keyboard color update
- P11: Android back button not handled → BackHandler listener per screen; block during animations/purchases

**Minor Pitfalls:**
- P12: Hard Mode logic errors with duplicate letters → TDD with 20+ edge cases before integration
- P13: AsyncStorage for game state instead of SQLite → use SQLite/MMKV for structured data
- P14: No internet on first launch → offline-first startup; graceful degradation
- P15: UTC midnight boundary ambiguity → always use UTC; handle clock skew; cache daily word

---

## Implications for Roadmap

### Recommended Phase Structure (6 phases)

The research files strongly agree on build order: core gameplay first, then polish, then persistence, then monetization, then cloud features. The following phases integrate recommendations from all four files.

#### Phase 1: Foundation & Data Architecture (Week 1)

**What:** Project scaffold, storage engine decision, dictionary preprocessing, theme, types.
**Deliverables:** Working Expo project with navigation shell, pre-processed word lists, storage layer, color theme.
**Features:** Scaffolding only (no gameplay yet).
**Pitfalls to avoid:** P8 (dictionary blocking startup — strip at build time), P13 (choose SQLite/MMKV over AsyncStorage for game data), P14 (offline-first startup design).
**Research flag:** Storage engine choice (SQLite vs MMKV vs AsyncStorage split) needs a quick spike to confirm optimal split. Otherwise well-documented patterns.

#### Phase 2: Core Gameplay (Weeks 2-3)

**What:** The full game loop — Daily Challenge mode, Free Play, Random mode, Hard Mode toggle.
**Deliverables:** Playable game with tile feedback, on-screen keyboard, valid word checking, win/loss detection, animations, sound effects.
**Features:** TS-1 through TS-9, TS-12, TS-13, TS-15 (table stakes), DF-1 (Free Play), DF-2 (Random), DF-4 (Hard Mode), DF-5 (multi-length).
**Pitfalls to avoid:** P1 (Reanimated from day one — NOT `Animated.timing`), P2 (obfuscated seed, not a plain JS string), P10 (separate component trees for board and keyboard), P12 (TDD for Hard Mode logic), P15 (UTC normalization for daily seed).
**Research flag:** Seed obfuscation technique — JNI native layer approach needs a brief spike to confirm feasibility. Hard Mode validation needs thorough unit tests (well-documented pattern).

#### Phase 3: Stats, Settings & Persistence (Week 4)

**What:** Persistent stats tracking, settings screen, app state persistence, share results.
**Deliverables:** Stats screen with guess distribution chart, settings (Hard Mode toggle, sound, haptic), game state saves on suspend/resume, share-as-emoji-grid.
**Features:** TS-10 (stats), TS-11 (share), TS-14 (state persistence), DF-12 (haptic feedback).
**Pitfalls to avoid:** P13 (persist game history in SQLite, settings in MMKV, not AsyncStorage for everything).
**Research flag:** Low risk. Standard RN patterns. Skip dedicated research, proceed with implementation.

#### Phase 4: Monetization (Week 5)

**What:** Ad integration, IAP Pro purchase, restore flow.
**Deliverables:** Interstitial ads after game completion (free tier), rewarded video for extra guesses, Pro purchase ($1.99) removes ads, restore purchases button.
**Features:** DF-9 (rewarded ads), DF-10 (Pro IAP), interstitial ads (from FEATURES.md ad placement strategy).
**Pitfalls to avoid:** P3 (Play Store compliance — declare ads, privacy policy, test ads), P6 (singleton ad manager, pre-load at game start), P7 (centralized product ID constants, restore flow), P11 (BackHandler during ad display).
**Research flag:** AdMob + IAP setup is well-documented. However, Play Store policy changes frequently — verify current ad/IAP policy requirements during this phase.

#### Phase 5: Cloud & Social (Week 6)

**What:** Google Sign-In, cloud sync, leaderboards.
**Deliverables:** Optional sign-in, cloud-synced stats, Daily Challenge and Endless leaderboards.
**Features:** DF-6 (Daily leaderboard), DF-7 (Endless leaderboard), DF-8 (cloud-synced stats).
**Pitfalls to avoid:** P4 (SHA-1 triple registration, Web client ID), P5 (event-based sync, not full-state), P9 (deferred score queue, retry with backoff).
**Research flag:** HIGH RISK. Google Sign-In configuration is the most fragile part of the stack. Need dedicated research spike for SHA-1 registration, Web client ID usage, and release build testing. Stats sync data model (event-based vs incremental) needs design doc before implementation.

#### Phase 6: Pre-Launch & Polish (Week 7)

**What:** Play Store submission, accessibility, edge case hardening, performance profiling.
**Deliverables:** Production-ready app submitted to Play Store.
**Features:** Accessibility (colorblind mode, screen reader, reduce motion), performance optimization, Play Store listing, privacy policy, content rating.
**Pitfalls to avoid:** P3 (final compliance check), P11 (comprehensive back button testing), P14 (offline-first verification on clean install).
**Research flag:** Play Store current policy requirements. Accessibility testing guidelines.

### Research Flags Summary

| Phase | Needs Deep Research | Standard Patterns |
|-------|---------------------|-------------------|
| Phase 1: Foundation | Storage engine split (SQLite vs MMKV vs AsyncStorage) | Expo project scaffold, dictionary preprocessing |
| Phase 2: Core Gameplay | Seed obfuscation via JNI/multi-source | Reanimated animations, daily seed is well-documented |
| Phase 3: Stats & Settings | — | Zustand persistence, stats tracking |
| Phase 4: Monetization | Current Play Store ad/IAP policy | AdMob setup, RN IAP |
| Phase 5: Cloud & Social | **Google Sign-In config guide**, event-based sync data model | Firebase Firestore, leaderboard patterns |
| Phase 6: Pre-Launch | Current Play Store policy, accessibility testing | — |

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| **Stack** | **HIGH** | All library versions verified against npm registry. Expo SDK 57 with managed workflow is the clear recommendation. No contradictory alternatives proposed. |
| **Features** | **HIGH** | Feature landscape validated against NYT Wordle and top clones (Wordscapes, Quordle). Table stakes are unambiguous. Differentiators are well-motivated. |
| **Architecture** | **MEDIUM** | Architecture is derived from RN 0.86 ecosystem best practices but no running code was verified. The 6-service/4-store split is opinionated and sensible but untested. The build order aligns across all research files, which increases confidence. |
| **Pitfalls** | **HIGH** | Most pitfalls verified via npm registry documentation, README files, and established RN community patterns. Google Sign-In `DEVELOPER_ERROR` and ad compliance risks are well-documented in the community. |

### Gaps to Address

1. **Seed obfuscation technique detail:** PITFALLS.md recommends splitting the seed across native layers (JNI) but doesn't provide an implementation walkthrough. Will need a spike in Phase 2.
2. **Google Sign-In configuration checklist:** PITFALLS.md identifies the SHA-1/Web client ID issue correctly but a step-by-step checklist needs to be created during Phase 5 research.
3. **SQLite vs MMKV vs AsyncStorage split:** FEATURES.md and PITFALLS.md recommend SQLite for game history and MMKV for settings, but ARCHITECTURE.md references AsyncStorage as the persistence layer. The architecture doc needs updating to reflect the split strategy.
4. **No performance benchmarks:** None of the research files reference actual performance numbers on target devices (Moto G Power class). Animation frame rates, dictionary load times, and storage read/write speeds are estimated, not measured.
5. **Play Store policy recency:** PITFALLS.md notes that Play Store policies "change frequently." The ad/IAP compliance guidance must be verified against the latest (2026) Play Console requirements before Phase 4/6.

---

## Sources

- [VERIFIED] Dictionary word counts per length (5-10) — confirmed from `dictionary.full.enriched.json` in project
- [VERIFIED] npm registry — `react-native-reanimated` 4.5.1 peer deps, `react-native-iap` 15.3.6 peer deps, `@react-native-google-signin/google-signin` 16.1.2 README
- [VERIFIED] `react-native-google-mobile-ads` 16.4.0 README — ad format docs, test IDs
- [ASSUMED] NYT Wordle mechanics (tile feedback, hard mode rules, share format) — based on extensive gameplay knowledge across all research files
- [ASSUMED] React Native 0.86 project structure and best practices — from React Native documentation
- [ASSUMED] Zustand 5.x patterns — from Zustand documentation
- [ASSUMED] React Navigation 7.x stack navigator — from React Navigation docs
- [ASSUMED] Google Play Console policy requirements for ads and IAP — current known policies
- [ASSUMED] Wordle hard mode edge cases — documented by Wordle clone community
- [ASSUMED] Offline-first sync patterns, async storage performance — established RN community knowledge
