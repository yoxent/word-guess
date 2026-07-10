import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../constants/colors';
import { useSettingsStore } from '../stores/settingsStore';
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

    brand: {
      primary: raw.primary,
      primaryDark: raw.primaryDark,
      secondary: raw.secondary,
      tertiary: raw.tertiary,
    },

    surface: {
      background: raw.background,
      card: raw.surface,
      header: raw.headerBackground,
      elevated: raw.surfaceElevated,
      muted: raw.surfaceMuted,
    },

    text: {
      primary: raw.textPrimary,
      secondary: raw.textSecondary,
      inverse: raw.textInverse,
      // Present tile/key background is a similar warm yellow in both
      // themes, so dark text works for both.
      onPresent: '#37474F',
    },

    button: {
      primary: { bg: raw.primary, fg: '#FFFFFF', bgDark: raw.primaryDark },
      secondary: { bg: raw.surface, fg: raw.accent, border: raw.accent },
      danger: { bg: raw.danger, fg: '#FFFFFF', bgDark: raw.accentDark },
      ghost: { fg: raw.accent },
    },

    toggle: {
      trackActive: raw.accent,
      trackInactive: raw.tileEmpty,
      thumb: '#FFFFFF',
    },

    icon: {
      primary: raw.textPrimary,
      accent: raw.accent,
      muted: raw.textSecondary,
      inverse: '#FFFFFF',
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
      actionText: raw.textPrimary,
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
 * color groups (brand / surface / text / button / toggle / icon / tile / key / status)
 * for the active theme.
 *
 * Mode is resolved from `settingsStore.themeMode` ('light' | 'dark' | 'system')
 * plus the OS color scheme. Resolves to 'light' or 'dark' before building.
 */
export function useTheme(): Theme {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  const raw = isDark ? darkColors : lightColors;
  return { colors: buildSemantic(raw, isDark ? 'dark' : 'light') };
}
