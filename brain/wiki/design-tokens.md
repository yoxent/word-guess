# design-tokens
updated: 2026-07-12 (Fraunces + DM Sans typography)
tags: [design, tokens, spacing, typography, colors, UI, accessibility, themes]
related: [architecture, ui-config-registry, tech-stack, phase-structure, accessibility, frontend-overhaul, theme-system, mixed-driver-animation-crash]

## Purpose
System-wide visual design tokens. Bright playful palette (sky blue / green / coral). Typography: Fraunces for display/headings, DM Sans for UI body/buttons/labels.

## Spacing scale (multiples of 4)
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps, inline padding in stat rows |
| sm | 8px | Compact spacing, internal card gaps |
| md | 16px | Default spacing = `layout.screenPadding` |
| lg | 24px | Section padding, card edge padding |
| xl | 32px | Gaps between major card groups |
| 2xl | 48px | Page-level top/bottom padding in ScrollView |

## Border radius tokens
| Token | Value | Where |
|-------|-------|-------|
| tile | 8px | Game tiles (was 6) |
| keyboardKey | 8px | Keyboard keys (was 6) |
| card | 16px | StatCard, settings sections (was 12) |
| button | 20px | All buttons — pill shape (was 12) |
| modal | 24px | All modals (was 16-20) |
| segment | 12px | Theme selector segments |

## Typography scale (Fraunces + DM Sans)
| Role | Size | Weight | Font | Usage |
|------|------|--------|------|-------|
| display | 40px | 800 | Fraunces | App title, win/loss announcements |
| heading | 24px | 700 | Fraunces | Section headings, screen titles |
| cardTitle | 18px | 700 | Fraunces | Card headers, settings sections |
| button | 17px | 700 | DM Sans | Button labels |
| statValue | 32px | 800 | Fraunces | Big numbers on stats cards |
| settingsRow | 16px | 500 | DM Sans | Toggle/row labels |
| body | 15px | 400 | DM Sans | General body text |
| small | 13px | 600 | DM Sans | Captions, badges |
| statLabel | 12px | 600 | DM Sans | Labels under stats, uppercase |

- All fontSize values multiplied by `PixelRatio.getFontScale()` for accessibility
- Tile sizes NOT scaled (already dynamic from screen width)

## Color palette (light theme)
| Category | Token | Hex |
|----------|-------|-----|
| Tile correct | tileCorrect | #4CAF50 |
| Tile present | tilePresent | #FFD54F |
| Tile absent | tileAbsent | #B0BEC5 |
| Tile empty | tileEmpty | #E3F2FD |
| Tile border | tileBorder | #90CAF9 |
| Background | background | #F0F7FF |
| Surface | surface | #FFFFFF |
| Surface elevated | surfaceElevated | #FFFFFF |
| Surface muted | surfaceMuted | #F5F9FF |
| Header | headerBackground | #E3F2FD |
| Text primary | textPrimary | #263238 |
| Text secondary | textSecondary | #78909C |
| Accent | accent | #29B6F6 |
| Primary | primary | #42A5F5 |
| Primary dark | primaryDark | #1E88E5 |
| Secondary | secondary | #FFA726 |
| Tertiary | tertiary | #F48FB1 |
| Danger | danger | #FF7043 |
| Success | success | #66BB6A |

## Color palette (dark theme)
| Category | Token | Hex |
|----------|-------|-----|
| Background | background | #0D1B2A |
| Surface | surface | #1B2838 |
| Tile empty | tileEmpty | #1E3A5F |
| Accent | accent | #4FC3F7 |
| Text primary | textPrimary | #ECEFF1 |

## Semantic theme groups
| Group | Fields | Purpose |
|-------|--------|---------|
| brand | primary, primaryDark, secondary, tertiary | Interactive palette |
| surface | background, card, header, elevated, muted | Visual layers |
| text | primary, secondary, inverse, onPresent | Text colors |
| button | primary{bg,fg,bgDark}, secondary{bg,fg,border}, danger{bg,fg,bgDark}, ghost{fg} | Buttons |
| toggle | trackActive, trackInactive, thumb | Switches |
| icon | primary, accent, muted, inverse | Icons |
| tile | correct, present, absent, empty, border | Game tiles |
| key | correct, present, absent, unused, text, special, actionText | Keyboard |
| status | success, danger, accent, accentDark | Status colors |

## WCAG contrast (post-overhaul, both themes verified)
| Pair | Ratio | Status |
|------|-------|--------|
| textPrimary on surface (light) | ~15:1 | ✅ AAA |
| textSecondary on surface (light) | ~5:1 | ✅ AA |
| text.onPresent on tilePresent | ~10:1 | ✅ AAA |
| brand.primary on surface | ~3:1 | N/A (non-text) |
| textPrimary on surface (dark) | ~12.5:1 | ✅ AAA |
| textSecondary on surface (dark) | ~4.8:1 | ✅ AA |
| white on brand.primary (dark) | ~8.4:1 | ✅ AAA |
| white on danger (dark) | ~5.2:1 | ✅ AA |
