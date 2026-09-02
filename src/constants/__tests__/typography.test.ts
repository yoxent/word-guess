import { Text } from 'react-native';
import { MAX_FONT_SIZE_MULTIPLIER, typography } from '../typography';
import { applyFontScalingDefaults } from '../../utils/fontScaling';

describe('typography', () => {
  it('uses unscaled design sizes so RN font scaling is not applied twice', () => {
    expect(typography.body.fontSize).toBe(15);
    expect(typography.heading.fontSize).toBe(24);
    expect(typography.display.fontSize).toBe(40);
  });

  it('aliases caption to small', () => {
    expect(typography.caption).toBe(typography.small);
  });
});

describe('applyFontScalingDefaults', () => {
  it('caps Text and TextInput at MAX_FONT_SIZE_MULTIPLIER', () => {
    applyFontScalingDefaults();
    const text = Text as typeof Text & {
      defaultProps?: { maxFontSizeMultiplier?: number };
    };
    expect(text.defaultProps?.maxFontSizeMultiplier).toBe(MAX_FONT_SIZE_MULTIPLIER);
    expect(MAX_FONT_SIZE_MULTIPLIER).toBe(1.15);
  });
});
