# android-build-setup
updated: 2026-07-05 (emulator storage, AGP warning)
tags: [android, build, gradle, sdk, config]
related: [tech-stack, dev-workflow]

## SDK versions (Expo SDK 57 / RN 0.86 defaults)
| Setting | Value | Source |
|---------|-------|--------|
| compileSdk | 35 | Expo version catalog default |
| targetSdk | 35 | Expo version catalog default |
| minSdk | 24 | Expo version catalog default |
| AGP | 8.12.0 (shipped with RN 0.86) → pin to 8.9.1 | RN gradle libs.versions.toml |
| Gradle | 9.3.1 | gradle-wrapper.properties |
| build-tools | latest matching compileSdk (35.x.x) | auto-selected |

## local.properties
Required for Gradle to find Android SDK. Create at `android/local.properties`:
```
sdk.dir=C:\\Users\\Xent\\AppData\\Local\\Android\\Sdk
```
Alternative: set `ANDROID_HOME` env var.

## AGP version pinning
React Native 0.86 ships AGP 8.12.0 via `node_modules/react-native/gradle/libs.versions.toml`. Android Studio versions before Ladybug 2024.x may not support AGP 8.12.x — error: `Latest supported version is AGP 8.9.1`.

**Fix:** Pin version explicitly in `android/build.gradle`:
```groovy
classpath('com.android.tools.build:gradle:8.9.1')
```

This overrides the version catalog default. Compatible with Gradle 9.3.1.

**Note:** AS may still show the warning even after pinning — it scans the RN version catalog file, not just the resolved version. The warning is cosmetic; actual build uses 8.9.1. To suppress, update AS to Ladybug 2024.x+.

## react-native-nitro-modules (MMKV peer dep)
- `react-native-mmkv@4.3.2` lists `react-native-nitro-modules` as a **peer dep** (not in dependencies)
- Not auto-installed by `npm install` — must install separately
- **Fix:** `npx expo install react-native-nitro-modules` then `npx expo prebuild`

Without this, Gradle fails:
```
Project with path ':react-native-nitro-modules' could not be found in project ':react-native-mmkv'.
```

## Android Studio standalone run
Default limitation: ▶ button from AS installs app but can't start Metro → blank screen ("No bundle URL").

**Workaround:** Shell Script run configuration:
1. Run → Edit Configurations → + → Shell Script
2. Script: `npx expo run:android`
3. Working dir: project root `E:\Projects\Indie\word-guess`

Now ▶ starts Metro + builds + installs + hot reloads from one button. Tradeoff: Metro + build output share AS Run tab (instead of separate terminal).

## Build-tools guidance
- Only need build-tools matching **compileSdk** (35), not per minSdk level
- minSdk 24 is a compile-time constraint only — no separate platform or build-tools needed
- Install SDK Platform 35 + Build-Tools 35.x.x via AS SDK Manager
- SDK Platform 24 is optional (only for testing against min API)

## Known pain points
## Emulator storage full
`INSTALL_FAILED_INSUFFICIENT_STORAGE` when installing debug APK. Emulator /data partition is full (default 6GB, fills with repeated installs).

### Fix options
1. **Cold boot + wipe data** (fastest) — In AVD Manager, dropdown → Cold Boot Now or Wipe Data
2. **Increase disk size** (permanent) — Edit AVD config.ini:
   ```
   disk.dataPartition.size = 8589934592  # 8GB
   ```
   Cold boot after changing. Default AVDs are 6442450944 bytes (6GB).

### Check current usage
```bash
adb shell "df -h /data"
```
If >90% used, emulator can't install debug APK (~74MB).

## Known pain points
| Issue | Workaround |
|-------|-----------|
| AGP 8.12.0 too new for AS | Pin to 8.9.1 in build.gradle (warning cosmetic)
| MMKV nitro-modules not found | npm install separately + prebuild |
| SDK not found | Create local.properties with sdk.dir |
| npx expo prebuild overwrites android/ | Use Expo config plugins in app.json instead of editing android/ directly |
