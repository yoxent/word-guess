import React, { useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import type { TileFeedback } from '../../types';
import { colors } from '../../constants/colors';
import { layout } from '../../constants/layout';
import {
  TILE_FLIP_DURATION,
  TILE_STAGGER_DELAY,
  TILE_BOUNCE_SCALE_UP,
  TILE_BOUNCE_SCALE_DOWN,
  TILE_BOUNCE_MAX,
  TILE_BOUNCE_NORMAL,
} from '../../constants/animations';

interface TileProps {
  letter: string;
  feedback: TileFeedback;
  index: number;
  isRevealing: boolean;
  tileSize: number;
}

const FEEDBACK_COLORS: Record<TileFeedback, string> = {
  correct: colors.tileCorrect,
  present: colors.tilePresent,
  absent: colors.tileAbsent,
  empty: colors.tileEmpty,
};

export function Tile({ letter, feedback, index, isRevealing, tileSize }: TileProps) {
  const flipProgress = useSharedValue(0);
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  // isEmpty: only check the letter value, not feedback status
  // (active row tiles have feedback='empty' but still need to show letters)
  const isEmpty = letter === ' ' || letter === '';
  // showBorder: unrevealed tiles get a border (Wordle-style)
  const showBorder = feedback === 'empty';

  useEffect(() => {
    if (!isRevealing) {
      flipProgress.value = 0;
      scale.value = 1;
      return;
    }

    // Skip animation on first render (static initial state)
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }

    // Stagger: TILE_STAGGER_DELAY ms per tile left-to-right (D-28)
    const staggerDelay = index * TILE_STAGGER_DELAY;

    // Flip animation (rotateX 0 → -90 → 0 via interpolation)
    flipProgress.value = withDelay(
      staggerDelay,
      withTiming(1, {
        duration: TILE_FLIP_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
    );

    // Correct tiles get scale bounce (D-28)
    if (feedback === 'correct') {
      scale.value = withDelay(
        staggerDelay + TILE_FLIP_DURATION,
        withSequence(
          withTiming(TILE_BOUNCE_MAX, { duration: TILE_BOUNCE_SCALE_UP }),
          withTiming(TILE_BOUNCE_NORMAL, { duration: TILE_BOUNCE_SCALE_DOWN }),
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealing]);

  const animatedTileStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      flipProgress.value,
      [0, 0.5, 1],
      [colors.tileEmpty, colors.tileEmpty, FEEDBACK_COLORS[feedback]],
    );

    const rotateX = interpolate(
      flipProgress.value,
      [0, 0.5, 1],
      [0, -90, 0],
    );

    return {
      backgroundColor: bgColor,
      transform: [
        { rotateX: `${rotateX}deg` },
        { scale: scale.value },
      ],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => ({
    // Before flip (0): visible; mid-flip (0.5): hidden; after flip (1): visible
    opacity: interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 1]),
  }));

  // Dynamic tile dimensions derived from tileSize
  const tileStyle: ViewStyle = {
    width: tileSize,
    height: tileSize,
    borderRadius: layout.tileBorderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.tileEmpty,
  };
  const tileFontSize = Math.round(tileSize * 0.48);

  return (
    <Animated.View
      style={[
        tileStyle,
        showBorder && styles.tileBorder,
        animatedTileStyle,
      ]}
    >
      {!isEmpty && (
        <Animated.Text
          style={[
            styles.letter,
            { fontSize: tileFontSize },
            animatedTextStyle,
          ]}
        >
          {letter.toUpperCase()}
        </Animated.Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tileBorder: {
    borderWidth: 2,
    borderColor: colors.tileBorder,
  },
  letter: {
    fontWeight: '700',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
});
