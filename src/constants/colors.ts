export const lightColors = {
  tileCorrect: '#6aaa64',
  tilePresent: '#c9b458',
  tileAbsent: '#787c7e',
  tileEmpty: '#d3d6da',
  tileBorder: '#878a8c',

  keyCorrect: '#6aaa64',
  keyPresent: '#c9b458',
  keyAbsent: '#787c7e',
  keyUnused: '#d3d6da',
  keyText: '#1a1a2e',
  keySpecial: '#818384',

  background: '#f5f5f0',
  surface: '#ffffff',
  textPrimary: '#1a1a2e',
  textSecondary: '#787c7e',
  textInverse: '#ffffff',

  accent: '#4a9eff',
  accentDark: '#357abd',
  danger: '#e74c3c',
  success: '#2ecc71',

  headerBackground: '#f0eee9',
  headerText: '#1a1a2e',
} as const;

export const darkColors = {
  tileCorrect: '#66bb6a',
  tilePresent: '#d4b84c',
  tileAbsent: '#636669',
  tileEmpty: '#3a3a3c',
  tileBorder: '#565658',

  keyCorrect: '#66bb6a',
  keyPresent: '#d4b84c',
  keyAbsent: '#636669',
  keyUnused: '#3a3a3c',
  keyText: '#e8e8e8',
  keySpecial: '#565658',

  background: '#121212',
  surface: '#2a2a3e',
  textPrimary: '#e8e8e8',
  textSecondary: '#a0a0a0',
  textInverse: '#1a1a2e',

  accent: '#6bb5ff',
  accentDark: '#4a9eff',
  danger: '#ff6b6b',
  success: '#4ecdc4',

  headerBackground: '#1e1e32',
  headerText: '#e8e8e8',
} as const;

/** @deprecated Use useColors() hook instead during migration. Will be removed after all consumers migrate. */
export const colors = lightColors;

export type AppColor = keyof typeof lightColors;
