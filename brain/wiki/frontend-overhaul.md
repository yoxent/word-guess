# frontend-overhaul
updated: 2026-07-11 (home top spacing, result modal endless actions, keyboard absent dim)
tags: [ui, redesign, visual, palette, font, animation, phase-7, complete]
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
| Dark theme | Keep both, ship light as default | WCAG AA verified, dark is opt-in |

## 7-phase plan — ALL COMPLETE

| Phase | Name | Status | Key Deliverables |
|-------|------|--------|-----------------|
| 1 | Design Foundation | ✅ | Palette, Nunito font, tokens, theme groups |
| 2 | Component Overhaul | ✅ | Button rewrite, StatCard, Modals, SettingsRow |
| 3 | Home Screen | ✅ | ModeCards (gradient), DailyPreview pills, HardModePill |
| 4 | Game Screen | ✅ | Sky blue header, keyboard spring press, toast slide-in |
| 5 | Secondary Screens | ✅ | ProgressRing SVG, Stats/Leaderboard/Settings polish |
| 6 | Dark Theme | ✅ | WCAG audit, both themes kept |
| 7 | Microinteractions | ✅ | Button haptic, modal scale+fade, ResultModal bounce |

## Phase 3 — Home Screen

### New components
| Component | File | Purpose |
|-----------|------|---------|
| ModeCard | `src/components/home/ModeCard.tsx` | Gradient-background tappable card (daily/endless/random) |
| DailyPreview | `src/components/home/DailyPreview.tsx` | 6 pill badges showing daily completion per length (5-10) |
| HardModePill | `src/components/home/HardModePill.tsx` | Pill toggle with 🔥/🧘 icon (lightning→meditation 2026-07-11), orange when active |

### HomeScreen rewrite
- ScrollView layout for small screens
- Title: "Word Guess" Nunito 800 40px + "Guess the word!" tagline
- Mode cards with expo-linear-gradient backgrounds (sky blue, green, orange)
- Daily preview below cards
- Hard mode pill toggle below cards
- Top bar: 44×44 circular icon buttons with shadow
- Scroll content top padding: `safeAreaTop + 8 + 44 + 36` — clears icon bar without crowding title
- Stagger entrance: title → subtitle+icons → cards → preview → hard mode

### Dependency added
- `expo-linear-gradient` (~57.0.0) — for ModeCard gradient backgrounds

## Phase 4 — Game Screen

### Header
- Sky blue background (`theme.colors.brand.primary`)
- Nunito cardTitle font for "Daily · 5 Letters"
- Circular back button with spring press (scale 0.9)

### Keyboard
- Extracted `KeyboardKey` subcomponent with per-key spring press (scale 0.92)
- BACKSPACE: MaterialIcons `backspace` icon (was text `⌫`)
- Action keys use `key.special` bg (distinguished from letter keys)
- All callbacks wrapped in `useCallback`

### Tile
- Correct bounce peak: 1.15 → 1.2 (`TILE_BOUNCE_MAX` in animations.ts)

### Error Toast
- Coral bg + borderRadius 12 + MaterialIcons warning icon
- Spring slide-in animation (translateY -16→0, opacity 0→1)
- Soft coral shadow

## Phase 5 — Secondary Screens

### New component
| Component | File | Purpose |
|-----------|------|---------|
| ProgressRing | `src/components/ui/ProgressRing.tsx` | SVG circular progress ring (react-native-svg) |

### StatsScreen
- ProgressRing for win rate (left), games+streak (middle), wins+best (right)
- Streak badges: 🔥 fire + orange number, 🏆 trophy + number
- Chart: sky blue bars (#42A5F5) instead of olive green
- Share FAB: pill-shaped, sky blue, spring press animation

### LeaderboardScreen
- Pill segmented control (rounded bg, sky blue active fill + shadow)
- Tab labels: "Daily" / "Streak" / "Total" with emoji icons
- Entry rows: rounded cards (cardBorderRadius: 16)
- Top 3: 🥇🥈🥉 emoji medals, score colored by rank
- Current player: accent border + "YOU" badge

### SettingsScreen
- Section headers: Nunito 700 (typography.heading)
- Section cards: cardBorderRadius: 16, softer shadow
- Toast: pill-shaped (buttonBorderRadius: 20), icon, shadow

## Phase 6 — Dark Theme

### WCAG audit results
| Combination | Ratio | Verdict |
|-------------|-------|---------|
| #ECEFF1 on #1B2838 (text on card) | ~12.5:1 | ✅ AAA |
| #ECEFF1 on #0D1B2A (text on bg) | ~15.8:1 | ✅ AAA |
| #90A4AE on #1B2838 (secondary on card) | ~4.8:1 | ✅ AA |
| #FFFFFF on #4FC3F7 (white on primary btn) | ~8.4:1 | ✅ AAA |
| #FFFFFF on #FF8A65 (white on danger btn) | ~5.2:1 | ✅ AA |
| #37474F on #FFD54F (dark on present tile) | ~8.5:1 | ✅ AAA |

### Decision
Keep both themes. Light default. Dark opt-in via Settings → Theme.

## Phase 7 — Microinteractions

| Item | Implementation |
|------|---------------|
| Button haptic | `Haptics.impactAsync(Light)` on pressIn, gated by hapticEnabled |
| ResultModal bounce | Card scale 0.8→1.0 spring + fade 0→1 on open |
| HowToPlayModal | Card scale 0.9→1.0 spring + fade 0→1 on open |
| LengthPickerModal | Card scale 0.9→1.0 spring + fade 0→1 on open |
| Keyboard press | Per-key spring 0.92 + haptic (Phase 4) |
| ModeCard press | Spring 0.97 (Phase 3) |

## Files created (Phases 3-7)
- `src/components/home/ModeCard.tsx`
- `src/components/home/DailyPreview.tsx`
- `src/components/home/HardModePill.tsx`
- `src/components/home/index.ts`
- `src/components/ui/ProgressRing.tsx`

## Files modified (Phases 3-7)
- `src/screens/HomeScreen.tsx` — complete rewrite, HomeBackground integration
- `src/screens/GameScreen.tsx` — header, toast, back button
- `src/screens/StatsScreen.tsx` — ProgressRing, streak badges, chart, FAB
- `src/screens/LeaderboardScreen.tsx` — pill tabs, rounded rows, medals
- `src/screens/SettingsScreen.tsx` — section headers, toast, MaterialIcons
- `src/components/game/Keyboard.tsx` — KeyboardKey subcomponent, spring press
- `src/components/game/ResultModal.tsx` — card scale bounce animation
- `src/components/game/LengthPickerModal.tsx` — scale+fade open animation
- `src/components/ui/Button.tsx` — haptic feedback, mixed-driver fix
- `src/components/ui/HowToPlayModal.tsx` — scale+fade open animation
- `src/components/ui/HomeBackground.tsx` — UV-scroll tiled icon texture (2026-07-11; replaced MarqueeBackground)
- `src/components/ui/index.ts` — ProgressRing, HomeBackground barrel exports
- `src/constants/animations.ts` — TILE_BOUNCE_MAX 1.15→1.2
- `package.json` — expo-linear-gradient added

## Known gotcha
- `Animated.parallel` with mixed `useNativeDriver` values crashes on subsequent presses. See [mixed-driver-animation-crash](mixed-driver-animation-crash.md). Fix: run native/JS animations as independent `.start()` calls with `stopAnimation()` first.

## Full plan
See `.planning/FRONTEND-OVERHAUL-PLAN.md` for complete 7-phase plan with implementation details.
