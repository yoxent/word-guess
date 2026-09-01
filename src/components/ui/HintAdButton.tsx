import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { FONTS } from '../../utils/fonts';
import { layout } from '../../constants/layout';

const ICON_COLOR = '#FFFFFF';
const ICON_SIZE = 18;
const LABEL_FONT_SIZE = 15;

export type HintAdIcon = 'play' | 'hint';

export interface HintAdButtonProps {
  icon: HintAdIcon;
  label: string;
  backgroundColor: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
}

function PlayIcon() {
  return (
    <Svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="1.88 1.88 20.25 20.25"
      accessible={false}
    >
      <Circle
        cx={12}
        cy={12}
        r={9}
        stroke={ICON_COLOR}
        strokeWidth={2.25}
        fill="none"
      />
      <Path d="M10.2 8.3v7.4L17 12 10.2 8.3z" fill={ICON_COLOR} />
    </Svg>
  );
}

function HintIcon() {
  return (
    <Svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="1 1 22 22"
      accessible={false}
    >
      <Path
        d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
        stroke={ICON_COLOR}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9 18h6"
        stroke={ICON_COLOR}
        strokeWidth={2.25}
        strokeLinecap="round"
      />
      <Path
        d="M10 22h4"
        stroke={ICON_COLOR}
        strokeWidth={2.25}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Rewarded-ad helper pill. Play and hint share one icon size and one
 * label size so the two buttons read as a pair.
 */
export function HintAdButton({
  icon,
  label,
  backgroundColor,
  onPress,
  disabled = false,
  accessibilityLabel,
}: HintAdButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor, shadowColor: backgroundColor },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <View style={styles.content} pointerEvents="none">
        {icon === 'play' ? <PlayIcon /> : <HintIcon />}
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.buttonBorderRadius,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    maxWidth: '100%',
  },
  label: {
    fontFamily: FONTS.button,
    fontSize: LABEL_FONT_SIZE,
    fontWeight: '700',
    lineHeight: ICON_SIZE,
    color: ICON_COLOR,
    flexShrink: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
