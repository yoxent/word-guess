import { Text, TextInput } from 'react-native';
import { MAX_FONT_SIZE_MULTIPLIER } from '../constants/typography';

type HostDefaults = { defaultProps?: { maxFontSizeMultiplier?: number } };

/**
 * Cap system font scaling on every Text / TextInput unless a child
 * sets allowFontScaling={false} or its own maxFontSizeMultiplier.
 */
export function applyFontScalingDefaults(): void {
  const text = Text as typeof Text & HostDefaults;
  text.defaultProps = {
    ...text.defaultProps,
    maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
  };
  const input = TextInput as typeof TextInput & HostDefaults;
  input.defaultProps = {
    ...input.defaultProps,
    maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
  };
}
