# navigation-setup
updated: 2026-07-11 (back button chevron via headerBackImage, header color per mode, no circle on game back)
tags: [navigation, react-navigation, screens, stack]
related: [architecture, phase-structure, tech-stack, game-modes]

## Stack
- Library: `@react-navigation/native-stack` v7.17.9 (NOT 8.x — verified against npm registry)
- Container: `NavigationContainer` in `src/app/App.tsx`
- Config: Static `createNativeStackNavigator` with typed `RootStackParamList`

## 6 screens
| Screen | Route Name | headerShown | Notes |
|--------|-----------|-------------|-------|
| Home | Home | no (headerShown: false) | Mode selection + top-right icon bar |
| Game | Game | no (full-screen game) | Tile board + keyboard |
| Result | Result | no | Win/loss reveal |
| Stats | Statistics | yes + headerRight NavMenuButton | Personal stats |
| Settings | Settings | yes + headerRight NavMenuButton | Toggles, account |
| Leaderboard | Leaderboard | yes + headerRight NavMenuButton | Ranking lists |

## Game loop flow (D-17)
```
Home → Game → Result → Home (Random/Daily modes)
                       → Game (Endless mode — auto-advance)
```
Free Play removed (merged into Endless).

## NavMenuButton pattern (D-18, REMOVED 2026-07-09)
- `NavMenuButton` rendered in `headerRight` of Stats, Settings, Leaderboard screens and showed an Alert "Navigate to..." with 4 destinations. **Removed 2026-07-09** — user found the alert redundant since the Home screen already has icon buttons for the same 4 destinations (and the OS back button handles going home). NavMenuButton function and its styles were deleted from `Navigation.tsx`.
- Home screen: `headerShown: false` — navigation header removed entirely
- Home navigation replaced by top-right icon bar with MaterialIcons (order left→right): `help-outline` (How to Play), `emoji-events` (Stats/medal), `leaderboard` (Leaderboard), `settings` (Settings)
- Uses `@expo/vector-icons/MaterialIcons` — installed as explicit dependency
- Game screen: `headerShown: false`, custom header with plain arrow-back-ios icon (no circle background, 22px, white on colored header). Shows "{Mode} · {N} Letters". Uses `useSafeAreaInsets()` for status bar offset. `paddingRight` from safe area only (no fixed right padding). Container has `paddingHorizontal: layout.screenPadding` (16). Header spans full width via `marginHorizontal: -layout.screenPadding`. No attempts counter (shown in GameBoard).
- Result screen: `headerShown: false` — clean reveal experience

## Screen padding (consistent 16px, 2026-07-09)
- All screens use `layout.screenPadding = 16` for outer screen-edge padding
- Inner card/modal padding stays at 24px (intentional visual hierarchy)
- GameScreen header is full-width (marginHorizontal: -layout.screenPadding)
- HomeScreen adds `paddingBottom: layout.screenPadding + insets.bottom` for the bottom safe area

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

## useFocusEffect / useNavigation must be inside NavigationContainer (FIXED 2026-07-09)
React Navigation hooks (`useFocusEffect`, `useNavigation`, `useRoute`) require a navigation context, which is only available to **descendants** of `<NavigationContainer>`. Calling them in the same component that *creates* the `NavigationContainer` (i.e. as a sibling of the `<NavigationContainer>` JSX) crashes with `Couldn't find a navigation object. Is your component inside NavigationContainer?`

**Pattern that works:** split into outer + inner components.
- Outer (`Navigation()`): creates `<NavigationContainer>`, no navigation hooks
- Inner (e.g. `BackHandlerController()`): calls navigation hooks, renders `null` or children. Rendered as a child of `<NavigationContainer>`, sibling of `<Stack.Navigator>`.

```tsx
function BackHandlerController() {
  useFocusEffect(useCallback(() => { ... }, []));
  return null;
}

export function Navigation() {
  return (
    <NavigationContainer>
      <BackHandlerController />  {/* INSIDE container — context valid */}
      <Stack.Navigator>...</Stack.Navigator>
    </NavigationContainer>
  );
}
```

This applies to ANY centralized logic that needs focus tracking (BackHandler, focus-based analytics, keyboard shortcut wiring, etc.).

## Back button: standardized chevron (2026-07-11)
- All screens (Stats, Settings, Leaderboard) use `arrow-back-ios` via global `headerBackImage` in `screenOptions` — overrides Android's default `arrow-back` (left-arrow) to match iOS-style chevron `<`
- Game screen uses custom back button (no `headerBackImage`, owns its rendering): plain chevron icon, no circle background, `padding: 8` for touch target
- `headerBackImage` renders `MaterialIcons arrow-back-ios size={22}` with `tintColor` from nav theme; Android gets `marginLeft: 4` for alignment

## Header color per game mode (2026-07-11)
Game screen header `backgroundColor` now matches the selected mode's ModeCard gradient:
- `daily` → `#42A5F5` (sky blue)
- `endless` → `#66BB6A` (green)
- `random` / `free` → `#FFA726` (orange)

Set inline via `MODE_HEADER_COLORS` map in GameScreen, overriding the static style. Hint buttons remain `theme.colors.brand.primary` (sky blue).

## Key decisions
| Decision | Rationale |
|----------|-----------|
| React Navigation over Expo Router | Simple 6-screen stack, RN Navigation transfers to any RN project |
| Static config API over dynamic | TypeScript type inference, no extra component nesting |
| headerRight NavMenuButton over bottom tab | Nav accessible from any screen without adding tab bar clutter to game |
| Alert menu over custom modal | Zero dependencies, native feel, works immediately |
