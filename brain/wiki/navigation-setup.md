# navigation-setup
updated: 2026-07-04
tags: [navigation, react-navigation, screens, stack]
related: [architecture, phase-structure, tech-stack]

## Stack
- Library: `@react-navigation/native-stack` v7.17.9 (NOT 8.x — verified against npm registry)
- Container: `NavigationContainer` in `src/app/App.tsx`
- Config: Static `createNativeStackNavigator` with typed `RootStackParamList`

## 6 screens
| Screen | Route Name | headerShown | Notes |
|--------|-----------|-------------|-------|
| Home | Home | yes + headerRight NavMenuButton | Mode selection |
| Game | Game | no (full-screen game) | Tile board + keyboard |
| Result | Result | no | Win/loss reveal |
| Stats | Statistics | yes + headerRight NavMenuButton | Personal stats |
| Settings | Settings | yes + headerRight NavMenuButton | Toggles, account |
| Leaderboard | Leaderboard | yes + headerRight NavMenuButton | Ranking lists |

## Game loop flow (D-17)
```
Home → Game → Result → Home (Free/Random/Daily modes)
                       → Game (Endless mode — auto-advance)
```

## NavMenuButton pattern (D-18)
- `NavMenuButton` component renders in `headerRight` of all non-game screens (Home, Stats, Settings, Leaderboard)
- Uses `Alert.alert()` with action-sheet-style options: Home, Statistics, Settings, Leaderboard, Cancel
- Implementation: `useNavigation<NativeStackNavigationProp<RootStackParamList>>()` for type-safe navigation
- Game screen has `headerShown: false` — no header, full concentration on gameplay
- Result screen also has `headerShown: false` — clean reveal experience

## TypeScript setup — RootStackParamList
```typescript
type RootStackParamList = {
  Home: undefined;
  Game: { mode: GameMode; letterCount?: number };
  Result: { sessionId: string };
  Stats: undefined;
  Settings: undefined;
  Leaderboard: undefined;
};
```
- Game receives `mode` always, `letterCount` optional (required for free/endless/daily, omitted for random)
- Result receives `sessionId` (UUID generated at game start)
- Screen props typed via `NativeStackScreenProps<RootStackParamList, 'ScreenName'>` or generic `ScreenProps<T>`
- Ensures route params are type-checked at compile time

## Settings as full-screen push (D-19)
- Settings uses same `animationTypeForReplace: 'push'` as other screens
- Not a modal — consistent transition feel across app
- `inactiveBehavior: 'pause'` (default) cleans up effects on inactive screens

## App entry point
- `src/app/App.tsx` — default export
- Wraps `NavigationContainer` around `Navigation` component
- `expo-status-bar` configured with `style="dark"`
- Gas pedal: import stores in App.tsx via barrel, configure persistence on mount

## Key decisions
| Decision | Rationale |
|----------|-----------|
| React Navigation over Expo Router | Simple 6-screen stack, RN Navigation transfers to any RN project |
| Static config API over dynamic | TypeScript type inference, no extra component nesting |
| headerRight NavMenuButton over bottom tab | Nav accessible from any screen without adding tab bar clutter to game |
| Alert menu over custom modal | Zero dependencies, native feel, works immediately |
