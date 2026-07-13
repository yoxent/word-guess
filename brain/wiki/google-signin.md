# Google Sign-In
updated: 2026-07-13 (Play Games primary path; Google kept as fallback until verified)
tags: [auth, firebase, google, play-games, known-pain, eas, signing]
related: [key-risks, tech-stack, phase-structure, dev-workflow, android-build-setup, cloud-sync]

## Firebase project (kept)
| Field | Value |
|-------|--------|
| Project ID | `word-guess-8fbee` |
| Display name | `word-guess` |
| Project number | `765565366850` |
| Package | `com.vorithstudio.wordguess` |

Repo points at this project via `.firebaserc` + root/`android/app` `google-services.json`. Do not create a second Firebase project for this app.

## Auth provider strategy (2026-07-13)

| Path | When |
|------|------|
| **Play Games → Firebase** (Android) | Primary once `PLAY_GAMES_APP_ID` is set — auto sign-in on launch, Settings button for interactive fallback |
| **Google Sign-In → Firebase** | Fallback while Play Games App ID is unset, or `EXPO_PUBLIC_AUTH_PROVIDER=google` |

Code: `src/config/auth.ts`, `src/services/authService.ts`, native module `modules/play-games-auth`.

**Do not remove Google Sign-In** until Play Games auto + Settings sign-in are verified on a Play/dev build with Games Services configured.

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

Player identity for Firestore remains **Firebase Auth UID** (`resolveFirebasePlayerId`).

## Legacy Google Sign-In flow
1. User taps "Sign in with Google" → `GoogleSignin.signIn()`
2. `GoogleSignin.getTokens()` → `{ idToken, accessToken }`
3. `GoogleAuthProvider.credential(idToken, accessToken)` then `signInWithCredential`
4. Firebase Auth creates/returns user session
5. Stats sync to Firestore using playerId; leaderboard queries by playerId

Same token exchange for silent sign-in (`signInSilently` → `getTokens` → credential).

## Critical: Web client ID
Pass **Web** client ID (Firebase → Web credentials / `client_type: 3` in `google-services.json`) to `GoogleSignin.configure()` and Play Games `requestServerSideAccess`. NOT the Android client ID. #1 cause of `DEVELOPER_ERROR`.

Current Web client ID: `src/config/auth.ts` → `FIREBASE_WEB_CLIENT_ID`.

## Critical: accessToken for Firebase Auth
RN Firebase Auth native credential path can throw:

`auth/unknown — accessToken cannot be empty`

**Fix:** always call `GoogleSignin.getTokens()` after a successful Google sign-in / silent sign-in and pass **both** tokens:

```ts
GoogleAuthProvider.credential(idToken, accessToken)
```

Passing only `idToken` is not enough on this stack (`@react-native-firebase/auth` 25.x + `@react-native-google-signin/google-signin` 16.x).

## SHA-1 fingerprints (register ALL that sign installs)
| Key | Source | When |
|-----|--------|------|
| **Expo/RN debug** | `android/app/debug.keystore` (see `android/app/build.gradle` `signingConfigs.debug`) | Local `expo run:android` / Gradle debug |
| Machine debug | `~/.android/debug.keystore` | Only if that keystore actually signs the APK |
| Upload | EAS / local upload keystore | EAS / Play upload builds |
| Play App Signing | Play Console → App Integrity | Production Play Store |

**Gotcha (2026-07-12):** Debug APK was signed with `android/app/debug.keystore` SHA-1 `5e8f1606…f625`, while Firebase only had `~/.android/debug.keystore` (`9430f852…`). Symptom: Google account picker opens then fails. Always verify the **installed APK** cert:

```powershell
adb pull (adb shell pm path com.vorithstudio.wordguess).Replace('package:','') "$env:TEMP\wg.apk"
# then: apksigner verify --print-certs "$env:TEMP\wg.apk"
```

After adding a SHA in Firebase, download/update both `google-services.json` copies (repo root + `android/app/`). OAuth client creation can take a few minutes to propagate.

## Prerequisites (console)
- Firebase Auth → Sign-in method → **Google enabled**
- Google Auth Platform → **Branding** → User support email set
- Publishing status **Production** is fine for basic `email`/`profile` scopes (no Test users list). **Testing** requires adding test-user emails
- `google-services.json` in project root and `android/app/`
- OAuth scopes: `profile`, `email` (minimal)

## Logging / diagnosis
- Prefer Metro / ReactNativeJS logs over raw `*:E` logcat — system GMS noise hides the real error
- Useful signal: `[authService] signInWithGoogle failed` with `code` / `message`
- Codes: 10 = configuration/SHA, 7 = network, 12500 = Play Services, `auth/*` = Firebase credential/provider

## Silent sign-in on app startup
- `GoogleSignin.signInSilently()` on launch (non-blocking)
- On success: `getTokens()` + Firebase credential exchange
- On failure (no prior session): show Sign in in Settings
- Never block gameplay on auth

## EAS-managed credentials (production build signing)

```bash
eas credentials --platform android   # production profile → SHA-1
eas build --platform android --profile production
```

Register debug + upload + Play App Signing SHA-1s in Firebase → Android app → Add fingerprint.

## SHA-1 troubleshooting
- **Code 10 (DEVELOPER_ERROR)**: signing cert of the installed build ≠ any Firebase fingerprint
- Debug works, release fails: missing upload / Play App Signing SHA-1
- Account picker then bounce: often SHA mismatch **or** missing `accessToken` on credential (check JS error)
