import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ProgressRing } from '../ProgressRing';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initialValue: any) => ({ value: initialValue }),
  useAnimatedStyle: (styleFunc: any) => styleFunc(),
  withTiming: (value: any) => value,
  interpolate: (value: any, inputRange: any, outputRange: any) => outputRange[0],
  interpolateColor: (value: any, inputRange: any, outputRange: any) => outputRange[0],
  Easing: {
    inOut: (easing: any) => easing,
    ease: (t: any) => t,
  },
}));

describe('ProgressRing', () => {
  it('renders with progress', () => {
    render(<ProgressRing progress={0.5} size={100} />);
    expect(screen.getByTestId('progress-ring')).toBeTruthy();
  });

  it('renders with full progress', () => {
    render(<ProgressRing progress={1} size={100} />);
    expect(screen.getByTestId('progress-ring')).toBeTruthy();
  });

  it('renders with zero progress', () => {
    render(<ProgressRing progress={0} size={100} />);
    expect(screen.getByTestId('progress-ring')).toBeTruthy();
  });
});
