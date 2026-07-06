import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../types';
import { useGameStore, useSettingsStore } from '../../stores';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { useAdStore } from '../../stores/adStore';
import { config } from '../../constants/config';
import { Button } from '../../components/ui';
import { Confetti } from './Confetti';
import {
  clearActiveGame,
  getEndlessStreak,
  setEndlessStreak as persistEndlessStreak,
  markDailyCompleted,
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
  const navigation = useNavigation<Nav>();
  const session = useGameStore((s) => s.session);
  const resetGame = useGameStore((s) => s.resetGame);
  const isPro = useSettingsStore(s => s.isPro);
  const [endlessStreak, setEndlessStreakState] = useState(0);

  // Compute definition from session data (static lookup, no reactivity needed)
  const definition = useMemo(() => {
    if (!session) return undefined;
    return useDictionaryStore.getState().getDefinition(
      session.letterCount,
      session.word
    );
  }, [session]);

  // Track daily completions and endless streak
  useEffect(() => {
    if (!session) return;

    if (session.status === 'won' || session.status === 'lost') {
      // Daily completion tracking (D-40, D-41)
      if (session.mode === 'daily') {
        const dateStr = getDailyDateString();
        markDailyCompleted(dateStr, session.letterCount);
      }

      // Endless streak tracking (D-47)
      if (session.mode === 'endless') {
        if (session.status === 'won') {
          const prev = getEndlessStreak();
          const next = prev + 1;
          persistEndlessStreak(next);
          setEndlessStreakState(next);
        } else {
          const finalStreak = getEndlessStreak();
          setEndlessStreakState(finalStreak);
          persistEndlessStreak(0);
        }
      }

      // Clear active game state (D-58)
      clearActiveGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

  if (!session || session.status === 'playing') {
    return null;
  }

  const isWin = session.status === 'won';

  const maxExtra = isPro ? config.maxExtraGuessesPro : config.maxExtraGuessesFree;
  const showRewardedAd = session.status === 'lost' && session.extraGuessesUsed < maxExtra;

  // Build emoji grid
  const emojiRows = session.feedback.map((rowFeedback) => {
    return rowFeedback
      .map((f) => EMOJI_MAP[f.feedback] || '⬛')
      .join('');
  });
  const emojiText = emojiRows.join('\n');

  const handleWatchAd = useCallback(async () => {
    const adStore = useAdStore.getState();
    const shown = await adStore.showRewarded(() => {
      useGameStore.getState().addExtraGuess();
    });
    if (!shown) {
      // Ad not ready — silently return, button stays visible
    }
  }, []);

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

  const handlePlayNext = () => {
    if (!session) return;

    const hardMode = useSettingsStore.getState().hardModeEnabled;
    const length = session.letterCount;
    const dictStore = useDictionaryStore.getState();

    // Get today's daily words to exclude (D-52)
    const todayDailyWords = dictStore.getTodayDailyWords().words;
    const excludeWord = todayDailyWords[length];

    // Get pool of target words excluding today's daily word
    const allTargets = dictStore.getWordList(length);
    const pool = excludeWord
      ? allTargets.filter((w) => w !== excludeWord)
      : allTargets;
    const nextWord = pool[Math.floor(Math.random() * pool.length)];

    // Start new endless game
    clearActiveGame();
    useGameStore.getState().startGame('endless', nextWord, length, hardMode);
  };

  const handleBackToMenu = () => {
    resetGame();
    navigation.navigate('Home');
  };

  const handlePlayNextWithAd = useCallback(async () => {
    await showInterstitialIfNeeded();
    handlePlayNext();
  }, [showInterstitialIfNeeded, handlePlayNext]);

  const handleBackToMenuWithAd = useCallback(async () => {
    await showInterstitialIfNeeded();
    handleBackToMenu();
  }, [showInterstitialIfNeeded, handleBackToMenu]);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        {isWin && <Confetti />}
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.titleSpacer} />
            <Text
              style={[
                styles.title,
                { color: isWin ? colors.success : colors.danger },
              ]}
            >
              {isWin ? 'You Won!' : 'Game Over'}
            </Text>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={handleBackToMenuWithAd}
              activeOpacity={0.7}
            >
              <MaterialIcons name="home" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.word}>{session.word.toUpperCase()}</Text>

          {definition && (
            <Text style={styles.definition}>{definition}</Text>
          )}

          {session.mode === 'endless' && (
            <Text
              style={[
                styles.streak,
                { color: isWin ? colors.accent : colors.textSecondary },
              ]}
            >
              {isWin ? `Streak: ${endlessStreak}` : `Final Streak: ${endlessStreak}`}
            </Text>
          )}

          <View style={styles.emojiContainer}>
            <Text style={styles.emojiText}>{emojiText}</Text>
          </View>

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
            {showRewardedAd && (
              <TouchableOpacity
                style={styles.watchAdButton}
                onPress={handleWatchAd}
                activeOpacity={0.7}
              >
                <Text style={styles.watchAdText}>Watch Ad for +1 Guess</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '85%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  titleSpacer: {
    width: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  word: {
    fontSize: 32,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 2,
  },
  definition: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  streak: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  emojiContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  playNextButton: {
    width: '100%',
  },
  watchAdButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  watchAdText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
});
