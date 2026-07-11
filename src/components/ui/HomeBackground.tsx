import React, { useEffect, useMemo } from 'react';
import {
  Image,
  PixelRatio,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../stores';

const TEXTURE_LIGHT = require('../../../assets/images/home-bg-light.png');
const TEXTURE_DARK = require('../../../assets/images/home-bg-dark.png');

/** Display tiles at 70% of a screen-relative base size. */
const TEXTURE_SCALE = 1;
const SCROLL_DURATION_MS = 25000;

function tileDimensions(
  screenWidth: number,
  source: number,
): { width: number; height: number } {
  const asset = Image.resolveAssetSource(source);
  const aspect = asset.height / asset.width;
  const assetScale = asset.scale ?? PixelRatio.get();
  const assetWidthDp = asset.width / assetScale;
  const baseWidth = Math.min(assetWidthDp, screenWidth);
  const width = Math.round(baseWidth * TEXTURE_SCALE);
  const height = Math.round(width * aspect);
  return { width, height };
}

function runAfterUiSettle(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function ScrollingTexture({ source }: { source: number }) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { width: tileW, height: tileH } = useMemo(
    () => tileDimensions(screenW, source),
    [screenW, source],
  );
  const scrollPxPerMs = tileH / SCROLL_DURATION_MS;
  // dp size of one physical pixel — used to snap offsets so tile edges always
  // land on a pixel boundary and never overlap their neighbour by a fraction.
  const pixelSize = 1 / PixelRatio.get();

  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const scroll = useSharedValue(0);
  const reduceMotionSv = useSharedValue(reduceMotion);

  useEffect(() => {
    reduceMotionSv.value = reduceMotion;
  }, [reduceMotion, reduceMotionSv]);

  const frameCallback = useFrameCallback((frame) => {
    'worklet';
    if (reduceMotionSv.value) return;
    const dt = frame.timeSincePreviousFrame ?? 16;
    scroll.value += scrollPxPerMs * dt;
  }, false);

  useEffect(() => {
    if (reduceMotion) {
      frameCallback.setActive(false);
      scroll.value = 0;
      return;
    }

    let cancelled = false;
    runAfterUiSettle(() => {
      if (cancelled) return;
      frameCallback.setActive(true);
    });

    return () => {
      cancelled = true;
      frameCallback.setActive(false);
      scroll.value = 0;
    };
  }, [reduceMotion, frameCallback, scroll]);

  const animatedStyle = useAnimatedStyle(() => {
    const rawX = scroll.value % tileW;
    const rawY = scroll.value % tileH;
    // Snap to the nearest physical pixel so adjacent tile edges share the
    // exact same boundary and never bleed into each other.
    const snapX = Math.round(rawX / pixelSize) * pixelSize;
    const snapY = Math.round(rawY / pixelSize) * pixelSize;
    return {
      transform: [{ translateX: snapX }, { translateY: snapY }],
    };
  }, [tileW, tileH, pixelSize]);

  const tiles = useMemo(() => {
    const cols = Math.max(2, Math.ceil(screenW / tileW) + 2);
    const rows = Math.max(2, Math.ceil(screenH / tileH) + 2);
    const list: { key: string; left: number; top: number }[] = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        list.push({
          key: `${row}-${col}`,
          left: col * tileW,
          top: row * tileH,
        });
      }
    }
    return list;
  }, [screenW, screenH, tileW, tileH]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        collapsable={false}
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: -tileW,
            top: -tileH,
            width: Math.ceil(screenW / tileW + 2) * tileW,
            height: Math.ceil(screenH / tileH + 2) * tileH,
          },
          animatedStyle,
        ]}
      >
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={source}
            style={{
              position: 'absolute',
              left: tile.left,
              top: tile.top,
              width: tileW,
              height: tileH,
            }}
            resizeMode="stretch"
          />
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Home-screen background: infinite UV-scroll tile in light and dark themes.
 * Rendered as the first sibling in HomeScreen; UI overlays via paint order.
 */
export function HomeBackground() {
  const theme = useTheme();
  const isDark = theme.colors.mode === 'dark';
  const texture = isDark ? TEXTURE_DARK : TEXTURE_LIGHT;

  return (
    <View
      style={[styles.fill, { backgroundColor: theme.colors.surface.background }]}
      pointerEvents="none"
    >
      <ScrollingTexture source={texture} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
