import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TileFeedback } from '@/types';
import { colors } from '@/constants/colors';
import { layout } from '@/constants/layout';

interface TileProps {
  letter: string;
  feedback: TileFeedback;
  index: number;
  isRevealing: boolean;
}

const FEEDBACK_COLORS: Record<TileFeedback, string> = {
  correct: colors.tileCorrect,
  present: colors.tilePresent,
  absent: colors.tileAbsent,
  empty: colors.tileEmpty,
};

export function Tile({ letter, feedback, index: _index, isRevealing: _isRevealing }: TileProps) {
  const isEmpty = feedback === 'empty' || letter === ' ' || letter === '';
  const backgroundColor = FEEDBACK_COLORS[feedback];
  const showBorder = isEmpty;

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor },
        showBorder && styles.tileBorder,
      ]}
    >
      {!isEmpty && (
        <Text style={styles.letter}>{letter.toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: layout.tileSize,
    height: layout.tileSize,
    borderRadius: layout.tileBorderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileBorder: {
    borderWidth: 2,
    borderColor: colors.tileBorder,
  },
  letter: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
