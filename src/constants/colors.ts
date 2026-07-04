export const colors = {
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

export type AppColor = keyof typeof colors;
