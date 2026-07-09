/**
 * Semantic theme type — the single source of truth for what colors mean in
 * this app. Components consume via `useTheme()` and ask for semantically
 * named colors (`button.primary.bg`, `toggle.trackActive`, `icon.muted`)
 * instead of raw flat hex values.
 *
 * The flat `lightColors` / `darkColors` in `src/constants/colors.ts` are the
 * raw palette tokens. The builder in `src/hooks/useTheme.ts` maps them to
 * this semantic shape. To add a new color, add it to both palettes AND to
 * the builder. To add a new semantic category, add it here AND to the
 * builder — components will fail TypeScript checks if they try to use a
 * category that doesn't exist.
 *
 * This file exists to prevent the "two ways to do the same thing" anti-pattern
 * that produced P30 (a ToggleRow using a module-level style without color,
 * which made the "Sound Effects" label unreadable in dark theme). With
 * semantic names, the type system forces every color to be explicitly chosen
 * from a known-good mapping.
 */

export interface ThemeColors {
  /** The active theme mode. 'light' or 'dark' (system mode resolves to one of these). */
  mode: 'light' | 'dark';

  /** Backgrounds — the layers of the visual stack from page-level down to card-level. */
  surface: {
    /** Page background behind cards. */
    background: string;
    /** Raised card / modal / section background. */
    card: string;
    /** Navigation header background. */
    header: string;
  };

  /** Text colors. The `on*` variants are for text on specific colored backgrounds. */
  text: {
    /** Main body / heading text. Same color as the header text in both themes. */
    primary: string;
    /** Labels, captions, table cells, secondary text. */
    secondary: string;
    /** Text on a colored (accent / danger / tile-correct) background. */
    inverse: string;
    /**
     * Dark text on the yellow `present` tile / key. Both themes use #1a1a2e
     * (P16 / D-180) because the present background is a similar warm yellow
     * in both light and dark themes — dark text on yellow passes WCAG AA.
     */
    onPresent: string;
  };

  /** Button styles for `src/components/ui/Button.tsx`. */
  button: {
    /** Solid accent button. Used for primary CTAs (Daily Challenge, Continue, Buy). */
    primary: { bg: string; fg: string };
    /** Outlined button. Card surface bg, accent text + border. */
    secondary: { bg: string; fg: string; border: string };
    /** Solid danger button. Reserved for destructive actions (not used in v1). */
    danger: { bg: string; fg: string };
    /** Text-only button, no background or border. */
    ghost: { fg: string };
  };

  /** Switch / toggle control. */
  toggle: {
    /** Track color when the switch is on. */
    trackActive: string;
    /** Track color when the switch is off. */
    trackInactive: string;
    /** Thumb color (RN's `Switch` does not differentiate active/inactive thumb). */
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
    /** Unrevealed tile background. Also used as the inactive toggle track (`toggle.trackInactive`). */
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
    /** Text color on an unused letter key. */
    text: string;
    /** Background of the ENTER / BACKSPACE action keys. */
    special: string;
    /** Text color of the ENTER / BACKSPACE action keys (same as `text.inverse`). */
    actionText: string;
  };

  /** Semantic status colors. `accent` / `accentDark` are also used in many non-status contexts. */
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
