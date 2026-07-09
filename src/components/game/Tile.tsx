import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
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
import { useColors } from '../../hooks/useColors';
import { layout } from '../../constants/layout';
import { useSettingsStore } from '../../stores';
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

function getAccessibilityLabel(letter: string, feedback: TileFeedback, index: number): string {
  const position = index + 1;
  if (letter === ' ' || letter === '') {
    return `Position ${position}: empty`;
  }
  const state = feedback === 'empty' ? 'active' : feedback;
  return `Position ${position}: ${letter.toUpperCase()}, ${state}`;
}

export function Tile({ letter, feedback, index, isRevealing, tileSize }: TileProps) {
  const colors = useColors();
  const colorBlindMode = useSettingsStore((s) => s.colorBlindMode);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const flipProgress = useSharedValue(0);
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  // Build dynamic styles + feedback color map from active theme
  const { styles, feedbackColors } = useMemo(() => {
    const feedbackColors: Record<TileFeedback, string> = {
      correct: colors.tileCorrect,
      present: colors.tilePresent,
      absent: colors.tileAbsent,
      empty: colors.tileEmpty,
    };
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
    return { styles, feedbackColors };
  }, [colors]);

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

    // When reduceMotion is on, skip animation and jump to final state
    if (reduceMotion) {
      flipProgress.value = 1;
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
      [colors.tileEmpty, colors.tileEmpty, feedbackColors[feedback]],
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

  // Compute dynamic text color — present tiles use dark text for contrast (D-180)
  const letterColor = feedback === 'present' ? '#1a1a2e' : colors.textInverse;

  // Dynamic tile dimensions derived from tileSize
  const tileStyle: ViewStyle = {
    width: tileSize,
    height: tileSize,
    borderRadius: layout.tileBorderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.tileEmpty,
    overflow: 'hidden',
  };
  const tileFontSize = Math.round(tileSize * 0.48);

  return (
    <Animated.View
      accessible={true}
      accessibilityLabel={getAccessibilityLabel(letter, feedback, index)}
      accessibilityRole="text"
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
            { fontSize: tileFontSize, color: letterColor },
            animatedTextStyle,
          ]}
        >
          {letter.toUpperCase()}
        </Animated.Text>
      )}

      {/* Texture overlay for color blind mode (LAUNCH-01) */}
      {colorBlindMode && feedback !== 'empty' && (
        <View style={[StyleSheet.absoluteFill, styles.textureContainer]} pointerEvents="none">
          {feedback === 'correct' && (
            <>
              <View style={[styles.dot, { top: '25%', left: '50%', marginLeft: -3, marginTop: -3 }]} />
              <View style={[styles.dot, { top: '60%', left: '25%', marginLeft: -3, marginTop: -3 }]} />
              <View style={[styles.dot, { top: '60%', left: '75%', marginLeft: -3, marginTop: -3 }]} />
            </>
          )}
          {feedback === 'present' && (
            <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: '45deg' }] }]}>
              <View style={[styles.stripeBar, { top: '20%' }]} />
              <View style={[styles.stripeBar, { top: '50%' }]} />
              <View style={[styles.stripeBar, { top: '80%' }]} />
            </View>
          )}
          {feedback === 'absent' && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.15)' }]} />
          )}
        </View>
      )}
    </Animated.View>
  );
}
