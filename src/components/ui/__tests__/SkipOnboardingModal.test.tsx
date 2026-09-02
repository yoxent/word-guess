import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SkipOnboardingModal } from '../SkipOnboardingModal';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      surface: { card: '#fff' },
      brand: { primary: '#1a73e8' },
      text: {
        primary: '#111',
        secondary: '#666',
        inverse: '#fff',
      },
      button: {
        primary: { bg: '#1a73e8', fg: '#fff' },
      },
      status: { danger: '#e53935' },
    },
  }),
}));

describe('SkipOnboardingModal', () => {
  it('confirms skip or returns to the tutorial', () => {
    const onCancel = jest.fn();
    const onSkip = jest.fn();

    render(
      <SkipOnboardingModal visible onCancel={onCancel} onSkip={onSkip} />,
    );

    expect(screen.getByText('Skip tutorial?')).toBeTruthy();
    expect(screen.getByText(/How to Play/)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Keep going'));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Skip tutorial'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
