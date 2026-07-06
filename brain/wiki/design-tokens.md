# design-tokens
updated: 2026-07-06
tags: [design, tokens, spacing, typography, colors, UI]
related: [architecture, ui-config-registry, tech-stack, phase-structure]

## Purpose
System-wide visual design tokens defined by Phase 3 UI-SPEC. Used across stats, settings, and all future UI phases. All values reference existing `colors.ts` and `layout.ts` constants where applicable.

## Spacing scale (multiples of 4)
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding in stat rows |
| sm | 8px | Compact spacing, internal card gaps |
| md | 16px | Default spacing = `layout.screenPadding` |
| lg | 24px | Section padding, card edge padding |
| xl | 32px | Gaps between major card groups |
| 2xl | 48px | Page-level top/bottom padding in ScrollView |

Exceptions: none. Card `borderRadius: 12` (not from tileBorderRadius 6 — intentional visual hierarchy).

## Typography scale (5 sizes)
| Role | Size | Weight | Line Height | Color | Usage |
|------|------|--------|-------------|-------|-------|
| Stat Value | 32px | 700 | 1.1 | `textPrimary` | Big numbers: total games, win count, streaks |
| Card Title / Section Header | 18px | 700 | 1.3 | `textPrimary` | Card headers, settings section titles |
| Settings Row | 16px | 400 | 1.5 | `textPrimary` | Toggle/row labels in Settings |
| Body | 14px | 400 | 1.5 | `textPrimary` | General body text, card descriptions |
| Stat Label | 12px | 600 | 1.3 | `textSecondary` | Labels under stat values; uppercase recommended |

- Placeholder text: Body (14px) + `textSecondary` color
- Reading type scale: 4 sizes (12, 14, 16, 18); 32px is display-only for numeric values
- Implementation: extracted to `src/constants/typography.ts` (D-84) — follows colors.ts/layout.ts pattern

## Color usage conventions
| Role | Color Variable | Hex | Usage |
|------|---------------|-----|-------|
| Dominant (60%) | `colors.background` | #f5f5f0 | Page background behind cards |
| Secondary (30%) | `colors.surface` | #ffffff | Card backgrounds |
| Accent (10%) | `colors.accent` | #4a9eff | Toggle track (active), share CTA, focus indicators ONLY |
| Destructive | `colors.danger` | #e74c3c | Reserved for Phase 4+ — not used in Phase 3 |

Accent NEVER used for: cards, backgrounds, decorative elements.

## Chart colors (guess distribution)
| Element | Color | Hex |
|---------|-------|-----|
| Active bar (count > 0) | `colors.tileCorrect` | #6aaa64 |
| Zero-count bar | `colors.tileEmpty` | #d3d6da |
| Axis labels | `colors.textSecondary` | #787c7e |

## Toggle colors
| Element | Active | Inactive |
|---------|--------|----------|
| Track | `colors.accent` (#4a9eff) | `colors.tileEmpty` (#d3d6da) |
| Thumb | `textInverse` (#ffffff) | `textInverse` (#ffffff) |
| Value text | `textPrimary` (#1a1a2e) | `textSecondary` (#787c7e) |

## WCAG contrast (inherited palette debt)
| Pair | Ratio | AA (text) | AA (large) | Status |
|------|-------|-----------|------------|--------|
| `textPrimary` (#1a1a2e) on `surface` (#fff) | 15.5:1 | ✅ | ✅ | Good |
| `textSecondary` (#787c7e) on `surface` (#fff) | 4.09:1 | ❌ | ✅ | Inherited debt from Phase 1 colors.ts |
| `accent` (#4a9eff) on `surface` (#fff) | 3.31:1 | N/A | N/A | Non-text element |

`textSecondary` (#787c7e) fails WCAG AA for normal text (<18px). Affects stat labels (12px) and secondary text on white backgrounds. Fix: darken to ~#6b6b6b (~4.7:1) in future palette revision, or accept for v1.
