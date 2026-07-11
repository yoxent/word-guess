import React, { useRef, useEffect, useMemo } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Grid config ──
const ICON_SIZE = 22; // uniform
const COLS = 5;
const ROWS = Math.ceil(SCREEN_HEIGHT / 80) + 3;
const SPACING_X = Math.round(SCREEN_WIDTH / COLS);
const SPACING_Y = 80;
const LOOP_X = SPACING_X * COLS; // full repeat distance horizontally
const LOOP_Y = SPACING_Y * ROWS;  // full repeat distance vertically
const GRID_W = LOOP_X * 2;        // 2× for seamless wrap
const GRID_H = LOOP_Y * 2;        // 2× for seamless wrap
const DURATION = 60000;

// All valid MaterialIcons — verified names only
const ICON_NAMES = [
  'star',
  'diamond',
  'auto-awesome',
  'emoji-events',
  'lightbulb',
  'extension',
  'psychology',
  'school',
  'translate',
  'casino',
  'spellcheck',
  'grid-view',
  'music-note',
  'brush',
  'rocket',
  'whatshot',
  'palette',
  'gamepad',
  'flare',
  'eco',
  'bolt',
  'explore',
  'leaderboard',
  'science',
  'stars',
  'waves',
] as const;

interface Pos {
  name: string;
  x: number;
  y: number;
}

/**
 * Full-screen diagonal marquee: game icons drift south-east (bottom-right)
 * in a seamless loop. Single `Animated.loop(Animated.parallel(...))` keeps
 * both axes locked together. All icons use one brand color at low opacity.
 */
export function MarqueeBackground() {
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const positions = useMemo(() => {
    const items: Pos[] = [];
    for (let row = 0; row < ROWS * 2; row++) {
      for (let col = 0; col < COLS * 2; col++) {
        const pRow = row % ROWS;
        const pCol = col % COLS;
        const idx = (pRow * COLS + pCol) % ICON_NAMES.length;
        items.push({
          name: ICON_NAMES[idx],
          x: col * SPACING_X + SPACING_X / 2,
          y: row * SPACING_Y + SPACING_Y / 2,
        });
      }
    }
    return items;
  }, []);

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -LOOP_X,
          duration: DURATION,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(translateY, {
          toValue: -LOOP_Y,
          duration: DURATION,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [translateX, translateY]);

  const isDark = theme.colors.mode === 'dark';

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <Animated.View
        style={[
          styles.grid,
          {
            width: GRID_W,
            height: GRID_H,
            transform: [{ translateX }, { translateY }],
          },
        ]}
      >
        {positions.map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: p.x - ICON_SIZE / 2,
              top: p.y - ICON_SIZE / 2,
              width: ICON_SIZE,
              height: ICON_SIZE,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons
              name={p.name as any}
              size={ICON_SIZE}
              color={theme.colors.brand.primary}
              style={{ opacity: isDark ? 0.15 : 0.2 }}
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    zIndex: 0,
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
