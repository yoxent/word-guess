import React from 'react';
import { Text, type TextProps } from 'react-native';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/typography';

/**
 * Text that honors the system font size, capped so dense layouts do not
 * overflow. Prefer this over raw `Text` for copy. Use `allowFontScaling={false}`
 * (or `noFontScaling`) for glyphs in a fixed box.
 *
 * Fabric ignores `Text.defaultProps`, so the cap must live on the instance.
 */
export function AppText({
  maxFontSizeMultiplier = MAX_FONT_SIZE_MULTIPLIER,
  ...props
}: TextProps) {
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}
