import type { AppSettings } from '../types/settings';
import { config } from '../constants/config';

// ── Stats Screen ──

export interface StatCardConfig {
  id: string;
  title: string;
  type: 'overview' | 'byLength' | 'guessDistribution';
  order: number;
}

// ── Settings Screen ──

export interface SettingsSectionConfig {
  id: string;
  title: string;
  rows: SettingsRowConfig[];
}

export type SettingsRowConfig =
  | { type: 'toggle'; id: string; label: string; description?: string; helpText?: string; storeKey: keyof AppSettings }
  | { type: 'placeholder'; id: string; label: string; description: string }
  | { type: 'info'; id: string; label: string; value: string }
  | { type: 'restore'; id: string; label: string; description?: string }
  | { type: 'purchase'; id: string; label: string; description?: string; productId: string }
  | { type: 'signInButton'; id: string }  // Phase 5
  | { type: 'themeSelector'; id: string; label: string }  // Phase 6 (06-01)
  // Phase 6 (07-09): 3-position volume slider for BGM and SFX.
  | { type: 'volumeSlider'; id: string; label: string; description?: string; storeKey: 'bgmVolume' | 'sfxVolume' };

// ── Config Arrays ──

export const statsConfig: StatCardConfig[] = [
  { id: 'overview', title: 'Overview', type: 'overview', order: 0 },
  { id: 'byLength', title: 'By Word Length', type: 'byLength', order: 1 },
  { id: 'distribution', title: 'Guess Distribution', type: 'guessDistribution', order: 2 },
];

export const settingsConfig: SettingsSectionConfig[] = [
  // 2026-07-09: reordered per user request. Account first (the action
  // that matters most to a new user), then Audio & Haptics (where the
  // user customizes their experience), then Appearance (theme is global
  // and one of the first things people want to set), then Accessibility.
  {
    id: 'account',
    title: 'Account',
    rows: [
      { type: 'signInButton', id: 'signIn' },
      { type: 'info', id: 'proStatus', label: 'Pro', value: '—' },
      { type: 'purchase', id: 'removeAds', label: 'Remove Ads · $1.99', description: 'One-time purchase, removes all ads forever', productId: config.proProductId },
      { type: 'restore', id: 'restorePurchases', label: 'Restore Purchases' },
    ],
  },
  {
    id: 'audioHaptics',
    title: 'Audio & Haptics',
    rows: [
      { type: 'volumeSlider', id: 'bgm', label: 'Background Music', storeKey: 'bgmVolume' },
      { type: 'volumeSlider', id: 'sfx', label: 'Sound Effects', storeKey: 'sfxVolume' },
      {
        type: 'toggle',
        id: 'haptic',
        label: 'Haptic Feedback',
        storeKey: 'hapticEnabled',
        helpText: 'A short vibration when you tap keys or submit a guess.',
      },
    ],
  },
  {
    id: 'appearance',
    title: 'Appearance',
    rows: [
      { type: 'themeSelector', id: 'theme', label: 'Theme' },
      {
        type: 'toggle',
        id: 'reduceMotion',
        label: 'Simpler Animations',
        description: 'Skip tile flips, confetti, and other effects',
        helpText:
          'Turns off tile flip animations, confetti, and other motion effects for a calmer experience.',
        storeKey: 'reduceMotion',
      },
    ],
  },
];

// Extension notes for future phases:
// Phase 4 (04-01): Added maxExtraGuessesFree/maxExtraGuessesPro split
// Phase 4 (04-02): Added restore, purchase row types and Account section rows
// Phase 5: Swap placeholder → signInButton row in account section
// Phase 6 (06-01): Added Appearance section (themeSelector, simpler animations toggle)
// 2026-07-09: Added volumeSlider row type (continuous slider). Replaced
// the prior soundEnabled toggle AND the 3-position segmented control with
// a real slider. The persisted state schema didn't need a version bump —
// old 3-position values (0, 0.75, 1) are still valid numbers in the
// continuous [0, 1] range.
