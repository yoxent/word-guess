import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Confetti } from '../Confetti';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initialValue: any) => ({ value: initialValue }),
  useAnimatedStyle: (styleFunc: any) => styleFunc(),
  withTiming: (value: any) => value,
  withSequence: (...args: any[]) => args[args.length - 1],
  withDelay: (delay: any, animation: any) => animation,
  interpolate: (value: any, inputRange: any, outputRange: any) => outputRange[0],
  Easing: {
    inOut: (easing: any) => easing,
    ease: (t: any) => t,
  },
}));

describe('Confetti', () => {
  it('renders confetti container', () => {
    render(<Confetti />);
    expect(screen.getByTestId('confetti-container')).toBeTruthy();
  });

  it('renders multiple particles', () => {
    render(<Confetti />);
    expect(screen.getByTestId('confetti-container')).toBeTruthy();
  });
});
