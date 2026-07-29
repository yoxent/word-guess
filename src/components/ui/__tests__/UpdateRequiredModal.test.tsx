import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { UpdateRequiredModal, openPlayStore } from '../UpdateRequiredModal';
import {
  PLAY_STORE_HTTPS_URL,
  PLAY_STORE_MARKET_URL,
} from '../../../constants/store';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      mode: 'light',
      brand: {
        primary: '#4fc3f7',
        secondary: '#FF8A65',
      },
      surface: {
        card: '#ffffff',
        muted: '#f0f0f0',
      },
      text: {
        primary: '#1a1a2e',
        secondary: '#666666',
        inverse: '#ffffff',
        onPresent: '#37474F',
      },
      tile: {
        correct: '#6aaa64',
        present: '#c9b458',
        absent: '#787c7e',
      },
    },
  }),
}));

describe('UpdateRequiredModal', () => {
  const onLater = jest.fn();

  beforeEach(() => {
    onLater.mockClear();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders when visible', () => {
    render(<UpdateRequiredModal visible onLater={onLater} />);
    expect(screen.getByText('Update available')).toBeTruthy();
    expect(
      screen.getByText('A newer version is available on the Play Store.'),
    ).toBeTruthy();
  });

  it('calls onLater when Later is pressed', () => {
    render(<UpdateRequiredModal visible onLater={onLater} />);
    fireEvent.press(screen.getByLabelText('Later'));
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('opens Play Store market URL on Update', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
    render(<UpdateRequiredModal visible onLater={onLater} />);
    fireEvent.press(screen.getByLabelText('Update'));
    await Promise.resolve();
    expect(openURL).toHaveBeenCalledWith(PLAY_STORE_MARKET_URL);
  });
});

describe('openPlayStore', () => {
  it('falls back to https when market URL fails', async () => {
    const openURL = jest
      .fn()
      .mockRejectedValueOnce(new Error('no market'))
      .mockResolvedValueOnce(undefined as never);
    jest.spyOn(Linking, 'openURL').mockImplementation(openURL);

    await openPlayStore();

    expect(openURL).toHaveBeenCalledTimes(2);
    expect(openURL).toHaveBeenNthCalledWith(1, PLAY_STORE_MARKET_URL);
    expect(openURL).toHaveBeenNthCalledWith(2, PLAY_STORE_HTTPS_URL);

    openURL.mockRestore?.();
    jest.restoreAllMocks();
  });
});
