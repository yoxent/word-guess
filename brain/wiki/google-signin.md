# Google Sign-In
updated: 2026-07-09 (EAS-managed credentials flow + 3-SHA-1 order added)
tags: [auth, firebase, google, known-pain, eas, signing]
related: [key-risks, tech-stack, phase-structure, dev-workflow, android-build-setup]

## Flow
1. User taps "Sign in with Google" → `GoogleSignin.signIn()` → returns idToken
2. `firebase.auth().signInWithCredential(GoogleAuthProvider.credential(idToken))`
3. Firebase Auth creates/returns user session
4. Stats sync to Firestore using playerId
5. Leaderboard queries by playerId

## Critical: Web client ID
Pass **Web** client ID (from Firebase → Web credentials) to `GoogleSignin.configure()`. NOT the Android client ID. Android SDK needs Web client ID for token exchange. #1 cause of DEVELOPER_ERROR.

## SHA-1 fingerprints (register ALL 3)
| Key | Source | When |
|-----|--------|------|
| Debug | ~/.android/debug.keystore | Development builds |
| Upload | Your local .jks/.keystore | EAS builds |
| Play App Signing | Play Console → App Integrity | Production release |

All 3 must be registered in Firebase project settings.

## Prerequisites
- Firebase project linked to Play Console
- google-services.json in android/app/
- OAuth consent screen configured (External, add test emails)
- OAuth scopes: profile, email (minimal)

## Testing
- Debug builds work but release builds fail? → SHA-1 mismatch (likely Play App Signing key missing)
- `adb logcat | grep -i "google\|signin\|auth"` during sign-in
- Code 10 = configuration, Code 7 = network, Code 12500 = Play Services
- Test on physical device with RELEASE build, not debug

## Silent sign-in on app startup
- Attempt `GoogleSignin.signInSilently()` on launch
- If user previously signed in, session restores transparently
- If fails (no prior sign-in), show "Sign in" button in Settings/Leaderboard
- Never block gameplay on auth

## EAS-managed credentials (production build signing)

For Play Store submission, EAS Build can manage the Android keystore automatically. Flow:

```bash
# 1. Install EAS CLI and log in
npm install -g eas-cli
eas login  # or: npx eas-cli login

# 2. Generate managed keystore for production profile
eas credentials --platform android
# → Select "production" profile
# → "Generate a new keystore" (EAS stores it in your Expo account)
# → Provide a name label (e.g. "wordguess-production")

# 3. After first build, retrieve SHA-1
eas credentials --platform android
# → View credentials → Android Keystore → SHA-1 fingerprint

# 4. Build production AAB
eas build --platform android --profile production
# Build takes 15-30 min (cloud)
```

The keystore is stored in your Expo account. Reuse for all future builds. Re-generating creates a new keystore (and new SHA-1).

### Get SHA-1 from EAS-managed keystore (PowerShell)
```powershell
# After EAS-managed keystore exists, list credentials
eas credentials --platform android --non-interactive
# Or via Expo dashboard: expo.dev → Project → Credentials
```

### Register all 3 SHA-1s in Firebase (required order)
1. **Debug** (dev builds): extract from `~/.android/debug.keystore` via `keytool -list -v -keystore ...`
2. **Upload** (EAS builds): get from `eas credentials` output above
3. **Play App Signing** (Play Store release): from Play Console → App integrity → App signing key certificate, after first upload

Each SHA-1 must be in Firebase Console → Project settings → General → Your apps → Android → Add fingerprint. Download updated `google-services.json` to project root.

## SHA-1 troubleshooting
- **Code 10 (DEVELOPER_ERROR)**: SHA-1 mismatch — the keystore that signed the build doesn't match what's in Firebase
- Debug works but release fails: missing Play App Signing SHA-1 in Firebase
- Build works, Play Store fails: missing Play App Signing SHA-1
- All 3 SHA-1s in Firebase: 3 entries under "SHA certificate fingerprints"
