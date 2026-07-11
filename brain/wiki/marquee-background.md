# marquee-background
updated: 2026-07-11
tags: [ui, animation, background, homepage, rain-effect, reanimated]
related: [frontend-overhaul, design-tokens, architecture, fabric-crash-patterns]

## Purpose
Subtle diagonal rain of game icons behind home screen content. Adds background texture without competing with foreground.

## Component: `MarqueeBackground`
- **File:** `src/components/ui/MarqueeBackground.tsx`
- **Rendered in:** HomeScreen, before all content (z-index lowest sibling)
- **Pointer events:** `pointerEvents="none"` — does not block interactions
- **Icons:** MaterialIcons (26 unique game-themed, single brand color)

## Rain config
| Parameter | Value | Detail |
|-----------|-------|--------|
| Columns | 6 | Evenly spread across full width |
| Column spacing | SCREEN_WIDTH / 6 | ~60dp on 360dp screen |
| Icons per column | 3 | Staggered vertically |
| Icon size | 22px | Uniform across all icons |
| Opacity | 0.18 (light) / 0.12 (dark) | Subtle background layer |
| Icon color | `theme.colors.brand.primary` | Single plain color (#42A5F5 sky blue) |
| Fall duration | 12s | Full screen traversal |
| East drift | 80px | Horizontal movement during fall |

## Animation
- **Direction:** Diagonal south-east (icons rain down + drift right)
- **Mechanism:** Individual `useSharedValue` per icon — `withRepeat(withTiming(...))` on UI thread
- **Driver:** Reanimated (100% UI-thread, zero JS bridge frame drops)
- **Seamless loop:** Each icon animates from initial Y to SCREEN_HEIGHT, then snaps back to start
- **Stagger:** Columns start at 2s intervals, rows within column at 800ms intervals

## Design decisions
| Decision | Rationale |
|----------|-----------|
| Rain effect over grid marquee | Grid approach caused Fabric crash from too many simultaneous view updates |
| Reanimated over RN Animated | UI-thread animations avoid Fabric mounting bottleneck |
| Individual shared values | Each icon animates independently — no parallel/sync issues |
| Checkerboard pattern | `(col + row) % 2 !== 0` — reduces visual density while maintaining rhythm |
| Icons pre-fill screen | `initialY` computed to distribute icons across full height on mount |

## Fabric crash history
- Grid-based approach with 100+ animated views crashed Fabric's `SurfaceMountingManager`
- Switched to rain effect with ~12 animated views — stable
- See `fabric-crash-patterns.md` for mitigation patterns
