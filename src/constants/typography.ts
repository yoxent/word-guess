import type { TextStyle } from 'react-native';
import { FONTS } from '../utils/fonts';

/**
 * Largest system font multiplier applied to scalable Text.
 * Dense chrome (modals, cards, home title) overflows above this.
 * Tiles/keys/pills opt out with noFontScaling.
 */
export const MAX_FONT_SIZE_MULTIPLIER = 1.15;

/** Spread onto Text that must stay inside a fixed box (tiles, keys, pills). */
export const noFontScaling = {
  allowFontScaling: false,
} as const;

/** Spread onto Text that should scale, with the layout-safe cap. */
export const cappedFontScaling = {
  maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
} as const;

const small: TextStyle = {
  fontFamily: FONTS.caption,
  fontSize: 13,
  fontWeight: '600', // must match FONTS.caption or RN falls back to system font
  lineHeight: 17,
  letterSpacing: 0.2,
};

/**
 * Typography scale — Fraunces (display) + DM Sans (UI).
 *
 * Color is intentionally NOT included here — apply per-theme color from
 * useTheme() in each consumer. This keeps typography pure sizing/weight
 * while colors stay reactive to theme switching.
 *
 * fontSize/lineHeight are design sizes. React Native scales Text via
 * allowFontScaling, capped at MAX_FONT_SIZE_MULTIPLIER (see App.tsx).
 * Do not multiply by PixelRatio.getFontScale() here — that double-scales.
 */
export const typography: Record<string, TextStyle> = {
  /** Hero text — app title, win/loss announcements. */
  display: {
    fontFamily: FONTS.display,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.6,
  },
  /** Section headings — card titles, screen headers. */
  heading: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.2,
  },
  /** Card / section title — inside StatCard, settings sections. */
  cardTitle: {
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 23,
  },
  /** Settings row label — toggle labels, menu items. */
  settingsRow: {
    fontFamily: FONTS.label,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  /** Body text — descriptions, definitions, secondary content. */
  body: {
    fontFamily: FONTS.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  /** Stat value — big numbers on stats cards. */
  statValue: {
    fontFamily: FONTS.display,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  /** Stat label — small labels under stat values. */
  statLabel: {
    fontFamily: FONTS.caption,
    fontSize: 12,
    fontWeight: '600', // must match FONTS.caption or RN falls back to system font
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  /** Button text — primary/secondary button labels. */
  button: {
    fontFamily: FONTS.button,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  /**
   * Small script — captions, badges, hints, microcopy.
   * Same typeface/weight as Guess Distribution counts (DM Sans SemiBold).
   */
  small,
  /** Alias used by a few screens that still say `caption`. */
  caption: small,
} as const;
