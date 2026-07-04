# Tech Stack
updated: 2026-07-04
tags: [stack, dependencies, versions, compat]
related: [architecture, storage-strategy, project-overview, android-build-setup]

## Core
| Layer | Choice | Version | Why |
|-------|--------|---------|-----|
| Framework | Expo (managed + dev client) | SDK ~57.0.2 | Solo dev, all native modules have config plugins |
| Rendering | React Native (via Expo) | 0.86.0 | Underlying RN for SDK 57 |
| Language | TypeScript | ~6.0.3 (strict) | Strict mode from day one |
| React | react | 19.2.3 | Required by RN 0.86.0 |
| @types/react | @types/react | ~19.2.2 | Aligned with react 19.2.3 |
| Path alias | @/ → src/ | tsconfig paths | Clean imports |

## UI & Navigation
| Layer | Choice | Version | Notes |
|-------|--------|---------|-------|
| Navigation | @react-navigation/native | ^7.3.7 | NOT 7.17.0 — that version doesn't exist on npm |
| Native Stack | @react-navigation/native-stack | ^7.17.9 | Latest 7.x |
| Screens | react-native-screens | 4.25.2 | 4.26+ only nightly |
| Safe area | react-native-safe-area-context | 5.8.0 | Latest stable |
| Animations | react-native-reanimated | ~4.5.1 | 4.6 only nightly |
| Gestures | react-native-gesture-handler | ~3.0.2 | Latest stable (v3 line) |
| Audio | expo-av | SDK 57 | |
| Haptics | expo-haptics | SDK 57 | |
| Clipboard | expo-clipboard | SDK 57 | |

## State & Storage
| Layer | Choice | Version | Use |
|-------|--------|---------|-----|
| State | Zustand | 5.0.14 | 5 stores (game, stats, auth, settings, dictionary) |
| KV store | react-native-mmkv | 4.3.2 | Settings + active game state (sync writes) |
| SQL | expo-sqlite | 57.0.0 | Game history (aggregated stats) |
| KV fallback | @react-native-async-storage | 3.1.1 | Auth tokens only |

## Cloud & Auth
| Layer | Choice | Version |
|-------|--------|---------|
| Backend | Firebase (Firestore + Auth) | 25.x |
| Google Sign-In | @react-native-google-signin | 16.x |

## Monetization
| Layer | Choice | Version |
|-------|--------|---------|
| Ads | react-native-google-mobile-ads | 16.x |
| IAP | react-native-iap | 15.x |

## Build
| Layer | Choice | Notes |
|-------|--------|-------|
| Build | EAS CLI (dev/preview/production profiles) | |
| Dev builds | npx expo prebuild + npx expo run:android | Prebuild from day one (Phase 1) |
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

### react-native-mmkv needs react-native-nitro-modules installed separately
`react-native-mmkv@4.3.2` has `react-native-nitro-modules` as a **peer dep** (not auto-installed). Fix: `npx expo install react-native-nitro-modules && npx expo prebuild`. Without this, Gradle fails with `Project with path ':react-native-nitro-modules' could not be found`.

## Metro bundler limitations
- `@/` alias is TypeScript-only — Metro cannot resolve it. Use relative paths for `require()`.
- Dynamic `require()` with template literals crashes Metro. Use static require() with string literal paths.
- All word list files bundled via static require() at build time (~150KB total).

## Anti-picks
- ❌ Bare RN CLI — android/ directory maintenance overhead
- ❌ Redux Toolkit — overkill for 5 simple stores
- ❌ React Context for game state — full-tree re-render on every guess
- ❌ Lottie for tile animations — 200KB+ JSON per animation
- ❌ RevenueCat — 25% fee on $1.99 IAP, SDK 5x larger than react-native-iap
- ❌ Custom backend (Node/PostgreSQL) — 10x work, Firebase handles all needs
