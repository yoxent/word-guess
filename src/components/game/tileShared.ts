import { StyleSheet } from 'react-native';
import type { Theme } from '../../types/theme';
import type { TileFeedback } from '../../types';
import { FONTS } from '../../utils/fonts';

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
      fontFamily: FONTS.button,
      fontWeight: '700',
      color: theme.colors.text.inverse,
      textTransform: 'uppercase',
    },
  });
}
