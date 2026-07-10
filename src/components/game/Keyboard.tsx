import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
        key: {
          flex: 1,
          height: layout.keyboardKeyHeight,
          borderRadius: layout.keyboardKeyBorderRadius,
          justifyContent: 'center',
          alignItems: 'center',
        },
        wideKey: {
          flex: 1.5,
        },
        keyDisabled: {
          opacity: 0.4,
        },
        keyText: {
          fontWeight: '700',
          textTransform: 'uppercase',
        },
      }),
    [],
  );

  // Build feedback → color map from active theme
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
      // Light haptic on any key press (D-18) — only if user has haptics enabled
      if (hapticEnabled) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      // Play key press sound (D-181) — gated by sfxVolume in the sound service
      sound.playKeyPress();

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
    if (isActionKey(key)) {
      // 2026-07-09: action keys (ENTER/BACKSPACE) now use the same background
      // as unused letter keys. Previously they used colors.key.special which
      // (combined with the dark text.inverse in dark theme) produced an
      // unreadable dark-on-dark combo. Same color as letters, but the text
      // label distinguishes them (ENTER/BACKSPACE + slightly wider).
      return theme.colors.key.unused;
    }
    const feedback = session?.keyColors?.[key];
    const status: TileFeedback | 'unused' = feedback ?? 'unused';
    return keyColorMap[status] || theme.colors.key.unused;
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
    if (isActionKey(key)) {
      // 2026-07-09: action keys now use the same text color as unused letter
      // keys (colors.key.text = text.primary, theme-aware). Previously they
      // used colors.key.actionText (= text.inverse, which is dark in dark
      // theme → unreadable on the dark-gray key.special background).
      return theme.colors.key.text;
    }
    const feedback = session?.keyColors?.[key];
    // Unused keys get dark text; used keys get inverse white text
    if (!feedback) {
      return theme.colors.key.text;
    }
    // Present keys use dark text for contrast (D-180)
    if (feedback === 'present') return theme.colors.text.onPresent;
    return theme.colors.text.inverse;
  };

  return (
    <View style={styles.container}>
      {ROWS.map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((key) => {
            if (key === '') {
              // Spacer for row 2 offset (9 keys -> centered like QWERTY)
              return <View key="spacer" style={styles.spacer} />;
            }
            const disabled = isKeyDisabled(key);
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.key,
                  { backgroundColor: getKeyBackground(key) },
                  isActionKey(key) && styles.wideKey,
                  disabled && styles.keyDisabled,
                ]}
                onPress={() => handlePress(key)}
                disabled={disabled}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="keyboardkey"
                accessibilityLabel={key === 'ENTER' ? 'Enter' : key === 'BACKSPACE' ? 'Backspace' : key}
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
