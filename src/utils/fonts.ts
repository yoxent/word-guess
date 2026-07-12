/**
 * Font loading — Fraunces (display) + DM Sans (UI).
 *
 * Chosen 2026-07-12 after A/B of three pairings:
 *   A) Fredoka + Plus Jakarta Sans
 *   B) Baloo 2 + Rubik
 *   C) Fraunces + DM Sans  ← locked
 *
 * If fonts fail to load, the app still works with system fonts.
 */
import * as Font from 'expo-font';
import {
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

/** Font family names — use these in StyleSheet text styles. */
export const FONTS = {
  /** Hero / win-loss / big numbers — editorial display serif. */
  display: 'Fraunces_800ExtraBold',
  /** Section titles, card titles. */
  heading: 'Fraunces_700Bold',
  /** Primary button labels. */
  button: 'DMSans_700Bold',
  /** Body copy. */
  body: 'DMSans_400Regular',
  /** Settings row labels, medium UI text. */
  label: 'DMSans_500Medium',
  /** Captions, badges, uppercase microcopy. */
  caption: 'DMSans_600SemiBold',
} as const;

/**
 * Load custom fonts. Call once at app startup (before first render).
 * Returns true on success, false on failure.
 */
export async function loadFonts(): Promise<boolean> {
  try {
    await Font.loadAsync({
      Fraunces_700Bold,
      Fraunces_800ExtraBold,
      DMSans_400Regular,
      DMSans_500Medium,
      DMSans_600SemiBold,
      DMSans_700Bold,
    });
    return true;
  } catch {
    return false;
  }
}
