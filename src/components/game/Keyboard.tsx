import React, { memo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGameStore } from '@/stores';
import { colors } from '@/constants/colors';
import { layout } from '@/constants/layout';
import * as Haptics from 'expo-haptics';
import type { TileFeedback } from '@/types';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
];

const KEY_COLOR_MAP: Record<string, string> = {
  correct: colors.keyCorrect,
  present: colors.keyPresent,
  absent: colors.keyAbsent,
  unused: colors.keyUnused,
};

function KeyboardComponent() {
  const session = useGameStore((s) => s.session);
  const addLetter = useGameStore((s) => s.addLetter);
  const removeLetter = useGameStore((s) => s.removeLetter);
  const submitGuess = useGameStore((s) => s.submitGuess);
  const currentGuess = useGameStore((s) => s.currentGuess);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const addPendingInput = useGameStore((s) => s.addPendingInput);

  const isPlaying = session?.status === 'playing';
  const isBlocked = !isPlaying || isRevealing;

  const handlePress = useCallback(
    (key: string) => {
      // Light haptic on any key press (D-18)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      if (!isPlaying) return;

      if (isRevealing) {
        // Queue input instead of dropping it (D-66: queue preferred)
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

  const getKeyBackground = (key: string): string => {
    if (key === 'ENTER' || key === 'BACKSPACE') {
      return colors.keySpecial;
    }
    const feedback = session?.keyColors?.[key];
    const status: TileFeedback | 'unused' = feedback ?? 'unused';
    return KEY_COLOR_MAP[status] || colors.keyUnused;
  };

  const isKeyDisabled = (key: string): boolean => {
    if (isBlocked) return true;
    if (key === 'ENTER') {
      return currentGuess.length < (session?.letterCount ?? 5);
    }
    if (key === 'BACKSPACE') {
      return currentGuess.length === 0;
    }
    // Letter key
    return currentGuess.length >= (session?.letterCount ?? 5);
  };

  const getKeyText = (key: string): string => {
    if (key === 'BACKSPACE') return '⌫';
    return key;
  };

  const getKeyFontSize = (key: string): number => {
    if (key === 'ENTER') return 12;
    if (key === 'BACKSPACE') return 16;
    return 16;
  };

  const getKeyTextColor = (key: string): string => {
    if (key === 'ENTER' || key === 'BACKSPACE') {
      return colors.textInverse;
    }
    const feedback = session?.keyColors?.[key];
    // Unused keys get dark text; used keys get inverse white text
    if (!feedback) {
      return colors.keyText;
    }
    return colors.textInverse;
  };

  return (
    <View style={styles.container}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => {
            const disabled = isKeyDisabled(key);
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  { backgroundColor: getKeyBackground(key) },
                  (key === 'ENTER' || key === 'BACKSPACE') && styles.wideKey,
                  disabled && styles.keyDisabled,
                ]}
                onPress={() => handlePress(key)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.keyText,
                    { fontSize: getKeyFontSize(key), color: getKeyTextColor(key) },
                  ]}
                >
                  {getKeyText(key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

KeyboardComponent.displayName = 'Keyboard';

export const Keyboard = memo(KeyboardComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: layout.keyboardKeyGap,
    marginBottom: 4,
  },
  key: {
    height: layout.keyboardKeyHeight,
    minWidth: layout.keyboardKeyMinWidth,
    borderRadius: layout.keyboardKeyBorderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  wideKey: {
    minWidth: layout.keyboardKeyMinWidth + 16,
    paddingHorizontal: 10,
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyText: {
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
