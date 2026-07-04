# Key Risks
updated: 2026-07-04
tags: [risks, pitfalls, critical]
related: [daily-seed, google-signin, phase-structure, tech-stack]

## Critical risks (rewrite / store rejection / abandonment)

### P1: JS-thread tile animations stutter
- Cause: Using RN's Animated API (bridges JS thread per frame)
- Mitigation: Use react-native-reanimated worklets from day one. UI thread only.
- Detection: Profile with Flipper during tile reveal. JS thread >16ms frames = fail.
- Phase: 2 (Core Gameplay)

### P2: Daily seed extraction via APK decompilation
- Cause: Private seed as plain JS string. apktool + strings reveals in minutes.
- Mitigation: Split across native layers (JNI). Derive from app signing key. ProGuard.
- Detection: `apktool d app-release.apk && strings ./ | grep -i seed`
- Phase: 2 (Core Gameplay)

### P3: Play Store rejection (ad/IAP compliance)
- Cause: Missing ad declaration, privacy policy, test ads in production, IAP product ID mismatch
- Mitigation: Declare ads in Play Console. Privacy policy URL. Test ads FIRST. Match product IDs exactly.
- Phase: 4 (Monetization), 6 (Pre-Launch)

### P4: Google Sign-In DEVELOPER_ERROR
- Cause: SHA-1 fingerprint mismatch between debug/upload/Play App Signing keys
- Mitigation: Register ALL 3 fingerprints in Firebase. Use Web client ID in GoogleSignin.configure(). Test release builds on real device.
- Phase: 5 (Cloud)
- Ref: @react-native-google-signin docs — this is the #1 reported issue

### P5: Offline data corruption (race condition)
- Cause: Multiple offline games → naive last-write-wins sync corrupts aggregated stats
- Mitigation: Event-based incremental sync (append game result, not full-state overwrite). Write-ahead log. Idempotent events.
- Phase: 5 (Cloud)

## Moderate risks

### P6: Interstitial double-loading
- Singleton ad manager with ref-counted lifecycle. Never call load() if isLoaded.
- Phase: 4

### P7: Missing IAP restore flow
- Implement restore from day one. Centralized product ID constants. Local receipt storage.
- Phase: 4

### P8: Dictionary blocks JS thread at startup
- Strip enriched JSON at build time (~150KB gzipped final). Static require() at module level — synchronous, no startup delay.
- Phase: 1 (Foundation)

### P12: Metro bundler crash from dynamic require()
- Cause: Using dynamic `require()` with template literals or `@/` path aliases. Metro cannot resolve either.
- Mitigation: Always use static `require()` with relative paths for bundled assets. Pre-import all word lists at module level.
- Detection: Plan checker flags dynamic require patterns. Also: `npx react-native start` will error on load.
- Phase: 1 (Foundation)

### P13: React Navigation version discrepancy
- Cause: Training data claims 8.x exists, npm registry shows 7.17.9 as latest.
- Mitigation: Always verify versions via `npm view <pkg> version` before planning. Document verified versions.
- Detection: Plan checker cross-references RESEARCH.md version claims.
- Phase: All

### P9: Score submission before sign-in complete
- Deferred score queue with retry (3x, exponential backoff). Visible sync status.
- Phase: 5

### P10: Keyboard flicker during tile reveal
- Separate component trees. Delayed keyboard color update (after animation completes).
- Phase: 2

### P11: Android back button during animation/ad/IAP
- BackHandler listener per screen. Block during critical states. Graceful skip on back.
- Phase: 1 (Foundation) + Phase 4 (Monetization)
