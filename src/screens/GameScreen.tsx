import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import type { ScreenProps } from '@/types';
import { colors } from '@/constants/colors';
import { useGameStore, useDictionaryStore } from '@/stores';
import { getActiveGame } from '@/services/storage';
import { GameBoard } from '@/components/game/GameBoard';
import { Keyboard } from '@/components/game/Keyboard';
import { ResultModal } from '@/components/game/ResultModal';
import type { GameMode } from '@/types';

type Props = ScreenProps<'Game'>;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function randomLength(): number {
  return 5 + Math.floor(Math.random() * 6);
}

export function GameScreen({ route }: Props) {
  const { mode, letterCount } = route.params;
  const session = useGameStore((s) => s.session);
  const startGame = useGameStore((s) => s.startGame);
  const restoreSession = useGameStore((s) => s.restoreSession);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Check for saved active game first (D-57)
    const saved = getActiveGame();
    if (saved && saved.mode === mode) {
      // Restore the saved session
      restoreSession(saved);
      setInitializing(false);
      return;
    }

    // Start a new game
    const dictStore = useDictionaryStore.getState();
    const len = letterCount ?? randomLength();
    const hardMode = false; // Hard Mode toggle comes in Plan 02-03

    let word: string;

    if (mode === 'daily') {
      // Daily mode: get today's word for the chosen/random length
      const dailyWords = dictStore.getTodayDailyWords();
      word = dailyWords.words[len];
      if (!word) {
        // Fallback if no daily word found for this length
        word = dictStore.getRandomWord(len);
      }
    } else {
      // Free, Random, Endless
      word = dictStore.getRandomWord(len);
    }

    startGame(mode, word, len, hardMode);
    setInitializing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (initializing || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const modeLabel = capitalize(session.mode);
  const attemptsLabel = `${session.guesses.length}/${session.maxAttempts}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerMode}>{modeLabel}</Text>
        <Text style={styles.headerAttempts}>{attemptsLabel}</Text>
      </View>

      {/* Board area */}
      <View style={styles.boardArea}>
        <GameBoard />
      </View>

      {/* Keyboard */}
      <Keyboard />

      {/* Result Modal */}
      <ResultModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 56,
    backgroundColor: colors.headerBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerMode: {
    fontSize: 16,
    color: colors.headerText,
    fontWeight: '600',
  },
  headerAttempts: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  boardArea: {
    flex: 1,
    justifyContent: 'center',
  },
});
