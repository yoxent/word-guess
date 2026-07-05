import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { useGameStore } from '../../stores';
import { colors } from '../../constants/colors';
import { layout } from '../../constants/layout';
import { GuessRow } from './GuessRow';
import type { GuessFeedback } from '../../types';

export function GameBoard() {
  const session = useGameStore((s) => s.session);
  const currentGuess = useGameStore((s) => s.currentGuess);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss error toast after 1.5s
  useEffect(() => {
    if (error) {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      errorTimerRef.current = setTimeout(() => {
        clearError();
        errorTimerRef.current = null;
      }, 1500);
    }
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, [error, clearError]);

  if (!session) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const maxAttempts = session.maxAttempts;
  const wordLength = session.letterCount;
  const completedGuesses = session.guesses.length;
  const remainingAttempts = maxAttempts - completedGuesses;
  const attemptsLabel = `Attempts: ${completedGuesses}/${maxAttempts}`;

  // Compute dynamic tile size so grid fits the screen width
  const tileSize = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const availableWidth = screenWidth - 40 - (wordLength - 1) * layout.tileGap;
    const computed = Math.floor(availableWidth / wordLength);
    const MAX_TILE = 56;
    const MIN_TILE = 32;
    return Math.max(MIN_TILE, Math.min(MAX_TILE, computed));
  }, [wordLength]);

  // Build rows array
  const rows: { guess: string; feedback: GuessFeedback[] | undefined; isActive: boolean }[] = [];

  // Completed guesses
  for (let i = 0; i < completedGuesses; i++) {
    rows.push({
      guess: session.guesses[i],
      feedback: session.feedback[i],
      isActive: false,
    });
  }

  // Active row (if game is still playing)
  if (session.status === 'playing') {
    rows.push({
      guess: currentGuess,
      feedback: undefined,
      isActive: true,
    });
  }

  // Remaining empty rows
  const totalRows = rows.length;
  for (let i = totalRows; i < maxAttempts; i++) {
    rows.push({
      guess: '',
      feedback: undefined,
      isActive: false,
    });
  }

  return (
    <View style={styles.container}>
      {/* Attempt counter */}
      <View style={styles.attemptsContainer}>
        <Text style={styles.attemptsText}>{attemptsLabel}</Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {rows.map((row, i) => (
          <GuessRow
            key={i}
            guess={row.guess}
            feedback={row.feedback}
            isActive={row.isActive}
            rowIndex={i}
            wordLength={wordLength}
            tileSize={tileSize}
            error={i === completedGuesses && session.status === 'playing' ? error : null}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  attemptsContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  attemptsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  grid: {
    gap: layout.tileGap,
    alignItems: 'center',
  },
});
