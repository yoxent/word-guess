import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { TileFeedback } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../constants/layout';
import { noFontScaling } from '../../constants/typography';
import {
  createTileStyles,
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
  tileSize,
  isHintGhost,
  isSelected = false,
  isCallout = false,
  onPress,
}: StaticTileProps) {
  const theme = useTheme();
  const styles = useMemo(() => createTileStyles(theme), [theme]);
  const feedbackColors = useMemo(() => getFeedbackColors(theme), [theme]);

  const isEmpty = letter === ' ' || letter === '';
  const showGhost = Boolean(isHintGhost && !isEmpty);
  const showBorder = feedback === 'empty' && !showGhost;
  const letterColor = showGhost ? theme.colors.key.hintText : getLetterColor(feedback, theme);
  const tileFontSize = Math.round(tileSize * 0.48);

  const content = !isEmpty ? (
    <Text
      {...noFontScaling}
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
  ) : null;

  const tileStyle = [
    {
      width: tileSize,
      height: tileSize,
      borderRadius: layout.tileBorderRadius,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      backgroundColor: showGhost ? theme.colors.key.hintDim : feedbackColors[feedback],
      overflow: 'visible' as const,
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

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={tileStyle}>
        {content}
      </Pressable>
    );
  }

  return <View style={tileStyle}>{content}</View>;
}
