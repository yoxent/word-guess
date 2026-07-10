# TESTING-PROFILE.md
Generated: 2026-07-10
Project: word-guess
Type: React Native (Expo)

## Stack
- Framework: Expo SDK 57, React Native 0.86
- Language: TypeScript (strict)
- State: Zustand (5 stores)
- Persistence: MMKV, SQLite, AsyncStorage
- Navigation: React Navigation 7.x native-stack
- Animations: Reanimated 4.x

## Conventions
- Test location: `__tests__/` next to source
- Test suffix: `.test.ts` / `.test.tsx`
- Fixtures: inline or `__fixtures__/` if needed

## Structure
```
src/
├── app/            # Entry, Navigation
├── components/     # game/, ui/, home/
├── config/         # UI config registry
├── constants/      # Design tokens
├── hooks/          # useTheme, etc.
├── screens/        # 7 route-level screens
├── services/       # Pure logic, SDK wrappers
├── stores/         # Zustand stores (5)
├── types/          # TypeScript definitions
└── utils/          # Helpers
```

## Mock Registry

### Layer 1 (Unit)
| Module | Mock Strategy |
|--------|---------------|
| services/wordLogic.ts | None (pure functions) |
| services/dailySeed.ts | None (pure function) |
| services/storage.ts | Mock MMKV/SQLite/AsyncStorage |
| services/sound.ts | Mock (no-op stub) |
| stores/* | Mock persistence layer |

### Layer 2 (Component)
| Module | Mock Strategy |
|--------|---------------|
| Zustand stores | Real store + mock persistence |
| @react-navigation | Mock useNavigation, useRoute |
| react-native-reanimated | Mock or skip animations |
| expo-haptics | Mock |
| expo-audio | Mock |

### Layer 3 (Integration)
| Module | Mock Strategy |
|--------|---------------|
| Backend/Firebase | Mock fetch, Firestore |
| Analytics | Mock |
| Purchases | Mock |
| Remote Config | Mock |

### Layer 4 (E2E)
No mocks — real app on device/emulator

## Skip List
- Exact animations (skip timing tests)
- Pixel-perfect layouts
- Non-critical cosmetic behavior
- Third-party library internals

## Setup Required
Before first test run, add to package.json:
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch"
}
```

And create jest.config.js:
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```
