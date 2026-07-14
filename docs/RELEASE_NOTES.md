# Release Notes

## 1.0.0 (versionCode 2) — Internal testing

**Build:** EAS production AAB (`b21ae1de-204d-4e60-b7dd-7ed3ce5572a6`)  
**Date:** 2026-07-14  
**Privacy:** https://yoxent.github.io/word-guess/privacy

### Play Console — What’s new (paste this)

```
Welcome to Word Guess 1.0!

• Daily Challenge — same word for everyone each day
• Free, Random & Endless modes (5–10 letter words)
• Hard Mode toggle for an extra challenge
• Stats, streaks & global leaderboards
• Sign in with Play Games to sync progress
• Watch ads for an extra attempt or letter hint
• Pro upgrade to remove interstitial ads
• Light/dark theme & accessibility options
```

### Full changelog (testers / changelog)

#### Gameplay
- Four modes: Free Play, Random, Daily Challenge, and Endless
- Word lengths 5–10 with color-coded tile feedback
- Hard Mode as a global setting (must reuse confirmed greens/yellows)
- Resume in-progress games after leaving the app
- Rewarded ads for +1 attempt and letter hints during play
- Interstitial ads after completed games (frequency-capped; skipped for Pro)

#### Account & cloud
- Optional Google Play Games sign-in
- Cloud-synced stats and Daily/Endless leaderboards when signed in
- Offline-first play; sync when online

#### Monetization
- One-time Pro IAP (`com.vorithstudio.wordguess.pro`) removes interstitial ads
- Restore purchases in Settings
- Production AdMob + Firebase Remote Config for ad unit IDs

#### Polish
- Light / dark / system theme
- Sound, haptics, How to Play, accessibility options
- Privacy policy hosted for Play Store compliance
