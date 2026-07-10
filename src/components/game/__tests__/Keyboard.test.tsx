import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Keyboard } from '../Keyboard';

// Mock stores
jest.mock('../../../stores', () => ({
  useSettingsStore: jest.fn((selector: any) =>
    selector({
      hapticEnabled: true,
    })
  ),
}));

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      key: {
        correct: '#6aaa64',
        present: '#c9b458',
        absent: '#787c7e',
        empty: '#d3d6da',
        text: '#1a1a2e',
      },
      background: {
        primary: '#ffffff',
      },
    },
  }),
}));

jest.mock('../../../stores/gameStore', () => ({
  useGameStore: {
    getState: jest.fn().mockReturnValue({
      currentGuess: '',
    }),
  },
}));

describe('Keyboard', () => {
  const mockOnKeyPress = jest.fn();

  beforeEach(() => {
    mockOnKeyPress.mockClear();
  });

  it('renders all letter keys', () => {
    render(<Keyboard onKeyPress={mockOnKeyPress} />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('Z')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('renders ENTER key', () => {
    render(<Keyboard onKeyPress={mockOnKeyPress} />);
    expect(screen.getByText('ENTER')).toBeTruthy();
  });

  it('renders BACKSPACE key', () => {
    render(<Keyboard onKeyPress={mockOnKeyPress} />);
    expect(screen.getByText('BACKSPACE')).toBeTruthy();
  });

  it('calls onKeyPress with letter when key pressed', () => {
    render(<Keyboard onKeyPress={mockOnKeyPress} />);
    fireEvent.press(screen.getByText('A'));
    expect(mockOnKeyPress).toHaveBeenCalledWith('A');
  });

  it('calls onKeyPress with ENTER', () => {
    render(<Keyboard onKeyPress={mockOnKeyPress} />);
    fireEvent.press(screen.getByText('ENTER'));
    expect(mockOnKeyPress).toHaveBeenCalledWith('ENTER');
  });

  it('calls onKeyPress with BACKSPACE', () => {
    render(<Keyboard onKeyPress={mockOnKeyPress} />);
    fireEvent.press(screen.getByText('BACKSPACE'));
    expect(mockOnKeyPress).toHaveBeenCalledWith('BACKSPACE');
  });

  it('applies key colors', () => {
    const keyColors = { A: 'correct', B: 'absent' };
    render(<Keyboard onKeyPress={mockOnKeyPress} keyColors={keyColors} />);
    const keyA = screen.getByTestId('key-A');
    expect(keyA).toBeTruthy();
  });

  it('disables all keys when disabled', () => {
    render(<Keyboard onKeyPress={mockOnKeyPress} disabled={true} />);
    fireEvent.press(screen.getByText('A'));
    expect(mockOnKeyPress).not.toHaveBeenCalled();
  });

  it('does not call onKeyPress when disabled', () => {
    render(<Keyboard onKeyPress={mockOnKeyPress} disabled={true} />);
    fireEvent.press(screen.getByText('ENTER'));
    expect(mockOnKeyPress).not.toHaveBeenCalled();
  });
});
