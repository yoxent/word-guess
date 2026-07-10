import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { HowToPlayModal } from '../HowToPlayModal';

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
    },
  }),
}));

describe('HowToPlayModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders when visible', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    expect(screen.getByText('How To Play')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(<HowToPlayModal visible={false} onClose={mockOnClose} />);
    expect(screen.queryByText('How To Play')).toBeNull();
  });

  it('shows game instructions', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Guess the word/)).toBeTruthy();
  });

  it('shows color explanations', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    expect(screen.getByText(/correct/i)).toBeTruthy();
    expect(screen.getByText(/present/i)).toBeTruthy();
    expect(screen.getByText(/absent/i)).toBeTruthy();
  });

  it('calls close when close button pressed', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    const closeButton = screen.getByLabelText('Close');
    fireEvent.press(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
