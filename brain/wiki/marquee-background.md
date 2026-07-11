# marquee-background
updated: 2026-07-11
tags: [ui, animation, background, homepage]
related: [frontend-overhaul, design-tokens, architecture]

## Purpose
Slow-moving decorative icon grid behind home screen content to add visual liveliness without distracting from gameplay options.

## Component: `MarqueeBackground`
- **File:** `src/components/ui/MarqueeBackground.tsx`
- **Rendered in:** HomeScreen, before all other content (behind top bar + scroll content)
- **Touch-through:** `pointerEvents="none"` — does not block interactions

## Grid config
| Parameter | Value | Detail |
|-----------|-------|--------|
| Icons | 15 game-themed MaterialIcons | `abc`, `spellcheck`, `text-fields`, `keyboard`, `grid-view`, `auto-awesome`, `star`, `diamond`, `casino`, `translate`, `extension`, `psychology`, `lightbulb`, `school`, `emoji-events` |
| Columns | 5 | Evenly spaced across screen width |
| Spacing X | SCREEN_WIDTH / 5 | ~72dp on 360dp screen |
| Spacing Y | 58dp | Row height |
| Icon size | 16-24px | Random jitter for organic feel |
| Opacity | 0.04 (light) / 0.06 (dark) | Very subtle — adds texture, not noise |

## Animation
- **Direction:** Upward drift (icons float up)
- **Duration:** 120 seconds per full cycle — slow and gentle, no distraction
- **Driver:** `Animated.loop` with `Animated.timing`, `Easing.linear`
- **Native driver:** `true` — no JS thread impact
- **Seamless loop:** Icon pattern repeats every VISIBLE_ROWS. Grid height = 2× screen height. Loop translates from 0 to -LOOP_HEIGHT and resets — repeated pattern makes reset imperceptible.

## Design decisions
| Decision | Rationale |
|----------|-----------|
| Game-themed icons (not generic) | Reinforces brand identity, feels intentional |
| Very low opacity | Adds depth without competing with content or harming contrast |
| Upward drift | Gentle, natural feeling — like bubbles rising |
| Slow speed (2min cycle) | Perceptible but not attention-grabbing |
| Random size jitter | Organic feel vs rigid grid — avoids looking like a tiled texture |
