import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { GuessFeedback } from '@/types';
import { layout } from '@/constants/layout';
import { Tile } from './Tile';

interface GuessRowProps {
  guess: string;
  feedback?: GuessFeedback[];
  isActive: boolean;
  rowIndex: number;
  error?: string | null;
}

export function GuessRow({ guess, feedback, isActive, rowIndex: _rowIndex, error: _error }: GuessRowProps) {
  // Derive word length from feedback length (if available) or guess length
  const wordLength = feedback?.length ?? guess.length;
  const letters: string[] = [];

  if (feedback) {
    // Completed guess row with feedback
    for (let i = 0; i < feedback.length; i++) {
      letters.push(feedback[i].letter);
    }
  } else if (isActive) {
    // Active row: pad current guess with spaces
    const padded = guess.padEnd(wordLength, ' ');
    for (let i = 0; i < wordLength; i++) {
      letters.push(padded[i]);
    }
  } else {
    // Empty/future row
    for (let i = 0; i < wordLength; i++) {
      letters.push(' ');
    }
  }

  return (
    <View style={styles.row}>
      {letters.map((letter, i) => {
        const tileFeedback = feedback ? feedback[i].feedback : 'empty';
        const isRevealing = !isActive && !!feedback;
        return (
          <Tile
            key={i}
            letter={letter}
            feedback={tileFeedback}
            index={i}
            isRevealing={isRevealing}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: layout.tileGap,
    justifyContent: 'center',
  },
});
