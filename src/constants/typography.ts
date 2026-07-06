import { colors } from './colors';
import type { TextStyle } from 'react-native';

// 5-size type scale for Phase 3+ UI (D-84)
export const typography: Record<string, TextStyle> = {
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 35,
    color: colors.textPrimary,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
    color: colors.textPrimary,
  },
  settingsRow: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    color: colors.textSecondary,
  },
} as const;
