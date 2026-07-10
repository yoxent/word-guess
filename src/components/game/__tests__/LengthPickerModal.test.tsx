import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { LengthPickerModal } from '../LengthPickerModal';

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
      },
      button: {
        primary: '#4fc3f7',
      },
    },
  }),
}));

describe('LengthPickerModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSelect.mockClear();
  });

  it('renders when visible', () => {
    render(
      <LengthPickerModal
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        completedLengths={[]}
      />
    );
    expect(screen.getByText('Select Word Length')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    render(
      <LengthPickerModal
        visible={false}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        completedLengths={[]}
      />
    );
    expect(screen.queryByText('Select Word Length')).toBeNull();
  });

  it('renders all length options', () => {
    render(
      <LengthPickerModal
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        completedLengths={[]}
      />
    );
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
  });

  it('calls onSelect with length when option pressed', () => {
    render(
      <LengthPickerModal
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        completedLengths={[]}
      />
    );
    fireEvent.press(screen.getByText('5'));
    expect(mockOnSelect).toHaveBeenCalledWith(5);
  });

  it('shows completed lengths as disabled', () => {
    render(
      <LengthPickerModal
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        completedLengths={[5, 6]}
      />
    );
    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('calls close when close button pressed', () => {
    render(
      <LengthPickerModal
        visible={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        completedLengths={[]}
      />
    );
    const closeButton = screen.getByLabelText('Close');
    fireEvent.press(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
