# marquee-background
updated: 2026-07-11
tags: [ui, animation, background, homepage]
related: [frontend-overhaul, design-tokens, architecture]

## Purpose
Subtle diagonal-scrolling game icon grid behind home screen content. Adds background texture without competing with foreground.

## Component: `MarqueeBackground`
- **File:** `src/components/ui/MarqueeBackground.tsx`
- **Rendered in:** HomeScreen, before all content (z-index lowest sibling)
- **Pointer events:** `pointerEvents="none"` — does not block interactions
- **Icons:** MaterialIcons (30 unique game-themed, single brand color)

## Grid config
| Parameter | Value | Detail |
|-----------|-------|--------|
| Columns | 5 | Evenly spread across full width |
| Spacing X | SCREEN_WIDTH / 5 | ~72dp on 360dp screen |
| Spacing Y | 80dp | Row height |
| Icon size | 22px | Uniform across all icons |
| Opacity | 0.2 (light) / 0.15 (dark) | Subtle background layer |
| Icon color | `theme.colors.brand.primary` | Single plain color (#42A5F5 sky blue) |
| Grid size | 2× loop size (W+H) | Seamless repeat in both axes |

## Animation
- **Direction:** Diagonal south-east (icons drift toward bottom-right)
- **Mechanism:** Single `Animated.loop(Animated.parallel([...]))` — both translateX and translateY locked together in one shared loop cycle so they never desync
- **Duration:** ~60s per full cycle
- **Driver:** `Animated.timing` with `Easing.linear`, native driver ON
- **Seamless loop:** Pattern repeats every `COLS`×`ROWS`. Grid is 2× that in each dimension. When translation completes one loop distance, the identical adjacent pattern is in view — reset is imperceptible.

## Design decisions
| Decision | Rationale |
|----------|-----------|
| Single brand color (#42A5F5) | Unified, clean look — not a confetti of random colors |
| Uniform icon size | Consistent grid rhythm, less visual noise |
| Low opacity (0.15-0.2) | Background texture that doesn't distract from gameplay |
| Diagonal SE motion | More dynamic than vertical drift; mimics falling confetti or scrolling game board |
| MaterialIcons (not emoji) | Take brand color prop, consistent with rest of app's icon system |
