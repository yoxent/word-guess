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
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../constants/layout';
import { useSettingsStore } from '../../stores';
import {
  TILE_FLIP_DURATION,
  TILE_STAGGER_DELAY,
  TILE_BOUNCE_SCALE_UP,
  TILE_BOUNCE_SCALE_DOWN,
  TILE_BOUNCE_MAX,
  TILE_BOUNCE_NORMAL,
  TILE_CORRECT_BOUNCE_EXTRA,
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
  const theme = useTheme();
  const colorBlindMode = useSettingsStore((s) => s.colorBlindMode);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const flipProgress = useSharedValue(0);
  const scale = useSharedValue(1);
  const isFirstRender = useRef(true);

  // Build dynamic styles + feedback color map from active theme
  const { styles, feedbackColors } = useMemo(() => {
    const c = theme.colors;
    const feedbackColors: Record<TileFeedback, string> = {
      correct: c.tile.correct,
      present: c.tile.present,
      absent: c.tile.absent,
      empty: c.tile.empty,
    };
    const styles = StyleSheet.create({
      tileBorder: {
        borderWidth: 2,
        borderColor: c.tile.border,
      },
      letter: {
        fontWeight: '700',
        color: c.text.inverse,
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
  }, [theme]);

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

    // 2026-07-09: removed the broken isFirstRender check. The previous code
    // set isFirstRender.current = false but did NOT return, so the
    // animation still ran on first render. The intent was apparently
    // to skip the animation on first render of the Tile (e.g., when
    // navigating to a saved game), but the implementation was wrong.
    // With the new opacity-based animation (no rotateX), this is less
    // critical — the animation is brief and the text is always visible
    // regardless of the animation state.

    // Stagger: TILE_STAGGER_DELAY ms per tile left-to-right (D-28)
    const staggerDelay = index * TILE_STAGGER_DELAY;

    // Color + opacity + scale animation (2026-07-09: no rotation)
    flipProgress.value = withDelay(
      staggerDelay,
      withTiming(1, {
        duration: TILE_FLIP_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
    );

    // Correct tiles still get the bounce effect (D-28)
    if (feedback === 'correct') {
      scale.value = withDelay(
        staggerDelay + TILE_FLIP_DURATION,
        withSequence(
          withTiming(TILE_BOUNCE_MAX, { duration: TILE_BOUNCE_SCALE_UP }),
          withTiming(TILE_BOUNCE_NORMAL, { duration: TILE_BOUNCE_SCALE_DOWN }),
        ),
      );
    }

    // 2026-07-09: safety-net timeout. Even if the worklet is interrupted
    // (busy JS thread during the gameStore update, re-render storm, etc.),
    // this setTimeout guarantees the tile reaches its final state.
    // The duration is the worst-case animation time for this tile:
    //   staggerDelay (left-to-right) + flip duration + bounce (if correct)
    // + 100ms buffer. Without this, the previous rotateX animation could
    // get stuck at -90° (invisible from the front) and the text would
    // appear 'missing' until the user navigated away and back.
    const totalDuration = staggerDelay + TILE_FLIP_DURATION
      + (feedback === 'correct' ? TILE_CORRECT_BOUNCE_EXTRA : 0)
      + 100;
    const safetyTimer = setTimeout(() => {
      flipProgress.value = 1;
      scale.value = 1;
    }, totalDuration);
    return () => clearTimeout(safetyTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealing]);

  const animatedTileStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      flipProgress.value,
      [0, 0.5, 1],
      [theme.colors.tile.empty, theme.colors.tile.empty, feedbackColors[feedback]],
    );

    // 2026-07-10: restored the rotateX flip animation 0 -> -90 -> 0.
    // (The text-opacity animation hides the letter at the midpoint so
    // it doesn't appear smushed.) The text would previously get stuck
    // at -90deg (invisible) when React reused a Tile instance, but
    // the newly added key-based remount in GuessRow forces a fresh
    // component instance when an active row becomes a completed row,
    // so the animation runs cleanly. The safety-net setTimeout below
    // guarantees the final state even if the worklet is interrupted.
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

  // 2026-07-10: re-applied to the <Animated.Text> below. Fires in lockstep
  // with animatedTileStyle, hiding the letter at the flip midpoint so it
  // doesn't look smushed as the tile rotates edge-on. At the end of the
  // animation (flipProgress = 1), text opacity = 1 (visible).
  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 0.5, 1], [1, 0, 1]),
  }));

  // Compute dynamic text color with proper WCAG contrast in BOTH themes.
  //
  // - 'present' (yellow): yellow is similar in both themes -> always use
  //   text.onPresent (hardcoded dark #1a1a2e) which contrasts well.
  // - 'correct' (green): green is similar in both themes -> text.inverse
  //   (white in light, dark in dark) gives good contrast (~7.5:1 in dark).
  // - 'absent' (gray): gray differs between themes (#787c7e light, #636669
  //   dark). text.inverse (dark in dark theme) would have only ~3.3:1
  //   contrast against the dark gray bg — below WCAG AA, looks 'missing'.
  //   text.primary is theme-aware: dark in light, light in dark, so it
  //   always has >=4.5:1 contrast against the gray bg.
  //
  // This was the root cause of the 'text missing on recent guess row'
  // bug: when the recent guess was all-absent (wrong guess), the dark
  // text on dark gray blended together and looked invisible.
  const letterColor =
    feedback === 'present'
      ? theme.colors.text.onPresent
      : feedback === 'absent'
        ? theme.colors.text.primary
        : theme.colors.text.inverse;

  // Dynamic tile dimensions derived from tileSize
  const tileStyle: ViewStyle = {
    width: tileSize,
    height: tileSize,
    borderRadius: layout.tileBorderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.tile.empty,
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
