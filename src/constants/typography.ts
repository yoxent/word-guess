import { PixelRatio } from 'react-native';
import type { TextStyle } from 'react-native';
import { FONTS } from '../utils/fonts';

const fontScale = PixelRatio.getFontScale();

/**
 * Typography scale — Fraunces (display) + DM Sans (UI).
 *
 * Color is intentionally NOT included here — apply per-theme color from
 * useTheme() in each consumer. This keeps typography pure sizing/weight
 * while colors stay reactive to theme switching.
 */
export const typography: Record<string, TextStyle> = {
  /** Hero text — app title, win/loss announcements. */
  display: {
    fontFamily: FONTS.display,
    fontSize: Math.round(40 * fontScale),
    fontWeight: '800',
    lineHeight: Math.round(46 * fontScale),
    letterSpacing: -0.6,
  },
  /** Section headings — card titles, screen headers. */
  heading: {
    fontFamily: FONTS.heading,
    fontSize: Math.round(24 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(30 * fontScale),
    letterSpacing: -0.2,
  },
  /** Card / section title — inside StatCard, settings sections. */
  cardTitle: {
    fontFamily: FONTS.heading,
    fontSize: Math.round(18 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(23 * fontScale),
  },
  /** Settings row label — toggle labels, menu items. */
  settingsRow: {
    fontFamily: FONTS.label,
    fontSize: Math.round(16 * fontScale),
    fontWeight: '500',
    lineHeight: Math.round(24 * fontScale),
  },
  /** Body text — descriptions, definitions, secondary content. */
  body: {
    fontFamily: FONTS.body,
    fontSize: Math.round(15 * fontScale),
    fontWeight: '400',
    lineHeight: Math.round(22 * fontScale),
  },
  /** Stat value — big numbers on stats cards. */
  statValue: {
    fontFamily: FONTS.display,
    fontSize: Math.round(32 * fontScale),
    fontWeight: '800',
    lineHeight: Math.round(36 * fontScale),
  },
  /** Stat label — small labels under stat values. */
  statLabel: {
    fontFamily: FONTS.caption,
    fontSize: Math.round(12 * fontScale),
    fontWeight: '600',
    lineHeight: Math.round(16 * fontScale),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  /** Button text — primary/secondary button labels. */
  button: {
    fontFamily: FONTS.button,
    fontSize: Math.round(17 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(22 * fontScale),
  },
  /** Small text — captions, badges, fine print. */
  small: {
    fontFamily: FONTS.caption,
    fontSize: Math.round(13 * fontScale),
    fontWeight: '600',
    lineHeight: Math.round(18 * fontScale),
  },
} as const;
