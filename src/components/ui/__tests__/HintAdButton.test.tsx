import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { HintAdButton } from '../HintAdButton';

describe('HintAdButton', () => {
  it('renders the play control with its label', () => {
    render(
      <HintAdButton
        icon="play"
        label="+1 Row"
        backgroundColor="#42A5F5"
        onPress={jest.fn()}
        accessibilityLabel="Watch ad for an extra row"
      />,
    );

    expect(screen.getByText('+1 Row')).toBeTruthy();
    expect(screen.getByLabelText('Watch ad for an extra row')).toBeTruthy();
  });

  it('renders the letter-hint control with its label', () => {
    render(
      <HintAdButton
        icon="hint"
        label="Letter Hint"
        backgroundColor="#FFA726"
        onPress={jest.fn()}
        accessibilityLabel="Watch ad for a letter hint"
      />,
    );

    expect(screen.getByText('Letter Hint')).toBeTruthy();
  });

  it('calls onPress when enabled', () => {
    const onPress = jest.fn();
    render(
      <HintAdButton
        icon="play"
        label="+1 Row"
        backgroundColor="#42A5F5"
        onPress={onPress}
        accessibilityLabel="Watch ad for an extra row"
      />,
    );

    fireEvent.press(screen.getByLabelText('Watch ad for an extra row'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(
      <HintAdButton
        icon="hint"
        label="Letter Hint"
        backgroundColor="#FFA726"
        onPress={onPress}
        disabled
        accessibilityLabel="Watch ad for a letter hint"
      />,
    );

    fireEvent.press(screen.getByLabelText('Watch ad for a letter hint'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
