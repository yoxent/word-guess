import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { GameBoard } from '../GameBoard';

jest.mock('../../../stores', () => ({
  useSettingsStore: jest.fn((selector: any) =>
    selector({
      colorBlindMode: false,
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
      background: {
        primary: '#ffffff',
      },
    },
  }),
}));

jest.mock('../../../constants/layout', () => ({
  layout: {
    tileGap: 6,
    tileSizeMax: 64,
    keyboardKeyHeight: 58,
    keyboardKeyGap: 6,
    keyboardHorizontalPadding: 4,
    screenPaddingHorizontal: 16,
  },
}));

describe('GameBoard', () => {
  const defaultProps = {
    guesses: ['CRANE'],
    feedback: [
      [
        { letter: 'C', feedback: 'absent' as const },
        { letter: 'R', feedback: 'absent' as const },
        { letter: 'A', feedback: 'present' as const },
        { letter: 'N', feedback: 'absent' as const },
        { letter: 'E', feedback: 'correct' as const },
      ],
    ],
    currentGuess: 'S',
    letterCount: 5,
    maxAttempts: 6,
    isRevealing: false,
  };

  it('renders the grid', () => {
    render(<GameBoard {...defaultProps} />);
    expect(screen.getByTestId('game-board')).toBeTruthy();
  });

  it('renders current guess letters', () => {
    render(<GameBoard {...defaultProps} />);
    expect(screen.getByText('S')).toBeTruthy();
  });

  it('renders previous guesses', () => {
    render(<GameBoard {...defaultProps} />);
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('R')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('N')).toBeTruthy();
    expect(screen.getByText('E')).toBeTruthy();
  });

  it('renders empty rows for remaining attempts', () => {
    render(<GameBoard {...defaultProps} />);
    expect(screen.getByTestId('game-board')).toBeTruthy();
  });

  it('handles different word lengths', () => {
    render(
      <GameBoard
        guesses={[]}
        feedback={[]}
        currentGuess=""
        letterCount={6}
        maxAttempts={7}
        isRevealing={false}
      />
    );
    expect(screen.getByTestId('game-board')).toBeTruthy();
  });
});
