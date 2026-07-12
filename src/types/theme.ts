/**
 * Semantic theme type — the single source of truth for what colors mean in
 * this app. Components consume via `useTheme()` and ask for semantically
 * named colors (`button.primary.bg`, `toggle.trackActive`, `icon.muted`)
 * instead of raw flat hex values.
 *
 * Updated 2026-07-10: added `brand`, `surface.elevated`, `surface.muted`
 * for the bright playful palette redesign.
 */

export interface ThemeColors {
  /** The active theme mode. 'light' or 'dark' (system mode resolves to one of these). */
  mode: 'light' | 'dark';

  /** Brand colors — the primary interactive palette. */
  brand: {
    /** Primary CTA color — sky blue in light, cyan in dark. */
    primary: string;
    /** Pressed state of primary. */
    primaryDark: string;
    /** Secondary accent — orange. */
    secondary: string;
    /** Tertiary accent — pink. */
    tertiary: string;
  };

  /** Backgrounds — the layers of the visual stack from page-level down to card-level. */
  surface: {
    /** Page background behind cards. */
    background: string;
    /** Raised card / modal / section background. */
    card: string;
    /** Navigation header background. */
    header: string;
    /** Elevated card with shadow. */
    elevated: string;
    /** Subtle section background. */
    muted: string;
  };

  /** Text colors. The `on*` variants are for text on specific colored backgrounds. */
  text: {
    /** Main body / heading text. Same color as the header text in both themes. */
    primary: string;
    /** Labels, captions, table cells, secondary text. */
    secondary: string;
    /** Text on a colored (accent / danger / tile-correct) background. */
    inverse: string;
    /** Dark text on the yellow present tile / key. */
    onPresent: string;
  };

  /** Button styles for `src/components/ui/Button.tsx`. */
  button: {
    /** Solid primary button. Used for primary CTAs (Daily Challenge, Continue, Buy). */
    primary: { bg: string; fg: string; bgDark: string };
    /** Outlined button. Card surface bg, accent text + border. */
    secondary: { bg: string; fg: string; border: string };
    /** Solid danger button. Reserved for destructive actions. */
    danger: { bg: string; fg: string; bgDark: string };
    /** Text-only button, no background or border. */
    ghost: { fg: string };
  };

  /** Switch / toggle control. */
  toggle: {
    /** Track color when the switch is on. */
    trackActive: string;
    /** Track color when the switch is off. */
    trackInactive: string;
    /** Thumb color. */
    thumb: string;
  };

  /** Icon colors for `MaterialIcons` and similar. */
  icon: {
    /** Main header / nav icons. Same as `text.primary`. */
    primary: string;
    /** Accent-colored icons (sign-in arrow, active call-to-action). */
    accent: string;
    /** Muted / secondary / empty-state icons. Same as `text.secondary`. */
    muted: string;
    /** Icons on an accent / danger / tile-correct background. Same as `text.inverse`. */
    inverse: string;
  };

  /** Wordle game tile feedback colors. */
  tile: {
    correct: string;
    present: string;
    absent: string;
    /** Unrevealed tile background. Also used as the inactive toggle track. */
    empty: string;
    /** Border on unrevealed tiles. */
    border: string;
  };

  /** On-screen QWERTY keyboard key colors. */
  key: {
    correct: string;
    present: string;
    absent: string;
    unused: string;
    /** Light blue used for ad letter-hint ghost tile border. */
    hint: string;
    /** Soft fill for letter-hint ghost tile. */
    hintDim: string;
    /** Text on the letter-hint ghost tile. */
    hintText: string;
    /** Text color on an unused letter key. */
    text: string;
    /** Background of the ENTER / BACKSPACE action keys. */
    special: string;
    /** Text color of the ENTER / BACKSPACE action keys. */
    actionText: string;
  };

  /** Semantic status colors. */
  status: {
    success: string;
    danger: string;
    accent: string;
    accentDark: string;
  };
}

export interface Theme {
  colors: ThemeColors;
}
