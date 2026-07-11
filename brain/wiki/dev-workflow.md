# dev-workflow
updated: 2026-07-11 (system theme, splash screen, volume slider, app icon)
tags: [workflow, android-studio, metro, emulator, dev-loop, eas-build]
related: [tech-stack, android-build-setup, theme-system]

## Daily dev loop
```bash
cd E:\Projects\Indie\word-guess
npx expo run:android
```
Single command starts Metro bundler (port 8081) + Gradle build + install on emulator/device. Hot reload and Fast Refresh work out of the box.

**Don't** run `npx expo start` separately — `npx expo run:android` already includes Metro.

## Stopping Metro
- **Ctrl+C** in the terminal running `npx expo run:android`
- Or from AS Shell Script run config: red **Stop** button (Ctrl+F2) in Run tab
- If Metro orphaned on port 8081:
  ```powershell
  netstat -ano | findstr :8081   # find PID
  taskkill /F /PID <PID>
  ```

## Android Studio setup
Open `E:\Projects\Indie\word-guess\android\` (NOT the root project folder — no Gradle files at root).

### AS provides:
- Emulator / connected device
- Logcat (native crash debugging)
- Gradle task runner (clean, build, assembleRelease)
- Device File Explorer
- APK/AAB output inspection

### AS alone is not enough
Running ▶ from Android Studio installs the app but **cannot start Metro** → blank screen ("No bundle URL"). Keep a terminal with `npx expo run:android` for the JS bundle.

## Dual-tool coexistence
Both Android Studio's emulator and `npx expo run:android` use the **same** running emulator instance. Start the emulator from AS, then run `npx expo run:android` from terminal — they share the device with no conflict.

| Tool | Role | Start command |
|------|------|---------------|
| Terminal (root) | Metro bundler + JS hot reload | `npx expo run:android` |
| Android Studio (`android/`) | Emulator, Logcat, native build inspection | Open android/ folder |

## EAS cloud builds (dev client APK)
Use when you need a distributable dev build (not daily JS work — that's `npx expo run:android`).

```bash
eas build --platform android --profile development
```

**Windows:** `--local` is not supported (macOS/Linux/WSL only). Use cloud builds or `npx expo run:android`.

### Upload rules (`.easignore`)
EAS uses `.gitignore` by default and **excludes gitignored files** from the upload archive — even if tracked in git. A dedicated `.easignore` re-includes build-required files via `!` rules at the bottom:
- `scripts/` — `postinstall` Kotlin patch (`patch-kotlin-version.mjs`)
- `assets/dictionary/` — Metro-bundled dictionary JSONs
- `google-services.json` — Firebase config (gitignored, uploaded from local machine)

Without `.easignore`, `npm ci` on EAS fails with `Cannot find module scripts/patch-kotlin-version.mjs`.

### Expo config
Static `app.json` replaced by `app.config.ts`. Firebase path:
```ts
googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
```
Optional: store file on EAS via `eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment development --visibility secret`.

### eas.json profiles
| Profile | Use |
|---------|-----|
| `development` | Dev client, internal distribution |
| `preview` | APK for testers |
| `production` | Play Store AAB (`autoIncrement: true`, `appVersionSource: remote`) |

## Native edits & prebuild
- Direct edits to `android/` files are **overwritten** on next `npx expo prebuild`
- For permanent native changes: use Expo config plugins in `app.config.ts` instead
- After adding a new Expo plugin: `npx expo prebuild` re-generates android/ with plugin applied
- **`npx expo prebuild --clean` wipes `local.properties`** — must recreate after each clean prebuild (see android-build-setup.md)

## Version alignment check
- Run `npx expo install --check` after any package.json changes to verify native module SDK compatibility
- Fix mismatches with `npx expo install <package>` (handles version alignment automatically)
- Never `npm install expo-*` packages directly — always use `npx expo install`
- Symptom of mismatched versions: `NoClassDefFoundError` at runtime (native Kotlin/Java classes missing from expo-modules-core)

## Postinstall script — Kotlin version patch
`package.json` has a `postinstall` hook that runs `node scripts/patch-kotlin-version.mjs` after each install/prebuild. This patches `android/build.gradle` to pin Kotlin 2.3.0 (required by `react-native-google-mobile-ads`'s `play-services-ads:25.4.0` dependency).

The `android/` dir is regenerated on prebuild — the Kotlin pin would be lost without this hook.

## Performance profiling (Phase 6)
- console.time/timeEnd markers at: `startup-init` (App mount, App.tsx:30-44), `stats-read` (StatsScreen mount), `stats-write` (game completion)
- All markers guarded behind `__DEV__` — stripped from release builds
- Visual FPS check on mid-range device (Moto G Power class) for tile animations
- Flipper only if visual check reveals jank — not needed for baseline threshold verification
- Thresholds: tile animations 60 FPS, stats read/write < 100ms
- **Note (renamed 2026-07-09):** `dictionary-load` was renamed to `startup-init` because the marker was a no-op — dictionary require() calls happen synchronously at module load BEFORE useEffect runs, so they cannot be measured from inside useEffect. The marker now measures post-module startup work (Remote Config fetch + sound init).

## Production build checklist (Phase 6)
Before EAS production build:
- [ ] Real AdMob app ID in `app.config.ts` (replace `ca-app-pub-3940256099942544~3347511713`)
- [ ] Real Firebase Remote Config keys set
- [ ] Privacy policy hosted on GitHub Pages (covers AdMob data collection)
- [x] Branded assets: icon.png, splash.png, adaptive-icon.png, favicon.png (1024×1024 logo, 2026-07-11)
- [ ] google-services.json with real Firebase project config at project root (uploaded via `.easignore` or EAS file secret)
- [ ] App version bumped in `app.config.ts`
- [ ] EAS Build: `eas build --platform android --profile production`

### Testing track order
1. Internal testing (EAS internal distribution)
2. Closed testing (Play Console — limited testers)
3. Production release (Play Store)

## Dev client on physical device
1. Install EAS `development` profile APK once
2. Each session: `npx expo start --dev-client --clear` on PC (same Wi‑Fi or `--tunnel`)
3. Open dev client app → scan QR / pick dev server
4. Native dep or plugin changes → new `eas build` required

### Common dev-client failures
| Symptom | Cause | Fix |
|---------|-------|-----|
| `SplashScreenManager` ClassNotFoundException | `expo-splash-screen` missing from native build | `npx expo install expo-splash-screen`, add plugin to `app.config.ts`, rebuild APK |
| Worklets version mismatch / `libworklets.so` SIGABRT | APK native worklets ≠ Metro JS worklets | Align `react-native-worklets` in lockfile, `npm ci`, `--clear`, rebuild APK if needed |
| `adb` not found | SDK platform-tools not on PATH | Use `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` |

## Privacy policy
- Hosted on GitHub Pages (docs/privacy.md or separate repo)
- Content must cover: AdMob data collection, Google Sign-In data, standard Play Store privacy requirements

## Asset icons
Launcher icons: `assets/icon.png` + `assets/adaptive-icon.png` (1024×1024, updated 2026-07-11). Splash: `assets/splash.png` via `expo-splash-screen` plugin in `app.config.ts` (`resizeMode: contain`, bg `#f5f5f0`). Rebuild native app after icon/splash asset changes.

## Settings UI gotchas
- **Volume slider:** PanResponder must use `gestureState.dx` from grant — `locationX` on move can jump to 0 on Android and flash 0% (see `VolumeSlider` in `SettingsRow.tsx`).
- **System theme:** JS hook alone is not enough — `userInterfaceStyle: 'automatic'` + `expo-system-ui` + EAS rebuild required on device.

## Android Studio standalone run (alternative)
Workaround to run everything from AS without a separate terminal:
1. Run → Edit Configurations → + → Shell Script
2. Script: `npx expo run:android`
3. Working dir: project root

Now ▶ starts Metro + build + install + hot reload from AS Run tab. Tradeoff: Metro + build output share one tab. See [android-build-setup](android-build-setup.md) for details.
