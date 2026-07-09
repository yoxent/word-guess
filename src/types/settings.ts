export interface AppSettings {
  hardModeEnabled: boolean;
  /**
   * Background music volume. 0 = Off, 0.75 = Default, 1 = Max.
   * Replaces the old `soundEnabled: boolean` toggle (added 2026-07-09).
   */
  bgmVolume: 0 | 0.75 | 1;
  /**
   * Sound effects volume. 0 = Off, 0.75 = Default, 1 = Max.
   * Replaces the old `soundEnabled: boolean` toggle (added 2026-07-09).
   */
  sfxVolume: 0 | 0.75 | 1;
  hapticEnabled: boolean;
  isPro: boolean;
  /** Color blind mode — shows patterns on tiles in addition to colors */
  colorBlindMode: boolean;
  /** Reduce motion — skips all animations */
  reduceMotion: boolean;
  /** Theme mode: 'light', 'dark', or 'system' (follows device) */
  themeMode: 'light' | 'dark' | 'system';
}
