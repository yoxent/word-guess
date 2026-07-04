# Technology Stack

**Project:** word-guess (Wordle-style word guessing game)
**Researched:** 2026-07-04
**Overall Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Expo** (managed + dev client) | SDK 57 | App framework + build toolchain | Solo dev new to RN; handles native config, EAS builds, Play Store publishing, OTA updates out of the box |
| **React Native** (via Expo) | ~0.86.0 | Rendering engine | Underlying RN version used by Expo SDK 57; peer-dep range for Reanimated v4 is "0.83 – 0.86" |

**Why Expo over bare RN:** The app needs 7 native modules (AdMob, Google Sign-In, IAP, Firebase, Reanimated, Gesture Handler, Safe Area). Every one has an Expo config plugin. Expo's managed workflow + dev-client gives you all the native power without maintaining native projects yourself. You use `eas build` for Play Store AABs and `eas update` for OTA JS pushes.

**What NOT to use:** Bare React Native CLI. Requires manual maintenance of `android/` and `ios/` directories.

### Navigation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@react-navigation/native** | 7.x | Navigation container + screen routing | Industry standard; deep linking support |
| **@react-navigation/native-stack** | 7.x | Stack navigator | Native-feeling push/pop transitions |
| **react-native-screens** | 4.x | Native screen containers | Required by React Navigation |
| **react-native-safe-area-context** | 5.x | Safe area insets | Required by React Navigation |

**App screens:** HomeScreen → GameScreen → StatsScreen / LeaderboardScreen. Stack navigator sufficient; no tabs needed.

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Zustand** | 5.x | Global game state, settings, auth state | 1 KB, zero boilerplate; selector-based subscriptions prevent full-tree re-renders |
| **@react-native-async-storage/async-storage** | 3.x | Persistent local storage | Standard RN persistence layer |

**Store architecture:**
```
stores/
├── gameStore.ts          # Current game state (board, guesses, feedback)
├── dictionaryStore.ts    # Loaded word lists per length
├── settingsStore.ts      # Hard mode, sound, theme
├── authStore.ts          # Google Sign-In state, player ID
├── statsStore.ts         # Win %, guess distribution, streaks
└── leaderboardStore.ts   # Cached leaderboard data
```

### UI & Animations

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **react-native-reanimated** | 4.x | Tile flip, keyboard press, win/loss animations | Worklet-driven animations on UI thread at 60 FPS |
| **react-native-gesture-handler** | 3.x | Touch/gesture handling | Required by Reanimated's Gesture API |

**Animation spec:** Each tile flips 300ms rotate-X, staggered 100ms left-to-right. Correct tiles scale bounce 1.0→1.15→1.0 after flip.

### Audio

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **expo-av** | 16.x | Sound effects | Actively maintained as part of Expo SDK |

### Cloud Backend

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@react-native-firebase/app** | 25.x | Firebase core | Most documented RN backend; Expo config plugins |
| **@react-native-firebase/firestore** | 25.x | Cloud-synced stats + leaderboard storage | Real-time queries; offline persistence |
| **@react-native-firebase/auth** | 25.x | Google Sign-In token exchange | Integrates with google-signin |

**Why Firebase over Supabase:** More battle-tested with Expo; real-time listeners; handles Google Sign-In easily. Solo dev doesn't need custom backend.

### Monetization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **react-native-google-mobile-ads** | 16.x | Interstitial + rewarded video ads | Official Google AdMob RN package; actively maintained |
| **react-native-iap** | 15.x | $1.99 Pro IAP (non-consumable) | Lightweight; no third-party fee (unlike RevenueCat) |

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@react-native-google-signin/google-signin** | 16.x | Google Play Sign-In button + token | Official Google Sign-In for RN |
| **@react-native-firebase/auth** | 25.x | Firebase Auth credential exchange | Two-step: GoogleSignIn → Firebase Auth |

### Dictionary Loading

**RECOMMENDED:** Bundled JSON stripped to just word arrays per length. ~150KB gzipped. Load synchronously at startup.

## Installation

```bash
npx create-expo-app@latest word-guess --template
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install zustand @react-native-async-storage/async-storage
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install expo-av
npx expo install react-native-google-mobile-ads
npx expo install react-native-iap
npx expo install @react-native-google-signin/google-signin
npx expo install @react-native-firebase/app @react-native-firebase/firestore @react-native-firebase/auth
npx expo install expo-haptics expo-clipboard
npm install -D typescript @types/react
```

## Compatibility Matrix

| Library | Expo SDK 57 | RN 0.86 | Android API | Config Plugin |
|---------|-------------|---------|-------------|---------------|
| react-native-reanimated 4.x | ✅ | ✅ 0.83–0.86 | 24+ | Built-in |
| react-native-gesture-handler 3.x | ✅ | ✅ | 21+ | Built-in |
| react-native-google-mobile-ads 16.x | ✅ | ✅ | 21+ | Built-in |
| @react-native-google-signin 16.x | ✅ | ✅ | 21+ | Built-in |
| react-native-iap 15.x | ✅ | ✅ | 21+ | Plugin needed |
| @react-native-firebase/* 25.x | ✅ | ✅ | 21+ | Built-in |
| react-native-screens 4.x | ✅ | ✅ | 21+ | Built-in |
