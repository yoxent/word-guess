import { darkColors, lightColors, PRESENT_LETTER_COLOR } from '../colors';
import { CONFETTI_PARTICLE_COLORS } from '../animations';

/** WCAG 2 relative luminance (sRGB). */
function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const channel = (start: number) => {
    const s = parseInt(h.slice(start, start + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrastRatio(fg: string, bg: string): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

describe('light textSecondary WCAG AA', () => {
  const fg = lightColors.textSecondary;
  const pairs: Array<[string, string]> = [
    ['surface', lightColors.surface],
    ['background', lightColors.background],
    ['surfaceMuted', lightColors.surfaceMuted],
    ['headerBackground', lightColors.headerBackground],
  ];

  it.each(pairs)(
    'meets 4.5:1 on %s',
    (_name, bg) => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

describe('dark textSecondary WCAG AA', () => {
  it('meets 4.5:1 on surface', () => {
    expect(
      contrastRatio(darkColors.textSecondary, darkColors.surface),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe('present tile/key letter WCAG AA', () => {
  it.each([
    ['light tilePresent', lightColors.tilePresent],
    ['light keyPresent', lightColors.keyPresent],
    ['dark tilePresent', darkColors.tilePresent],
    ['dark keyPresent', darkColors.keyPresent],
  ] as const)('meets 4.5:1 on %s', (_name, bg) => {
    expect(contrastRatio(PRESENT_LETTER_COLOR, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('confetti particle colors', () => {
  it('does not include white (invisible on the result overlay)', () => {
    const normalized = CONFETTI_PARTICLE_COLORS.map((c) => c.toLowerCase());
    expect(normalized).not.toContain('#ffffff');
    expect(normalized).not.toContain('#fff');
  });
});
