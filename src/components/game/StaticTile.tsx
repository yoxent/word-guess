import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TileFeedback } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../constants/layout';
import { useSettingsStore } from '../../stores';
import {
  createTileStyles,
  getAccessibilityLabel,
  getFeedbackColors,
  getLetterColor,
} from './tileShared';

interface StaticTileProps {
  letter: string;
  feedback: TileFeedback;
  index: number;
  tileSize: number;
}

/** Plain tile with no Reanimated worklets — safe for completed / idle rows. */
export function StaticTile({ letter, feedback, index, tileSize }: StaticTileProps) {
  const theme = useTheme();
  const colorBlindMode = useSettingsStore((s) => s.colorBlindMode);
  const styles = useMemo(() => createTileStyles(theme), [theme]);
  const feedbackColors = useMemo(() => getFeedbackColors(theme), [theme]);

  const isEmpty = letter === ' ' || letter === '';
  const showBorder = feedback === 'empty';
  const letterColor = getLetterColor(feedback, theme);
  const tileFontSize = Math.round(tileSize * 0.48);

  return (
    <View
      accessible
      accessibilityLabel={getAccessibilityLabel(letter, feedback, index)}
      accessibilityRole="text"
      style={[
        {
          width: tileSize,
          height: tileSize,
          borderRadius: layout.tileBorderRadius,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: feedbackColors[feedback],
          overflow: 'hidden',
        },
        showBorder && styles.tileBorder,
      ]}
    >
      {!isEmpty && (
        <Text
          style={[
            styles.letter,
            { fontSize: tileFontSize, color: letterColor },
          ]}
        >
          {letter.toUpperCase()}
        </Text>
      )}

      {colorBlindMode && feedback !== 'empty' && (
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
    </View>
  );
}
