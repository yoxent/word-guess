# Feature Landscape: Wordle-Style Word Guessing Games

**Domain:** React Native mobile word puzzle game (Android)
**Researched:** 2026-07-04
**Mode:** Ecosystem research — features dimension
**Confidence Level:** HIGH (features validated against known NYT Wordle and top clones including Wordscapes, Quordle, Moviedle variants)

---

## Executive Summary

This document maps the feature landscape for React Native word-guessing games inspired by NYT Wordle. The goal is to identify what features are **table stakes** (users expect them, missing = product feels incomplete), **differentiators** (competitive advantages), and **anti-features** (deliberately excluded). The project targets 5–10 letter word lengths, four game modes, and a freemium monetization model with $1.99 Pro IAP.

Wordle's success defined a tight core loop — guess, get feedback, refine, repeat. Clones that survive (e.g., Quordle, Framed, Heardle, Worldle) layer a twist on that loop. This project's differentiators are **multi-length support** (5–10 letters), **Endless mode**, and **Hard Mode as a universal toggle** rather than a separate game type.

---

## Feature Categorization

### 🟢 Table Stakes (Must Have)

Features users expect from any word-guessing game. Missing these will cause negative reviews and abandonment.

| # | Feature | Why Expected | Complexity | Implementation Notes |
|---|---------|--------------|------------|---------------------|
| TS-1 | **Color-coded tile feedback** (correct/mint, present/yellow, absent/slate) | Core mechanic — identical to Wordle. Feedback is the game. | Medium | Per-word: check exact positions first (green), then remaining letters for presence (yellow), rest gray. Must handle duplicate letters correctly (Wordle's rules — yellow counts decrement per occurrence). |
| TS-2 | **On-screen QWERTY keyboard** with per-key color tracking | Second screen after board — shows which letters are eliminated, present, or confirmed. | Medium | Need custom keyboard component. Keys update colors live after each guess. Must handle small screens — row layout: QWERTYUIOP / ASDFGHJKL / ZXCVBNM + backspace + enter. |
| TS-3 | **Valid word checking** — non-dictionary words rejected | Essential for fairness. Players must know only real words count. | Low | Load `dictionary.full.enriched.json` — strip to word arrays per length (5-10). Pre-load into a `Set` per word length for O(1) lookup. |
| TS-4 | **Win/loss state detection** + end-of-game screen | Game needs an ending. Show result immediately. | Low | Win = all letters green. Loss = all attempts exhausted. Show word on loss. |
| TS-5 | **Tile reveal animation** (flip/twist with delay per tile) | Iconic Wordle UX — sequential reveal builds tension. Without it, game feels flat. | Medium-High | Use `react-native-reanimated` for flip animation. Delay each tile 100-200ms. First row: reveal left-to-right or random? Standard is left-to-right. |
| TS-6 | **Keyboard update animation** (keys change color after reveal) | Visual feedback loop — board reveals, then keyboard updates. | Low-Medium | After tile reveal completes, animate keyboard key backgrounds. `react-native-reanimated` with `withTiming`. |
| TS-7 | **Letter count indicator** (5/6/7/8/9/10 tiles per row) | Core board structure. Must be obvious how many letters. | Low | Dynamic grid rendering based on selected `wordLength`. |
| TS-8 | **Attempt counter** (letterCount + 1 attempts visible) | Players need to know how many guesses remain. | Low | Show remaining guesses as row count. Gray out remaining rows. |
| TS-9 | **Daily Challenge mode** — same word for all players, deterministic from date+seed | This is the flagship mode per PROJECT.md. The "if nothing else ships" requirement. | Medium | Seeded RNG from UTC date + app seed. Word index = seeded value % wordList[length].length. Must handle timezone boundary (UTC midnight). |
| TS-10 | **Stats tracking** (games played, win %, current streak, max streak, guess distribution) | Expected persistence. Players track their performance. | Medium | AsyncStorage for local cache. Sync to cloud when authenticated. Guess distribution = bar chart of win-by-attempt count. |
| TS-11 | **Share results** as text grid (🟩🟨⬛ emoji squares) | Viral loop — Wordle's primary growth mechanism. | Low | Generate text from guess results. Include mode, attempts, date. Copy to clipboard or open share sheet. |
| TS-12 | **Sound effects** (key press, tile reveal, win/lose jingle) | Expected in mobile games. Adds polish. | Low-Medium | `react-native-sound` or `expo-av`. Short SFX. Keep optional/mutable. Volume setting. |
| TS-13 | **On-screen keyboard Enter/Backspace keys** | Required for word submission and correction. | Low | Enter submits guess (only if valid word). Backspace removes last letter. Must handle empty row gracefully. |
| TS-14 | **State persistence** — game saves on suspend/resume | Mobile users multitask. Losing progress = frustration. | Low-Medium | Save current board state, active row, timer, mode to AsyncStorage on every guess or app state change. Restore on resume. |
| TS-15 | **Loading screen / asset init** while dictionary loads | Large dictionary (15K+ words) needs parse time. | Low | Show branded splash while loading Set from JSON. Progress bar or animation. |

---

### 🔵 Differentiators (Competitive Advantage)

Features not found in standard Wordle that set this project apart. Prioritize after table stakes.

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| DF-1 | **Free Play mode** — player picks word length (5-10) | Unique flexibility. Standard Wordle is locked at 5. Catches casual players who want variety. | Medium | Mode selection screen with length picker. Random word from chosen length's dictionary. Unlimited plays. No streak tracking (or separate free-play streak?). |
| DF-2 | **Random mode** — auto-assigned letter count | Discovery — player may try lengths they wouldn't normally pick. | Low | Random pick from 5-10 lengths each game. Could show "5 letters" or surprise them. Great for variety. |
| DF-3 | **Endless mode** — consecutive words with streak tracking | Replayability. Standard Wordle is one-and-done. Endless mode keeps players engaged longer. | Medium | After win/loss, immediately start new game. Track consecutive correct streak. Separate leaderboard for this. |
| DF-4 | **Hard Mode toggle** — must reuse confirmed green/yellow tiles | Skill escalator. Not a separate mode but a per-game toggle that works with any mode. | Medium | Validate each guess: all green tiles must be same position, all yellow tiles must appear somewhere. Prevent invalid guesses at input time (disable non-compliant keys or show warning). |
| DF-5 | **Multi-length dictionary** (5 through 10 letters) | Core differentiator. Very few word games offer this range. | Low (data exists) | Dictionary already has words 3-10. Use 5-10 only. Word counts: 2540 (5), 2588 (6), 2439 (7), 2105 (8), 1602 (9), 1045 (10) = ~12,319 total. |
| DF-6 | **Daily Challenge leaderboard** (best streak) | Community competition. Drives daily return visits. | High | Requires Google Play Sign-In. Daily reset of streak tracking. Show top N players. Handle ties. |
| DF-7 | **Endless leaderboard** (total consecutive correct) | Competitive endless play. Bragging rights. | High | Total correct words in endless mode (not necessarily consecutive? Two leaderboards per spec: consecutive, total ever). |
| DF-8 | **Cloud-synced stats** via Google Play Sign-In | Cross-device continuity. Player retention. | Medium-High | Google Sign-In -> Play Games Services or custom backend. AsyncStorage as local cache, sync on auth. |
| DF-9 | **Rewarded video for +1 extra guess** (max 2 per game) | Monetization twist. Gives players a second chance. | Medium | Track extra guesses used (max 2). Disable rewarded button after limit. Ads must finish before guess is awarded. |
| DF-10 | **Pro version IAP** ($1.99 one-time, removes all ads) | Clean revenue model. No subscription fatigue. | Medium | `react-native-iap`. Google Play Billing. Restore purchases flow. Feature flag: ads_enabled = !proPurchased. |
| DF-11 | **Pastel soft aesthetic** (mint green, sunny yellow, muted slate) | Differentiates visually from bold/primary-colored clones. Brand identity. | Low | Define color palette in constants. Consistent across tiles, keyboard, UI. Rounded corners on tiles. |
| DF-12 | **Cell phone vibration/haptic feedback** on key press and tile reveal | Polished tactile feel. Premium mobile experience. | Low | `react-native` `Vibration` API. Short pulses on key press, longer on submit. Configurable. |

---

### 🔴 Anti-Features (Deliberately NOT to Build)

Features that seem obvious but actually hurt the product. Consciously excluded.

| # | Anti-Feature | Why Avoid | What to Do Instead |
|---|--------------|-----------|-------------------|
| AF-1 | **Hint system** (reveal a letter, show definition, etc.) | Breaks the core puzzle loop. Wordle-style games are pure deduction. Hints remove the satisfaction. | The game IS the hint. If stuck, guess strategically (letter frequency). |
| AF-2 | **Definition/synonym display during game** | Dictionary already has definitions but showing them mid-game trivializes the puzzle. | Show definition only after guess is complete (on result screen) as a "learn something new" bonus. |
| AF-3 | **Unlimited ads** (interstitial after every action) | Kills UX. Players bounce. Negative reviews mention ad frequency as top complaint. | One interstitial per completed game (free tier). Rewarded video is opt-in for extra guess. Pro removes all. |
| AF-4 | **Login wall** (must sign in to play) | Friction kills first-time conversion. Let players play immediately. | Play without account. Cloud sync is optional. Prompt sign-in gently after a few games. |
| AF-5 | **Push notification spam** ("Come back!" "Your streak!") | High opt-out rate. Negative app store reviews. | Only essential notifications (daily challenge available). Respect system notification settings. |
| AF-6 | **Friend challenges / social feed** | Scope creep. Requires friend graph, invites, deep linking. Maintenance cost for solo dev. | Leaderboards provide enough social comparison without the complexity. |
| AF-7 | **Real-time multiplayer / PvP** | Complex networking, sync, fairness. Out of scope per spec. Completely different game. | Solo puzzle experience with asynchronous leaderboards. |
| AF-8 | **Word suggestion / autocomplete on keyboard** | Part of the challenge is remembering possible words. Suggestion defeats the puzzle. | Let players type freely. Valid word check is enough guardrail. |
| AF-9 | **Alternative languages** | Dictionary is English-only. Translation would require full new dictionary for each language. | English only for initial release. Future milestone if demand is clear. |
| AF-10 | **Login rewards / daily bonus coins** | Gamification that doesn't fit the genre. Wordle players appreciate minimalism. | The game IS the reward. Streak tracking provides natural retention. |
| AF-11 | **Timer / speed mode** | Rushed word solving is anti-thetical to the thoughtful deduction loop. | Casual unlimited time. Let players think. |

---

## Feature Dependencies

### Required Ordering

```
Daily Challenge (TS-9)
  └── Valid word checking (TS-3) — must have dictionary loaded
  └── Tile feedback (TS-1) — core mechanic
  └── Win/loss detection (TS-4)
  └── State persistence (TS-14) — daily game must not reset

Free Play (DF-1)  
  └── Letter count indicator (TS-7) — dynamic grid
  └── Valid word checking (TS-3) — per-length dictionary

Hard Mode (DF-4)
  └── Tile feedback (TS-1) — must know which tiles are green/yellow
  └── Word validation (TS-3) — must check tile reuse compliance
  └── On-screen keyboard (TS-2) — need to disable non-compliant keys

Animations (TS-5)
  └── react-native-reanimated setup (external dependency)

Cloud Sync (DF-8)
  └── Stats tracking (TS-10) — local stats must exist first
  └── Google Play Sign-In (platform dependency)

Leaderboards (DF-6, DF-7)
  └── Cloud Sync (DF-8) — auth required
  └── Stats tracking (TS-10) — stats to compare

IAP Pro (DF-10)
  └── react-native-iap setup
  └── Ad integration (TS — interstitial + rewarded ads)

Rewarded ads (DF-9)
  └── Attempt counter (TS-8) — max 2 extra guesses enforced
```

### Recommended Build Order

```
Phase 1 (Core Gameplay): 
  TS-3 (dictionary) → TS-1 (tile feedback) → TS-2 (keyboard) → TS-4 (win/loss) 
  → TS-9 (Daily mode) → TS-13 (enter/backspace)

Phase 2 (Polished UX): 
  TS-5 (animations) → TS-6 (keyboard animation) → TS-7 (letter count) 
  → TS-8 (attempts) → TS-12 (sounds) → TS-15 (loading screen)

Phase 3 (Modes Expansion): 
  DF-1 (Free Play) → DF-2 (Random) → DF-3 (Endless) → DF-4 (Hard Mode)

Phase 4 (Persistence): 
  TS-10 (local stats) → TS-14 (state persistence) → TS-11 (share) 
  → DF-8 (cloud sync) → DF-6/DF-7 (leaderboards)

Phase 5 (Monetization): 
  DF-9 (rewarded ads) → DF-10 (IAP Pro) → Interstitial ads
```

---

## Feature Complexity Breakdown

| Complexity | Count | Features |
|------------|-------|----------|
| **Low** | 12 | TS-3, TS-4, TS-7, TS-8, TS-11, TS-12, TS-13, TS-15, DF-2, DF-5, DF-11, DF-12 |
| **Medium** | 11 | TS-1, TS-2, TS-6, TS-9, TS-10, TS-14, DF-1, DF-3, DF-4, DF-9, DF-10 |
| **Medium-High** | 2 | TS-5 (animations), DF-8 (cloud sync) |
| **High** | 2 | DF-6, DF-7 (leaderboards) |

**Total table stakes (must-have before launch):** 15 features
**Total differentiators (nice-to-have for launch):** 12 features
**Minimum viable launch:** TS-1 through TS-15 + DF-1 (Free Play) = 16 features

---

## Accessibility Features

| Feature | Type | Why | Implementation |
|---------|------|-----|----------------|
| **Color blindness support** — patterns or icons in addition to color | Table stakes for accessibility | ~8% of players have color vision deficiency. Green/yellow indistinguishable for red-green colorblind. | Add texture patterns (dots for green, stripes for yellow, solid for gray) or icons (✓ for correct, ~ for present, ✕ for absent). |
| **Screen reader support** (TalkBack on Android) | Table stakes for accessibility | Visually impaired players need spoken feedback. | Proper `accessible` props on tiles. Announce guess result: "Position 1: A correct", "Position 2: B not in word". |
| **Font size scaling** | Table stakes for accessibility | Older players may need larger text. | Use `react-native` `PixelRatio` or `Dimensions` for responsive sizing. Test on small/old screens. |
| **Reduce motion setting** | Differentiator for accessibility | Players with vestibular disorders need non-animated interaction. | Detect `AccessibilityInfo.isReduceMotionEnabled()`. Skip tile flip animations, show instant results. |

---

## Competitive Feature Comparison

| Feature | NYT Wordle | Wordscapes | Quordle | **This Project** |
|---------|------------|------------|---------|------------------|
| Word length | 5 only | Variable | 5 only (x4) | **5-10 selectable** |
| Modes | Daily only | Levels | Daily + Practice | **Free/Random/Daily/Endless** |
| Hard Mode | Separate mode | None | Separate | **Universal toggle** |
| Ads | None (NYT sub) | Yes | Yes | **Yes (interstitial + rewarded)** |
| IAP | NYT sub ($) | Premium | $2.99 | **$1.99 Pro (ad removal)** |
| Stats | Win %, streak, dist | Basic | Win %, streak, dist | **Win %, streak, dist + cloud sync** |
| Leaderboards | No | No | No | **Yes (Daily + Endless)** |
| Cloud Sync | Account-based | Device only | Device only | **Google Play Sign-In** |
| Endless mode | No | No | No | **Yes (streak tracking)** |
| Share results | Yes (text grid) | Screenshots | Yes (text grid) | **Yes (text grid)** |
| Colorblind mode | Yes | No | No | **Planned (patterns/icons)** |
| Haptic feedback | No | No | No | **Yes (vibration)** |
| Sounds | No | Yes | No | **Yes (SFX)** |
| Extra guesses via ads | No | No | No | **Yes (rewarded video, max 2)** |

---

## Edge Cases and State Handling

### Game State Machine

```
IDLE → PLAYING → WIN / LOSS → RESULTS → (DAILY: locked, FREEPLAY/ENDLESS: replay)
               → SUSPENDED → resume → PLAYING
               → ABANDONED (no action for >24h in daily mode → auto-loss)
```

### Edge Cases to Handle

| Edge Case | Handling |
|-----------|----------|
| **Duplicate letters in guess** | Standard Wordle rules: count available green placements first, then yellow. If a letter appears 3 times in guess but only 1 in answer, only 1 shows yellow/green. |
| **Empty submission** | Disable Enter button when row is empty. Or show "Type a word" toast. |
| **Invalid word submission** | Shake animation on row. Show "Not in word list" toast. Don't consume an attempt. |
| **Daily mode: replay on same day** | Gray out board, show result. "Come back tomorrow!" |
| **Daily mode: midnight boundary mid-game** | A player in a game at UTC midnight — current game is auto-loss? Or let them finish? Standard approach: current game finishes, next day's game loads after. |
| **0 attempts remaining + no ads left** | Show loss state. Gray out keyboard. |
| **Ad fails to load (no network)** | Don't consume rewarded ad attempt. Show "Ad not available" toast. Retry button. |
| **Google Sign-In fails** | Continue with local stats only. Queue sync for next auth attempt. |
| **IAP restore finds no purchase** | Show "No previous purchase found." dialog. Offer current purchase. |
| **Very long word (10 letters) on small screen** | Scale tile size dynamically. Minimum tile width constraint. Scroll horizontal if needed. |
| **Keyboard typing while tile animation is playing** | Queue input or disable keyboard until animation completes. Prevents race conditions. |
| **Hard Mode: forced green/yellow tile reuse** | If user tries to submit without reusing a known green tile, show warning. If green tile is moved, block submission. Gray out non-compliant keys. |
| **Hard Mode + duplicate letters** | If answer is "HELLO" and player has L in position 3 (green) and guesses L again somewhere else, standard Wordle Hard Mode rules apply. |

---

## Monetization Feature Details

### Ad Placement Strategy

| Ad Type | Trigger | Frequency Cap | Notes |
|---------|---------|---------------|-------|
| Interstitial | After game completes (win or loss), before result screen | 1 per game completion | No ads in Pro version. No ads during gameplay. |
| Rewarded video | Player taps "Get +1 Guess" button on attempt screen | Max 2 per game | Button appears when down to last 2 attempts. Disabled after 2 uses. |

### IAP Details

| Property | Value |
|----------|-------|
| Product ID | `com.wordguess.pro` (single SKU) |
| Price | $1.99 USD (localized per region by Play Store) |
| What it removes | All interstitial ads. Rewarded ads remain available? (Decision needed — probably yes, keep rewarded as optional helper). |
| Restore flow | Settings screen > "Restore Purchases" button > verify with Play Store > re-enable pro features. |

### Ad Revenue Projections (Estimate)

| Metric | Estimate |
|--------|----------|
| Daily active users (launch target) | 100-500 |
| Interstitials per user per day | 2-3 (assuming 2-3 games) |
| Estimated eCPM (US) | $5-15 |
| Daily revenue (100 users) | $1-4.50/day |
| Pro IAP conversion rate | 2-5% of active users |
| Monthly IAP revenue (500 users) | $20-50/month |

---

## Performance Considerations

| Concern | Mitigation |
|---------|------------|
| **Dictionary load time** (~12K words) | Load asynchronously on splash screen. Parse JSON once, store in global `Set` per length. Avoid `flatList` of words — use Set for O(1) lookup. |
| **Animation frame rate** | Use `react-native-reanimated` worklets (UI thread) not JS thread for tile flips. Test on mid-range Android devices. |
| **Memory — board state** | Store as simple arrays (max 11 rows × 10 cols = 110 cells). Trivial. Keep in Redux/Zustand context, not re-rendering entire board on each keypress. |
| **AsyncStorage writes** | Debounce state persistence. Write only on guess submit and app state change, not on every keypress. |
| **Ads loading delay** | Pre-load interstitial after game starts (not after it ends). Rewarded: pre-load on app launch. |

---

## Sources

- [ASSUMED] NYT Wordle mechanics (tile feedback, hard mode, share format) — based on extensive gameplay knowledge
- [ASSUMED] Quordle/Wordscapes feature comparison — based on app store analysis and gameplay
- [ASSUMED] `react-native-reanimated` v3 API for flip animations — v4.5.1 latest, `withTiming`/`withSequence` for cascading reveals
- [ASSUMED] `react-native-google-mobile-ads` v16.4.0 — current standard for Android monetization in RN
- [ASSUMED] `react-native-iap` v15.3.6 — IAP implementation guide
- [ASSUMED] `@react-native-google-signin/google-signin` v16.1.2 — Play Games auth
- [ASSUMED] Color blindness statistics: ~8% of male players, ~0.5% female (source: NIH/NEI)
- [VERIFIED] Dictionary word counts per length — confirmed from project's `dictionary.full.enriched.json`