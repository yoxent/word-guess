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
  | { type: 'info'; id: string; label: string; value: string };

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
      { type: 'placeholder', id: 'signIn', label: 'Sign in', description: 'Sign in — coming in Phase 5' },
    ],
  },
];

// Extension notes for future phases:
// Phase 4: Append ad/IAP toggle rows to settingsConfig
// Phase 5: Swap placeholder → signInButton row in account section
// Phase 6: Append accessibility toggle rows to settingsConfig
