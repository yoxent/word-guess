# dev-workflow
updated: 2026-07-05 (prebuild wipe, version check)
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

## Asset icons
Placeholder 1×1 PNGs in `assets/` (icon.png, splash.png, etc.) satisfy prebuild requirements. Replace with real branded assets before Phase 6 (Pre-Launch & Polish).

## Android Studio standalone run (alternative)
Workaround to run everything from AS without a separate terminal:
1. Run → Edit Configurations → + → Shell Script
2. Script: `npx expo run:android`
3. Working dir: project root

Now ▶ starts Metro + build + install + hot reload from AS Run tab. Tradeoff: Metro + build output share one tab. See [android-build-setup](android-build-setup.md) for details.
