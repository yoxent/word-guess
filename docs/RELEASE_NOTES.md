# Release Notes

## 1.0.1 (versionCode 10) — Production

**Build:** EAS production AAB (`e381f340-6a6b-405b-913c-796ccc64a57e`)  
**Date:** 2026-08-10  
**Track:** Production (Play Store)  
**Privacy:** https://yoxent.github.io/word-guess/privacy

### Play Console — What’s new (paste this)

```
Word Guess is live on the Play Store!

• Daily Challenge — same words for everyone each day (UTC)
• Free, Random & Endless modes (5–10 letter words)
• Hard Mode toggle for an extra challenge
• Stats, streaks & global leaderboards
• Sign in with Play Games to sync progress
• Watch ads for an extra attempt or letter hint
• Pro upgrade to remove interstitial ads
• Light/dark theme, keyboard layouts & accessibility options

1.0.1 polish: better keyboard editing, hint persistence, rewarded-ad recovery, and soft update prompts.
```

### Full changelog (testers / changelog)

#### Gameplay
- Four modes: Free Play, Random, Daily Challenge, and Endless
- Word lengths 5–10 with color-coded tile feedback
- Hard Mode as a global setting (must reuse confirmed greens/yellows)
- Resume in-progress Endless and Random games after leaving the app
- Daily sessions expire at UTC midnight so reopen starts today’s puzzle
- Mid-guess tile editing and multiple on-screen keyboard layouts (QWERTY, QWERTZ, AZERTY, A–Z)
- Rewarded ads for +1 attempt and letter hints during play
- Interstitial ads after completed games (frequency-capped; skipped for Pro)

#### Account & cloud
- Optional Google Play Games sign-in
- Cloud-synced stats and leaderboards when signed in
- Offline-first play; sync when online

#### Monetization
- One-time Pro IAP (`com.vorithstudio.wordguess.pro`) removes interstitial ads
- Restore purchases in Settings
- Production AdMob + Firebase Remote Config for ad unit IDs
- Letter hints persisted per mode with immediate save after rewarded ads
- Stuck rewarded-ad recovery

#### Polish
- Light / dark / system theme
- Sound, haptics, How to Play, accessibility options
- Soft update prompt via Remote Config `min_supported_version` (fail-open)
- Privacy policy hosted for Play Store compliance

---

## 1.0.0 (versionCode 8) — Closed / internal testing

**Build:** EAS production AAB (`3fc97890-183f-4c1c-ab66-08881f2d4a61`)  
**Date:** 2026-07-14  
**Track:** Internal / closed testing (superseded by 1.0.1 production)

First store-ready build used for Play Console testing before production approval.
