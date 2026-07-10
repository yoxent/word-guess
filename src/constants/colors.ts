/**
 * Color palette — Bright, playful, modern casual game identity.
 *
 * Replaced Wordle's muted earth tones (olive green, mustard yellow,
 * dark navy, off-white) with a vibrant sky-blue / green / coral palette.
 *
 * Two complete palettes: light and dark. Both share the same semantic
 * mapping in useTheme.ts — adding a token here automatically applies
 * to both themes.
 */
export const lightColors = {
  // ── Tile feedback ──
  tileCorrect: '#4CAF50',    // bright green — correct letter + position
  tilePresent: '#FFD54F',    // bright yellow — correct letter, wrong spot
  tileAbsent: '#B0BEC5',     // blue-gray — letter not in word
  tileEmpty: '#E3F2FD',      // light blue — unrevealed tile bg
  tileBorder: '#90CAF9',     // medium blue — unrevealed tile border

  // ── Keyboard keys ──
  keyCorrect: '#4CAF50',     // match tile correct
  keyPresent: '#FFD54F',     // match tile present
  keyAbsent: '#B0BEC5',      // match tile absent
  keyUnused: '#E3F2FD',      // unused key bg (matches tile empty)
  keyText: '#37474F',        // dark blue-gray — text on unused keys
  keySpecial: '#CFD8DC',     // light blue-gray — ENTER/BACKSPACE bg

  // ── Surface & background ──
  background: '#F0F7FF',     // very light blue — page background
  surface: '#FFFFFF',        // white — card backgrounds
  surfaceElevated: '#FFFFFF', // raised cards (shadow adds elevation)
  surfaceMuted: '#F5F9FF',   // subtle section bg
  headerBackground: '#E3F2FD', // light blue — nav header bg

  // ── Text ──
  textPrimary: '#263238',    // dark blue-gray — main text
  textSecondary: '#78909C',  // blue-gray — labels, captions
  textInverse: '#FFFFFF',    // white — text on colored bg
  headerText: '#263238',     // header text (matches textPrimary)

  // ── Brand / accent ──
  accent: '#29B6F6',         // sky blue — primary interactive
  accentDark: '#0288D1',     // darker sky blue — pressed accent
  primary: '#42A5F5',        // vibrant blue — buttons, CTAs
  primaryDark: '#1E88E5',    // pressed primary button
  secondary: '#FFA726',      // orange — secondary actions
  tertiary: '#F48FB1',       // pink — decorative accents

  // ── Status ──
  danger: '#FF7043',         // coral — error, destructive
  success: '#66BB6A',        // bright green — success, win
} as const;

export const darkColors = {
  // ── Tile feedback ──
  tileCorrect: '#66BB6A',    // bright green (lighter for dark bg)
  tilePresent: '#FFD54F',    // bright yellow
  tileAbsent: '#546E7A',     // slate — muted blue-gray
  tileEmpty: '#1E3A5F',      // dark blue — empty tile
  tileBorder: '#37474F',     // darker border

  // ── Keyboard keys ──
  keyCorrect: '#66BB6A',     // match tile correct
  keyPresent: '#FFD54F',     // match tile present
  keyAbsent: '#546E7A',      // match tile absent
  keyUnused: '#1E3A5F',      // unused key bg
  keyText: '#B0BEC5',        // light text on dark keys
  keySpecial: '#37474F',     // ENTER/BACKSPACE bg

  // ── Surface & background ──
  background: '#0D1B2A',     // deep navy — page bg
  surface: '#1B2838',        // dark blue — card bg
  surfaceElevated: '#243447', // elevated cards
  surfaceMuted: '#152232',   // subtle section bg
  headerBackground: '#152232', // dark header

  // ── Text ──
  textPrimary: '#ECEFF1',    // near-white — main text
  textSecondary: '#90A4AE',  // blue-gray — labels
  textInverse: '#263238',    // dark — text on light bg (rare in dark theme)
  headerText: '#ECEFF1',     // header text

  // ── Brand / accent ──
  accent: '#4FC3F7',         // light cyan — brighter for dark bg
  accentDark: '#29B6F6',     // cyan — pressed
  primary: '#4FC3F7',        // light cyan — buttons
  primaryDark: '#29B6F6',    // pressed primary
  secondary: '#FFB74D',      // orange (lighter for dark bg)
  tertiary: '#F48FB1',       // pink

  // ── Status ──
  danger: '#FF8A65',         // coral (lighter for dark bg)
  success: '#81C784',        // green (lighter for dark bg)
} as const;

export type AppColor = keyof typeof lightColors;
