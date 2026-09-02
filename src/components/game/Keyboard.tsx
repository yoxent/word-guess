import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useGameStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../constants/layout';
import {
  getKeyboardKeys,
  getKeyboardRows,
} from '../../constants/keyboardLayouts';
import { computeLetterKeyWidth } from '../../utils/gameLayout';
import { FONTS } from '../../utils/fonts';
import { noFontScaling } from '../../constants/typography';
import * as Haptics from 'expo-haptics';
import * as sound from '../../services/sound';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTutorialStore } from '../../stores/tutorialStore';
import {
  isTutorialKeyAllowed,
  tutorialHighlightedKey,
} from '../../services/tutorialScript';
import type { TileFeedback } from '../../types';

function isActionKey(key: string): boolean {
  return key === 'ENTER' || key === 'BACKSPACE';
}

/** Individual key with lightweight press scale (transform only, native driver). */
const KeyboardKey = memo(function KeyboardKey({
  displayText,
  fontSize,
  backgroundColor,
  textColor,
  flex = 1,
  width,
  height = layout.keyboardKeyHeight,
  showBackspaceIcon,
  disabled,
  dimmed,
  highlighted,
  onPress,
}: {
  displayText: string;
  fontSize: number;
  backgroundColor: string;
  textColor: string;
  flex?: number;
  width?: number;
  height?: number;
  showBackspaceIcon?: boolean;
  disabled: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!highlighted) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [highlighted, pulse]);

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
        transform: [{ scale }, { scale: pulse }],
        flex: width != null ? 0 : flex,
        width,
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <TouchableOpacity
        style={[
          keyStyles.key,
          { backgroundColor, height },
          keyStyles.keyFillWidth,
          disabled && keyStyles.keyDisabled,
          highlighted && keyStyles.keyHighlighted,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={1}
      >
        {showBackspaceIcon ? (
          <MaterialIcons name="backspace" size={20} color={textColor} />
        ) : (
          <Text
            {...noFontScaling}
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
    borderWidth: 2,
    borderColor: 'transparent',
  },
  keyFillWidth: {
    width: '100%',
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyHighlighted: {
    borderColor: '#29B6F6',
  },
  keyText: {
    fontFamily: FONTS.caption,
    fontWeight: '700',
  },
});

function KeyboardComponent() {
  const theme = useTheme();
  const [keyboardWidth, setKeyboardWidth] = useState(0);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: '100%',
          paddingBottom: 16,
        },
        actionBar: {
          flexDirection: 'row',
          gap: layout.keyboardKeyGap,
          marginBottom: layout.keyboardActionBarGap,
        },
        lettersColumn: {
          width: '100%',
        },
        row: {
          flexDirection: 'row',
          // Center shorter rows so letters form a soft V / U silhouette.
          justifyContent: 'center',
          gap: layout.keyboardKeyGap,
          marginBottom: layout.keyboardKeyGap,
        },
      }),
    [],
  );

  const keyboardLayout = useSettingsStore((s) => s.keyboardLayout);
  const rows = useMemo(() => getKeyboardRows(keyboardLayout), [keyboardLayout]);
  const allKeys = useMemo(() => getKeyboardKeys(keyboardLayout), [keyboardLayout]);

  const maxKeysPerRow = useMemo(
    () => Math.max(1, ...rows.map((row) => row.filter((key) => key !== '').length)),
    [rows],
  );

  const letterKeyWidth = useMemo(() => {
    const width = computeLetterKeyWidth(
      keyboardWidth,
      maxKeysPerRow,
      layout.keyboardKeyGap,
    );
    return width > 0 ? width : undefined;
  }, [keyboardWidth, maxKeysPerRow]);

  const onKeyboardLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    setKeyboardWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

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
  const currentGuess = useGameStore((s) => s.currentGuess);
  const currentGuessLength = currentGuess.length;
  const editIndex = useGameStore((s) => s.editIndex);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const addPendingInput = useGameStore((s) => s.addPendingInput);
  const tutorialActive = useTutorialStore((s) => s.active);
  const tutorialPhase = useTutorialStore((s) => s.phase);

  const isPlaying = status === 'playing';
  const isBlocked = !isPlaying || isRevealing;
  const highlightedKey = tutorialActive
    ? tutorialHighlightedKey(tutorialPhase, currentGuess)
    : null;

  const handlePress = useCallback(
    (key: string) => {
      // Read haptic at press time — avoids re-subscribing the whole keyboard
      if (useSettingsStore.getState().hapticEnabled) {
        Haptics.selectionAsync().catch(() => {});
      }
      sound.playKeyPress();

      if (!isPlaying) return;

      if (tutorialActive && !isTutorialKeyAllowed(tutorialPhase, currentGuess, key)) {
        return;
      }

      if (isRevealing) {
        if (tutorialActive) return;
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
    [
      isPlaying,
      isRevealing,
      tutorialActive,
      tutorialPhase,
      currentGuess,
      addPendingInput,
      submitGuess,
      removeLetter,
      addLetter,
    ],
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
      if (tutorialActive) {
        return !isTutorialKeyAllowed(tutorialPhase, currentGuess, key);
      }
      if (key === 'ENTER') return currentGuessLength < letterCount;
      if (key === 'BACKSPACE') return currentGuessLength === 0;
      // Allow letter taps when replacing a selected tile even if the row is full
      if (editIndex != null) return false;
      return false;
    },
    [
      isBlocked,
      tutorialActive,
      tutorialPhase,
      currentGuess,
      currentGuessLength,
      letterCount,
      editIndex,
    ],
  );

  const getKeyDisplay = useCallback(
    (key: string): { text: string; fontSize: number } => {
      if (key === 'ENTER') return { text: 'Submit', fontSize: 16 };
      if (key === 'BACKSPACE') {
        return { text: '⌫', fontSize: 18 };
      }
      return { text: key, fontSize: 16 };
    },
    [],
  );

  const renderLetterKey = (key: string) => {
    const { text, fontSize } = getKeyDisplay(key);
    const disabled = isKeyDisabled(key);
    const feedback = getKeyFeedback(key);
    const highlighted = highlightedKey === key;
    return (
      <KeyboardKey
        key={key}
        displayText={text}
        fontSize={fontSize}
        backgroundColor={getKeyBackground(key)}
        textColor={getKeyTextColor(key)}
        width={letterKeyWidth}
        disabled={disabled}
        dimmed={feedback === 'absent' || (tutorialActive && disabled && !isBlocked)}
        highlighted={highlighted}
        onPress={pressHandlers[key]}
      />
    );
  };

  const backspaceDisplay = getKeyDisplay('BACKSPACE');
  const submitDisplay = getKeyDisplay('ENTER');

  return (
    <View style={styles.container} onLayout={onKeyboardLayout}>
      <View style={styles.actionBar}>
        <KeyboardKey
          displayText={submitDisplay.text}
          fontSize={submitDisplay.fontSize}
          backgroundColor={getKeyBackground('ENTER')}
          textColor={getKeyTextColor('ENTER')}
          flex={3}
          disabled={isKeyDisabled('ENTER')}
          dimmed={tutorialActive && isKeyDisabled('ENTER') && !isBlocked}
          highlighted={highlightedKey === 'ENTER'}
          onPress={pressHandlers.ENTER}
        />
        <KeyboardKey
          displayText={backspaceDisplay.text}
          fontSize={backspaceDisplay.fontSize}
          backgroundColor={getKeyBackground('BACKSPACE')}
          textColor={getKeyTextColor('BACKSPACE')}
          flex={1}
          showBackspaceIcon
          disabled={isKeyDisabled('BACKSPACE')}
          dimmed={tutorialActive && isKeyDisabled('BACKSPACE') && !isBlocked}
          highlighted={highlightedKey === 'BACKSPACE'}
          onPress={pressHandlers.BACKSPACE}
        />
      </View>

      <View style={styles.lettersColumn}>
        {rows.map((row, i) => (
          <View
            key={`${keyboardLayout}-${i}`}
            style={[styles.row, i === rows.length - 1 && { marginBottom: 0 }]}
          >
            {row.filter((key) => key !== '').map((key) => renderLetterKey(key))}
          </View>
        ))}
      </View>
    </View>
  );
}

KeyboardComponent.displayName = 'Keyboard';

export const Keyboard = memo(KeyboardComponent);
