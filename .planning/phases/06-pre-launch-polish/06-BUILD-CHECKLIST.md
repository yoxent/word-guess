# Pre-Submission Build Checklist

**Phase:** 06 — Pre-Launch & Polish
**Created:** 2026-07-09
**Status:** Pre-submission — items below must be completed before Google Play Store upload.

This document is the final sign-off checklist for LAUNCH-08 (production AAB build) and LAUNCH-09 (offline-first verification). It is **not** automated — every item must be completed manually before the build is uploaded to the Play Console.

---

## 1. EAS Build Configuration Verification

### Current `eas.json` state

```json
{
  "cli": { "version": ">= 3.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "android": { "buildType": "apk" } },
    "production":  {}
  },
  "submit": { "production": {} }
}
```

### Verification

- [x] `production` profile present in `eas.json` (empty `{}` — EAS Build will default to `app-bundle` for Android, which is the correct production output format).
- [x] `submit.production` profile present (used by `eas submit --platform android`).
- [x] `cli.version` pinned to `>= 3.0.0` (current EAS CLI).

### Optional improvement (not required)

For explicitness, the `production` profile can be made explicit:

```json
"production": {
  "android": {
    "buildType": "app-bundle"
  }
}
```

> **Note:** The `gradleCommand` field referenced in some templates is **not** a real EAS Build profile field. EAS does not accept it. Do not add it.

---

## 2. `app.json` Production Values

### Required fields and current state

| Field | Current | Production-ready? |
|-------|---------|-------------------|
| `expo.name` | `"Word Guess"` | ✅ Yes |
| `expo.slug` | `"word-guess"` | ✅ Yes |
| `expo.version` | `"1.0.0"` | ✅ Yes (semver) |
| `expo.android.package` | `"com.vorithstudio.wordguess"` | ✅ Yes (Play Store package) |
| `expo.android.googleServicesFile` | `"./google-services.json"` | ✅ Yes (must exist at root) |
| `expo.android.adaptiveIcon` | `./assets/adaptive-icon.png` + bg `#f5f5f0` | ✅ Yes (asset present) |
| `expo.android.versionCode` | **MISSING** | ⚠️ See below |
| `expo.android.permissions` | not set | ⚠️ See below |

### Items to address before build

- [ ] **Add `expo.android.versionCode: 1`** — Play Store requires an integer that increments with every release. The first production upload starts at `1` (or higher if uploading an update over a previous internal/closed track version).
- [ ] **Add `expo.android.permissions: []`** — explicit (even if empty) — to silence EAS Build warnings about missing `RECORD_AUDIO`, `ACCESS_*`, etc. Only declare permissions that the app actually uses. AdMob does not need additional Android permissions beyond what is already pulled in by `play-services-ads`.

### Items to swap before production

- [ ] **Replace AdMob `androidAppId` test value** in `app.json` `plugins` section:
  - Current: `"androidAppId": "ca-app-pub-3940256099942544~3347511713"` (Google's published test ID)
  - Replace with: real AdMob app ID for the Play Store listing, e.g., `"ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"`.
  - **Real AdMob app IDs** are issued via the AdMob console (https://admob.google.com) after registering the Play Store package name. They look like `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`.
  - Test IDs only show "Test Ad" labels and must not ship to production.
- [ ] **Real Firebase Remote Config values** — confirm `fetchAdUnitIds()` resolves to production ad unit IDs at runtime. Test the release build with `RemoteConfig` set to the production ad unit slots before submitting to Play Console.
- [ ] **Replace placeholder sound assets** in `assets/sounds/` (`keypress.wav`, `reveal.wav`, `win.wav`, `loss.wav`) with the final user-provided `.wav` files. Placeholder/empty files will cause `expo-av` to log warnings on first play.

---

## 3. Branding and Assets

- [ ] **App icon (`assets/icon.png`)** — replace the 1×1 placeholder with the real branded icon. Minimum 512×512, PNG, no transparency.
- [ ] **Splash screen (`assets/splash.png`)** — replace the 1×1 placeholder with the real branded splash. Recommended 1242×2436 (iPhone X resolution; works for all Android aspect ratios).
- [ ] **Adaptive icon (`assets/adaptive-icon.png`)** — replace placeholder; verify against the background color `#f5f5f0`.
- [ ] **Feature graphic (Play Console asset)** — 1024×500 PNG uploaded separately to Play Console. Not in the bundle.
- [ ] **Phone screenshots** — minimum 2 per device type (phone, 7-inch tablet if supported). Required by Play Console before publishing.

---

## 4. Play Console Setup

- [ ] **App created** in Google Play Console with the package name `com.vorithstudio.wordguess`.
- [ ] **Default language** set (English recommended for v1).
- [ ] **App category** selected (Games → Word).
- [ ] **Ads declared** — Play Console → App content → Ads. Set "Contains ads" to **Yes** (the free tier shows banner + interstitial ads).
- [ ] **In-app purchases declared** — Play Console → App content → In-app products. Add the `pro_upgrade` product ID matching the one configured in `react-native-iap` / IAP catalog. Set price tier for $1.99 USD equivalent.
- [ ] **Content rating completed** — fill out the IARC questionnaire. Expected rating: **Everyone** (no violence, no user-generated content displayed, no mature themes).
- [ ] **Privacy policy URL** set in Play Console → App content → Privacy policy. Use the published GitHub Pages URL (see step 5).
- [ ] **Data safety form completed** — declare: account info (email, name) only if signed in, app activity (gameplay stats), device IDs (AdMob). Reference the privacy policy.
- [ ] **Target audience** — select **13 and older** (not targeting children; see Privacy Policy §4).
- [ ] **Government apps declaration** — **No** (not a government app).
- [ ] **News apps declaration** — **No** (not a news app).

---

## 5. Privacy Policy Hosting (GitHub Pages)

- [ ] **Repository: `docs/privacy.md`** committed (this build). File covers AdMob data collection, Google Sign-In data, Firebase Firestore storage, children's privacy, contact email, and last-updated date.
- [ ] **Enable GitHub Pages** on the repository:
  - Repo → Settings → Pages → Source: `Deploy from a branch` → Branch: `main` (or `master`) → Folder: `/docs` → Save.
- [ ] **Verify URL reachable**: `https://<github-username>.github.io/<repo-name>/privacy` returns the rendered Markdown page. Allow 1–2 minutes after enabling for first deployment.
- [ ] **Copy the URL** into Play Console → App content → Privacy policy.

### Alternative hosting

If GitHub Pages is not desired, the `docs/privacy.md` file can be served from any static host (Netlify, Vercel, GitLab Pages, plain web server). The file is self-contained Markdown — no build step required.

---

## 6. Build Pipeline (EAS)

### 6.1 Pre-build smoke test

- [ ] **Run `npx expo install --check`** — verify all native module SDK versions are aligned with Expo SDK 57.
- [ ] **Run `npx tsc --noEmit --strict`** — confirm zero TypeScript errors.
- [ ] **Run `npx jest --bail --passWithNoTests`** — confirm no failing tests (project has no test suite — `passWithNoTests` should exit 0).
- [ ] **Run `npx expo prebuild --clean`** — regenerate the `android/` directory and verify Gradle still compiles.
- [ ] **Run a debug Android build locally** — `npx expo run:android --variant release` (or build with Gradle directly: `cd android && ./gradlew :app:assembleRelease`). Install on a real device and verify the full game loop.

### 6.2 Production AAB

```bash
# Build the production Android App Bundle
npx eas build --platform android --profile production
```

- [ ] Build completes without errors. Expect ~10–15 min.
- [ ] Download the `.aab` artifact from the EAS dashboard.
- [ ] Verify the bundle size is reasonable (target: < 30 MB).

### 6.3 Internal testing track

- [ ] **Upload the AAB to Google Play Console → Internal testing**.
- [ ] Add internal testers by email (up to 100).
- [ ] Testers install via the Play Store internal-testing opt-in link.
- [ ] **Smoke test on internal track**:
  - [ ] Fresh install (no cached state) — daily word appears, daily challenge is playable.
  - [ ] Sign in with Google — leaderboard, sync work.
  - [ ] Purchase Pro upgrade — banner + interstitial ads are removed.
  - [ ] Restore purchase on a fresh install — Pro status re-applied.
  - [ ] All 4 game modes playable: Free, Random, Daily, Endless.

### 6.4 Closed testing track

- [ ] **Promote the same AAB to Closed testing** (or rebuild if changes were made during internal).
- [ ] **Recruit 20+ testers** — required by Play Console before promoting to production.
- [ ] **Run the closed track for 14+ days** — Play Store's policy for new developer accounts or accounts without a production track history.
- [ ] Monitor Crashlytics / Logcat for crashes during the closed track. Address any P0/P1 issues before promoting to production.

### 6.5 Production release

- [ ] **Promote the AAB to Production** in Play Console.
- [ ] **Run `eas submit --platform android`** (optional — Play Console UI also accepts manual upload).
- [ ] **Verify rollout settings**:
  - [ ] Start with 5% staged rollout (recommended for first production release).
  - [ ] Monitor for 24h, then increase to 20%, 50%, 100% over the following days.
- [ ] **Verify the listing is live** — search for the app on Play Store, confirm:
  - [ ] Title, description, screenshots render correctly.
  - [ ] Icon, feature graphic render.
  - [ ] Privacy policy link is reachable from the listing.

---

## 7. Offline-First Verification (LAUNCH-09)

The app is designed to work fully offline. The following test must be run on a **real Android device** in airplane mode.

### 7.1 Pre-test setup

- [ ] Fresh install of the production AAB (or release-mode debug build).
- [ ] Sign out of any Google account on the device.
- [ ] Sign out of the app (Settings → Account → Sign out) before going offline.
- [ ] Uninstall and reinstall to ensure no cached auth state (optional but recommended for a clean test).

### 7.2 Test procedure

1. **Enable airplane mode** on the device.
2. **Launch the app fresh** (cold start, not from recent apps).
3. **Daily Challenge**:
   - [ ] Tap "Daily" mode → pick a word length → game loads.
   - [ ] Verify: a daily word was generated (not a network error, not a "Loading…" stuck state).
   - [ ] Type at least 3 guesses — verify tile feedback (green/yellow/gray) appears.
   - [ ] Win or lose the game — verify the ResultModal appears with confetti (win) or loss message.
4. **Stats persistence**:
   - [ ] Navigate to Stats screen — verify the just-completed game is recorded (incremented Total Games, updated Win %).
   - [ ] Force-quit the app (swipe from recents).
   - [ ] Reopen the app — verify stats are still there (SQLite persistence).
5. **Ads graceful skip**:
   - [ ] Play and lose 3 games to trigger the interstitial (every 3rd game, configurable).
   - [ ] Verify: the app does not crash, does not show a network error toast, simply does not display an ad (AdMob will silently fail with no network).
   - [ ] Game still completes normally — no interruption.
6. **Settings toggles**:
   - [ ] Open Settings — toggle Color Blind Mode ON. Replay a game, verify texture patterns appear on tiles.
   - [ ] Toggle Reduce Motion ON. Replay a game, verify tile flip and home stagger are instant (no animation).
   - [ ] Change Theme to Dark. Replay a game, verify dark palette is applied.
   - [ ] Toggle each setting back to OFF — verify state changes take effect immediately.
7. **Sound**:
   - [ ] Verify keypress sound plays (when device volume is up).
   - [ ] Verify tile reveal sound plays.
   - [ ] Verify win/loss sound plays on result.
   - [ ] Toggle Sound OFF in Settings — verify no sound plays.
8. **Disable airplane mode** — verify the app recovers gracefully (Firestore syncs queued game results, Remote Config fetches updated ad unit IDs).

### 7.3 Pass criteria

- [ ] No crashes during any of the above steps.
- [ ] No "Network error" or "Failed to fetch" user-facing toasts.
- [ ] All game modes playable end-to-end.
- [ ] Stats persist across app restarts.
- [ ] Ads skip cleanly when offline (no error, no crash).

### 7.4 If a test fails

- Do **not** promote to production.
- Capture Logcat from the failure step:
  ```bash
  adb logcat -d -v time *:E ReactNativeJS:V
  ```
- File the issue with the captured logs and the exact reproduction steps.
- Address the failure, rebuild, re-run the full offline test suite.

---

## 8. Final Sign-Off

Before clicking "Start rollout to Production" in Play Console:

- [ ] All EAS build configuration items verified.
- [ ] All `app.json` production values present and correct.
- [ ] Branding assets in place.
- [ ] Play Console listing complete (privacy policy, ads, IAP, content rating, data safety).
- [ ] Internal testing track smoke-tested.
- [ ] Closed testing track run for 14+ days with 20+ testers (or trust established via prior releases).
- [ ] Offline-first test suite passed on a real device.
- [ ] Crashlytics / monitoring alerts set up and tested.

**Approver:** _______________________  **Date:** _____________

---

*This checklist is the final gate before Play Store submission. Address every item before promoting the AAB to production.*
