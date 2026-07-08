# Phase 6: Pre-Launch & Polish — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-08
**Phase:** 6-Pre-Launch-Polish
**Areas discussed:** Color blindness, Reduce motion, Back handler, Privacy policy, Performance profiling, Production build, Startup animation, Themes, Sound files, How to Play, TalkBack, PixelRatio scaling, Dead code cleanup

---

## Color Blindness (LAUNCH-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Texture overlays | Dots (correct), stripes (present), solid (absent) on tile surface | ✓ |
| Icons only | Unicode icons replacing color entirely | |
| Both textures + icons | Texture overlays + icon overlay | |

**User's choice:** Texture overlays enabled via Settings toggle, OFF by default.
**Notes:** Overlays are visual addition, not replacement of color. Setting toggle in Settings screen.

---

## Reduce Motion (LAUNCH-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Skip all animations | Tile flip, confetti, stat entrance, stagger — all instant | ✓ |
| Fade-only | Keep fade animations, skip flip/confetti | |
| Per-screen control | Different skip per screen | |

**User's choice:** Skip ALL animations, Settings toggle, OFF by default. User-controlled (not system-detected).
**Notes:** Differs from LAUNCH-04 requirement text which said use AccessibilityInfo. User explicitly chose manual toggle.

---

## Back Button Handling (LAUNCH-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Single centralized BackHandler | One listener in Navigation.tsx | ✓ |
| Per-screen BackHandler | Individual listeners per screen | |

**User's choice:** Single centralized BackHandler in Navigation.tsx.
**Notes:** Blocks during tile animation (with skip-to-final-state), ad display, IAP flow.

---

## Privacy Policy (LAUNCH-06)

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub Pages | Host markdown as GitHub Pages site | ✓ |
| Firebase Hosting | Host via Firebase | |
| Policy generator service | Use free privacy policy generator | |

**User's choice:** Host on GitHub Pages.
**Notes:** Covers AdMob data collection, Google Sign-In data.

---

## Performance Profiling (LAUNCH-07)

| Option | Description | Selected |
|--------|-------------|----------|
| console.time markers | Date.now() / console.time at key code paths | ✓ |
| Flipper setup | Full profiling suite setup | |
| Debug overlay HUD | On-screen FPS/timing overlay | |

**User's choice:** console.time markers (recommendation accepted).
**Notes:** Guarded behind __DEV__. Visual FPS check for animations, Flipper fallback if jank detected.

---

## Production Build (LAUNCH-08)

| Option | Description | Selected |
|--------|-------------|----------|
| Full build checklist | Real IDs, branded assets, internal→closed→production | ✓ |

**User's choice:** Proceed with full checklist. All prior discussion areas confirmed as part of build readiness.

---

## Startup Animation (replacing 500ms delay)

| Option | Description | Selected |
|--------|-------------|----------|
| Fade-in | Simple opacity 0→1 on Home screen | |
| Fade + slide-up | Opacity + translateY 20→0 | |
| Sequential stagger | Title → buttons → icons, 80ms stagger | ✓ |
| Logo reveal | Logo zooms center to top, content fills below | |
| Tile-flip branded intro | Animated tiles flipping to spell app name | |

**User's choice:** Sequential stagger (title → mode buttons → icon bar, 80ms stagger, fade-in + slide-up).
**Notes:** Uses RN Animated API (not Reanimated). LoadingScreen still shows briefly, then Home animates in.

---

## Dead Code Cleanup

| Item | Action | Selected |
|------|--------|----------|
| ResultScreen.tsx | Delete file + route from Navigation | ✓ |
| White confetti invisible | Replace #ffffff with visible color | ✓ |
| Present tile contrast | Dark text on yellow tiles | ✓ |

**User's choice:** Clean up all three items + add 3 themes.

---

## Theme System (Light / Dark / System)

| Decision | Selected |
|----------|----------|
| 3 modes: light, dark, system | ✓ |
| themeMode in settingsStore (MMKV) | ✓ |
| colors.ts → lightColors + darkColors | ✓ |
| useColors() hook replaces direct imports | ✓ |
| React Navigation theme injection | ✓ |
| expo-status-bar theme-aware | ✓ |

**User's choice:** Full 3-theme system as part of polish work. Acknowledged as an addition beyond 9 LAUNCH requirements but fits Phase 6 "polish" scope.

---

## Sound Files

| Item | Detail | Selected |
|------|--------|----------|
| Location | assets/sounds/ | ✓ |
| Format | .wav | ✓ |
| Files | keypress.wav, reveal.wav, win.wav, loss.wav | ✓ |
| Wiring | expo-av in sound.ts during planning | ✓ |

**User's choice:** User will place .wav files manually. expo-av wiring done in planning/execution.

---

## How to Play (Onboarding)

| Option | Description | Selected |
|--------|-------------|----------|
| Modal overlay | HowToPlayModal.tsx, triggered from ? icon, not a nav route | ✓ |
| Full navigation screen | Dedicated route in stack navigator | |

**User's choice:** Modal overlay. Shows tile color examples + rules + "Got it!" button. Accessible via ? icon in Home screen icon bar.

---

## TalkBack Detail Level (LAUNCH-02)

| Option | Description | Selected |
|--------|-------------|----------|
| "Position N: letter, state" | Full spatial context | ✓ (recommended) |
| "letter, state" | State only, no position | |
| "A, correct" | Minimal format | |

**User's choice:** Recommendation accepted — "Position N: letter, state" format.

---

## PixelRatio Scaling (LAUNCH-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Typography only | Scale font sizes by PixelRatio.getFontScale() | ✓ |
| Typography + tiles | Also scale tile and layout sizes | |

**User's choice:** Recommendation accepted — typography only. Tiles already dynamic from screen width.

---

## Deferred Ideas

- **Replace Alert.alert-based NavMenu** (P20) — non-standard navigation but functional. Post-launch.
- **Server-side receipt validation** — not needed for MVP.
- **iOS release** — v2.
- **Push notifications** — not scoped for v1.
- **Auto-detect reduce motion from system** — user chose manual toggle, system detection possible enhancement.

---

*Discussion completed: 2026-07-08*
*40 decisions captured (D-155 through D-194)*
