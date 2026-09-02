import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AppText } from '../AppText';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../../constants/typography';

describe('AppText', () => {
  it('caps system font scaling on the instance', () => {
    render(<AppText>Hello</AppText>);
    expect(screen.getByText('Hello').props.maxFontSizeMultiplier).toBe(
      MAX_FONT_SIZE_MULTIPLIER,
    );
  });
});
