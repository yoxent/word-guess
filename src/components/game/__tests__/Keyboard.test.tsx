import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Keyboard } from '../Keyboard';

const mockAddLetter = jest.fn();
const mockRemoveLetter = jest.fn();
const mockSubmitGuess = jest.fn();
const mockAddPendingInput = jest.fn();

let mockGameState: Record<string, unknown>;

jest.mock('../../../stores', () => ({
  useGameStore: jest.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector(mockGameState),
  ),
}));

jest.mock('../../../stores/settingsStore', () => {
  const state = {
    hapticEnabled: false,
    keyboardLayout: 'qwerty' as const,
  };
  const useSettingsStore = jest.fn(
    (selector: (s: typeof state) => unknown) => selector(state),
  ) as jest.Mock & { getState: () => typeof state };
  useSettingsStore.getState = () => state;
  return { useSettingsStore };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialIcons: ({ name }: { name: string }) =>
      React.createElement(Text, null, name),
  };
});

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      key: {
        correct: '#6aaa64',
        present: '#c9b458',
        absent: '#787c7e',
        unused: '#d3d6da',
        special: '#cfd8dc',
        text: '#1a1a2e',
      },
      text: {
        inverse: '#ffffff',
        onPresent: '#1a1a2e',
      },
    },
  }),
}));

jest.mock('../../../services/sound', () => ({
  playKeyPress: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('Keyboard', () => {
  beforeEach(() => {
    mockAddLetter.mockClear();
    mockRemoveLetter.mockClear();
    mockSubmitGuess.mockClear();
    mockAddPendingInput.mockClear();
    mockGameState = {
      session: {
        keyColors: {},
        pendingKeyColors: undefined,
        letterCount: 5,
        status: 'playing',
      },
      currentGuess: 'APPLE',
      editIndex: null,
      isRevealing: false,
      addLetter: mockAddLetter,
      removeLetter: mockRemoveLetter,
      submitGuess: mockSubmitGuess,
      addPendingInput: mockAddPendingInput,
    };
  });

  it('renders letter keys for the layout', () => {
    render(<Keyboard />);
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('Z')).toBeTruthy();
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('renders Submit action (ISO tall key label)', () => {
    render(<Keyboard />);
    expect(screen.getByText('SUBMIT')).toBeTruthy();
    expect(screen.getByLabelText('Submit')).toBeTruthy();
  });

  it('renders Backspace action with accessibility label', () => {
    render(<Keyboard />);
    expect(screen.getByLabelText('Backspace')).toBeTruthy();
  });

  it('adds a letter via the game store', () => {
    render(<Keyboard />);
    fireEvent.press(screen.getByText('Q'));
    expect(mockAddLetter).toHaveBeenCalledWith('Q');
  });

  it('submits via Submit key (internal ENTER)', () => {
    render(<Keyboard />);
    fireEvent.press(screen.getByLabelText('Submit'));
    expect(mockSubmitGuess).toHaveBeenCalled();
  });

  it('removes a letter via Backspace', () => {
    render(<Keyboard />);
    fireEvent.press(screen.getByLabelText('Backspace'));
    expect(mockRemoveLetter).toHaveBeenCalled();
  });

  it('does not type letters when the game is not playing', () => {
    mockGameState = {
      ...mockGameState,
      session: {
        ...(mockGameState.session as object),
        status: 'won',
      },
    };
    render(<Keyboard />);
    fireEvent.press(screen.getByText('Q'));
    expect(mockAddLetter).not.toHaveBeenCalled();
  });
});
