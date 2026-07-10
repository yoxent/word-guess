import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StatCard } from '../StatCard';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      card: {
        surface: '#f5f5f5',
      },
      text: {
        primary: '#1a1a2e',
        secondary: '#666666',
      },
    },
  }),
}));

describe('StatCard', () => {
  it('renders with title', () => {
    render(
      <StatCard title="Games Played">
        <></>
      </StatCard>
    );
    expect(screen.getByText('Games Played')).toBeTruthy();
  });

  it('renders children', () => {
    render(
      <StatCard title="Stats">
        <></>
      </StatCard>
    );
    expect(screen.getByText('Stats')).toBeTruthy();
  });

  it('renders with custom title', () => {
    render(
      <StatCard title="Win Rate">
        <></>
      </StatCard>
    );
    expect(screen.getByText('Win Rate')).toBeTruthy();
  });
});
