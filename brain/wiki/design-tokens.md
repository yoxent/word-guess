# design-tokens
updated: 2026-07-08 (Phase 6 additions — dark palette, PixelRatio scaling, useColors() hook)
tags: [design, tokens, spacing, typography, colors, UI, accessibility, themes]
related: [architecture, ui-config-registry, tech-stack, phase-structure, accessibility]

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
- Phase 6: all fontSize values multiplied by `PixelRatio.getFontScale()` for accessibility scaling. Tile sizes NOT scaled (already dynamic). Layout NOT scaled.

## Color usage conventions (light theme)
| Role | Color Variable | Hex | Usage |
|------|---------------|-----|-------|
| Dominant (60%) | `background` | #f5f5f0 | Page background behind cards |
| Secondary (30%) | `surface` | #ffffff | Card backgrounds |
| Accent (10%) | `accent` | #4a9eff | Toggle track (active), share CTA, focus indicators ONLY |
| Destructive | `danger` | #e74c3c | Reserved for Phase 4+ — not used in Phase 3 |

Accent NEVER used for: cards, backgrounds, decorative elements.

## Dark theme (Phase 6)
`src/constants/colors.ts` restructured into `lightColors` + `darkColors` exports. `useColors()` hook returns active palette based on settingsStore.themeMode. Dark palette requirements:
- Background: dark (~#121212), surface: slightly lighter (~#2a2a3e)
- TextPrimary: near-white (~#e8e8e8), TextSecondary: meets 4.5:1 on dark bg
- Tile colors (correct/present/absent): adjusted for dark background visibility
- Accent: may need slight brightening for dark mode
- Follow Material Design 3 dark theme surface/on-surface guidelines

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
| `textSecondary` (#787c7e) on `tileEmpty` (#d3d6da) — segmented control inactive | 1.4:1 | ❌ | ❌ | **FIXED 2026-07-09** — switched to textPrimary + opacity 0.65 in ThemeSelectorRow |
| `tileAbsent` on `rgba(120,124,126,0.3)` overlay — completed length button | <1.5:1 | ❌ | ❌ | **FIXED 2026-07-09** — textPrimary + opacity 0.5 in LengthPickerModal |

`textSecondary` (#787c7e) fails WCAG AA for normal text (<18px) on white surfaces and on `tileEmpty` (#d3d6da) track. Affects stat labels (12px), table cells, and was the source of the segmented-control readability issue. Pattern adopted after 2026-07-09 audit: anywhere a label sits on `tileEmpty` (segmented controls, toggle tracks), use `textPrimary` + opacity 0.5–0.65 instead of `textSecondary`.

**Phase 6 fix (P16):** present tiles/keys (#c9b458 background) now use dark text (#1a1a2e) instead of white (#ffffff) for contrast compliance.

**Phase 6 fix (P30):** `SettingsRow.ToggleRow` migrated to `useStyles(colors)` so toggle labels get explicit theme-aware color (was the user-reported "Sound Effects blends into dark theme" bug — module-level `styles.label` had no color, so text inherited the OS default).
