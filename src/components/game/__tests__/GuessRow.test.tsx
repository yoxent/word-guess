import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { GuessRow } from '../GuessRow';

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
    },
  }),
}));

describe('GuessRow', () => {
  const defaultProps = {
    guess: 'CRANE',
    feedback: [
      { letter: 'C', feedback: 'absent' as const },
      { letter: 'R', feedback: 'absent' as const },
      { letter: 'A', feedback: 'present' as const },
      { letter: 'N', feedback: 'absent' as const },
      { letter: 'E', feedback: 'correct' as const },
    ],
    tileSize: 50,
    isRevealing: false,
    shake: false,
  };

  it('renders all letters', () => {
    render(<GuessRow {...defaultProps} />);
    expect(screen.getByText('C')).toBeTruthy();
    expect(screen.getByText('R')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('N')).toBeTruthy();
    expect(screen.getByText('E')).toBeTruthy();
  });

  it('renders correct number of tiles', () => {
    render(<GuessRow {...defaultProps} />);
    const tiles = screen.getAllByText(/[A-Z]/);
    expect(tiles.length).toBe(5);
  });

  it('renders empty row', () => {
    render(
      <GuessRow
        guess=""
        feedback={[]}
        tileSize={50}
        isRevealing={false}
        shake={false}
      />
    );
  });

  it('renders with different word lengths', () => {
    const shortFeedback = [
      { letter: 'A', feedback: 'correct' as const },
      { letter: 'B', feedback: 'absent' as const },
    ];
    render(
      <GuessRow
        guess="AB"
        feedback={shortFeedback}
        tileSize={50}
        isRevealing={false}
        shake={false}
      />
    );
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
  });
});
