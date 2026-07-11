import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, Modal, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { useGameStore, useSettingsStore } from '../../stores';
import * as sound from '../../services/sound';
import { useDictionaryStore } from '../../stores/dictionaryStore';

import { useTheme } from '../../hooks/useTheme';
import { useAdStore } from '../../stores/adStore';
import { Button } from '../../components/ui';
import { Confetti } from './Confetti';
import { typography } from '../../constants/typography';
import { layout } from '../../constants/layout';
import {
  clearActiveGame,
  getEndlessStreak,
  setEndlessStreak as persistEndlessStreak,
  markDailyCompleted,
  incrementEndlessTotalWords,
} from '../../services/storage';
import { getDailyDateString } from '../../services/dailySeed';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const EMOJI_MAP: Record<string, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
  empty: '⬛',
};

export function ResultModal() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(13, 27, 42, 0.7)', // darker for celebration contrast
          justifyContent: 'center',
          alignItems: 'center',
        },
        card: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.modalBorderRadius,
          padding: 28,
          alignItems: 'center',
          minWidth: 300,
          maxWidth: '85%',
          // Colored shadow — green for win, coral for loss
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.2,
          shadowRadius: 32,
          elevation: 12,
        },
        iconContainer: {
          width: 72,
          height: 72,
          borderRadius: 36,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        },
        iconContainerWin: {
          backgroundColor: `${theme.colors.status.success}20`,
        },
        iconContainerLoss: {
          backgroundColor: `${theme.colors.status.danger}20`,
        },
        title: {
          ...typography.heading,
          textAlign: 'center',
          marginBottom: 8,
        },
        word: {
          ...typography.display,
          color: theme.colors.text.primary,
          marginBottom: 4,
          letterSpacing: 3,
          textTransform: 'uppercase',
        },
        definition: {
          ...typography.body,
          color: theme.colors.text.secondary,
          fontStyle: 'italic',
          textAlign: 'center',
          marginTop: 4,
          marginBottom: 12,
          paddingHorizontal: 8,
        },
        streak: {
          ...typography.settingsRow,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 4,
        },
        emojiContainer: {
          marginVertical: 16,
          alignItems: 'center',
          backgroundColor: theme.colors.surface.muted,
          borderRadius: 12,
          padding: 12,
        },
        emojiText: {
          fontSize: 14,
          lineHeight: 20,
          fontFamily: 'monospace',
          textAlign: 'center',
          color: theme.colors.text.primary,
        },
        buttonContainer: {
          marginTop: 8,
          width: '100%',
          gap: 10,
        },
        playNextButton: {
          width: '100%',
        },
      }),
    [theme],
  );

  const navigation = useNavigation<Nav>();
  const session = useGameStore((s) => s.session);
  const resetGame = useGameStore((s) => s.resetGame);
  const isPro = useSettingsStore(s => s.isPro);
  const [endlessStreak, setEndlessStreakState] = useState(0);

  // Compute definition from session data
  const definition = useMemo(() => {
    if (!session) return undefined;
    return useDictionaryStore.getState().getDefinition(
      session.letterCount,
      session.word,
    );
  }, [session]);

  // Track daily completions and endless streak
  useEffect(() => {
    if (!session) return;

    if (session.status === 'won' || session.status === 'lost') {
      if (session.mode === 'daily') {
        const dateStr = getDailyDateString();
        markDailyCompleted(dateStr, session.letterCount);
      }

      if (session.mode === 'endless') {
        const hard = session.hardMode;
        if (session.status === 'won') {
          const prev = getEndlessStreak(hard);
          const next = prev + 1;
          persistEndlessStreak(next, hard);
          setEndlessStreakState(next);
        } else {
          const finalStreak = getEndlessStreak(hard);
          setEndlessStreakState(finalStreak);
          persistEndlessStreak(0, hard);
        }
        incrementEndlessTotalWords();
      }

      if (session.status === 'won') {
        sound.playWin();
      } else if (session.status === 'lost') {
        sound.playLoss();
      }

      clearActiveGame(session.hardMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

  const handlePlayNext = () => {
    if (!session) return;

    const hardMode = useSettingsStore.getState().hardModeEnabled;
    const length = session.letterCount;
    const dictStore = useDictionaryStore.getState();

    const todayDailyWords = dictStore.getTodayDailyWords().words;
    const excludeWord = todayDailyWords[length];

    const allTargets = dictStore.getWordList(length);
    const pool = excludeWord
      ? allTargets.filter((w) => w !== excludeWord)
      : allTargets;
    const nextWord = pool[Math.floor(Math.random() * pool.length)];

    clearActiveGame(session?.hardMode ?? false);
    useGameStore.getState().startGame('endless', nextWord, length, hardMode);
  };

  const handleBackToMenu = () => {
    resetGame();
    navigation.navigate('Home');
  };

  const showInterstitialIfNeeded = useCallback(async (): Promise<void> => {
    const { isPro: pro } = useSettingsStore.getState();
    if (pro) return;

    const adStore = useAdStore.getState();
    const { gamesSinceLastAd } = adStore;

    let threshold = 0;
    if (session?.mode === 'daily') threshold = 0;
    else if (session?.mode === 'endless' || session?.mode === 'random') threshold = 1;

    if (gamesSinceLastAd >= threshold) {
      const shown = await adStore.showInterstitial();
      if (shown) {
        adStore.resetGamesSinceLastAd();
      }
    }
  }, [session?.mode]);

  const handlePlayNextWithAd = useCallback(async () => {
    await showInterstitialIfNeeded();
    handlePlayNext();
  }, [showInterstitialIfNeeded, handlePlayNext]);

  const handleBackToMenuWithAd = useCallback(async () => {
    await showInterstitialIfNeeded();
    handleBackToMenu();
  }, [showInterstitialIfNeeded, handleBackToMenu]);



  // Build emoji grid
  const emojiRows = session?.feedback.map((rowFeedback) => {
    return rowFeedback
      .map((f) => EMOJI_MAP[f.feedback] || '⬛')
      .join('');
  }) ?? [];
  const emojiText = emojiRows.join('\n');

  // ── Card scale bounce animation (Phase 7E) ──
  const cardScale = useRef(new Animated.Value(0.8)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 50,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardScale, cardOpacity]);

  if (!session || session.status === 'playing') {
    return null;
  }

  const isWin = session.status === 'won';

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        {isWin && <Confetti />}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* Result icon */}
          <View
            style={[
              styles.iconContainer,
              isWin ? styles.iconContainerWin : styles.iconContainerLoss,
            ]}
          >
            <MaterialIcons
              name={isWin ? 'emoji-events' : 'sentiment-dissatisfied'}
              size={40}
              color={isWin ? theme.colors.status.success : theme.colors.status.danger}
            />
          </View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              { color: isWin ? theme.colors.status.success : theme.colors.status.danger },
            ]}
          >
            {isWin ? 'You Won!' : 'Game Over'}
          </Text>

          {/* Word */}
          <Text style={styles.word}>{session.word.toUpperCase()}</Text>

          {/* Definition */}
          {definition && (
            <Text style={styles.definition}>{definition}</Text>
          )}

          {/* Streak */}
          {session.mode === 'endless' && (
            <Text
              style={[
                styles.streak,
                { color: isWin ? theme.colors.brand.secondary : theme.colors.text.secondary },
              ]}
            >
              {isWin ? `🔥 Streak: ${endlessStreak}` : `Final streak: ${endlessStreak}`}
            </Text>
          )}

          {/* Emoji grid */}
          <View style={styles.emojiContainer}>
            <Text style={styles.emojiText}>{emojiText}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {session.mode === 'endless' ? (
              <Button
                title="Play Next"
                onPress={handlePlayNextWithAd}
                style={styles.playNextButton}
              />
            ) : (
              <Button title="Back to Menu" onPress={handleBackToMenuWithAd} />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
