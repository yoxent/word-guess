# word-guess

## What This Is

A React Native word-guessing puzzle game for Android, inspired by NYT Wordle. Players guess words from 5 to 10 letters with color-coded feedback on each attempt. Supports Free Play (pick your length), Random mode, Daily Challenge (same word for everyone, deterministic from date + seed), and Endless mode — all with persistent stats, cloud leaderboards, and optional Hard Mode that forces reuse of confirmed tiles.

## Core Value

The daily puzzle must work consistently — every player gets the same word on the same day, and guesses resolve with correct tile feedback. If nothing else ships, the daily challenge is reliable and fun.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Core Gameplay:**
- [ ] Word dictionary loaded from existing `dictionary.full.enriched.json`, cleaned to 5-10 letter words only
- [ ] Game board with `letterCount + 1` rows; guess feedback: mint green (correct), sunny yellow (present), muted slate (absent)
- [ ] Free Play mode — player picks 5-10 letters before starting
- [ ] Random mode — auto-assigned letter count each game
- [ ] Daily Challenge — same word for all players, deterministic from UTC date + private app seed
- [ ] Endless mode — consecutive words with streak tracking
- [ ] Hard Mode toggle — must reuse confirmed green/yellow tiles in subsequent guesses
- [ ] On-screen QWERTY keyboard with per-key color feedback matching tile colors
- [ ] Animations for tile reveals, keyboard updates, and win/loss states

**Monetization:**
- [ ] Interstitial ads after each completed game (free tier)
- [ ] Rewarded video ad for +1 extra guess, max 2 per game
- [ ] Pro version IAP ($1.99 USD) — removes all ads for life
- [ ] Restore purchases flow

**Accounts & Cloud:**
- [ ] Google Play Sign-In
- [ ] Cloud-synced stats: win %, guess distribution, current/max streak
- [ ] Local stats cached and synced when online

**Leaderboards:**
- [ ] Daily Challenge leaderboard (best streak)
- [ ] Endless leaderboard (total consecutive correct)
- [ ] Endless leaderboard (total words guessed ever) — separate listing

**UI/UX:**
- [ ] Soft playful pastel background
- [ ] Mint green correct tiles, sunny yellow present tiles, muted slate absent tiles
- [ ] Soft rounded high-contrast primary colors for keycaps and UI elements
- [ ] Smooth, responsive mobile experience (touch, swipe, accessibility)

**Distribution:**
- [ ] Android APK/AAB build ready for Play Store publication
- [ ] Release pipeline or manual build steps documented

### Out of Scope

- iOS version — Android-only for initial release
- Multiplayer / real-time PvP — solo puzzle experience only
- Ads in Pro version — IAP removes all ads permanently
- Word suggestions or hints — pure word-guessing, no hint system
- Alternative languages — English only (based on dictionary source)
- Social feed or friend invites — leaderboards only

## Context

- **Platform:** React Native (Android, published on Google Play Store)
- **Dictionary source:** Existing `dictionary.full.enriched.json` with word definitions, synonyms, antonyms — will be stripped to a clean word list per length (5-10 letters only)
- **Inspiration:** NYT Wordle mechanics (tile feedback, keyboard coloring, daily puzzle concept)
- **Developer background:** Solo developer with experience in Unity/C# and Flutter, but new to React Native
- **Daily seed approach:** Word index derived from UTC date + private app seed → deterministic, same word for all, unpredictable without the seed
- **Existing assets:** `dictionary.full.enriched.json` is in the project root

## Constraints

- **Platform**: Android only (React Native)
- **Monetization**: Free-to-play with interstitial ads; Pro IAP at $1.99 removes ads
- **Attempts**: letterCount + 1 base, +2 max via rewarded ads
- **Dictionary**: Only 5-10 letter English words from existing source
- **Daily reset**: UTC time boundary for daily challenge
- **Leaderboard auth**: Requires Google Play Sign-In
- **IAP restore**: Must support standard Play Store restore purchase flow

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native over Flutter | Chosen by user despite Flutter experience — RN for learning | — Pending |
| Private seed for daily puzzles | Ensures all players get same word without predictability | — Pending |
| 4 game modes (Free/Random/Daily/Endless) | Covers casual, challenge, and competitive play styles | — Pending |
| Hard Mode as toggle, not separate mode | UX simplicity — apply to any mode | — Pending |
| Cloud sync via Google Sign-In | Enables cross-device stat persistence and leaderboard auth | — Pending |
| $1.99 Pro IAP | Competitive pricing for ad-removal in word game category | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-04 after initialization*
