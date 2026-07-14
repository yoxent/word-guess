import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { HowToPlayModal } from '../HowToPlayModal';

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

describe('HowToPlayModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  it('renders when visible', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    expect(screen.getByText('How to Play')).toBeTruthy();
  });

  it('does not render content when not visible', () => {
    render(<HowToPlayModal visible={false} onClose={mockOnClose} />);
    expect(screen.queryByText('How to Play')).toBeNull();
  });

  it('shows game instructions', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Guess the word/)).toBeTruthy();
  });

  it('shows tile color explanations', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    expect(screen.getByText(/Right letter,\s*right spot/)).toBeTruthy();
    expect(screen.getByText(/Right letter,\s*wrong spot/)).toBeTruthy();
    expect(screen.getByText(/Letter not\s*in word/)).toBeTruthy();
  });

  it('explains Hard Mode rules', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    expect(screen.getByText('🔥')).toBeTruthy();
    expect(screen.getByText('Hard Mode')).toBeTruthy();
    expect(screen.getByText(/green letters/i)).toBeTruthy();
    expect(screen.getByText(/yellow letters/i)).toBeTruthy();
  });

  it('calls close when Got it pressed', () => {
    render(<HowToPlayModal visible={true} onClose={mockOnClose} />);
    fireEvent.press(screen.getByLabelText('Got it'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
