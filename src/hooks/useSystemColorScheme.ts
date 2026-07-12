import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Appearance,
  useColorScheme,
  type AppStateStatus,
  type ColorSchemeName,
} from 'react-native';

export function resolveSystemColorScheme(
  appearanceScheme: ColorSchemeName,
  hookScheme: ColorSchemeName,
): 'light' | 'dark' {
  return appearanceScheme === 'dark' || hookScheme === 'dark' ? 'dark' : 'light';
}

/**
 * OS light/dark preference with live updates.
 * Read both Appearance and useColorScheme: Android dev-client builds have
 * shown cases where only one path reports the current system theme promptly.
 */
export function useSystemColorScheme(): 'light' | 'dark' {
  const hookScheme = useColorScheme();
  const readCurrentScheme = useCallback(
    () => resolveSystemColorScheme(Appearance.getColorScheme(), hookScheme),
    [hookScheme],
  );

  const [scheme, setScheme] = useState<'light' | 'dark'>(
    () => readCurrentScheme(),
  );

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(resolveSystemColorScheme(colorScheme, hookScheme));
    });
    return () => subscription.remove();
  }, [hookScheme]);

  useEffect(() => {
    setScheme(readCurrentScheme());
  }, [readCurrentScheme]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        setScheme(readCurrentScheme());
      }
    });
    return () => subscription.remove();
  }, [readCurrentScheme]);

  return scheme;
}
