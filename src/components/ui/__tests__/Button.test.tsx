import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../Button';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      button: {
        primary: '#4fc3f7',
        secondary: '#4fc3f7',
        danger: '#ef5350',
        ghost: '#4fc3f7',
      },
      text: {
        inverse: '#ffffff',
        primary: '#1a1a2e',
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

describe('Button', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders with title', () => {
    render(<Button title="Play" onPress={mockOnPress} />);
    expect(screen.getByText('Play')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(<Button title="Play" onPress={mockOnPress} />);
    fireEvent.press(screen.getByText('Play'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    render(<Button title="Play" onPress={mockOnPress} disabled />);
    fireEvent.press(screen.getByText('Play'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('renders primary variant by default', () => {
    render(<Button title="Play" onPress={mockOnPress} />);
    const button = screen.getByText('Play');
    expect(button).toBeTruthy();
  });

  it('renders secondary variant', () => {
    render(<Button title="Cancel" onPress={mockOnPress} variant="secondary" />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders danger variant', () => {
    render(<Button title="Delete" onPress={mockOnPress} variant="danger" />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('renders ghost variant', () => {
    render(<Button title="Skip" onPress={mockOnPress} variant="ghost" />);
    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('shows loading indicator when loading', () => {
    render(<Button title="Submit" onPress={mockOnPress} loading />);
    expect(screen.getByText('Submit')).toBeTruthy();
  });

  it('applies custom style', () => {
    const customStyle = { marginTop: 20 };
    render(<Button title="Play" onPress={mockOnPress} style={customStyle} />);
    expect(screen.getByText('Play')).toBeTruthy();
  });
});
