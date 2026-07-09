# Theme System

updated: 2026-07-09
tags: [theme, colors, useTheme, semantic, design-system, architecture]
related: [tech-stack, architecture, design-tokens, ui-config-registry]

## Purpose

The theme system is the single source of truth for "what color means what" in the app. Every `<View>`, `<Text>`, `MaterialIcons`, and `Switch` reads its colors from a semantic `Theme` object — never a flat hex value, never a hardcoded literal.

This exists to prevent the "two ways to do the same thing" anti-pattern that produced [P30](./key-risks.md) — a `ToggleRow` using a module-level `styles` object without any `color` property, so the label was black on dark in dark theme (unreadable). With semantic names, the type system forces every color to be explicitly chosen from a known-good mapping.

## File layout

| File | Role |
|------|------|
| `src/constants/colors.ts` | Raw flat palettes: `lightColors` and `darkColors` (the only place hex values are defined) |
| `src/types/theme.ts` | `ThemeColors` and `Theme` type definitions — the contract |
| `src/hooks/useTheme.ts` | `useTheme()` hook + `buildSemantic()` builder that maps flat → semantic |
| `src/hooks/useColors.ts` | `@deprecated` — returns the raw flat palette. Only used internally by the builder. Safe to delete once the migration is fully verified. |

## Semantic structure

```ts
interface Theme {
  colors: {
    mode: 'light' | 'dark';

    surface: { background; card; header };
    text:    { primary; secondary; inverse; onPresent };
    button:  { primary: {bg, fg}; secondary: {bg, fg, border}; danger: {bg, fg}; ghost: {fg} };
    toggle:  { trackActive; trackInactive; thumb };
    icon:    { primary; accent; muted; inverse };
    tile:    { correct; present; absent; empty; border };
    key:     { correct; present; absent; unused; text; special; actionText };
    status:  { success; danger; accent; accentDark };
  };
}
```

### Key design decisions

| Decision | Why |
|----------|-----|
| **Buttons have `{bg, fg, border}` slots** | One variant = one object lookup. No more "which color is the button background again" — `button.primary.bg` is the answer. The Button component resolves a uniform `{bg, fg, border}` shape for every variant so its JSX is identical. |
| **`text.onPresent` is a separate token** | The yellow present tile/key is similar in both light and dark themes, so the same dark text (`#1a1a2e`) passes WCAG AA in both. Was hardcoded in Tile.tsx and Keyboard.tsx before the refactor. |
| **`icon.*` is separate from `text.*`** | Icons have different needs — a nav-bar icon uses `icon.primary` (= `text.primary`), but a sign-in button icon uses `icon.accent` (= `status.accent`), and an icon ON an accent button uses `icon.inverse` (= `text.inverse`). Naming makes the call site self-documenting. |
| **`status.accent` lives in `status` not `color`** | It's the "primary interactive accent" — a status role that happens to also be used for buttons, toggles, and indicators. The semantic name is the role; the hex is implementation. |
| **`mode` is on the theme, not the hook** | Consumers can read `theme.colors.mode` for branching logic (e.g. Navigation passes `DarkTheme` vs `DefaultTheme`). The old approach used object identity (`colors === darkColors`) which is brittle. |
| **No `colors.*` flat export, no `accent` field at the top level** | Forcing every consumer to traverse a semantic name (`button.primary.bg`) is the whole point. A flat `colors.accent` shortcut would invite the same P30-style anti-pattern. |

## Usage

```tsx
import { useTheme } from '../hooks/useTheme';

function MyComponent() {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.surface.card }}>
      <Text style={{ color: theme.colors.text.primary }}>Hello</Text>
      <MaterialIcons name="settings" size={24} color={theme.colors.icon.primary} />
      <Switch
        trackColor={{
          false: theme.colors.toggle.trackInactive,
          true: theme.colors.toggle.trackActive,
        }}
        thumbColor={theme.colors.toggle.thumb}
      />
      <Button title="Continue" onPress={...} variant="primary" />  {/* uses theme.colors.button.primary */}
    </View>
  );
}
```

## Mode detection

```tsx
// Theme hook detects mode via system color scheme + user setting
const theme = useTheme();   // { colors: { mode: 'light' | 'dark', ... } }

// Navigation theme
const navTheme = theme.colors.mode === 'dark' ? DarkTheme : DefaultTheme;
```

## Adding a new color

1. Add the hex to BOTH `lightColors` and `darkColors` in `src/constants/colors.ts`
2. Add it to the appropriate semantic group in `buildSemantic()` in `src/hooks/useTheme.ts`
3. Add the field to the `ThemeColors` interface in `src/types/theme.ts` (TypeScript will then enforce its use)
4. Consumers must now import the new semantic name — there's no shortcut

## Adding a new semantic group (e.g. `shadow`)

1. Add the `shadow` group to `ThemeColors` in `src/types/theme.ts`
2. Add the mapping in `buildSemantic()` in `src/hooks/useTheme.ts`
3. TypeScript will require the new group to be present in both light and dark builds

## What was here before

- Pre-2026-07-09: `useColors()` returned a flat object (`{ accent, textPrimary, tileCorrect, ... }`). Every component chose its own color from a flat namespace. This worked for the light theme but produced P30 in dark mode (ToggleRow had a style without a color).
- Pre-2026-07-09: `useColors()` was the only way to get theme colors. No semantic grouping.
- Pre-2026-07-09: `headerText` was a duplicate of `textPrimary` (same hex in both themes). Consolidated into `text.primary`.
