import type { AppSettings } from '../types/settings';
import type { VolumeLevel } from '../stores/settingsStore';

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
  | { type: 'toggle'; id: string; label: string; description?: string; storeKey: keyof AppSettings }
  | { type: 'placeholder'; id: string; label: string; description: string }
  | { type: 'info'; id: string; label: string; value: string }
  | { type: 'restore'; id: string; label: string; description?: string }
  | { type: 'purchase'; id: string; label: string; description?: string; productId: string }
  | { type: 'signInButton'; id: string }  // Phase 5
  | { type: 'themeSelector'; id: string; label: string }  // Phase 6 (06-01)
  // Phase 6 (07-09): 3-position volume slider for BGM and SFX.
  | { type: 'volumeSelector'; id: string; label: string; description?: string; storeKey: 'bgmVolume' | 'sfxVolume' };

/** The three options for a volumeSelector. Order = array index. */
export const VOLUME_OPTIONS: { value: VolumeLevel; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 0.75, label: 'Default' },
  { value: 1, label: 'Max' },
];

// ── Config Arrays ──

export const statsConfig: StatCardConfig[] = [
  { id: 'overview', title: 'Overview', type: 'overview', order: 0 },
  { id: 'byLength', title: 'By Word Length', type: 'byLength', order: 1 },
  { id: 'distribution', title: 'Guess Distribution', type: 'guessDistribution', order: 2 },
];

export const settingsConfig: SettingsSectionConfig[] = [
  {
    id: 'audioHaptics',
    title: 'Audio & Haptics',
    rows: [
      // 2026-07-09: replaced single soundEnabled toggle with two volume
      // sliders (bgm + sfx). Haptic stays as a binary toggle.
      { type: 'volumeSelector', id: 'bgm', label: 'Background Music', storeKey: 'bgmVolume' },
      { type: 'volumeSelector', id: 'sfx', label: 'Sound Effects', storeKey: 'sfxVolume' },
      { type: 'toggle', id: 'haptic', label: 'Haptic Feedback', storeKey: 'hapticEnabled' },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    rows: [
      { type: 'signInButton', id: 'signIn' },
      { type: 'info', id: 'proStatus', label: 'Pro', value: '—' },
      { type: 'purchase', id: 'removeAds', label: 'Remove Ads · $1.99', description: 'One-time purchase, removes all ads forever', productId: 'com.vorithstudio.wordguess.pro' },
      { type: 'restore', id: 'restorePurchases', label: 'Restore Purchases' },
    ],
  },
  {
    id: 'accessibility',
    title: 'Accessibility',
    rows: [
      { type: 'toggle', id: 'colorBlind', label: 'Color Blind Mode', description: 'Shows patterns on tiles', storeKey: 'colorBlindMode' },
      { type: 'toggle', id: 'reduceMotion', label: 'Reduce Motion', description: 'Skip all animations', storeKey: 'reduceMotion' },
    ],
  },
  {
    id: 'appearance',
    title: 'Appearance',
    rows: [
      { type: 'themeSelector', id: 'theme', label: 'Theme' },
    ],
  },
];

// Extension notes for future phases:
// Phase 4 (04-01): Added maxExtraGuessesFree/maxExtraGuessesPro split
// Phase 4 (04-02): Added restore, purchase row types and Account section rows
// Phase 5: Swap placeholder → signInButton row in account section
// Phase 6 (06-01): Added Accessibility section (colorBlind toggle, reduceMotion toggle) + Appearance section (themeSelector)
// 2026-07-09: Added volumeSelector row type. Replaced soundEnabled toggle
// with bgmVolume + sfxVolume sliders. Persisted state version bumped 1→2
// with a migrate function to convert the old boolean to two numeric volumes.
