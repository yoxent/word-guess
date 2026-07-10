import { PixelRatio } from 'react-native';
import type { TextStyle } from 'react-native';
import { FONTS } from '../utils/fonts';

const fontScale = PixelRatio.getFontScale();

/**
 * Typography scale — 2026-07-10 redesign.
 *
 * Display / heading / cardTitle / statValue / button use Nunito (loaded
 * via expo-font). Body / settingsRow / statLabel / small use the system
 * font for readability at smaller sizes.
 *
 * Color is intentionally NOT included here — apply per-theme color from
 * useTheme() in each consumer. This keeps typography pure sizing/weight
 * while colors stay reactive to theme switching.
 */
export const typography: Record<string, TextStyle> = {
  /** Hero text — app title, win/loss announcements. Nunito 800. */
  display: {
    fontFamily: FONTS.display,
    fontSize: Math.round(40 * fontScale),
    fontWeight: '800',
    lineHeight: Math.round(44 * fontScale),
  },
  /** Section headings — card titles, screen headers. Nunito 700. */
  heading: {
    fontFamily: FONTS.heading,
    fontSize: Math.round(24 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(29 * fontScale),
  },
  /** Card / section title — inside StatCard, settings sections. Nunito 700. */
  cardTitle: {
    fontFamily: FONTS.heading,
    fontSize: Math.round(18 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(23 * fontScale),
  },
  /** Settings row label — toggle labels, menu items. System font 500. */
  settingsRow: {
    fontSize: Math.round(16 * fontScale),
    fontWeight: '500',
    lineHeight: Math.round(24 * fontScale),
  },
  /** Body text — descriptions, definitions, secondary content. System font 400. */
  body: {
    fontSize: Math.round(15 * fontScale),
    fontWeight: '400',
    lineHeight: Math.round(22 * fontScale),
  },
  /** Stat value — big numbers on stats cards. Nunito 800. */
  statValue: {
    fontFamily: FONTS.display,
    fontSize: Math.round(32 * fontScale),
    fontWeight: '800',
    lineHeight: Math.round(35 * fontScale),
  },
  /** Stat label — small labels under stat values. System font 600. */
  statLabel: {
    fontSize: Math.round(12 * fontScale),
    fontWeight: '600',
    lineHeight: Math.round(16 * fontScale),
    textTransform: 'uppercase',
  },
  /** Button text — primary/secondary button labels. Nunito 700. */
  button: {
    fontFamily: FONTS.heading,
    fontSize: Math.round(17 * fontScale),
    fontWeight: '700',
    lineHeight: Math.round(22 * fontScale),
  },
  /** Small text — captions, badges, fine print. System font 500. */
  small: {
    fontSize: Math.round(13 * fontScale),
    fontWeight: '500',
    lineHeight: Math.round(18 * fontScale),
  },
} as const;
