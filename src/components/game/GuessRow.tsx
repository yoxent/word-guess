import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { GuessFeedback } from '../../types';
import { layout } from '../../constants/layout';
import { Tile } from './Tile';
import { StaticTile } from './StaticTile';

interface GuessRowProps {
  guess: string;
  feedback?: GuessFeedback[];
  isActive: boolean;
  /** True only for the row currently playing the flip animation. */
  isRevealingRow: boolean;
  rowIndex: number;
  wordLength: number;
  tileSize: number;
  error?: string | null;
}

export function GuessRow({
  guess,
  feedback,
  isActive,
  isRevealingRow,
  rowIndex: _rowIndex,
  wordLength,
  tileSize,
  error,
}: GuessRowProps) {
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

        // Only the row actively revealing uses Reanimated Tile (~7 worklets).
        // All other rows use StaticTile so a large board (e.g. after ad rows)
        // does not register dozens of idle useAnimatedStyle prop overrides
        // that collide with Fabric during the flip commit batch.
        if (isRevealingRow && feedback) {
          return (
            <Tile
              key={i}
              letter={letter}
              feedback={tileFeedback}
              index={i}
              isRevealing
              tileSize={tileSize}
            />
          );
        }

        return (
          <StaticTile
            key={i}
            letter={letter}
            feedback={tileFeedback}
            index={i}
            tileSize={tileSize}
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
