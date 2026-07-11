# home-background
updated: 2026-07-11
tags: [ui, background, homepage, image, texture-scroll, reanimated]
related: [frontend-overhaul, design-tokens, fabric-crash-patterns]
replaces: marquee-background (animated icon rain)

## Purpose
Subtle game-icon texture behind home screen content. Adds background depth without competing with foreground cards and buttons.

## Why not animated marquee?
The previous `MarqueeBackground` mounted ~42 Reanimated `Animated.View` + MaterialIcons on first paint. That caused Fabric startup SIGSEGV. **UV texture scroll** uses one `Animated.View` transform on a small tiled `Image` grid — same visual idea as material panning, far fewer native views.

## Component: `HomeBackground`
- **File:** `src/components/ui/HomeBackground.tsx`
- **Rendered in:** HomeScreen, lowest z-index sibling
- **Pointer events:** `pointerEvents="none"`

### Both themes — UV-scroll texture
- **Light asset:** `assets/images/home-bg-light.png` (1024×1536)
- **Dark asset:** `assets/images/home-bg-dark.png` (1024×1536)
- **Mechanism:** `ScrollingTexture` builds a `(cols+2) × (rows+2)` grid of `Image` tiles inside one `Animated.View`; `translateX/Y` advances diagonally (south-east) over 25s, modulo tile size for seamless loop
- **Tile sizing:** `Image.resolveAssetSource` + `PixelRatio` — tile width = `min(assetWidthDp, screenWidth) * TEXTURE_SCALE` (currently `1`)
- **Seam fix:** scroll offset snapped to nearest physical pixel (`1 / PixelRatio.get()`) so adjacent tile edges never bleed by a sub-pixel fraction
- **Animation start:** deferred two `requestAnimationFrame` ticks after mount (Fabric safety)
- **reduceMotion:** frozen at offset 0

### Asset design
- Both PNGs share the same icon layout, rotation, scale, and spacing (light derived from dark mask)
- Icons: letters A–D, star, trophy, lightbulb, diamond, controller, rocket, puzzle piece
- **Light palette:** bg `#F0F7FF`, icons `#AACAE9` (theme `surface.background` + muted blue)
- **Dark palette:** bg `#091D33`, icons `#1E3954`
- Tiles must be **seamless** on all edges for invisible UV loop

## Design notes
- Page `backgroundColor` (`theme.colors.surface.background`) fills any gaps during scroll
- Cards/pills still need opaque backgrounds (see `architecture.md`)

## Replacing a texture
1. Edit or replace `assets/images/home-bg-dark.png` (master layout)
2. Regenerate light from dark so spacing stays matched — project dark bg→icon color axis onto light palette (see session notes 2026-07-11)
3. Keep 1024×1536 or update `tileDimensions()` if aspect ratio changes

## Fabric crash history
See `fabric-crash-patterns.md` §9. Safe to use Reanimated here because only **one** animated container exists; tile count scales with screen size but stays O(screen/tile) `Image` views with no per-icon worklets.
