# Tech Stack
updated: 2026-07-08 (build fix — Kotlin metadata mismatch, google-services ignore)
tags: [stack, dependencies, versions, compat]
related: [architecture, storage-strategy, project-overview, android-build-setup, dev-workflow]

## Core
| Layer | Choice | Version | Why |
|-------|--------|---------|-----|
| Framework | Expo (managed + dev client) | SDK ~57.0.2 | Solo dev, all native modules have config plugins |
| Rendering | React Native (via Expo) | 0.86.0 | Underlying RN for SDK 57 |
| Language | TypeScript | ~6.0.3 (strict) | Strict mode from day one |
| React | react | 19.2.3 | Required by RN 0.86.0 |
| @types/react | @types/react | ~19.2.2 | Aligned with react 19.2.3 |
| Path alias | None — relative imports | removed 2026-07-05 | Metro can't resolve TypeScript path aliases |

## UI & Navigation
| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Navigation | @react-navigation/native | ^7.3.7 | NOT 7.17.0 — that version doesn't exist on npm |
| Native Stack | @react-navigation/native-stack | ^7.17.9 | Latest 7.x |
| Screens | react-native-screens | 4.25.2 | 4.26+ only nightly |
| Safe area | react-native-safe-area-context | 5.7.0 | Aligned with Expo SDK 57 |
| Animations | react-native-reanimated | 4.5.0 | Aligned with Expo SDK 57 |
| Worklets | react-native-worklets | ^0.10.1 | Required peer dep of reanimated (installed separately) |
| Gestures | react-native-gesture-handler | 2.32.0 | Latest stable (v2 line, compatible with SDK 57) |
| Audio | expo-av | SDK 57 | |
| Haptics | expo-haptics | SDK 57 | |
| Clipboard | expo-clipboard | SDK 57 | Copy share text to clipboard (Phase 3, STAT-04) |

## State & Storage
| Layer | Choice | Version | Use |
|-------|--------|---------|-----|
| State | Zustand | 5.0.14 | 5 stores (game, stats, auth, settings, dictionary) |
| KV store | react-native-mmkv | 4.3.2 | Settings + active game state (sync writes) |
| SQL | expo-sqlite | 57.0.0 | Game history (aggregated stats) |
| KV fallback | @react-native-async-storage | 2.2.0 | Auth tokens only |

## Charts & UI
| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Bar chart | react-native-chart-kit | ^6.12.0 | Guess distribution histogram (Phase 3, STAT-02) |
| SVG | react-native-svg | ^13.9.0 | Peer dep of react-native-chart-kit (Phase 3) |

## Cloud & Auth
| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Backend | Firebase (Firestore + Auth) | 25.x | Phase 5 — Firestore for player stats + leaderboards, Auth for Google Sign-In token exchange |
| Google Sign-In | @react-native-google-signin | 16.x | Phase 5 — Web client ID (not Android) passed to configure() |
| Firebase Auth | @react-native-firebase/auth | 25.x | Phase 5 — credential exchange after GoogleSignIn |
| Firebase Firestore | @react-native-firebase/firestore | 25.x | Phase 5 — 3 leaderboard collections + playerStats |
| Remote Config | @react-native-firebase/remote-config | 25.1.0 | Ad unit ID config (Phase 4, D-106) — npm verified |
| Firebase App | @react-native-firebase/app | 25.x | Required peer dep of remote-config + auth + firestore; installs alongside |

## Monetization
| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Ads | react-native-google-mobile-ads | 16.4.0 | Interstitial + rewarded (Phase 4) — npm verified |
| IAP | react-native-iap | 15.3.6 | Pro purchase + restore (Phase 4, D-98) — npm verified |
| Remote Config | @react-native-firebase/remote-config | 25.1.0 | Ad unit ID config via Firebase (D-106) |

## Build
| Layer | Choice | Notes |
|-------|--------|-------|
| Build | EAS CLI (dev/preview/production profiles) | |
| Dev builds | npx expo prebuild + npx expo run:android | Prebuild from day one (Phase 1) |
| Build properties | expo-build-properties | ~57.0.3 | Config plugin for android.kotlinVersion, googleServicesFile |
| Prototyping | Expo Go | Limited native modules |

## Known issues & workarounds

### TypeScript 6 — baseUrl + paths deprecation
TS 6.0 deprecates `baseUrl` with `paths`. To silence TS5101 error:
```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "ignoreDeprecations": "6.0"
  }
}
```
Future: migrate `@/` alias to a build-time Metro resolver and drop tsconfig paths.

### Prebuild requires valid PNG assets
`npx expo prebuild` fails if icon/splash PNGs are missing or corrupt.
- ENOENT on missing assets (icon.png, splash.png, etc.)
- CRC error on malformed PNGs
- Fix: create valid 1x1 placeholder PNGs before first prebuild, replace with real assets later

### npm install — legacy-peer-deps
React Navigation and Expo packages have peer dep conflicts resolved by:
```bash
npm install --legacy-peer-deps
```
Prefers `npx expo install` for Expo SDK packages (handles version alignment automatically).

### Postinstall script bootstrapping
If `package.json` has a `postinstall` script referencing a file that doesn't exist yet, `npm install` fails. Workaround: temporarily remove or rename the postinstall hook during initial setup, create the script, then restore it.

### AGP version — RN 0.86 ships 8.12.0, AS may not support it
RN 0.86 bundles AGP 8.12.0 via `node_modules/react-native/gradle/libs.versions.toml`. Older Android Studio versions error `Latest supported version is AGP 8.9.1`. Fix: pin version explicitly in `android/build.gradle` — see [android-build-setup](android-build-setup.md).

### react-native-reanimated needs react-native-worklets installed separately
`react-native-reanimated` requires `react-native-worklets` as a peer dep (not auto-installed). Fix: `npm install react-native-worklets --legacy-peer-deps && npx expo prebuild`. Without this, Gradle fails at build time.

### react-native-mmkv needs react-native-nitro-modules installed separately
`react-native-mmkv@4.3.2` has `react-native-nitro-modules` as a **peer dep** (not auto-installed). Fix: `npx expo install react-native-nitro-modules && npx expo prebuild`. Without this, Gradle fails with `Project with path ':react-native-nitro-modules' could not be found`.

### expo-sqlite version must match Expo SDK major
`expo-sqlite@15.2.x` is incompatible with `expo@57.0.2` — causes `NoClassDefFoundError: AnyTypeProvider` at runtime (SQLiteModule.kt:676). The v15 line targets a different SDK major.
- Fix: `npx expo install expo-sqlite` installs the correct `~57.0.0` version.
- Always run `npx expo install --check` after package.json changes to verify SDK compatibility.
- Never `npm install expo-sqlite` directly — always use `npx expo install` for Expo SDK packages.

### npx expo prebuild --clean wipes local.properties
`npx expo prebuild --clean` deletes the entire `android/` directory, including `android/local.properties`. Must recreate after each clean prebuild:
```
sdk.dir=C:\\Users\\Xent\\AppData\\Local\\Android\\Sdk
```
- Detection: Gradle build fails with `SDK location not found.`
- Fix: write `local.properties` file with `sdk.dir` pointing to Android SDK.

### npx expo install --check reveals mismatched native modules
Run `npx expo install --check` to verify all native module versions align with installed Expo SDK. Shows expected vs actual versions for each package. Fix mismatches with `npx expo install <package>`.
- Known mismatches before fix (2026-07-05): expo-sqlite@15.2.14→57.0.0, react-native-gesture-handler@3.0.2→2.32.0, react-native-reanimated@4.5.1→4.5.0, react-native-safe-area-context@5.8.0→5.7.0, @react-native-async-storage/async-storage@3.1.1→2.2.0.

## Metro bundler limitations
- Dynamic `require()` with template literals crashes Metro. Use static require() with string literal paths.
- All word list files bundled via static require() at build time (~150KB total).
- `@/` alias removed 2026-07-05 — Metro can't resolve TypeScript path aliases. All imports use relative paths.

## Phase 3 additions (UI)
| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Bar chart | react-native-chart-kit | ^6.12.0 | Guess distribution histogram for stats screen |
| SVG renderer | react-native-svg | ^13.9.0 | Peer dep of react-native-chart-kit |
| Clipboard | expo-clipboard | SDK 57 | Copy share text (emoji grid) to clipboard |

**Phase 3 source files (constants layer):**
| File | Purpose |
|------|---------|
| `src/constants/typography.ts` | 5-size type scale (Stat Value 32px, Card Title 18px, Settings Row 16px, Body 14px, Stat Label 12px). Follows colors.ts/layout.ts pattern. See [design-tokens](design-tokens.md). |

## Phase 6 additions (Pre-Launch & Polish)
| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Audio | expo-av | SDK 57 | Sound effects: keypress/reveal/win/loss. .wav files at assets/sounds/ |

**Phase 6 source files:**
| File | Purpose |
|------|---------|
| `assets/sounds/` | Sound effect files: keypress.wav, reveal.wav, win.wav, loss.wav (user-provided, v1) |
| `src/hooks/useColors.ts` | Theme-aware color hook — returns lightColors/darkColors based on settingsStore.themeMode |
| `src/components/ui/HowToPlayModal.tsx` | How to Play modal overlay (not a nav route) |

## Bonus dependencies (evaluated, deferred)
| Library | Use | Verdict |
|---------|-----|--------|
| typegpu-confetti | GPU-accelerated confetti particles | DEFERRED — v0.3.0, WebGPU on Android experimental. Use Reanimated worklet confetti instead |

## Source data files
| File | Purpose |
|------|---------|
| `dictionary.full.enriched.json` | Target word selection + definitions (curated, ~12K words) |
| `dictionary.full.json` | Player guess validation (broader, ~184K words) |
| `profanity-blocklist.txt` | Profanity filter (5-10 letter entries only) |
| `manual-blocklist.txt` | Manual exclusion list — proper nouns, names, non-English (5-10 letter entries only) |

## Anti-picks
- ❌ Bare RN CLI — android/ directory maintenance overhead
- ❌ Redux Toolkit — overkill for 5 simple stores
- ❌ React Context for game state — full-tree re-render on every guess
- ❌ Lottie for tile animations — 200KB+ JSON per animation
- ❌ RevenueCat — 25% fee on $1.99 IAP, SDK 5x larger than react-native-iap
- ❌ Custom backend (Node/PostgreSQL) — 10x work, Firebase handles all needs

### npx expo prebuild --clean fails with EBUSY on locked android/
If `android/` directory or files inside are locked by another process (Android Studio, file explorer, stale Gradle daemon), `prebuild --clean` fails with `EBUSY`. Fix: close Android Studio, close file explorer windows on `android/`, kill java/node/gradle processes. Workaround: use `npx expo prebuild` (without `--clean`) — updates in-place without deleting directory.

### @react-native-firebase/firestore has no app.plugin.js
Only `@react-native-firebase/app` has a config plugin (`app.plugin.js`), which covers all Firebase sub-modules (auth, firestore, remote-config). Do NOT add `@react-native-firebase/firestore` to `app.json plugins` — it will error `PluginError: Unexpected token 'typeof'`. Fix: add `@react-native-firebase/app` to plugins instead.

### google-services.json placement for Firebase
Must be at project root (not `android/app/`). Add `expo.android.googleServicesFile: "./google-services.json"` to `app.json`. The `@react-native-firebase/app` config plugin copies it from source to `android/app/` during prebuild. If already placed at `android/app/`, move to project root before prebuild.

### google-services.json not tracked in git
`google-services.json` contains Firebase API keys and client config (project_number, mobilesdk_app_id, api_key). Not committed to git — listed in `.gitignore`. Each dev/CI env places its own copy at project root.

### Package name must match google-services.json
`app.json android.package` must match `package_name` in `google-services.json`. Mismatch causes Gradle failure:
```
No matching client found for package name 'com.wordguess.app' in google-services.json
```
Fix: align `android.package` in `app.json` with Firebase project's registered package name.
In this project: `com.vorithstudio.wordguess` (also matches IAP product ID `com.vorithstudio.wordguess.pro`).

### Kotlin metadata version — play-services-ads 25.4.0 needs Kotlin 2.3.0
`react-native-google-mobile-ads` 16.4.0 depends on `play-services-ads:25.4.0`, which was compiled with Kotlin metadata version 2.3.0. RN 0.86 ships Kotlin 2.1.20 in its Gradle version catalog (`node_modules/react-native/gradle/libs.versions.toml`). The Kotlin compiler 2.1.20 cannot read metadata 2.3.0:
```
Module was compiled with an incompatible version of Kotlin.
The binary version of its metadata is 2.3.0, expected version is 2.1.0.
```
**Scope quirk:** `expo-build-properties` sets `android.kotlinVersion` in `gradle.properties`, but `react-native-google-mobile-ads` reads Kotlin version via `getExtOrDefault('kotlinVersion', '1.8.22')` which checks `rootProject.ext.kotlinVersion` — a different scope. Gradle properties do NOT flow into `rootProject.ext`.
**Fix:** Pin Kotlin in `android/build.gradle`:
```groovy
buildscript {
  ext.kotlinVersion = '2.3.0'
  // ...
  classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")
}
```
**Persistence:** `android/` is regenerated on prebuild — the above edit gets wiped. Fix: `scripts/patch-kotlin-version.mjs` patches `android/build.gradle` after each prebuild via `postinstall` npm script.

### react-native-google-mobile-ads requests compileSdk 36
`react-native-google-mobile-ads` 16.4.0 sets compileSdk/targetSdk to 36 via its build.gradle. Other Firebase modules (auth, firestore, remote-config) also request 36. Verify SDK Platform 36 is installed via Android Studio SDK Manager.

### react-native-firebase v25+ modular API (migrated 2026-07-08)
`@react-native-firebase` v22+ deprecates the old namespaced API (`firebase()`, `auth()`, `firestore()`, `remoteConfig()`) in favor of a modular API matching Firebase Web v9+. Warnings logged at app start. All 3 services migrated:

| File | Old (namespaced) | New (modular) |
|------|-----------------|---------------|
| `remoteConfig.ts` | `remoteConfig().fetchAndActivate()` | `getRemoteConfig()` + `fetchAndActivate(rc)` |
| `remoteConfig.ts` | `remoteConfig().getValue('key')` | `getValue(rc, 'key')` |
| `firestoreService.ts` | `firestore().settings({persistence: true})` | `initializeFirestore(getApp(), {persistence: true})` |
| `firestoreService.ts` | `firestore().collection().doc().set()` | `setDoc(doc(collection(db, ...), ...), ...)` |
| `firestoreService.ts` | `firestore.FieldValue.serverTimestamp()` | `serverTimestamp()` |
| `firestoreService.ts` | `.orderBy().limit().get()` | `getDocs(query(ref, orderBy(...), limit(...)))` |
| `authService.ts` | `auth().signInWithCredential(c)` | `signInWithCredential(auth, c)` |
| `authService.ts` | `auth().signOut()` | `signOut(auth)` |
| `authService.ts` | `auth().onAuthStateChanged(cb)` | `onAuthStateChanged(auth, cb)` |
| `authService.ts` | `auth.GoogleAuthProvider.credential()` | `GoogleAuthProvider.credential()` |

### AdMob app ID — placeholder causes startup crash
`react-native-google-mobile-ads` config plugin reads `androidAppId` from `app.json` and writes it to `AndroidManifest.xml` as `com.google.android.gms.ads.APPLICATION_ID`. If set to placeholder `ca-app-pub-xxxxxxxx~xxxxxxxx`, `MobileAdsInitProvider` crashes at native startup with `Invalid application ID`.
- Fix: use Google's test app ID `ca-app-pub-3940256099942544~3347511713` for dev
- Swap to real production AdMob app ID before Play Store release
- Config lives in `app.json` under `plugins → react-native-google-mobile-ads`
