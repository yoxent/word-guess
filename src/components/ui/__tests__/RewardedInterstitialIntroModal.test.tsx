import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { RewardedInterstitialIntroModal } from '../RewardedInterstitialIntroModal';

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
    },
  }),
}));

describe('RewardedInterstitialIntroModal', () => {
  it('offers Watch and No thanks for the stated reward', () => {
    const onWatch = jest.fn();
    const onSkip = jest.fn();

    render(
      <RewardedInterstitialIntroModal
        visible
        rewardLabel="+1 Attempt"
        onWatch={onWatch}
        onSkip={onSkip}
      />,
    );

    expect(
      screen.getByLabelText('Watch a short ad for +1 Attempt'),
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Watch ad for +1 Attempt'));
    expect(onWatch).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('No thanks, skip the ad'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
