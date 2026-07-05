# Key Risks
updated: 2026-07-05
tags: [risks, pitfalls, critical]
related: [daily-seed, google-signin, phase-structure, tech-stack]

## Critical risks (rewrite / store rejection / abandonment)

### P1: JS-thread tile animations stutter (MITIGATED)
- Cause: Using RN's Animated API (bridges JS thread per frame)
- Mitigation: react-native-reanimated 4.x worklets used exclusively — Tile flip via useSharedValue/useAnimatedStyle, all on UI thread. No JS thread frames during animation.
- Status: Mitigated in Phase 2. Implementation uses interpolateColor, interpolate for rotateX, withSequence for bounce.
- Detection: Profile with Flipper during tile reveal. JS thread >16ms frames = fail.
- Phase: 2 (Core Gameplay)

### P2: Daily seed extraction via APK decompilation (ACCEPTED RISK, SIMPLIFIED)
- Cause: Private seed as plain JS string. apktool + strings reveals in minutes.
- Decision: Accepted deterministic multi-source hash (DJB2) + ProGuard/R8 minification instead of JNI. No native layer for seed — adequate for casual cheating prevention.
- Mitigation: Multi-source hash: `APP_SEED + ':' + dateStr + ':' + length` → DJB2 → index. Seed constant `wg-v1-seed-2026` obfuscated via ProGuard.
- Future: Server-side validation (Phase 5+) to verify submitted daily word.
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

### P10: Keyboard flicker during tile reveal (MITIGATED)
- Keyboard wrapped in React.memo (D-63) — prevents re-render during tile animation.
- Keyboard color update fires after setTimeout matching total animation time.
- Input queued during animation (D-66) via pendingInputs array, flushed after animation completion.
- Phase: 2

### P11: Android back button during animation/ad/IAP
- BackHandler listener per screen. Block during critical states. Graceful skip on back.
- Phase: 1 (Foundation) + Phase 4 (Monetization)
