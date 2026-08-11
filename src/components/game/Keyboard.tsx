import React, { memo, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGameStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../constants/layout';
import {
  getKeyboardKeys,
  getKeyboardRows,
} from '../../constants/keyboardLayouts';
import { FONTS } from '../../utils/fonts';
import * as Haptics from 'expo-haptics';
import * as sound from '../../services/sound';
import { useSettingsStore } from '../../stores/settingsStore';
import type { TileFeedback } from '../../types';

function isActionKey(key: string): boolean {
  return key === 'ENTER' || key === 'BACKSPACE';
}

/** Individual key with lightweight press scale (transform only, native driver). */
const KeyboardKey = memo(function KeyboardKey({
  label,
  displayText,
  fontSize,
  backgroundColor,
  textColor,
  flex = 1,
  height = layout.keyboardKeyHeight,
  showBackspaceIcon,
  disabled,
  dimmed,
  onPress,
}: {
  label: string;
  displayText: string;
  fontSize: number;
  backgroundColor: string;
  textColor: string;
  flex?: number;
  height?: number;
  showBackspaceIcon?: boolean;
  disabled: boolean;
  dimmed?: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    // timing is cheaper than spring under rapid multi-key input
    Animated.timing(scale, {
      toValue: 0.92,
      duration: 60,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 80,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        flex,
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <TouchableOpacity
        style={[
          keyStyles.key,
          { backgroundColor, height },
          disabled && keyStyles.keyDisabled,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={1}
        accessible
        accessibilityRole="keyboardkey"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        {showBackspaceIcon ? (
          <MaterialIcons name="backspace" size={20} color={textColor} />
        ) : (
          <Text
            style={[keyStyles.keyText, { fontSize, color: textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {displayText}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const keyStyles = StyleSheet.create({
  key: {
    borderRadius: layout.keyboardKeyBorderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyText: {
    fontFamily: FONTS.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});

function KeyboardComponent() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: '100%',
          flexDirection: 'row',
          gap: layout.keyboardKeyGap,
          paddingBottom: 16,
        },
        lettersColumn: {
          flex: 1,
          minWidth: 0,
        },
        row: {
          flexDirection: 'row',
          gap: layout.keyboardKeyGap,
          marginBottom: layout.keyboardKeyGap,
        },
        spacer: {
          flex: 0.5,
        },
        actionsColumn: {
          // Roughly one wide key — ISO backspace/submit rail
          width: 56,
          gap: layout.keyboardKeyGap,
        },
      }),
    [],
  );

  const keyboardLayout = useSettingsStore((s) => s.keyboardLayout);
  const rows = useMemo(() => getKeyboardRows(keyboardLayout), [keyboardLayout]);
  const allKeys = useMemo(() => getKeyboardKeys(keyboardLayout), [keyboardLayout]);

  const submitHeight = useMemo(
    () => layout.keyboardKeyHeight * 2 + layout.keyboardKeyGap,
    [],
  );

  const keyColorMap = useMemo<Record<string, string>>(
    () => ({
      correct: theme.colors.key.correct,
      present: theme.colors.key.present,
      absent: theme.colors.key.absent,
      unused: theme.colors.key.unused,
    }),
    [theme],
  );

  // Narrow selectors — full `session` re-rendered every letter before.
  const keyColors = useGameStore((s) => s.session?.keyColors);
  const pendingKeyColors = useGameStore((s) => s.session?.pendingKeyColors);
  const letterCount = useGameStore((s) => s.session?.letterCount ?? 5);
  const status = useGameStore((s) => s.session?.status);
  const addLetter = useGameStore((s) => s.addLetter);
  const removeLetter = useGameStore((s) => s.removeLetter);
  const submitGuess = useGameStore((s) => s.submitGuess);
  const currentGuessLength = useGameStore((s) => s.currentGuess.length);
  const editIndex = useGameStore((s) => s.editIndex);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const addPendingInput = useGameStore((s) => s.addPendingInput);

  const isPlaying = status === 'playing';
  const isBlocked = !isPlaying || isRevealing;

  const handlePress = useCallback(
    (key: string) => {
      // Read haptic at press time — avoids re-subscribing the whole keyboard
      if (useSettingsStore.getState().hapticEnabled) {
        Haptics.selectionAsync().catch(() => {});
      }
      sound.playKeyPress();

      if (!isPlaying) return;

      if (isRevealing) {
        addPendingInput(key);
        return;
      }

      if (key === 'ENTER') {
        submitGuess();
      } else if (key === 'BACKSPACE') {
        removeLetter();
      } else {
        addLetter(key);
      }
    },
    [isPlaying, isRevealing, addPendingInput, submitGuess, removeLetter, addLetter],
  );

  // Stable per-key handlers so memoized KeyboardKey can skip re-renders
  const pressHandlers = useMemo(() => {
    const map: Record<string, () => void> = {};
    for (const key of allKeys) {
      map[key] = () => handlePress(key);
    }
    return map;
  }, [handlePress, allKeys]);

  const getKeyFeedback = useCallback(
    (key: string): TileFeedback | undefined =>
      keyColors?.[key] ?? pendingKeyColors?.[key],
    [keyColors, pendingKeyColors],
  );

  const getKeyBackground = useCallback(
    (key: string): string => {
      if (isActionKey(key)) {
        return theme.colors.key.special;
      }
      const feedback = getKeyFeedback(key);
      const statusKey: TileFeedback | 'unused' = feedback ?? 'unused';
      return keyColorMap[statusKey] || theme.colors.key.unused;
    },
    [getKeyFeedback, keyColorMap, theme],
  );

  const getKeyTextColor = useCallback(
    (key: string): string => {
      if (isActionKey(key)) {
        return theme.colors.key.text;
      }
      const feedback = getKeyFeedback(key);
      if (!feedback) return theme.colors.key.text;
      if (feedback === 'present') return theme.colors.text.onPresent;
      return theme.colors.text.inverse;
    },
    [getKeyFeedback, theme],
  );

  /**
   * Letter keys stay enabled while typing — addLetter already no-ops when
   * the row is full (unless a tile is selected for replace). Only ENTER /
   * BACKSPACE flip with length so we don't re-render every letter key on each tap.
   */
  const isKeyDisabled = useCallback(
    (key: string): boolean => {
      if (isBlocked) return true;
      if (key === 'ENTER') return currentGuessLength < letterCount;
      if (key === 'BACKSPACE') return currentGuessLength === 0;
      // Allow letter taps when replacing a selected tile even if the row is full
      if (editIndex != null) return false;
      return false;
    },
    [isBlocked, currentGuessLength, letterCount, editIndex],
  );

  const getKeyDisplay = useCallback(
    (key: string): { text: string; fontSize: number; label: string } => {
      if (key === 'ENTER') return { text: 'SUBMIT', fontSize: 10, label: 'Submit' };
      if (key === 'BACKSPACE') {
        return { text: '⌫', fontSize: 18, label: 'Backspace' };
      }
      return { text: key, fontSize: 16, label: key };
    },
    [],
  );

  const renderLetterKey = (key: string, keyIndex: number, rowIndex: number) => {
    if (key === '') {
      return (
        <View key={`spacer-${rowIndex}-${keyIndex}`} style={styles.spacer} />
      );
    }
    const { text, fontSize, label } = getKeyDisplay(key);
    const disabled = isKeyDisabled(key);
    const feedback = getKeyFeedback(key);
    return (
      <KeyboardKey
        key={key}
        label={label}
        displayText={text}
        fontSize={fontSize}
        backgroundColor={getKeyBackground(key)}
        textColor={getKeyTextColor(key)}
        disabled={disabled}
        dimmed={feedback === 'absent'}
        onPress={pressHandlers[key]}
      />
    );
  };

  const backspaceDisplay = getKeyDisplay('BACKSPACE');
  const submitDisplay = getKeyDisplay('ENTER');

  return (
    <View style={styles.container}>
      <View style={styles.lettersColumn}>
        {rows.map((row, i) => (
          <View
            key={`${keyboardLayout}-${i}`}
            style={[styles.row, i === rows.length - 1 && { marginBottom: 0 }]}
          >
            {row.map((key, keyIndex) => renderLetterKey(key, keyIndex, i))}
          </View>
        ))}
      </View>

      <View style={styles.actionsColumn}>
        <KeyboardKey
          label={backspaceDisplay.label}
          displayText={backspaceDisplay.text}
          fontSize={backspaceDisplay.fontSize}
          backgroundColor={getKeyBackground('BACKSPACE')}
          textColor={getKeyTextColor('BACKSPACE')}
          flex={0}
          showBackspaceIcon
          disabled={isKeyDisabled('BACKSPACE')}
          onPress={pressHandlers.BACKSPACE}
        />
        <KeyboardKey
          label={submitDisplay.label}
          displayText={submitDisplay.text}
          fontSize={submitDisplay.fontSize}
          backgroundColor={getKeyBackground('ENTER')}
          textColor={getKeyTextColor('ENTER')}
          flex={0}
          height={submitHeight}
          disabled={isKeyDisabled('ENTER')}
          onPress={pressHandlers.ENTER}
        />
      </View>
    </View>
  );
}

KeyboardComponent.displayName = 'Keyboard';

export const Keyboard = memo(KeyboardComponent);
