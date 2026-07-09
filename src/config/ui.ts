import type { AppSettings } from '../types/settings';

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
  | { type: 'signInButton'; id: string }  // NEW — Phase 5
  | { type: 'themeSelector'; id: string; label: string };  // NEW — Phase 6 (06-01)

// ── Config Arrays ──

export const statsConfig: StatCardConfig[] = [
  { id: 'overview', title: 'Overview', type: 'overview', order: 0 },
  { id: 'byLength', title: 'By Word Length', type: 'byLength', order: 1 },
  { id: 'distribution', title: 'Guess Distribution', type: 'guessDistribution', order: 2 },
];

export const settingsConfig: SettingsSectionConfig[] = [
  {
    id: 'gameplay',
    title: 'Gameplay',
    rows: [
      { type: 'toggle', id: 'hardMode', label: 'Hard Mode', storeKey: 'hardModeEnabled' },
    ],
  },
  {
    id: 'audioHaptics',
    title: 'Audio & Haptics',
    rows: [
      { type: 'toggle', id: 'sound', label: 'Sound Effects', storeKey: 'soundEnabled' },
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
