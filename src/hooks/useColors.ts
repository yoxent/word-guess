import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../constants/colors';
import { useSettingsStore } from '../stores/settingsStore';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useColors() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const systemScheme = useColorScheme();

  let activeTheme: 'light' | 'dark';
  if (themeMode === 'system') {
    activeTheme = systemScheme === 'dark' ? 'dark' : 'light';
  } else {
    activeTheme = themeMode;
  }

  return activeTheme === 'dark' ? darkColors : lightColors;
}
