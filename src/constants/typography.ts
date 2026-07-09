import { PixelRatio } from 'react-native';
import type { TextStyle } from 'react-native';

const fontScale = PixelRatio.getFontScale();

// 5-size type scale for Phase 3+ UI (D-84)
// Note: color is intentionally NOT included here — apply per-theme color from useColors() in each
// consumer. This lets typography remain a pure type/sizing/weight constant while colors stay
// reactive to theme switching.
export const typography: Record<string, TextStyle> = {
  statValue: {
    fontSize: Math.round(32 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(35 * fontScale),
  },
  cardTitle: {
    fontSize: Math.round(18 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(23 * fontScale),
  },
  settingsRow: {
    fontSize: Math.round(16 * fontScale),
    fontWeight: '400',
    lineHeight: Math.round(24 * fontScale),
  },
  body: {
    fontSize: Math.round(14 * fontScale),
    fontWeight: '400',
    lineHeight: Math.round(21 * fontScale),
  },
  statLabel: {
    fontSize: Math.round(12 * fontScale),
    fontWeight: '600',
    lineHeight: Math.round(16 * fontScale),
  },
} as const;
