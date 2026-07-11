import { StyleSheet } from 'react-native';
import type { Theme } from '../../types/theme';
import type { TileFeedback } from '../../types';
import { layout } from '../../constants/layout';

export function getAccessibilityLabel(
  letter: string,
  feedback: TileFeedback,
  index: number,
): string {
  const position = index + 1;
  if (letter === ' ' || letter === '') {
    return `Position ${position}: empty`;
  }
  const state = feedback === 'empty' ? 'active' : feedback;
  return `Position ${position}: ${letter.toUpperCase()}, ${state}`;
}

export function getLetterColor(feedback: TileFeedback, theme: Theme): string {
  if (feedback === 'present') return theme.colors.text.onPresent;
  if (feedback === 'absent') return theme.colors.text.primary;
  if (feedback === 'empty') return theme.colors.text.primary;
  return theme.colors.text.inverse;
}

export function getFeedbackColors(theme: Theme): Record<TileFeedback, string> {
  return {
    correct: theme.colors.tile.correct,
    present: theme.colors.tile.present,
    absent: theme.colors.tile.absent,
    empty: theme.colors.tile.empty,
  };
}

export function createTileStyles(theme: Theme) {
  return StyleSheet.create({
    tileBorder: {
      borderWidth: 2,
      borderColor: theme.colors.tile.border,
    },
    letter: {
      fontWeight: '700',
      color: theme.colors.text.inverse,
      textTransform: 'uppercase',
    },
    textureContainer: {
      borderRadius: layout.tileBorderRadius,
      overflow: 'hidden',
    },
    dot: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.7)',
    },
    stripeBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: 'rgba(255,255,255,0.35)',
    },
  });
}
