import { resolveSystemColorScheme } from '../useSystemColorScheme';

describe('resolveSystemColorScheme', () => {
  it('uses dark when the Appearance API reports dark', () => {
    expect(resolveSystemColorScheme('dark', 'light')).toBe('dark');
  });

  it('uses dark when useColorScheme reports dark', () => {
    expect(resolveSystemColorScheme('light', 'dark')).toBe('dark');
  });

  it('falls back to light when neither signal reports dark', () => {
    expect(resolveSystemColorScheme(null, null)).toBe('light');
    expect(resolveSystemColorScheme('light', 'light')).toBe('light');
  });
});
