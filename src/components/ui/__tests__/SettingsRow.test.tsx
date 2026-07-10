import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { SettingsRow } from '../SettingsRow';

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
      border: {
        light: '#e0e0e0',
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

describe('SettingsRow', () => {
  it('renders toggle type', () => {
    const mockToggle = jest.fn();
    render(
      <SettingsRow
        type="toggle"
        label="Hard Mode"
        value={false}
        onToggle={mockToggle}
      />
    );
    expect(screen.getByText('Hard Mode')).toBeTruthy();
  });

  it('calls onToggle when toggle pressed', () => {
    const mockToggle = jest.fn();
    render(
      <SettingsRow
        type="toggle"
        label="Sound"
        value={true}
        onToggle={mockToggle}
      />
    );
    fireEvent.press(screen.getByText('Sound'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('renders placeholder type', () => {
    render(
      <SettingsRow
        type="placeholder"
        label="Coming Soon"
        placeholder="Available in v2"
      />
    );
    expect(screen.getByText('Coming Soon')).toBeTruthy();
    expect(screen.getByText('Available in v2')).toBeTruthy();
  });

  it('renders info type', () => {
    render(
      <SettingsRow
        type="info"
        label="Version"
        value="1.0.0"
      />
    );
    expect(screen.getByText('Version')).toBeTruthy();
    expect(screen.getByText('1.0.0')).toBeTruthy();
  });

  it('renders restore type', () => {
    const mockRestore = jest.fn();
    render(
      <SettingsRow
        type="restore"
        label="Restore Purchases"
        onPress={mockRestore}
      />
    );
    expect(screen.getByText('Restore Purchases')).toBeTruthy();
  });
});
