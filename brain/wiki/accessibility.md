# accessibility
updated: 2026-07-11 (Simpler Animations in Appearance, settings help tooltips)
tags: [accessibility, talkback, color-blindness, reduce-motion, pixelratio]
related: [architecture, design-tokens, animation-system, ui-config-registry, key-risks]

## Phase 6 additions — 4 accessibility features

All implemented in Phase 6 (Pre-Launch & Polish). Controlled via Settings toggles, OFF by default except PixelRatio (always active).

## TalkBack screen reader (LAUNCH-02)

- Tile announcements: `"Position {N}: {letter}, {state}"` — e.g., `"Position 1: A, correct"`
- Empty tile: `"Position {N}: empty"`
- Keyboard keys: letter name only; Enter = "Enter", Backspace = "Backspace"
- `accessible`, `accessibilityLabel`, `accessibilityRole` props on all interactive elements (tiles, keys, buttons, modals)
- Every component imported `accessibility.ts` (or inline) — zero existing coverage before Phase 6

## Color blindness textures (LAUNCH-01)

| Tile state | Texture | Implementation |
|-----------|---------|----------------|
| Correct (green) | Dots pattern | Small circles via absolute-positioned View |
| Present (yellow) | Diagonal stripes | Narrow rotated View elements |
| Absent (gray) | Solid fill | Full opacity overlay |

- Settings toggle `colorBlindMode`, OFF by default
- Overlay rendered on top of Tile (absolute inset 0) — visual addition, not color replacement
- Toggle in settingsStore persisted via MMKV

## Simpler Animations (LAUNCH-04, formerly "Reduce Motion")

- Settings toggle `reduceMotion`, label **Simpler Animations** — under **Appearance** (not a separate Accessibility section)
- OFF by default — user-controlled, NOT system-detected
- `helpText` on toggle; (?) opens Alert with explanation
- When ON: skip tile flip, confetti, stat entrance, home stagger — instant results
- Separate from system `AccessibilityInfo.isReduceMotionEnabled()`

## PixelRatio font scaling (LAUNCH-03)

- Typography `fontSize` values multiplied by `PixelRatio.getFontScale()` in `src/constants/typography.ts`
- Tile sizes NOT scaled — already dynamic from screen width (caps 56px, floors 32px)
- Layout spacing NOT scaled — would break tight keyboard layout
- Applied at constant definition time, not runtime hook
