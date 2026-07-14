import React, { useEffect, useMemo } from 'react';
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
  cancelAnimation,
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
  // 2026-07-10: dedicated shared value for text visibility.
  // - Active/unrevealed tiles (feedback='empty'): initialize to 1 so the
  //   letter is visible while the user is typing.
  // - Revealing/completed tiles: initialize to 0 so the letter is hidden
  //   from the start. The useEffect animates it according to the user's
  //   preferences: for normal mode it appears at the 50% point of the
  //   flip; for reduceMotion it appears instantly (no flip) but staggered
  //   left-to-right.
  const textOpacity = useSharedValue(feedback === 'empty' ? 1 : 0);

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
      // Active row (typing) or empty/future row.
      // Text is always visible during typing.
      cancelAnimation(flipProgress);
      cancelAnimation(scale);
      cancelAnimation(textOpacity);
      textOpacity.value = 1;
      flipProgress.value = 0;
      scale.value = 1;
      return;
    }

    const staggerDelay = index * TILE_STAGGER_DELAY;

    // Stop any in-flight worklets before scheduling a new reveal sequence.
    cancelAnimation(flipProgress);
    cancelAnimation(scale);
    cancelAnimation(textOpacity);

    if (reduceMotion) {
      // 2026-07-10: When reduceMotion is on, skip the rotateX flip BUT
      // stagger the text appearance left-to-right over a brief instant
      // so the player still gets some sense of progression. The actual
      // reveal has zero motion (instant text appearance after delay).
      flipProgress.value = 1;
      scale.value = 1;
      textOpacity.value = 0;
      textOpacity.value = withDelay(
        staggerDelay,
        withTiming(1, { duration: 0 }),
      );
      return;
    }

    // 2026-07-11: reset textOpacity to 0 BEFORE scheduling the fade-in.
    // With stable keys (no remount), the shared value persists at 1 from
    // the active typing phase. Without this reset, the letter would stay
    // visible throughout the flip instead of hiding until the 50% point.
    // This replaces the previous key-based remount that forced fresh
    // shared values but caused Fabric mount/unmount churn crashes.
    textOpacity.value = 0;

    // 2026-07-10: Normal mode. The text is hidden during the first
    // half of the flip (when the empty side is showing), then fades
    // in over the second half (when the new face with the feedback
    // color is rotating back to face the user). The fade-in starts
    // exactly at the 50% point of the flip animation, so the
    // displayed character appears simultaneously with the feedback
    // color — a natural-feeling 'reveal'.
    flipProgress.value = withDelay(
      staggerDelay,
      withTiming(1, {
        duration: TILE_FLIP_DURATION,
        easing: Easing.inOut(Easing.ease),
      }),
    );
    textOpacity.value = withDelay(
      staggerDelay + TILE_FLIP_DURATION / 2,
      withTiming(1, { duration: TILE_FLIP_DURATION / 2 }),
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
    // + 100ms buffer. The safety net forces textOpacity = 1 too so the
    // letter is definitely visible at end of animation.
    const totalDuration = staggerDelay + TILE_FLIP_DURATION
      + (feedback === 'correct' ? TILE_CORRECT_BOUNCE_EXTRA : 0)
      + 100;
    const safetyTimer = setTimeout(() => {
      flipProgress.value = 1;
      scale.value = 1;
      textOpacity.value = 1;
    }, totalDuration);
    return () => clearTimeout(safetyTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRevealing, reduceMotion]);

  const animatedTileStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      flipProgress.value,
      [0, 0.5, 1],
      [theme.colors.tile.empty, theme.colors.tile.empty, feedbackColors[feedback]],
    );

    // 2026-07-10: restored the rotateX flip animation 0 -> -90 -> 0.
    // The text is kept hidden during the first half of the flip via the
    // dedicated textOpacity shared value (see useEffect above) so it
    // doesn't appear smushed as the tile rotates edge-on, then it
    // fades in over the second half so the letter appears simultaneously
    // with the feedback color (the natural Wordle tile reveal).
    //
    // 2026-07-11: the previous key-based remount in GuessRow (key=`${i}-${tileFeedback}`)
    // was removed because unmounting/re mounting ~7 Animated.Views per guess
    // triggered Fabric SurfaceMountingManager assertion failures. The
    // missing-text bug that remount worked around is now fixed by resetting
    // textOpacity to 0 in the reveal useEffect above, so the stable-key Tile
    // instance animates cleanly. The safety-net setTimeout below guarantees
    // the final state if a worklet is interrupted for any reason.
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

  // 2026-07-10: text opacity is driven by the dedicated textOpacity
  // shared value (no longer interpolated from flipProgress). The
  // useEffect sets this value:
  //   - Active/unrevealed tiles: instant 1 (always visible)
  //   - reduceMotion: instant 1 after the stagger delay (no flip, just
  //     left-to-right stagger of text appearance)
  //   - Normal: 0 from the start, fades to 1 over the second half of
  //     the flip (so the letter reveals simultaneously with the
  //     feedback color after the 50% edge-on point)
  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
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
        : feedback === 'empty'
          ? theme.colors.text.primary // active/typing: dark in light, light in dark
          : theme.colors.text.inverse; // 'correct' feedback

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

      {/* Texture overlay for color blind mode (LAUNCH-01). Container is always
          mounted when colorBlindMode is on so feedback transitions do not
          insert native views mid-flip (Fabric mount + Reanimated prop flush). */}
      {colorBlindMode && (
        <View style={[StyleSheet.absoluteFill, styles.textureContainer]} pointerEvents="none">
          <View
            style={[
              StyleSheet.absoluteFill,
              { opacity: feedback === 'correct' ? 1 : 0 },
            ]}
          >
            <View style={[styles.dot, { top: '25%', left: '50%', marginLeft: -3, marginTop: -3 }]} />
            <View style={[styles.dot, { top: '60%', left: '25%', marginLeft: -3, marginTop: -3 }]} />
            <View style={[styles.dot, { top: '60%', left: '75%', marginLeft: -3, marginTop: -3 }]} />
          </View>
          <View
            style={[
              StyleSheet.absoluteFill,
              { opacity: feedback === 'present' ? 1 : 0, transform: [{ rotate: '45deg' }] },
            ]}
          >
            <View style={[styles.stripeBar, { top: '20%' }]} />
            <View style={[styles.stripeBar, { top: '50%' }]} />
            <View style={[styles.stripeBar, { top: '80%' }]} />
          </View>
          <View
            style={[
              StyleSheet.absoluteFill,
              { opacity: feedback === 'absent' ? 1 : 0, backgroundColor: 'rgba(0,0,0,0.15)' },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}
