# Google Sign-In
updated: 2026-07-04
tags: [auth, firebase, google, known-pain]
related: [key-risks, tech-stack, phase-structure]

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
