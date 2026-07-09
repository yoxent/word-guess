import { useColors } from './useColors';
import { lightColors, darkColors } from '../constants/colors';
import type { Theme, ThemeColors } from '../types/theme';

/**
 * Build a semantic theme from the raw flat palette. Both light and dark
 * share the same builder so semantic mappings are guaranteed identical
 * across themes — if you add a mapping here, you don't need to remember
 * to also add it for the other palette.
 */
function buildSemantic(
  raw: typeof lightColors | typeof darkColors,
  mode: 'light' | 'dark',
): ThemeColors {
  return {
    mode,

    surface: {
      background: raw.background,
      card: raw.surface,
      header: raw.headerBackground,
    },

    text: {
      primary: raw.textPrimary,
      secondary: raw.textSecondary,
      inverse: raw.textInverse,
      // P16 / D-180: present tile/key background is a similar warm yellow in
      // both themes, so the same dark text works for both. Hardcoded in
      // Tile.tsx and Keyboard.tsx before this refactor.
      onPresent: '#1a1a2e',
    },

    button: {
      primary: { bg: raw.accent, fg: raw.textInverse },
      secondary: { bg: raw.surface, fg: raw.accent, border: raw.accent },
      danger: { bg: raw.danger, fg: raw.textInverse },
      ghost: { fg: raw.accent },
    },

    toggle: {
      trackActive: raw.accent,
      trackInactive: raw.tileEmpty,
      thumb: raw.textInverse,
    },

    icon: {
      primary: raw.textPrimary,
      accent: raw.accent,
      muted: raw.textSecondary,
      inverse: raw.textInverse,
    },

    tile: {
      correct: raw.tileCorrect,
      present: raw.tilePresent,
      absent: raw.tileAbsent,
      empty: raw.tileEmpty,
      border: raw.tileBorder,
    },

    key: {
      correct: raw.keyCorrect,
      present: raw.keyPresent,
      absent: raw.keyAbsent,
      unused: raw.keyUnused,
      text: raw.keyText,
      special: raw.keySpecial,
      actionText: raw.textInverse,
    },

    status: {
      success: raw.success,
      danger: raw.danger,
      accent: raw.accent,
      accentDark: raw.accentDark,
    },
  };
}

/**
 * Semantic theme hook. Returns a fully-built `Theme` object with named
 * color groups (button / toggle / icon / tile / key / status) for the
 * active theme.
 *
 * Use this instead of `useColors()` in new code. `useColors()` returns the
 * raw flat palette and is kept only for backwards compatibility — it will
 * be removed in a follow-up commit once all consumers have migrated.
 *
 * @example
 *   const theme = useTheme();
 *   <View style={{ backgroundColor: theme.colors.button.primary.bg }}>
 *     <Text style={{ color: theme.colors.button.primary.fg }}>Continue</Text>
 *   </View>
 */
export function useTheme(): Theme {
  const raw = useColors();
  // useColors() returns either lightColors or darkColors — both share the
  // same keys, so we can safely use `raw.background === lightColors.background`
  // to detect mode. (Cheaper than re-reading the settings store.)
  const mode: 'light' | 'dark' = raw === darkColors ? 'dark' : 'light';
  return { colors: buildSemantic(raw, mode) };
}
