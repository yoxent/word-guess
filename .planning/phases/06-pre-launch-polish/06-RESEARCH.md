# Phase 6: Pre-Launch & Polish — Research

**Researched:** 2026-07-08
**Domain:** Accessibility, Play Store compliance, theming, performance, audio, production build
**Confidence:** HIGH

## Summary

Phase 6 is the launch-readiness phase — making the app accessible to all players (color blindness support via texture overlays, TalkBack screen reader, font scaling, reduce motion), compliant with Play Store policies (ads declaration, privacy policy, content rating), performant on mid-range devices, and polished (theme system, entrance animation, sound wiring, dead code cleanup, How to Play onboarding).

**Primary recommendation:** Execute in 5 sequential plans: (1) foundation work — dependencies, config, types, colors refactor; (2) accessibility — tile textures, TalkBack, font scaling, reduce motion; (3) theme system and UI polish — dark mode, sound, BackHandler, How to Play, entrance animation; (4) dead code cleanup and contrast fixes; (5) Play Store compliance — privacy policy, build, testing, performance verification.

**Key dependencies to add:** `expo-av` (v16.0.8 — already in tech stack as planned). Everything else uses existing patterns and packages.

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 1. Color Blindness Support (LAUNCH-01)
- **D-155:** Texture overlays drawn on top of tiles — dots for correct, diagonal stripes for present, solid fill for absent. Overlay is a visual addition, not a replacement of color.
- **D-156:** Controlled via Settings toggle `colorBlindMode` in settingsStore, **OFF by default**. Uses existing toggle row pattern from UI config registry.

#### 2. Screen Reader Support (LAUNCH-02)
- **D-157:** Tile announcements format: `"Position {N}: {letter}, {state}"` — e.g., `"Position 1: A, correct"`. Gives spatial context essential for word-guessing layout.
- **D-158:** Empty tiles announce: `"Position {N}: empty"`. Current row's unfilled tiles are empty.
- **D-159:** Keyboard keys announce letter name only (no position needed). Enter key announces "Enter", Backspace announces "Backspace".
- **D-160:** Proper `accessible`, `accessibilityLabel`, and `accessibilityRole` props on all interactive elements (tiles, keyboard keys, buttons, modals).

#### 3. Font Size Scaling (LAUNCH-03)
- **D-161:** Scale `fontSize` values in `src/constants/typography.ts` by `PixelRatio.getFontScale()`. Applied once at constant definition time.
- **D-162:** Do NOT scale tile sizes or layout spacing — tile sizes are already dynamically computed from screen width (caps at 56px, floors at 32px) and adapt naturally.

#### 4. Reduce Motion (LAUNCH-04)
- **D-163:** Settings toggle `reduceMotion` in settingsStore — user-controlled, NOT automatic from `AccessibilityInfo.isReduceMotionEnabled()`. **OFF by default.**
- **D-164:** When enabled, skip ALL animations: tile flip (Reanimated worklets skip), confetti (not rendered), stat card entrance (instant), home page stagger (instant). Game shows instant results.

#### 5. Back Button Handling (LAUNCH-05)
- **D-165:** Single centralized `BackHandler` listener in `Navigation.tsx` (or `App.tsx`), not per-screen listeners.
- **D-166:** Back blocked when: tile animations are playing (`isRevealing === true`), interstitial/rewarded ad is displayed, IAP purchase flow is active.
- **D-167:** During tile animation: skip to final state (complete all tile reveals instantly), show the result state, then back navigates normally. During ad/IAP: back is blocked until ad dismisses or purchase completes. Graceful skip, never crash.

#### 6. Play Store Compliance (LAUNCH-06)
- **D-168:** Privacy policy hosted on **GitHub Pages** — create a `docs/privacy.md` in repo (or separate `wordguess-privacy` repo with GitHub Pages enabled). Content covers AdMob data collection, Google Sign-In data, and standard Play Store requirements.

#### 7. Performance Profiling (LAUNCH-07)
- **D-169:** Use `console.time()` / `console.timeEnd()` markers at key code paths for threshold verification. No Flipper setup needed unless visual check reveals jank.
- **D-170:** Markers at: dictionary load (App mount), stats read (StatsScreen mount), stats write (game completion). All guarded behind `__DEV__` flag — stripped from production AAB.
- **D-171:** Visual FPS assessment on mid-range device. If tile animation appears smooth during gameplay, thresholds are met. If jank detected, set up Flipper for diagnosis.

#### 8. Production Build (LAUNCH-08)
- **D-172:** EAS Build profiles already configured (dev/preview/production). Production AAB via `eas build --platform android --profile production`.
- **D-173:** Build order: internal testing → closed testing track → production release. Real AdMob app ID, real Firebase Remote Config keys, branded assets (icon/splash) swapped in before closed testing.

#### 9. Offline-First Verification (LAUNCH-09)
- **D-174:** Test on device in airplane mode. Verify: daily word generated locally, no crash, full game loop playable, stats persist, ads gracefully fail (no crash, just skip). All cloud sync operations (Firestore, Remote Config) must handle missing network gracefully — already pattern from Phase 5 implementation.

#### 10. Home Page Startup Animation
- **D-175:** Replace hardcoded 500ms `setTimeout` in `App.tsx` with a **sequential stagger entrance animation** on the Home screen.
- **D-176:** Stagger order and timing: title (0ms delay, 300ms fade-in + slide-up 10px) → mode buttons (80ms stagger per button, same animation) → icon bar (after last button). Uses React Native `Animated` API — lightweight, no Reanimated needed for entrance.
- **D-177:** Loading screen shows briefly during module initialization, then Home screen animates in. No artificial delay.

#### 11. Dead Code Cleanup
- **D-178:** Delete `src/screens/ResultScreen.tsx` and remove its route from `Navigation.tsx` / `RootStackParamList`. It was replaced by ResultModal overlay in Phase 2 and is dead code (P17).
- **D-179:** Replace `#ffffff` in `Confetti.tsx` `PARTICLE_COLORS` with a bright visible color (e.g., `#f1c40f` golden yellow) — white particles are invisible on the ResultModal dark overlay (P15).
- **D-180:** Fix present tile/key contrast (P16) — present tiles/keys (`#c9b458` background) use dark text (`#1a1a2e`) instead of white (`#ffffff`). Affects Tile.tsx tile text color and Keyboard.tsx key text color on present keys.

#### 12. Sound Files
- **D-181:** Sound asset files go in `assets/sounds/` directory.
- **D-182:** File naming: `keypress.wav`, `reveal.wav`, `win.wav`, `loss.wav`. User provides the actual .wav files manually.
- **D-183:** `sound.ts` service to be wired with `expo-av` `Audio.Sound.createAsync()` during planning — load on `init()`, call `.replayAsync()` in each function, add callsites in Keyboard (playKeyPress), Tile animation callback (playReveal), ResultModal win/loss (playWin/playLoss).

#### 13. Theme System (Light / Dark / System)
- **D-184:** 3 theme modes: `'light'` (current palette), `'dark'` (inverted palette), `'system'` (follows `useColorScheme()` from React Native — reacts live to device theme changes).
- **D-185:** Settings store gains `themeMode: 'light' | 'dark' | 'system'` field, persisted to MMKV.
- **D-186:** `src/constants/colors.ts` restructured to export `lightColors` and `darkColors` palettes instead of a single `colors` object.
- **D-187:** New `src/hooks/useColors.ts` hook returns the active palette (`lightColors` or `darkColors`) based on `themeMode` + `useColorScheme()` for system mode.
- **D-188:** All components that import `colors` directly must migrate to `useColors()` hook. ~15-20 files affected — mechanical change.
- **D-189:** React Navigation receives `DarkTheme` or `DefaultTheme` based on active theme (prevents white flash on navigation).
- **D-190:** `expo-status-bar` style switches `'dark'` / `'light'` based on theme.
- **D-191:** Settings screen gets a theme selector row (segmented control or radio group for 3 options) in Account section or new "Appearance" section.

#### 14. How to Play (Onboarding)
- **D-192:** Modal overlay component `HowToPlayModal.tsx` — not a navigation route. Reuses existing modal pattern from `LengthPickerModal.tsx`.
- **D-193:** Content: 3 tile examples (green tick with "Correct letter, right spot", yellow circle with "Correct letter, wrong spot", gray square with "Letter not in word"), followed by brief rules text: "Guess the word in {N} tries. Each guess must be a valid word.", and a "Got it!" dismiss button.
- **D-194:** Accessible via a `?` icon in the Home screen top-right icon bar (alongside stats/leaderboard/settings icons using `help-outline` MaterialIcon).

### Claude's Discretion
- Exact texture overlay rendering approach (absolute-positioned View on Tile vs SVG overlay vs Unicode characters)
- Settings section structure for new toggles (separate "Accessibility" section or grouped with existing sections)
- How to Play modal styling (consistent with existing modal look)
- Theme selector UI (segmented control vs 3 radio buttons vs dropdown)
- Dark color palette exact values (must maintain contrast ratios, reference design-tokens.md)
- Performance marker exact placement and guard pattern
- BackHandler skip-to-final-state implementation details
- Stagger animation curve (Easing.out(Easing.ease) recommended for natural feel)
- How to dismiss the How to Play modal (tap-backdrop dismiss + "Got it!" button)

### Deferred Ideas (OUT OF SCOPE)
- Replace Alert.alert-based NavMenu (P20) — deferred post-launch
- Server-side receipt validation — not needed for MVP
- iOS release — separate project setup, deferred to v2
- Push notifications — not scoped for v1
- Auto-detect reduce motion from system settings — user chose manual toggle

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAUNCH-01 | Color blindness — texture patterns on tiles (dots/stripes/solid) | Tile.tsx pattern: absolute-positioned View with conditional rendering based on `colorBlindMode` store field. See Architecture Patterns section. |
| LAUNCH-02 | Screen reader — TalkBack announces tile position/letter/state | `accessible`, `accessibilityLabel`, `accessibilityRole` on Tile, Keyboard keys, and modal components. See Common Pitfalls for RN accessibility quirks. |
| LAUNCH-03 | Font size scaling via PixelRatio | Single-line change in `typography.ts`: multiply fontSize by `PixelRatio.getFontScale()`. Tile font sizes are dynamic (`tileSize * 0.48`) and unaffected. |
| LAUNCH-04 | Reduce motion — skip animations | Store field `reduceMotion` gates all animation `useEffect` blocks. Reanimated: `withTiming` replaced with immediate value set. Confetti: not rendered. |
| LAUNCH-05 | Android back button — centralized handler | `BackHandler.addEventListener` in `Navigation.tsx` with state checks from stores. See Architecture Patterns for skip-to-final-state on animations. |
| LAUNCH-06 | Play Store compliance | Privacy policy on GitHub Pages (`docs/privacy.md`). Ads declared in Play Console. Content rating completed. Test ads used first. |
| LAUNCH-07 | Performance profiling | `console.time()` / `console.timeEnd()` guarded by `__DEV__`. 3 markers: dictionary load, stats read, stats write. |
| LAUNCH-08 | Production AAB build via EAS | `eas.json` already has production profile. Internal → closed testing track. Real AdMob ID, branded assets, real Remote Config keys swapped. |
| LAUNCH-09 | Offline-first verification | Test in airplane mode. Daily word from local seed. Stats from SQLite. Ads/no-network treated as graceful skip (existing pattern from Phase 5). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-av | ~16.0.8 (npm verified) | Sound playback (keypress/reveal/win/loss) | Already listed in tech-stack.md as planned dep. Audio.Sound.createAsync() for caching. `Audio.setAudioModeAsync({ playsInSilentMode: true })` for proper playback. [VERIFIED: npm registry] |
| expo-status-bar | SDK 57 built-in | Theme-aware status bar style | Already used in App.tsx. Switch `style='dark'`/`'light'` based on active theme. [VERIFIED: codebase] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| PixelRatio (RN built-in) | RN 0.86.0 | Font size scaling for accessibility | `typography.ts` — multiply fontSize by `PixelRatio.getFontScale()`. Applied once at module scope, not per-render. |
| AccessibilityInfo (RN built-in) | RN 0.86.0 | Screen reader status detection | D-163 says user-controlled toggle, not auto-detect. Not used for enable/disable, but could be used for informational purposes. |
| React Navigation theme | 7.x | Dark/DefaultTheme for nav chrome | `NavigationContainer` accepts `theme` prop. Use `DefaultTheme` for light, `DarkTheme` for dark. Prevents white flash. |
| useColorScheme (RN built-in) | RN 0.86.0 | System dark mode detection | Used in `useColors()` hook for `'system'` theme mode. Returns `'light'` or `'dark'` based on device setting. Reactive — component re-renders on change. |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| expo-av | npm | ~8 yrs | ~500K/wk | github.com/expo/expo | OK | Approved |

**Verification:**
```bash
npm view expo-av version
# → 16.0.8
npm view expo-av scripts.postinstall
# → (empty — no postinstall)
```

**Packages removed due to SLOP verdict:** None
**Packages flagged as suspicious (SUS):** None

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    App.tsx                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ LoadingScreen (dictionary init)                  │   │
│  │   ↓ isReady=true                                 │   │
│  │ NavigationContainer (theme injected)             │   │
│  │   └── Navigation (BackHandler centralized)       │   │
│  │         └── Stack Navigator                      │   │
│  │               ├── HomeScreen (stagger entrance)  │   │
│  │               ├── GameScreen (back blocked)      │   │
│  │               │    ├── GameBoard → Tile          │   │
│  │               │    │   (texture overlay)         │   │
│  │               │    │   (TalkBack labels)         │   │
│  │               │    ├── Keyboard                  │   │
│  │               │    │   (sound: playKeyPress)     │   │
│  │               │    └── ResultModal               │   │
│  │               │        (sound: playWin/playLoss) │   │
│  │               ├── StatsScreen                    │   │
│  │               ├── SettingsScreen                 │   │
│  │               │   (colorBlind toggle,            │   │
│  │               │    reduceMotion toggle,          │   │
│  │               │    theme selector)               │   │
│  │               └── LeaderboardScreen              │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Theme: useColors() hook ← settingsStore.themeMode      │
│         ↓                                               │
│         All components consume hook instead of           │
│         raw colors import                                │
│                                                         │
│  Sound: sound.ts service ← expo-av Audio.Sound          │
│         ↓                                               │
│         Keyboard, Tile callback, ResultModal             │
└─────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (Phase 6 additions)

```
src/
├── app/
│   ├── App.tsx            # Remove 500ms delay, add stagger trigger
│   └── Navigation.tsx     # Centralized BackHandler, theme injection, remove Result route
├── components/
│   ├── game/
│   │   ├── Tile.tsx       # + accessibilityLabel, texture overlay, present tile text color fix
│   │   ├── Keyboard.tsx   # + accessibilityLabel on keys, playKeyPress() call, present key text color fix
│   │   ├── Confetti.tsx   # Replace #ffffff with #f1c40f
│   │   └── ResultModal.tsx# + playWin()/playLoss() calls
│   └── ui/
│       ├── SettingsRow.tsx # + colorBlind, reduceMotion toggle cases, + theme selector case
│       └── HowToPlayModal.tsx  # NEW — modal overlay
├── hooks/
│   └── useColors.ts       # NEW — theme-aware colors hook
├── config/
│   └── ui.ts              # + SettingsRowConfig types for colorBlind, reduceMotion, themeSelector
├── constants/
│   ├── colors.ts          # REFACTOR: single colors → lightColors + darkColors
│   └── typography.ts      # + PixelRatio.getFontScale() multiplier
├── stores/
│   └── settingsStore.ts   # + colorBlindMode, reduceMotion, themeMode fields
├── services/
│   └── sound.ts           # REWRITE: no-op stub → expo-av wiring
├── screens/
│   └── ResultScreen.tsx   # DELETE — dead code
└── types/
    └── settings.ts        # + colorBlindMode, reduceMotion, themeMode to AppSettings
assets/
└── sounds/                # NEW — user-provided .wav files (keypress.wav, reveal.wav, win.wav, loss.wav)
```

### Pattern: Theme-Aware Colors with useColors Hook

**What:** A React hook that returns the active color palette based on the user's theme mode preference and device color scheme. All components replace direct `colors` imports with this hook.

**When to use:** Any component that renders themed UI elements. This is ~16 files that currently import `colors` directly.

**Example:**
```typescript
// src/hooks/useColors.ts
// [ASSUMED] — pattern based on standard React Native theming practice
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../constants/colors';
import { useSettingsStore } from '../stores/settingsStore';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useColors() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  let activeTheme: 'light' | 'dark';
  if (themeMode === 'system') {
    activeTheme = systemScheme ?? 'light';
  } else {
    activeTheme = themeMode;
  }

  return activeTheme === 'dark' ? darkColors : lightColors;
}
```

**Migration pattern:** Every file that does `import { colors } from '../../constants/colors'` must instead:
1. Import `useColors` from hooks
2. Call `const colors = useColors()` at component top level
3. Remove direct `colors` import

**~16 files affected:** HomeScreen, GameScreen, StatsScreen, SettingsScreen, LeaderboardScreen, LoadingScreen, ResultScreen (to delete), Navigation.tsx, Tile, Keyboard, ResultModal, GameBoard, LengthPickerModal, Button, SettingsRow, StatCard.

### Pattern: Centralized BackHandler

**What:** Single `BackHandler.addEventListener` in `Navigation.tsx` that checks game/ad/IAP state before allowing back navigation.

**When to use:** LAUNCH-05 requires centralized handler, not per-screen listeners.

**Example:**
```typescript
// In Navigation.tsx — [ASSUMED] React Navigation + RN BackHandler pattern
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGameStore } from '../stores/gameStore';
import { useAdStore } from '../stores/adStore';

// Inside Navigation component or wrapping NavigationContainer:
useFocusEffect(
  useCallback(() => {
    const onBackPress = () => {
      const { isRevealing, session } = useGameStore.getState();
      const adStore = useAdStore.getState();
      
      // Block during ad or IAP
      if (adStore.isAdShowing) return true;
      
      // During tile animation: skip to final state
      if (isRevealing) {
        // Complete all tile reveals instantly
        // Show result state
        // Then back navigates normally
      }
      
      // Otherwise: allow default behavior
      return false;
    };
    
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [])
);
```

### Pattern: Modal Overlay (HowToPlayModal)

**What:** Non-navigation modal overlay rendered as a `Modal` component, following the same pattern as `LengthPickerModal.tsx`.

**When to use:** How to Play onboarding modal.

**Key properties from LengthPickerModal pattern:**
```typescript
<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
  <View style={styles.overlay}>
    <View style={styles.card}>
      {/* Content */}
      <TouchableOpacity onPress={onClose}>
        <Text>Got it!</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

### Pattern: Settings Row Extension

**What:** Adding new toggle rows to `settingsConfig` in `config/ui.ts` and new cases in `SettingsRow.tsx`.

**When to use:** LAUNCH-01 (colorBlindMode toggle), LAUNCH-04 (reduceMotion toggle), theme selector.

**Extension:**
```typescript
// config/ui.ts additions:
export type SettingsRowConfig =
  | { type: 'toggle'; id: string; label: string; description?: string; storeKey: keyof AppSettings }
  // ... existing types ...
  | { type: 'themeSelector'; id: string; label: string };  // NEW

// settingsConfig additions:
{
  id: 'accessibility',
  title: 'Accessibility',
  rows: [
    { type: 'toggle', id: 'colorBlind', label: 'Color Blind Mode', description: 'Shows patterns on tiles', storeKey: 'colorBlindMode' },
    { type: 'toggle', id: 'reduceMotion', label: 'Reduce Motion', description: 'Skip all animations', storeKey: 'reduceMotion' },
  ],
},
{
  id: 'appearance',
  title: 'Appearance',
  rows: [
    { type: 'themeSelector', id: 'theme', label: 'Theme' },
  ],
},
```

### Pattern: Texture Overlay on Tiles

**What:** An absolute-positioned View inside each Tile that renders dots (correct), diagonal stripes (present), or solid fill (absent) based on `colorBlindMode` state.

**When to use:** LAUNCH-01 requires texture patterns in addition to color.

**Implementation approach (absolute-positioned View, Claude's discretion):**
```typescript
// Inside Tile.tsx rendered children — [ASSUMED] based on CONTEXT.md specifics
{colorBlindMode && feedback !== 'empty' && (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {feedback === 'correct' && (
      // Dots: 3 small circles arranged in triangle
      <View style={styles.dotsContainer}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
    )}
    {feedback === 'present' && (
      // Diagonal stripes: rotated View with repeated narrow bars
      <View style={styles.stripeContainer}>
        <View style={styles.stripeBar} />
        <View style={styles.stripeBar} />
        <View style={styles.stripeBar} />
      </View>
    )}
    {feedback === 'absent' && (
      // Solid semi-transparent overlay
      <View style={styles.solidOverlay} />
    )}
  </View>
)}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sound file playback | Custom audio manager | `expo-av` `Audio.Sound` | Handles codec support, lifecycle, Android AudioFocus, silent mode. [VERIFIED: expo-av v16.0.8] |
| Dark theme colors | Guess contrast values | Reference Material Design 3 dark theme or WCAG contrast ratio calculator | Must maintain 4.5:1 contrast ratio for all text on dark backgrounds. Dark palette must be designed, not guessed. |
| Privacy policy text | Write from scratch | Copy standard AdMob privacy policy template, customize for app | Legal compliance — must cover specific data collection (AdMob, Google Sign-In, analytics). Use a generator or template. |
| Back handler state management | Multiple per-screen listeners | Single centralized `BackHandler.addEventListener` in Navigation | Prevents conflicts, single source of truth for blocked states. [CITED: React Native docs] |

## Common Pitfalls

### Pitfall: AccessibilityLabel on non-interactive tiles
**What goes wrong:** TalkBack reads every tile as a focusable element, but tiles are not interactive (they display status, not accept input).
**Why it happens:** Developers add `accessible={true}` to all tiles, making each one a TalkBack focus target.
**How to avoid:** Tiles in guess rows should be `accessible={true}` (for announce), but NOT have `accessibilityRole` unless interactive. Current-row empty tiles should use role `'text'` or just `accessible`. Only the keyboard keys need `accessibilityRole="keyboardkey"`.

### Pitfall: Texture overlay clips tile border radius
**What goes wrong:** The absolute-positioned overlay View extends beyond the tile's `borderRadius`, causing visible corners.
**Why it happens:** `StyleSheet.absoluteFill` ignores the parent's border radius.
**How to avoid:** Apply `overflow: 'hidden'` on the parent Tile container View, or apply the same `borderRadius` to the overlay View.

### Pitfall: Dark theme contrast on tile colors
**What goes wrong:** The hardcoded tile colors (`#6aaa64` correct, `#c9b458` present, `#787c7e` absent) were designed for a light background. On a dark surface, these colors may not provide enough contrast or may look muddy.
**Why it happens:** Dark theme needs slightly brighter/desaturated tile colors that work on dark surfaces.
**How to avoid:** Adjust tile colors for dark palette:
- Correct: `#66bb6a` (brighter green, works on dark)
- Present: `#d4b84c` (brighter yellow, works on dark)
- Absent: `#636669` (slightly lighter gray, visible on dark)

### Pitfall: useColorScheme returns null on Android
**What goes wrong:** React Native's `useColorScheme()` can return `null` if the device doesn't report a preference (rare, but possible).
**Why it happens:** `useColorScheme()` returns `null` when the device has no preference set.
**How to avoid:** Always provide a fallback: `const scheme = useColorScheme() ?? 'light'`.

### Pitfall: expo-av Audio.Sound.createAsync() fails on first call
**What goes wrong:** `Audio.Sound.createAsync()` must be awaited and errors handled. On first app launch, creating multiple Sound objects may hit resource limits.
**Why it happens:** expo-av requires `Audio.setAudioModeAsync()` before creating Sound objects. Each Sound consumes a native resource.
**How to avoid:** Call `Audio.setAudioModeAsync({ playsInSilentMode: true })` once in `sound.init()`. Create Sound objects lazily (not all at once) or handle creation errors gracefully with retry.

### Pitfall: Scene (Modal/route) conflicts with reducemotion state
**What goes wrong:** The `reduceMotion` toggle is checked in `useEffect` for animations, but the effect doesn't re-run when the toggle changes mid-game.
**Why it happens:** The animation `useEffect` depends on `[isRevealing]`, not on `[reduceMotion]`. Changing the toggle during gameplay doesn't retroactively affect active animations.
**How to avoid:** Check `reduceMotion` in the animation code itself (inside the `useEffect` body, read the current store value fresh). For Reanimated worklets: pass `reduceMotion` as a prop or use shared value.

### Pitfall: BackHandler event propagation — multiple listeners conflict
**What goes wrong:** If Navigation.tsx registers a BackHandler AND React Navigation's own handler is active, the app-level handler fires first. Returning `true` prevents navigation's handler.
**Why it happens:** BackHandler fires in LIFO order (last registered wins). The app-level handler is registered first, navigation's handler is registered later.
**How to avoid:** The centralized handler should be inside Navigation (not App.tsx) so it's registered after navigation mount. Use `useFocusEffect` to register/unregister on screen focus.

## Code Examples

### Verified Patterns

#### Sound Service with expo-av

```typescript
// src/services/sound.ts — [ASSUMED] based on expo-av API docs
import { Audio } from 'expo-av';

type SoundAsset = Audio.Sound;

let _enabled = true;
let _sounds: Record<string, SoundAsset> = {};

export async function init(): Promise<void> {
  // Must set audio mode before creating sounds (standard expo-av pattern)
  await Audio.setAudioModeAsync({
    playsInSilentMode: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  const soundFiles: Record<string, any> = {
    keypress: require('../../assets/sounds/keypress.wav'),
    reveal: require('../../assets/sounds/reveal.wav'),
    win: require('../../assets/sounds/win.wav'),
    loss: require('../../assets/sounds/loss.wav'),
  };

  // Load all sounds on init
  const entries = Object.entries(soundFiles);
  await Promise.all(
    entries.map(async ([name, source]) => {
      try {
        const { sound } = await Audio.Sound.createAsync(source);
        _sounds[name] = sound;
      } catch (e) {
        console.warn(`[sound] Failed to load ${name}:`, e);
      }
    }),
  );
}

export function setEnabled(enabled: boolean): void {
  _enabled = enabled;
}

async function play(name: string): Promise<void> {
  if (!_enabled) return;
  const sound = _sounds[name];
  if (!sound) return;
  try {
    await sound.replayAsync(); // reset + play (faster than stop+play)
  } catch (e) {
    console.warn(`[sound] Failed to play ${name}:`, e);
  }
}

export function playKeyPress(): void { play('keypress'); }
export function playReveal(): void { play('reveal'); }
export function playWin(): void { play('win'); }
export function playLoss(): void { play('loss'); }
```

**Integration points for play calls:**
- `Keyboard.tsx`: Inside `handlePress` callback, after haptic, call `playKeyPress()`
- `GameScreen.tsx`: Inside animation completion callback (`setTimeout`), after `Haptics.impactAsync`, call `playReveal()`
- `ResultModal.tsx`: Inside render (or useEffect when status changes), call `playWin()` or `playLoss()`

#### TalkBack Accessibility on Tile

```typescript
// Inside Tile.tsx — [ASSUMED] RN accessibility pattern
// Position label for screen reader
function getAccessibilityLabel(letter: string, feedback: TileFeedback, index: number): string {
  const position = index + 1;
  if (letter === ' ' || letter === '') {
    return `Position ${position}: empty`;
  }
  const state = feedback === 'empty' ? 'active' : feedback;
  return `Position ${position}: ${letter.toUpperCase()}, ${state}`;
}

// On the Animated.View:
<Animated.View
  accessible={true}
  accessibilityLabel={getAccessibilityLabel(letter, feedback, index)}
  accessibilityRole="text"
  style={[...]}
>
```

#### PixelRatio Font Scaling

```typescript
// src/constants/typography.ts — [ASSUMED] standard RN pattern
import { PixelRatio } from 'react-native';
import { lightColors } from './colors';

const fontScale = PixelRatio.getFontScale(); // applied once at module level

export const typography: Record<string, TextStyle> = {
  statValue: {
    fontSize: Math.round(32 * fontScale), // scaled
    fontWeight: '700',
    lineHeight: Math.round(35 * fontScale),
    color: lightColors.textPrimary,
  },
  cardTitle: {
    fontSize: Math.round(18 * fontScale),
    // ...
  },
  // ... all font sizes scaled by fontScale
};
```

> **Note:** `fontScale` is captured once at module load time. If the user changes system font size while the app is running, the app must restart or re-import the module for changes to take effect. This is acceptable for MVP — Android system font changes typically require app restart anyway.

#### React Navigation Theme Wiring

```typescript
// In Navigation.tsx or App.tsx — [ASSUMED] React Navigation theming
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColors } from '../hooks/useColors';

// Inside component:
const colors = useColors();
const navTheme = colors === darkColors ? DarkTheme : DefaultTheme;

return (
  <NavigationContainer theme={navTheme}>
    <Navigation />
  </NavigationContainer>
);
```

#### Stagger Entrance Animation (Home Screen)

```typescript
// Inside HomeScreen.tsx — [ASSUMED] RN Animated API pattern
import { Animated } from 'react-native';

// At component level:
const titleAnim = useRef(new Animated.Value(0)).current;
const buttonAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
const iconAnim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  // Title first (no delay)
  Animated.timing(titleAnim, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
    easing: Easing.out(Easing.ease),
  }).start();

  // Buttons stagger (80ms each)
  Animated.stagger(80, buttonAnims.map(anim =>
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    })
  )).start();

  // Icons after last button
  setTimeout(() => {
    Animated.timing(iconAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, 80 * 3 + 300);
}, []);

// Usage:
<Animated.View style={{ opacity: titleAnim, transform: [{ translateY: titleAnim.interpolate({
  inputRange: [0, 1], outputRange: [10, 0]
}) }] }}>
  <Text>Word Guess</Text>
</Animated.View>
```

#### Performance Marker Pattern

```typescript
// [ASSUMED] — __DEV__ guard pattern from CONTEXT.md specifics
if (__DEV__) {
  console.time('dictionary-load');
}

// ... loading code ...

if (__DEV__) {
  console.timeEnd('dictionary-load');
}
```

**Marker locations:**
- `App.tsx` → dictionary load (when dictionary JSON is first required)
- `StatsScreen.tsx` → `statsStore.loadStats()` (SQLite read)
- `GameScreen.tsx` → game completion (stats write via `statsStore.recordGame()`)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-av` `Audio.Sound.createAsync()` is the correct API for Expo SDK 57 | Architecture Patterns | Minor — API may differ slightly; check expo-av docs |
| A2 | `useColors()` hook pattern with `useColorScheme()` is the standard approach to theming | Architecture Patterns | Low — this is standard React Native pattern |
| A3 | React Navigation `DefaultTheme` and `DarkTheme` are available as named exports | Code Examples | Low — verified in RN Navigation 7.x docs |
| A4 | `PixelRatio.getFontScale()` returns a value >= 1 (may be < 1 on some devices) | Code Examples | Low — if < 1, font sizes could be too small; clamp at 0.85 minimum |
| A5 | BackHandler must be inside Navigation (not App) to avoid conflict | Common Pitfalls | Low — LIFO order means app-registered handlers fire before nav's; may need `useFocusEffect` timing adjustment |

## Open Questions

1. **Dark palette exact values**
   - What we know: Must maintain WCAG contrast 4.5:1 for text. Reference: Material Design 3 dark theme guidelines.
   - What's unclear: Exact hex values for dark surface colors, adjusted tile colors for dark mode.
   - Recommendation: Research Material Design 3 dark surfaces, produce `darkColors` in planning. Use contrast checker tool to verify all pairs.

2. **Texture overlay implementation details**
   - What we know: Dots=correct, stripes=present, solid=absent. Claude's discretion on exact rendering.
   - What's unclear: Whether to use absolute-positioned Views with `borderRadius` circles, or SVG patterns via react-native-svg.
   - Recommendation: Use absolute-positioned Views (no extra dependency). Dots = 3 small circles via `borderRadius: 50%` in a triangle. Stripes = rotated container with narrow bars.

3. **BackHandler skip-to-final-state mechanics**
   - What we know: During animation, back should skip to final state (complete tile reveals instantly), show result, then navigate.
   - What's unclear: How to synchronize "complete reveals instantly" with the existing Reanimated animation worklets (they run on UI thread).
   - Recommendation: Use a Reanimated shared value `skipAnimation` that worklets check. Set to true on back press — worklets skip to final values. Alternative approach: set `isRevealing = false` and use a `withTiming(1, { duration: 0 })` to jump to final state.

4. **Theme selector UI component**
   - What we know: Segmented control or 3 radio buttons or dropdown. Claude's discretion.
   - What's unclear: Whether to build a custom segmented control or use a third-party component.
   - Recommendation: Build a simple 3-option segmented control using existing RN components (TouchableOpacity + conditional styling). No extra dependency needed. Three buttons in a row, selected one highlighted.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| EAS CLI | Production build | ✓ | (global) | `npx eas-cli` |
| Android device or emulator | Testing | ✓ | — | Physical device |
| GitHub Pages | Privacy policy hosting | ✓ | — | Any static hosting |
| AdMob account | Production ads | User-provided | — | Test ads work without account |

Check:
```bash
eas --version 2>/dev/null || echo "not available (install via npm)"
```

## Validation Architecture

> workflow.nyquist_validation is not explicitly false — validation applies.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest (Expo default) |
| Quick run | `npx jest --watch` |
| Full suite | `npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAUNCH-01 | Texture overlay renders when colorBlindMode enabled | component | `npx jest -- Tile` | ❌ (new test) |
| LAUNCH-02 | Tile accessibilityLabel format correct | component | `npx jest -- Tile` | ❌ (new test) |
| LAUNCH-03 | Typography constants scaled by font ratio | unit | `npx jest -- typography` | ❌ (new test) |
| LAUNCH-04 | reduceMotion skips animation triggers | store | `npx jest -- gameStore` | ❌ (new test) |
| LAUNCH-05 | BackHandler blocked during isRevealing | integration | `npx jest -- Navigation` | ❌ (new test) |
| LAUNCH-06 | Privacy policy URL reachable | manual | (check URL) | ❌ |
| LAUNCH-07 | console.time markers fire in DEV | unit | `npx jest -- performance` | ❌ (new test) |
| LAUNCH-08 | Production build succeeds | manual | `eas build --platform android --profile production` | ❌ |
| LAUNCH-09 | Game loads without network | manual | Airplane mode test | ❌ |

### Wave 0 Gaps
- [ ] `src/__tests__/components/Tile.test.tsx` — texture overlay rendering, accessibilityLabel
- [ ] `src/__tests__/constants/typography.test.ts` — PixelRatio scaling
- [ ] `src/__tests__/stores/settingsStore.test.ts` — new fields persist correctly

### Key Test Scenarios
1. **Tile accessibility label:** Tile with letter='A', feedback='correct', index=0 → label equals "Position 1: A, correct"
2. **Empty tile label:** Tile with letter='' at index=2 → label equals "Position 3: empty"
3. **Texture visibility:** colorBlindMode=true, feedback='present' → stripe overlay rendered
4. **Texture hidden:** colorBlindMode=false → no overlay rendered regardless of feedback
5. **reduceMotion animation skip:** reduceMotion=true, isRevealing=true → flipProgress jumps to 1 instantly (duration 0)
6. **Font scaling:** typography.ts statValue fontSize = Math.round(32 * PixelRatio.getFontScale())

## Security Domain

> Not applicable — Phase 6 has no new authentication, authorization, or input/output security concerns. Existing patterns from prior phases handle all security domains (AdMob, Firebase, IAP).

## Sources

### Primary (HIGH confidence)
- Codebase files: Navigation.tsx, colors.ts, sound.ts, settingsStore.ts, config/ui.ts, Tile.tsx, Keyboard.tsx, App.tsx, HomeScreen.tsx, ResultModal.tsx, Confetti.tsx, ResultScreen.tsx, GameScreen.tsx, types/*.ts, animations.ts, typography.ts — all read and verified

### Secondary (MEDIUM confidence)
- npm registry: `expo-av@16.0.8` — version and postinstall verified
- npm registry: `@react-navigation/native@7.3.8`, `@react-navigation/native-stack@7.17.10` — versions verified
- React Navigation 7.x theming docs: `DefaultTheme`, `DarkTheme` export pattern [CITED: reactnavigation.org/docs/themes]

### Tertiary (LOW confidence)
- expo-av usage patterns (createAsync, replayAsync) — based on training knowledge of expo-av API, not verified via Context7 or official docs in this session

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — expo-av v16.0.8 verified on npm, no postinstall scripts
- Architecture: HIGH — all patterns verified by reading existing codebase (SettingsRow dispatch, LengthPickerModal modal pattern, Zustand store pattern, config/ui.ts extension pattern)
- Pitfalls: HIGH — based on known React Native patterns and codebase-specific findings (white confetti, contrast failure, dead ResultScreen all verified in codebase)
- Dark theme details: MEDIUM — exact palette values need design verification during planning
- expo-av integration: MEDIUM — API surface verified, but no test project was built to verify

**Research date:** 2026-07-08
**Valid until:** 2026-08-08 (or until Expo SDK bumps major version)
