# Play Games Auth
updated: 2026-07-14 (Google Sign-In removed; Play Games is the only auth path)
tags: [auth, firebase, play-games, known-pain, eas, signing]
related: [key-risks, tech-stack, phase-structure, dev-workflow, android-build-setup, cloud-sync]

## Firebase project
| Field | Value |
|-------|--------|
| Project ID | `word-guess-8fbee` |
| Display name | `word-guess` |
| Project number | `765565366850` |
| Package | `com.vorithstudio.wordguess` |

Repo points at this project via `.firebaserc` + root/`android/app` `google-services.json`. Do not create a second Firebase project for this app.

## Auth path (Android only)

**Play Games → Firebase Auth** is the only sign-in provider.

1. Play Games SDK auto-auth (silent) on cold start, or interactive `GamesSignInClient.signIn()` from Settings / Leaderboard
2. `requestServerSideAccess(webClientId)` → server auth code
3. Native `PlayGamesAuthProvider.getCredential(code)` → Firebase Auth
4. Player identity for Firestore is the **Firebase Auth UID** (`resolveFirebasePlayerId`)

Code: `src/config/auth.ts`, `src/services/authService.ts`, native module `modules/play-games-auth`.

Google Sign-In (`@react-native-google-signin`) was removed on 2026-07-14. Disable the Google provider in Firebase Console Auth if still enabled — only **Play Games** is required.

### Play Games setup checklist
1. Play Console → Grow → Play Games Services → create/link game to Firebase project `word-guess-8fbee`
2. Add **Game server** credential (Web client ID) + **Android** credential (package + SHA-1)
3. Copy numeric **Play Games App / Project ID**
4. Firebase Console → Authentication → Sign-in method → enable **Play Games** (same web client ID + secret)
5. Set env and rebuild native:
   - `PLAY_GAMES_APP_ID=<id>`
   - `EXPO_PUBLIC_PLAY_GAMES_APP_ID=<id>`
6. Or set `android/app/src/main/res/values/strings.xml` → `game_services_project_id` and uncomment `APP_ID` meta-data in `AndroidManifest.xml`
7. `npx expo run:android` — cold start should silent-auth; Settings can force interactive sign-in

## Critical: Web client ID
Pass **Web** client ID (Firebase → Web credentials / `client_type: 3` in `google-services.json`) to Play Games `requestServerSideAccess`. NOT the Android client ID.

Current Web client ID: `src/config/auth.ts` → `FIREBASE_WEB_CLIENT_ID`.

## SHA-1 fingerprints (register ALL that sign installs)
| Key | Source | When |
|-----|--------|------|
| **Expo/RN debug** | `android/app/debug.keystore` (see `android/app/build.gradle` `signingConfigs.debug`) | Local `expo run:android` / Gradle debug |
| Machine debug | `~/.android/debug.keystore` | Only if that keystore actually signs the APK |
| Upload | EAS / local upload keystore | EAS / Play upload builds |
| Play App Signing | Play Console → App Integrity | Production Play Store |

After adding a SHA in Firebase / Play Console credentials, rebuild. OAuth client creation can take a few minutes to propagate.

## Silent sign-in on app startup
- `signInSilently()` on launch (non-blocking) → Play Games non-interactive path
- On success: Firebase session + local `authStore` player
- On failure (no prior session): show Sign in in Settings
- Never block gameplay on auth

## Logging / diagnosis
- Prefer Metro / ReactNativeJS logs over raw `*:E` logcat
- Native reject codes: `E_SILENT_FAILED`, `E_NOT_AUTHENTICATED`, `E_SERVER_AUTH`, `E_FIREBASE`, `E_CONFIG`
