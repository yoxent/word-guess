import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { TutorialCoach } from '../TutorialCoach';
import { useTutorialStore } from '../../../stores/tutorialStore';

jest.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      brand: { primary: '#42A5F5' },
      surface: { card: '#ffffff', muted: '#f0f0f0' },
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

jest.mock('../../game/Confetti', () => ({
  Confetti: () => null,
}));

jest.mock('../../../stores/gameStore', () => ({
  useGameStore: (selector: (s: { session: null }) => unknown) =>
    selector({ session: null }),
}));

describe('TutorialCoach', () => {
  const onFinish = jest.fn();

  beforeEach(() => {
    onFinish.mockClear();
    useTutorialStore.setState({ active: false, phase: 'intro-welcome' });
  });

  it('renders nothing when the tutorial is inactive', () => {
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.queryByText(/CRANE/)).toBeNull();
  });

  it('shows a welcome intro before CRANE', () => {
    useTutorialStore.setState({ active: true, phase: 'intro-welcome' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('Welcome')).toBeTruthy();
    expect(screen.getByText(/Guess the hidden word/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('intro-how');
  });

  it('shows how-to-play intro then the CRANE prompt', () => {
    useTutorialStore.setState({ active: true, phase: 'intro-how' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('Six tries')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('prompt-word1');
  });

  it('shows a CRANE dialogue modal, then the CRANE reminder', () => {
    useTutorialStore.setState({ active: true, phase: 'prompt-word1' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText(/Let's try CRANE/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('word1');
  });

  it('shows CRANE as the lingering reminder while typing', () => {
    useTutorialStore.setState({ active: true, phase: 'word1' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('CRANE')).toBeTruthy();
    expect(screen.getByLabelText('Type CRANE')).toBeTruthy();
    expect(screen.queryByLabelText('Next')).toBeNull();
  });

  it('shows grey sample tiles from CRANE then advances to yellow', () => {
    useTutorialStore.setState({ active: true, phase: 'explain-grey' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('Grey')).toBeTruthy();
    expect(screen.getByLabelText('C, absent')).toBeTruthy();
    expect(screen.getByLabelText('R, absent')).toBeTruthy();
    expect(screen.getByLabelText('A, absent')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('explain-yellow');
  });

  it('shows yellow sample tiles from CRANE then advances to LEMON', () => {
    useTutorialStore.setState({ active: true, phase: 'explain-yellow' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('Yellow')).toBeTruthy();
    expect(screen.getByLabelText('N, present')).toBeTruthy();
    expect(screen.getByLabelText('E, present')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('prompt-word2');
  });

  it('shows a LEMON dialogue modal, then the LEMON reminder', () => {
    useTutorialStore.setState({ active: true, phase: 'prompt-word2' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText(/Let's try LEMON/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('word2');
  });

  it('shows LEMON as the lingering reminder while typing', () => {
    useTutorialStore.setState({ active: true, phase: 'word2' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('LEMON')).toBeTruthy();
  });

  it('shows an ENVOY dialogue modal after green', () => {
    useTutorialStore.setState({ active: true, phase: 'prompt-word3' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText(/Let's try ENVOY/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('word3');
  });

  it('shows ENVOY as the lingering reminder while typing', () => {
    useTutorialStore.setState({ active: true, phase: 'word3' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('ENVOY')).toBeTruthy();
  });

  it('offers a helping hand after ENVOY', () => {
    useTutorialStore.setState({ active: true, phase: 'help-enjoy' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('Almost there')).toBeTruthy();
    expect(screen.getByText(/middle letter/)).toBeTruthy();
    expect(screen.queryByText(/Let's try ENJOY/)).toBeNull();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('prompt-word4');
  });

  it('shows a ENJOY dialogue modal after the helping hand', () => {
    useTutorialStore.setState({ active: true, phase: 'prompt-word4' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText(/Let's try ENJOY/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next'));
    expect(useTutorialStore.getState().phase).toBe('word4');
  });

  it('shows ENJOY as the lingering reminder while typing', () => {
    useTutorialStore.setState({ active: true, phase: 'word4' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText('ENJOY')).toBeTruthy();
  });

  it('finishes from the completion card', () => {
    useTutorialStore.setState({ active: true, phase: 'complete' });
    render(<TutorialCoach onFinish={onFinish} />);
    expect(screen.getByText(/Great job/)).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Let's play"));
    expect(onFinish).toHaveBeenCalled();
  });
});
