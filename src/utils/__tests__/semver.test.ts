import { compareSemver, isVersionBelow } from '../semver';

describe('semver', () => {
  it('orders major.minor.patch', () => {
    expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareSemver('1.0.1', '1.0.1')).toBe(0);
    expect(compareSemver('1.1.0', '1.0.9')).toBeGreaterThan(0);
  });

  it('treats missing/non-numeric parts as 0', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('abc', '0.0.0')).toBe(0);
  });

  it('isVersionBelow only when strictly less', () => {
    expect(isVersionBelow('1.0.0', '1.0.1')).toBe(true);
    expect(isVersionBelow('1.0.1', '1.0.1')).toBe(false);
    expect(isVersionBelow('1.0.2', '1.0.1')).toBe(false);
    expect(isVersionBelow('1.0.0', '0.0.0')).toBe(false);
  });
});
