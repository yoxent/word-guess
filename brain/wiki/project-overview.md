# word-guess: Project Overview
updated: 2026-07-04
tags: [project, mvp]
related: [tech-stack, game-modes, architecture, phase-structure]

## What
React Native (Expo) word-guessing game for Android (Play Store). Wordle-style with 5-10 letter words.

## Core Value
Daily challenge must work consistently — same word for all players, correct tile feedback. Everything else is secondary.

## Platform
- Android only (Play Store), solo dev
- Expo SDK 57 managed + dev client
- Developer: Flutter/Unity/C# background, new to RN

## Monetization
- Free-to-play with interstitial ads after each game
- Rewarded video: +1 extra guess (max 2/game)
- Pro IAP $1.99 removes all ads (non-consumable, restore supported)

## Game modes
1. Free Play — pick letter count 5-10
2. Random — auto-assigned letter count
3. Daily Challenge — same word for all, UTC date + seed
4. Endless — consecutive words, streak tracking
- Hard Mode: universal toggle (NYT rules, applies to any mode)

## Social
- Google Play Sign-In (optional)
- Cloud-synced stats (Firebase Firestore)
- 3 leaderboards: daily streak, endless streak, endless total words

## Delivery
- 6 phases, sequential, MVP mode (vertical slices)
- Phase 1: Foundation → Phase 6: Play Store submission
