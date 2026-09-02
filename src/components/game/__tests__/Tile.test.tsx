import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Tile } from '../Tile';

jest.mock('../../../stores', () => ({
  useSettingsStore: jest.fn((selector: any) =>
    selector({
      reduceMotion: false,
    })
  ),
}));

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      tile: {
        correct: '#6aaa64',
        present: '#c9b458',
        absent: '#787c7e',
        empty: '#ffffff',
        border: '#878a8c',
      },
      text: {
        inverse: '#ffffff',
        primary: '#1a1a2e',
        onPresent: '#1a1a2e',
      },
    },
  }),
}));

describe('Tile', () => {
  const defaultProps = {
    letter: 'A',
    feedback: 'empty' as const,
    index: 0,
    isRevealing: false,
    tileSize: 50,
  };

  it('renders letter', () => {
    render(<Tile {...defaultProps} />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders empty tile', () => {
    render(<Tile {...defaultProps} letter="" />);
    expect(screen.queryByText('A')).toBeNull();
  });

  it('renders uppercase letter', () => {
    render(<Tile {...defaultProps} letter="a" />);
    expect(screen.getByText('A')).toBeTruthy();
  });
});
