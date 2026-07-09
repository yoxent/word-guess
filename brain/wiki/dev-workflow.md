# dev-workflow
updated: 2026-07-08 (postinstall Kotlin patch script)
tags: [workflow, android-studio, metro, emulator, dev-loop]
related: [tech-stack, android-build-setup]

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

## Native edits & prebuild
- Direct edits to `android/` files are **overwritten** on next `npx expo prebuild`
- For permanent native changes: use Expo config plugins in `app.json` instead
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
- [ ] Real AdMob app ID in app.json (replace `ca-app-pub-3940256099942544~3347511713`)
- [ ] Real Firebase Remote Config keys set
- [ ] Privacy policy hosted on GitHub Pages (covers AdMob data collection)
- [ ] Branded assets: icon.png, splash.png, adaptive-icon.png (replace 1×1 placeholders)
- [ ] google-services.json with real Firebase project config at project root
- [ ] App version bumped in app.json
- [ ] EAS Build: `eas build --platform android --profile production`

### Testing track order
1. Internal testing (EAS internal distribution)
2. Closed testing (Play Console — limited testers)
3. Production release (Play Store)

## Privacy policy
- Hosted on GitHub Pages (docs/privacy.md or separate repo)
- Content must cover: AdMob data collection, Google Sign-In data, standard Play Store privacy requirements

## Asset icons
Placeholder 1×1 PNGs in `assets/` (icon.png, splash.png, etc.) satisfy prebuild requirements. Replace with real branded assets before Phase 6 production build.

## Android Studio standalone run (alternative)
Workaround to run everything from AS without a separate terminal:
1. Run → Edit Configurations → + → Shell Script
2. Script: `npx expo run:android`
3. Working dir: project root

Now ▶ starts Metro + build + install + hot reload from AS Run tab. Tradeoff: Metro + build output share one tab. See [android-build-setup](android-build-setup.md) for details.
