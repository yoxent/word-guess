import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useGameStore } from '../../stores';
import { useTutorialStore } from '../../stores/tutorialStore';
import { useTheme } from '../../hooks/useTheme';
import { layout } from '../../constants/layout';
import { typography } from '../../constants/typography';
import { computeTileSize } from '../../utils/gameLayout';
import { GuessRow } from './GuessRow';
import type { GuessFeedback } from '../../types';
import { tutorialCallouts } from '../../services/tutorialScript';

export function GameBoard({
  onContentLayout,
  boardAreaHeight = 0,
}: {
  onContentLayout?: (layout: { y: number; height: number }) => void;
  boardAreaHeight?: number;
} = {}) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: 'center',
          paddingVertical: layout.boardHeaderGap,
        },
        emptyContainer: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        loadingText: {
          ...typography.small,
          fontSize: 14,
          color: theme.colors.text.secondary,
        },
        attemptsContainer: {
          alignItems: 'center',
          marginBottom: layout.boardChromeGap,
        },
        attemptsText: {
          ...typography.small,
          fontSize: 14,
          color: theme.colors.text.secondary,
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
  const hintTile = useGameStore((s) => s.hintTile);
  const editIndex = useGameStore((s) => s.editIndex);
  const setEditIndex = useGameStore((s) => s.setEditIndex);
  const tutorialActive = useTutorialStore((s) => s.active);
  const tutorialPhase = useTutorialStore((s) => s.phase);
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
    return computeTileSize({
      screenWidth,
      wordLength,
      maxAttempts: session?.maxAttempts ?? 6,
      boardAreaHeight,
      tileGap: layout.tileGap,
      horizontalPadding: 40,
      minTile: 32,
      maxTile: 56,
      attemptsLabelBlock:
        layout.boardHeaderGap * 2 + 14 + layout.boardChromeGap,
    });
  }, [wordLength, session?.maxAttempts, boardAreaHeight]);

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
  const callouts = tutorialActive ? tutorialCallouts(tutorialPhase) : [];

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

  const handleContentLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    onContentLayout?.({ y, height });
  };

  return (
    <View style={styles.container}>
      <View onLayout={handleContentLayout}>
        <View style={styles.attemptsContainer}>
          <Text style={styles.attemptsText}>{attemptsLabel}</Text>
        </View>
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
              hintTile={row.isActive ? hintTile : null}
              editIndex={row.isActive ? editIndex : null}
              calloutIndices={callouts
                .filter((callout) => callout.rowIndex === i)
                .flatMap((callout) => callout.indices)}
              onTilePress={
                row.isActive && !isRevealing && !tutorialActive
                  ? (index) => setEditIndex(index)
                  : undefined
              }
            />
          ))}
        </View>
      </View>
    </View>
  );
}
