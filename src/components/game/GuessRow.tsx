import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
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

export function GuessRow({ guess, feedback, isActive, rowIndex: _rowIndex, error }: GuessRowProps) {
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (error && isActive) {
      // Shake animation: left-right oscillation (D-68)
      shakeX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, isActive]);

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

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
    <Animated.View style={[styles.row, animatedRowStyle]}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: layout.tileGap,
    justifyContent: 'center',
  },
});
