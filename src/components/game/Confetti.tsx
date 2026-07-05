import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  withDelay,
  useAnimatedStyle,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 35;
const PARTICLE_COLORS = ['#6aaa64', '#c9b458', '#4a9eff', '#e74c3c', '#ffffff'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ParticleProps {
  index: number;
}

function Particle({ index }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 15,
      withTiming(1, {
        duration: 1500,
        easing: Easing.out(Easing.ease),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deterministic random values per particle (seed from index)
  const hue = PARTICLE_COLORS[index % PARTICLE_COLORS.length];
  const size = 6 + ((index * 7) % 9); // 6-14px range
  const startX = SCREEN_WIDTH / 2 + ((index * 53) % SCREEN_WIDTH) - SCREEN_WIDTH / 2;
  const fallDistance = 300 + ((index * 37) % 200); // 300-500px
  const endX = startX + ((index * 29) % 200) - 100;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [startX, endX],
        ),
      },
      {
        translateY: interpolate(
          progress.value,
          [0, 1],
          [-20, fallDistance],
        ),
      },
      {
        scale: interpolate(
          progress.value,
          [0, 0.7, 1],
          [1, 0.8, 0.3],
        ),
      },
    ],
    opacity: interpolate(
      progress.value,
      [0, 0.6, 1],
      [1, 1, 0],
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: hue,
        },
        animatedStyle,
      ]}
    />
  );
}

export function Confetti() {
  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <Particle key={i} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
