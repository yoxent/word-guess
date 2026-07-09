import { PixelRatio } from 'react-native';
import { colors } from './colors';
import type { TextStyle } from 'react-native';

const fontScale = PixelRatio.getFontScale();

// 5-size type scale for Phase 3+ UI (D-84)
export const typography: Record<string, TextStyle> = {
  statValue: {
    fontSize: Math.round(32 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(35 * fontScale),
    color: colors.textPrimary,
  },
  cardTitle: {
    fontSize: Math.round(18 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(23 * fontScale),
    color: colors.textPrimary,
  },
  settingsRow: {
    fontSize: Math.round(16 * fontScale),
    fontWeight: '400',
    lineHeight: Math.round(24 * fontScale),
    color: colors.textPrimary,
  },
  body: {
    fontSize: Math.round(14 * fontScale),
    fontWeight: '400',
    lineHeight: Math.round(21 * fontScale),
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: Math.round(12 * fontScale),
    fontWeight: '600',
    lineHeight: Math.round(16 * fontScale),
    color: colors.textSecondary,
  },
} as const;
