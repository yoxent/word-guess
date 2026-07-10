# frontend-overhaul
updated: 2026-07-10
tags: [ui, redesign, visual, palette, font, animation, phase-7]
related: [design-tokens, theme-system, tech-stack, architecture, animation-system]

## Goal
Transform from "Wordle clone with muted earth tones" to "bright, playful, family-friendly casual game."

## Locked decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tile palette | Full bright overhaul (not Wordle-recognizable) | Differentiated identity, not a clone |
| Home screen | Mode cards + decorative elements + daily preview | Visual identity, not a button list |
| Microinteractions | Playful — spring press, card lift, color shift | Game-like feel, satisfying feedback |
| Typography | Display font (Nunito) for headings + system body | Brand personality without heavy bundle |
| Dark theme | Brighten to match new identity, keep as option | Don't remove — expand the palette |

## 7-phase plan

| Phase | Name | Status |
|-------|------|--------|
| 1 | Design Foundation (colors, fonts, tokens, theme) | ✅ Complete |
| 2 | Component Overhaul (Button, Card, Modal, SettingsRow) | ✅ Complete |
| 3 | Home Screen (mode cards, daily preview, branding) | 🔜 Next |
| 4 | Game Screen (header, keyboard, tiles, toast) | Pending |
| 5 | Stats/Leaderboard/Settings | Pending |
| 6 | Dark Theme Alignment | Pending |
| 7 | Microinteraction Polish | Pending |

## Phase 1 — Design Foundation (complete)

### New palette (replaces Wordle muted earth tones)

| Category | Light | Dark |
|----------|-------|------|
| Tile correct | #4CAF50 (bright green) | #66BB6A |
| Tile present | #FFD54F (bright yellow) | #FFD54F |
| Tile absent | #B0BEC5 (blue-gray) | #546E7A |
| Tile empty | #E3F2FD (light blue) | #1E3A5F |
| Background | #F0F7FF (very light blue) | #0D1B2A (deep navy) |
| Surface | #FFFFFF | #1B2838 |
| Accent | #29B6F6 (sky blue) | #4FC3F7 (light cyan) |
| Primary | #42A5F5 (vibrant blue) | #4FC3F7 |
| Secondary | #FFA726 (orange) | #FFB74D |
| Tertiary | #F48FB1 (pink) | #F48FB1 |
| Danger | #FF7043 (coral) | #FF8A65 |
| Success | #66BB6A (bright green) | #81C784 |

### Font system
- Package: `@expo-google-fonts/nunito` + `expo-font`
- Nunito 700 (heading) + Nunito 800 (display) — loaded at startup
- Utility: `src/utils/fonts.ts` — `loadFonts()`, `FONTS.heading`, `FONTS.display`
- Where used: titles, headings, card titles, stat values, button text
- Where NOT used: body text, labels, tile letters (system font)

### Layout token changes
| Token | Old | New |
|-------|-----|-----|
| tileBorderRadius | 6 | 8 |
| keyboardKeyBorderRadius | 6 | 8 |
| cardBorderRadius | 12 | 16 |
| buttonBorderRadius | 12 | 20 (pill) |
| modalBorderRadius | 16-20 | 24 |

## Phase 2 — Component Overhaul (complete)

### Button — full rewrite
- Pill-shaped (borderRadius: 20)
- Spring press: scale 0.95, friction 4, tension 40
- Color shift: bg → bgDark on press (via Animated.Value interpolation)
- Loading state: spinner overlay
- Soft colored shadow (brand color for primary)

### StatCard
- borderRadius: 16 (was 12)
- Left accent border strip (4px, brand.primary)
- Soft colored shadow

### Modals (HowToPlay, LengthPicker, Result)
- Darker overlay: rgba(13,27,42,0.6-0.7) (was rgba(0,0,0,0.5))
- Card borderRadius: 24
- Brand-colored shadow
- Pill-shaped buttons
- Mode icon header in LengthPicker

### SettingsRow
- Theme selector: filled pill segments (sky blue active)
- Purchase row: "Buy" badge (sky blue pill)
- Sign-in: avatar circle with person icon
- Volume slider: larger thumb (26px), thicker track (8px)

## Phase 3 — Home Screen (next)
- Mode cards instead of flat buttons (gradient bg, icon, subtitle, status)
- Daily preview: 6 completion pills per length
- Nunito 800 title, tagline
- Top bar icons: 48×48, circular bg, spring press
- Hard Mode: pill toggle with ⚡ icon

## Files modified in Phase 1-2
- `src/constants/colors.ts` — full rewrite
- `src/constants/layout.ts` — updated radii
- `src/constants/typography.ts` — Nunito + new scale
- `src/types/theme.ts` — brand, surface.elevated/muted, button.bgDark
- `src/hooks/useTheme.ts` — new semantic mappings
- `src/utils/fonts.ts` — new file
- `src/app/App.tsx` — font loading at startup
- `src/components/ui/Button.tsx` — full rewrite
- `src/components/ui/StatCard.tsx` — accent border
- `src/components/ui/HowToPlayModal.tsx` — softer design
- `src/components/ui/SettingsRow.tsx` — pill segments, badges
- `src/components/game/LengthPickerModal.tsx` — icon header, pill buttons
- `src/components/game/ResultModal.tsx` — celebration design

## Full plan
See `.planning/FRONTEND-OVERHAUL-PLAN.md` for complete 7-phase plan with implementation details.
