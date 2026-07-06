# Phase 4: Monetization — Discussion Log

**Gathered:** 2026-07-06

## Questions & Decisions

### 1. Interstitial Ad Timing & Frequency
- **Asked:** How should interstitials behave (timing and frequency)?
- **User:** Flappy Bird-style — transition from results to next screen. Daily: every game. Endless + Random: every 2nd game.
- **Decision:** D-87 (Flappy Bird timing), D-88 (frequency per mode)

### 2. Rewarded Ad UX
- **Asked:** Where and when should the rewarded ad entry point be?
- **User:** Option B — button at bottom of ResultModal, loss state only. User suggested this placement themselves after considering UI/UX fit.
- **Decision:** D-89 (ResultModal loss state), D-90 (bottom of modal), D-91 (resume game after ad)

### 3. Pro IAP Product ID
- **Asked:** Is `com.wordguess.pro` correct or should it match the package name?
- **User:** Package is `com.vorithstudio.wordguess`. Confirmed product ID `com.vorithstudio.wordguess.pro`.
- **Decision:** D-95 through D-98

### 4. Restore Purchases UX
- **Asked:** Button placement and behavior, especially whether to hide when Pro is active.
- **User:** Option A (Account section). Hide when `isPro === true`. Edge case analysis confirmed: fresh install on new device shows button → restore succeeds → button hides. Safe.
- **Decision:** D-99 through D-102

### 5. Ad Manager Architecture
- **Asked:** Zustand, service singleton, or React Context?
- **User:** A (Zustand store)
- **Decision:** D-103 through D-105

### 6. Ad ID Configuration
- **Asked:** Build-time env, config file, or EAS profiles? User asked if a remote-config-like approach existed.
- **User:** Firebase Remote Config — fetch on launch, cache locally, fallback to test IDs.
- **Decision:** D-106 through D-109

### 7. Settings Config Integration
- **Asked:** Options for monetization rows in Settings (new section vs Account section, which rows).
- **User:** B (Account section), asked for options first then selected. Hidden Restore when Pro active.
- **Decision:** D-110, D-111

### 8. Extra Guesses Per Tier
- **User proposed:** 2 for free tier, 3 for Pro tier. Pro can still watch ads (ads = gameplay mechanic, not annoyance).
- **Evaluated:** No pushback — clean design. Pro removes interstitials (the annoyance), rewarded ads are gameplay choice for both tiers. Pro perk = +1 extra guess.
- **Decision:** D-92 through D-94

### 9. Price Display on Remove Ads
- **Asked:** In button text, as flavor text, or both?
- **User:** Both — can remove one later.
- **Decision:** D-112

## Deferred Ideas (noted during discussion)
- Server-side receipt validation — future if needed
- Interstitial during app open / splash — not scoped
- Ad-free temporary mode via watching N ads — future idea
- RevenueCat — confirmed anti-pick from Phase 1
