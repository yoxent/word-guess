export interface AppSettings {
  hardModeEnabled: boolean;
  /**
   * Background music volume. Continuous value in [0, 1]. 0 = silent, 1 = max.
   * Replaces the old `soundEnabled: boolean` toggle and the 3-position
   * `bgmVolume: 0 | 0.75 | 1` slider. Persisted values from either prior
   * schema are still valid (0, 0.75, 1 are all valid numbers).
   */
  bgmVolume: number;
  /**
   * Sound effects volume. Continuous value in [0, 1]. Same semantics as bgmVolume.
   */
  sfxVolume: number;
  hapticEnabled: boolean;
  isPro: boolean;
  /** Color blind mode — shows patterns on tiles in addition to colors */
  colorBlindMode: boolean;
  /** Reduce motion — skips all animations */
  reduceMotion: boolean;
  /** Theme mode: 'light', 'dark', or 'system' (follows device) */
  themeMode: 'light' | 'dark' | 'system';
}
