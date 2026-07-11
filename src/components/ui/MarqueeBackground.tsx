import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Rain config ──
const ICON_SIZE = 22;
const COLUMN_COUNT = 6;
const COLUMN_SPACING = SCREEN_WIDTH / COLUMN_COUNT;
const ICONS_PER_COLUMN = 3;
const FALL_DURATION = 12000; // 12 seconds for full screen fall
const EAST_DRIFT = 80; // horizontal movement amount (pixels)
const COLUMN_STAGGER = 2000; // ms stagger between columns

const ICON_NAMES = [
  'star', 'diamond', 'auto-awesome', 'emoji-events', 'lightbulb',
  'extension', 'psychology', 'school', 'translate', 'casino',
  'spellcheck', 'grid-view', 'music-note', 'brush', 'rocket',
  'whatshot', 'palette', 'gamepad', 'flare', 'eco',
  'bolt', 'explore', 'leaderboard', 'science', 'stars', 'waves',
] as const;

interface IconProps {
  columnIndex: number;
  rowIndex: number;
  iconName: string;
  initialY: number; // pre-computed starting Y position
}

/**
 * Single falling icon with diagonal movement (south-east)
 */
function FallingIcon({ columnIndex, rowIndex, iconName, initialY }: IconProps) {
  const theme = useTheme();
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Column X position
  const baseX = columnIndex * COLUMN_SPACING + COLUMN_SPACING / 2;

  // Stagger delay
  const delay = (columnIndex * COLUMN_STAGGER) + (rowIndex * 800);

  useMemo(() => {
    // Fall DOWN (south)
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(SCREEN_HEIGHT, {
          duration: FALL_DURATION,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    // Drift RIGHT (east)
    translateX.value = withDelay(
      delay,
      withRepeat(
        withTiming(EAST_DRIFT, {
          duration: FALL_DURATION,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: baseX + translateX.value },
      { translateY: initialY + translateY.value },
    ],
    opacity: interpolate(
      translateY.value,
      [-100, 0, SCREEN_HEIGHT * 0.7, SCREEN_HEIGHT],
      [0, 0.6, 0.6, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const isDark = theme.colors.mode === 'dark';

  return (
    <Animated.View style={[styles.icon, animatedStyle]}>
      <MaterialIcons
        name={iconName as any}
        size={ICON_SIZE}
        color={theme.colors.brand.primary}
        style={{ opacity: isDark ? 0.12 : 0.18 }}
      />
    </Animated.View>
  );
}

/**
 * Diagonal rain of icons with checkerboard pattern
 * Icons start already filling the screen and rain down-east continuously
 */
export function MarqueeBackground() {
  // Pre-compute icon positions so they fill screen immediately
  const drops = useMemo(() => {
    const result: { key: string; col: number; row: number; name: string; initialY: number }[] = [];

    for (let col = 0; col < COLUMN_COUNT; col++) {
      for (let row = 0; row < ICONS_PER_COLUMN; row++) {
        // Checkerboard: skip every other cell
        if ((col + row) % 2 !== 0) continue;

        const idx = (col * 5 + row * 3) % ICON_NAMES.length;

        // Spread icons vertically across screen from start
        // Each icon gets a Y position that covers the full screen height
        const initialY = (row * (SCREEN_HEIGHT / ICONS_PER_COLUMN)) - 50;

        result.push({
          key: `${col}-${row}`,
          col,
          row,
          name: ICON_NAMES[idx],
          initialY,
        });
      }
    }
    return result;
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {drops.map((drop) => (
        <FallingIcon
          key={drop.key}
          columnIndex={drop.col}
          rowIndex={drop.row}
          iconName={drop.name}
          initialY={drop.initialY}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  icon: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
