import React, { memo, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGameStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../constants/layout';
import * as Haptics from 'expo-haptics';
import * as sound from '../../services/sound';
import { useSettingsStore } from '../../stores/settingsStore';
import type { TileFeedback } from '../../types';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

function isActionKey(key: string): boolean {
  return key === 'ENTER' || key === 'BACKSPACE';
}

/** Individual key with spring press animation (transform only). */
function KeyboardKey({
  label,
  displayText,
  fontSize,
  backgroundColor,
  textColor,
  wide,
  disabled,
  dimmed,
  onPress,
}: {
  label: string;
  displayText: string;
  fontSize: number;
  backgroundColor: string;
  textColor: string;
  wide?: boolean;
  disabled: boolean;
  dimmed?: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 5,
      tension: 50,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 50,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        flex: wide ? 1.5 : 1,
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <TouchableOpacity
        style={[
          keyStyles.key,
          { backgroundColor },
          wide && keyStyles.wideKey,
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
        {label === 'BACKSPACE' ? (
          <MaterialIcons name="backspace" size={20} color={textColor} />
        ) : (
          <Text style={[keyStyles.keyText, { fontSize, color: textColor }]}>
            {displayText}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const keyStyles = StyleSheet.create({
  key: {
    height: layout.keyboardKeyHeight,
    borderRadius: layout.keyboardKeyBorderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wideKey: {
    // flex: 1.5 applied via Animated.View
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyText: {
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
          paddingBottom: 16,
        },
        row: {
          flexDirection: 'row',
          gap: layout.keyboardKeyGap,
          marginBottom: 4,
        },
        spacer: {
          flex: 0.5,
        },
      }),
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

  const session = useGameStore((s) => s.session);
  const addLetter = useGameStore((s) => s.addLetter);
  const removeLetter = useGameStore((s) => s.removeLetter);
  const submitGuess = useGameStore((s) => s.submitGuess);
  const currentGuess = useGameStore((s) => s.currentGuess);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const addPendingInput = useGameStore((s) => s.addPendingInput);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);

  const isPlaying = session?.status === 'playing';
  const isBlocked = !isPlaying || isRevealing;

  const handlePress = useCallback(
    (key: string) => {
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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
    [isPlaying, isRevealing, addPendingInput, submitGuess, removeLetter, addLetter, hapticEnabled],
  );

  const getKeyFeedback = useCallback(
    (key: string): TileFeedback | undefined =>
      session?.keyColors?.[key] ?? session?.pendingKeyColors?.[key],
    [session?.keyColors, session?.pendingKeyColors],
  );

  const getKeyBackground = useCallback(
    (key: string): string => {
      if (isActionKey(key)) {
        return theme.colors.key.special;
      }
      const feedback = getKeyFeedback(key);
      const status: TileFeedback | 'unused' = feedback ?? 'unused';
      return keyColorMap[status] || theme.colors.key.unused;
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

  const isKeyDisabled = useCallback(
    (key: string): boolean => {
      if (isBlocked) return true;
      if (key === 'ENTER') return currentGuess.length < (session?.letterCount ?? 5);
      if (key === 'BACKSPACE') return currentGuess.length === 0;
      return currentGuess.length >= (session?.letterCount ?? 5);
    },
    [isBlocked, currentGuess.length, session?.letterCount],
  );

  const getKeyDisplay = useCallback((key: string): { text: string; fontSize: number; label: string } => {
    if (key === 'ENTER') return { text: 'ENTER', fontSize: 11, label: 'Enter' };
    if (key === 'BACKSPACE') return { text: '⌫', fontSize: 18, label: 'Backspace' };
    return { text: key, fontSize: 16, label: key };
  }, []);

  return (
    <View style={styles.container}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => {
            if (key === '') {
              return <View key="spacer" style={styles.spacer} />;
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
                wide={isActionKey(key)}
                disabled={disabled}
                dimmed={feedback === 'absent'}
                onPress={() => handlePress(key)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

KeyboardComponent.displayName = 'Keyboard';

export const Keyboard = memo(KeyboardComponent);
