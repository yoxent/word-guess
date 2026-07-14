import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ModeCard } from '../ModeCard';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        primary: '#1a1a2e',
        inverse: '#ffffff',
      },
      background: {
        primary: '#ffffff',
      },
    },
  }),
}));

describe('ModeCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders with title and subtitle', () => {
    render(
      <ModeCard
        mode="daily"
        icon="wb-sunny"
        title="Daily Challenge"
        subtitle="6 puzzles today"
        onPress={mockOnPress}
      />
    );
    expect(screen.getByText('Daily Challenge')).toBeTruthy();
    expect(screen.getByText('6 puzzles today')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(
      <ModeCard
        mode="daily"
        icon="wb-sunny"
        title="Daily Challenge"
        subtitle="6 puzzles today"
        onPress={mockOnPress}
      />
    );
    fireEvent.press(screen.getByText('Daily Challenge'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders different modes', () => {
    const modes = ['daily', 'endless', 'random'] as const;
    modes.forEach((mode) => {
      const { unmount } = render(
        <ModeCard
          mode={mode}
          icon="casino"
          title={`${mode} mode`}
          subtitle="test"
          onPress={mockOnPress}
        />
      );
      expect(screen.getByText(`${mode} mode`)).toBeTruthy();
      unmount();
    });
  });

  it('shows progress bar when provided', () => {
    render(
      <ModeCard
        mode="daily"
        icon="wb-sunny"
        title="Daily Challenge"
        subtitle="Playing"
        progress={0.5}
        progressLabel="3/6 complete"
        onPress={mockOnPress}
      />
    );
    expect(screen.getByText('Playing')).toBeTruthy();
  });

  it('renders disabled state', () => {
    render(
      <ModeCard
        mode="daily"
        icon="wb-sunny"
        title="Daily Challenge"
        subtitle="Completed"
        onPress={mockOnPress}
        disabled
      />
    );
    expect(screen.getByText('Daily Challenge')).toBeTruthy();
  });
});
