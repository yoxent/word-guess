# Tech Stack
updated: 2026-07-04
tags: [stack, dependencies, versions]
related: [architecture, storage-strategy, project-overview]

## Core
| Layer | Choice | Version | Why |
|-------|--------|---------|-----|
| Framework | Expo (managed + dev client) | SDK 57 | Solo dev, all native modules have config plugins |
| Rendering | React Native (via Expo) | ~0.86.0 | Underlying RN for SDK 57 |
| Language | TypeScript | strict | Type safety from day one |
| Path alias | @/ → src/ | tsconfig | Clean imports |

## UI & Navigation
| Layer | Choice | Version |
|-------|--------|---------|
| Navigation | @react-navigation/native-stack | 7.17.9 |
| Screens | react-native-screens | 4.x |
| Safe area | react-native-safe-area-context | 5.x |
| Animations | react-native-reanimated | 4.5.1 |
| Gestures | react-native-gesture-handler | 3.x |
| Audio | expo-av | SDK 57 |
| Haptics | expo-haptics | SDK 57 |
| Clipboard | expo-clipboard | SDK 57 |

## State & Storage
| Layer | Choice | Version | Use |
|-------|--------|---------|-----|
| State | Zustand | 5.0.14 | 4+ stores (game, stats, auth, settings, dictionary) |
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
| Layer | Choice |
|-------|--------|
| Build | EAS CLI (dev/preview/production profiles) |
| Dev builds | npx expo prebuild + npx expo run:android |
| Prototyping | Expo Go (limited native modules) |

## Metro bundler limitations
- `@/` alias is TypeScript-only — Metro cannot resolve it. Use relative paths for `require()`.
- Dynamic `require()` with template literals crashes Metro. Use static require() with string literal paths.
- All word list files bundled via static require() at build time (~150KB total).

## Anti-picks
- ❌ Bare RN CLI — android/ directory maintenance overhead
- ❌ Redux Toolkit — overkill for 4 simple stores
- ❌ React Context for game state — full-tree re-render on every guess
- ❌ Lottie for tile animations — 200KB+ JSON per animation
- ❌ RevenueCat — 25% fee on $1.99 IAP, SDK 5x larger than react-native-iap
- ❌ Custom backend (Node/PostgreSQL) — 10x work, Firebase handles all needs
