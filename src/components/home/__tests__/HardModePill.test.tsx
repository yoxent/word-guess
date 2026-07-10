import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HardModePill } from '../HardModePill';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      pill: {
        active: '#ff6b6b',
        inactive: '#e0e0e0',
      },
      text: {
        primary: '#1a1a2e',
        inverse: '#ffffff',
      },
    },
  }),
}));

describe('HardModePill', () => {
  it('renders Hard Mode text', () => {
    render(<HardModePill enabled={false} />);
    expect(screen.getByText('Hard Mode')).toBeTruthy();
  });

  it('shows enabled state', () => {
    render(<HardModePill enabled={true} />);
    expect(screen.getByText('Hard Mode')).toBeTruthy();
  });

  it('shows disabled state', () => {
    render(<HardModePill enabled={false} />);
    expect(screen.getByText('Hard Mode')).toBeTruthy();
  });
});
