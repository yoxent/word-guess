export interface AppSettings {
  hardModeEnabled: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  isPro: boolean;
  /** Color blind mode — shows patterns on tiles in addition to colors */
  colorBlindMode: boolean;
  /** Reduce motion — skips all animations */
  reduceMotion: boolean;
  /** Theme mode: 'light', 'dark', or 'system' (follows device) */
  themeMode: 'light' | 'dark' | 'system';
}
