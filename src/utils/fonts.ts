/**
 * Font loading — Nunito display font for headings, titles, and buttons.
 *
 * Loaded once at app startup. Components reference fontFamily strings
 * from this module. If fonts fail to load, the app still works with
 * system fonts — Nunito is purely cosmetic.
 */
import * as Font from 'expo-font';
import {
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

/** Font family names — use these in StyleSheet text styles. */
export const FONTS = {
  heading: 'Nunito_700Bold',
  display: 'Nunito_800ExtraBold',
  /** System font — for body text and labels. */
  body: undefined,
} as const;

/**
 * Load custom fonts. Call once at app startup (before first render).
 * Returns true on success, false on failure. The app works fine
 * without custom fonts — they're purely visual polish.
 */
export async function loadFonts(): Promise<boolean> {
  try {
    await Font.loadAsync({
      Nunito_700Bold,
      Nunito_800ExtraBold,
    });
    return true;
  } catch {
    // Font loading failed — app continues with system fonts
    return false;
  }
}
