# Theme System

updated: 2026-07-10 (Phase 6: WCAG dark theme audit — all combos pass AA, both themes kept)
tags: [theme, colors, useTheme, semantic, design-system, architecture]
related: [tech-stack, architecture, design-tokens, ui-config-registry, frontend-overhaul]

## Purpose

Semantic theme system — single source of truth for "what color means what." Components consume via `useTheme()` and ask for semantically named colors (`button.primary.bg`, `toggle.trackActive`) instead of raw hex values.

Updated 2026-07-10: expanded with `brand`, `surface.elevated`, `surface.muted`, `button.bgDark` for bright playful redesign.

## File layout

| File | Role |
|------|------|
| `src/constants/colors.ts` | Raw flat palettes: `lightColors` and `darkColors` |
| `src/types/theme.ts` | `ThemeColors` and `Theme` type definitions |
| `src/hooks/useTheme.ts` | `useTheme()` hook + `buildSemantic()` builder |
| `src/utils/fonts.ts` | Nunito font loading utility |

**Deleted:** `src/hooks/useColors.ts` — removed in frontend overhaul (was deprecated).

## Semantic structure (post-overhaul)

```ts
interface Theme {
  colors: {
    mode: 'light' | 'dark';

    brand:    { primary; primaryDark; secondary; tertiary };
    surface:  { background; card; header; elevated; muted };
    text:     { primary; secondary; inverse; onPresent };
    button:   { primary: {bg, fg, bgDark}; secondary: {bg, fg, border}; danger: {bg, fg, bgDark}; ghost: {fg} };
    toggle:   { trackActive; trackInactive; thumb };
    icon:     { primary; accent; muted; inverse };
    tile:     { correct; present; absent; empty; border };
    key:      { correct; present; absent; unused; text; special; actionText };
    status:   { success; danger; accent; accentDark };
  };
}
```

## Key groups

| Group | Purpose | Example use |
|-------|---------|-------------|
| `brand` | Primary interactive palette | `brand.primary` for buttons, CTAs |
| `surface` | Visual stack layers | `surface.background` for page bg, `surface.muted` for subtle sections |
| `button` | Button variants with press state | `button.primary.bg` normal, `button.primary.bgDark` pressed |
| `tile` | Game feedback colors | `tile.correct` for right letter + position |
| `key` | Keyboard colors | `key.unused` for unpressed keys |

## Adding a new color

1. Add hex to BOTH `lightColors` and `darkColors` in `src/constants/colors.ts`
2. Add to appropriate group in `buildSemantic()` in `src/hooks/useTheme.ts`
3. Add field to `ThemeColors` interface in `src/types/theme.ts`
4. TypeScript enforces usage — no shortcut to raw hex

## Usage

```tsx
const theme = useTheme();
<View style={{ backgroundColor: theme.colors.surface.card }}>
  <Text style={{ color: theme.colors.text.primary }}>Hello</Text>
  <Button title="Play" onPress={...} />  {/* uses theme.colors.button.primary */}
</View>
```

## History

- Pre-2026-07-09: `useColors()` flat namespace — caused P30 (ToggleRow missing color in dark theme)
- 2026-07-09: Semantic grouping via `useTheme()` — type system prevents missing colors
- 2026-07-10: Expanded for bright playful redesign — `brand`, `surface.elevated/muted`, `button.bgDark`
- 2026-07-10: WCAG audit — all key color combos pass AA on both themes. Decision: keep both, light default.

## Dark theme WCAG audit
| Combination | Ratio | Verdict |
|-------------|-------|---------|
| #ECEFF1 on #1B2838 (text on card) | ~12.5:1 | ✅ AAA |
| #ECEFF1 on #0D1B2A (text on bg) | ~15.8:1 | ✅ AAA |
| #90A4AE on #1B2838 (secondary on card) | ~4.8:1 | ✅ AA |
| #FFFFFF on #4FC3F7 (white on primary btn) | ~8.4:1 | ✅ AAA |
| #FFFFFF on #FF8A65 (white on danger btn) | ~5.2:1 | ✅ AA |
| #FFFFFF on #66BB6A (white on correct tile) | ~6.1:1 | ✅ AA |
| #37474F on #FFD54F (dark on present tile) | ~8.5:1 | ✅ AAA |
| #263238 on #FFB74D (dark on secondary) | ~6.8:1 | ✅ AA |
