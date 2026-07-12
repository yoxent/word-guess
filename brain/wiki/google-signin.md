# Google Sign-In
updated: 2026-07-12 (debug.keystore SHA, accessToken credential, OAuth branding)
tags: [auth, firebase, google, known-pain, eas, signing]
related: [key-risks, tech-stack, phase-structure, dev-workflow, android-build-setup, cloud-sync]

## Firebase project (kept)
| Field | Value |
|-------|--------|
| Project ID | `word-guess-8fbee` |
| Display name | `word-guess` |
| Project number | `765565366850` |
| Package | `com.vorithstudio.wordguess` |

Repo points at this project via `.firebaserc` + root/`android/app` `google-services.json`. Do not create a second Firebase project for this app.

## Flow
1. User taps "Sign in with Google" → `GoogleSignin.signIn()`
2. `GoogleSignin.getTokens()` → `{ idToken, accessToken }`
3. `GoogleAuthProvider.credential(idToken, accessToken)` then `signInWithCredential`
4. Firebase Auth creates/returns user session
5. Stats sync to Firestore using playerId; leaderboard queries by playerId

Same token exchange for silent sign-in (`signInSilently` → `getTokens` → credential).

## Critical: Web client ID
Pass **Web** client ID (Firebase → Web credentials / `client_type: 3` in `google-services.json`) to `GoogleSignin.configure()`. NOT the Android client ID. #1 cause of `DEVELOPER_ERROR`.

Current Web client ID is in `src/services/authService.ts` (`WEB_CLIENT_ID`).

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
