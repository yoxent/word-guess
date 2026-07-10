import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ResultModal } from '../ResultModal';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        primary: '#ffffff',
        secondary: '#f5f5f5',
      },
      text: {
        primary: '#1a1a2e',
        secondary: '#666666',
      },
      tile: {
        correct: '#6aaa64',
        present: '#c9b458',
        absent: '#787c7e',
      },
      button: {
        primary: '#4fc3f7',
      },
    },
  }),
}));

jest.mock('../../../stores/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn().mockReturnValue({
      hapticEnabled: true,
    }),
  },
}));

jest.mock('../../../services/sound', () => ({
  playWin: jest.fn(),
  playLoss: jest.fn(),
}));

describe('ResultModal', () => {
  const mockOnClose = jest.fn();
  const mockOnPlayAgain = jest.fn();
  const mockOnShare = jest.fn();

  const defaultProps = {
    visible: true,
    won: true,
    word: 'APPLE',
    attempts: 4,
    maxAttempts: 6,
    guesses: [
      [
        { letter: 'C', feedback: 'absent' as const },
        { letter: 'R', feedback: 'absent' as const },
        { letter: 'A', feedback: 'present' as const },
        { letter: 'N', feedback: 'absent' as const },
        { letter: 'E', feedback: 'correct' as const },
      ],
    ],
    onClose: mockOnClose,
    onPlayAgain: mockOnPlayAgain,
    onShare: mockOnShare,
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnPlayAgain.mockClear();
    mockOnShare.mockClear();
  });

  it('renders when visible', () => {
    render(<ResultModal {...defaultProps} />);
    expect(screen.getByText('You Won!')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(<ResultModal {...defaultProps} visible={false} />);
    expect(screen.queryByText('You Won!')).toBeNull();
  });

  it('shows win message', () => {
    render(<ResultModal {...defaultProps} won={true} />);
    expect(screen.getByText('You Won!')).toBeTruthy();
  });

  it('shows loss message', () => {
    render(<ResultModal {...defaultProps} won={false} />);
    expect(screen.getByText('Game Over')).toBeTruthy();
  });

  it('shows the word on loss', () => {
    render(<ResultModal {...defaultProps} won={false} word="APPLE" />);
    expect(screen.getByText('APPLE')).toBeTruthy();
  });

  it('shows attempt count', () => {
    render(<ResultModal {...defaultProps} attempts={4} maxAttempts={6} />);
    expect(screen.getByText('4/6')).toBeTruthy();
  });

  it('calls onPlayAgain when play again button pressed', () => {
    render(<ResultModal {...defaultProps} />);
    fireEvent.press(screen.getByText('Play Again'));
    expect(mockOnPlayAgain).toHaveBeenCalledTimes(1);
  });

  it('calls onShare when share button pressed', () => {
    render(<ResultModal {...defaultProps} />);
    fireEvent.press(screen.getByText('Share'));
    expect(mockOnShare).toHaveBeenCalledTimes(1);
  });

  it('shows emoji grid', () => {
    render(<ResultModal {...defaultProps} />);
    expect(screen.getByText('⬛⬛🟨⬛🟩')).toBeTruthy();
  });
});
