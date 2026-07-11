import { useEffect, useState } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';

/**
 * OS light/dark preference with live updates.
 * Prefer Appearance API over useColorScheme() — more reliable on Android
 * dev builds where AppearanceModule may not expose colorScheme to the hook.
 */
export function useSystemColorScheme(): 'light' | 'dark' {
  const [scheme, setScheme] = useState<ColorSchemeName>(
    () => Appearance.getColorScheme(),
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  return scheme === 'dark' ? 'dark' : 'light';
}
