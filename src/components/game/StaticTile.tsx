import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
  /** Rewarded letter-hint ghost preview (letter is the hinted char). */
  isHintGhost?: boolean;
  /** Active-row selection for in-place letter replace. */
  isSelected?: boolean;
  isCallout?: boolean;
  onPress?: () => void;
}

/** Plain tile with no Reanimated worklets — safe for completed / idle rows. */
export function StaticTile({
  letter,
  feedback,
  index,
  tileSize,
  isHintGhost,
  isSelected = false,
  isCallout = false,
  onPress,
}: StaticTileProps) {
  const theme = useTheme();
  const colorBlindMode = useSettingsStore((s) => s.colorBlindMode);
  const styles = useMemo(() => createTileStyles(theme), [theme]);
  const feedbackColors = useMemo(() => getFeedbackColors(theme), [theme]);

  const isEmpty = letter === ' ' || letter === '';
  const showGhost = Boolean(isHintGhost && !isEmpty);
  const showBorder = feedback === 'empty' && !showGhost;
  const letterColor = showGhost ? theme.colors.key.hintText : getLetterColor(feedback, theme);
  const tileFontSize = Math.round(tileSize * 0.48);

  const content = (
    <>
      {!isEmpty && (
        <Text
          style={[
            styles.letter,
            {
              fontSize: tileFontSize,
              color: letterColor,
              opacity: showGhost ? 0.55 : 1,
            },
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
    </>
  );

  const tileStyle = [
    {
      width: tileSize,
      height: tileSize,
      borderRadius: layout.tileBorderRadius,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: showGhost ? theme.colors.key.hintDim : feedbackColors[feedback],
      overflow: (colorBlindMode ? 'hidden' : 'visible') as 'hidden' | 'visible',
    },
    showBorder && styles.tileBorder,
    showGhost && {
      borderWidth: 2,
      borderColor: theme.colors.key.hint,
    },
    isSelected && {
      borderWidth: 2.5,
      borderColor: theme.colors.brand.primary,
    },
    isCallout && {
      borderWidth: 3,
      borderColor: theme.colors.brand.primary,
    },
  ];

  const accessibilityLabel = showGhost
    ? `Position ${index + 1}: ${letter.toUpperCase()}, hint`
    : getAccessibilityLabel(letter, feedback, index);

  if (onPress) {
    return (
      <Pressable
        accessible
        accessibilityLabel={
          isSelected
            ? `${accessibilityLabel}, selected — tap to deselect or type to replace`
            : `${accessibilityLabel}, tap to select`
        }
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={onPress}
        style={tileStyle}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      style={tileStyle}
    >
      {content}
    </View>
  );
}
