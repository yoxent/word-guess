import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { useGameStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../constants/layout';
import { GuessRow } from './GuessRow';
import type { GuessFeedback } from '../../types';

export function GameBoard() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          color: theme.colors.text.secondary,
        },
        attemptsContainer: {
          alignItems: 'center',
          marginBottom: 8,
        },
        attemptsText: {
          fontSize: 14,
          color: theme.colors.text.secondary,
          fontWeight: '500',
        },
        grid: {
          gap: layout.tileGap,
          alignItems: 'center',
        },
      }),
    [theme],
  );

  const session = useGameStore((s) => s.session);
  const currentGuess = useGameStore((s) => s.currentGuess);
  const isRevealing = useGameStore((s) => s.isRevealing);
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

  // 2026-07-10: compute tileSize BEFORE the early return. The previous
  // code put useMemo AFTER `if (!session) { return ...; }`, which violated
  // the Rules of Hooks (useMemo was called conditionally). On re-renders
  // that transition from session-null to session-set (e.g., after a guess
  // is submitted), the hook order would differ, destabilizing React's
  // internal tracking and contributing to the missing-text rendering bug.
  const wordLength = session?.letterCount ?? 5;

  const tileSize = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const availableWidth = screenWidth - 40 - (wordLength - 1) * layout.tileGap;
    const computed = Math.floor(availableWidth / wordLength);
    const MAX_TILE = 56;
    const MIN_TILE = 32;
    return Math.max(MIN_TILE, Math.min(MAX_TILE, computed));
  }, [wordLength]);

  if (!session) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const maxAttempts = session.maxAttempts;
  const completedGuesses = session.guesses.length;
  const remainingAttempts = maxAttempts - completedGuesses;
  const attemptsLabel = `Attempts: ${completedGuesses}/${maxAttempts}`;

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

  // Active row (if game is still playing and no deferred win/loss pending reveal)
  if (session.status === 'playing' && !session.pendingStatus) {
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
            isRevealingRow={
              isRevealing && !!row.feedback && i === completedGuesses - 1
            }
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
