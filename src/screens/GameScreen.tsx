import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, AppState, AppStateStatus, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { ScreenProps } from '@/types';
import { colors } from '@/constants/colors';
import { useGameStore, useDictionaryStore } from '@/stores';
import {
  getActiveGame,
  saveActiveGame,
  clearActiveGame,
  markDailyCompleted,
  getEndlessStreak,
  setEndlessStreak as persistEndlessStreak,
} from '@/services/storage';
import { getDailyDateString } from '@/services/dailySeed';
import {
  TILE_FLIP_DURATION,
  TILE_STAGGER_DELAY,
  ANIMATION_COMPLETION_BUFFER,
  TILE_CORRECT_BOUNCE_EXTRA,
} from '@/constants/animations';
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
  const isRevealing = useGameStore((s) => s.isRevealing);
  const setIsRevealing = useGameStore((s) => s.setIsRevealing);
  const flushPendingInputs = useGameStore((s) => s.flushPendingInputs);
  const [initializing, setInitializing] = useState(true);
  const appState = useRef(AppState.currentState);

  // ── Game initialization ──
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

  // ── AppState persistence (D-55, D-56, D-57) ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextState.match(/inactive|background/)) {
        // Going to background — save session (D-57)
        const currentSession = useGameStore.getState().session;
        if (currentSession && currentSession.status === 'playing') {
          saveActiveGame(currentSession);
        }
      }

      if (nextState === 'active' && appState.current.match(/inactive|background/)) {
        // Coming to foreground — check for saved session (D-55)
        const currentSession = useGameStore.getState().session;
        if (!currentSession || currentSession.status !== 'playing') {
          const saved = getActiveGame();
          if (saved && saved.status === 'playing') {
            useGameStore.getState().restoreSession(saved);
          }
        }
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  // ── Animation completion callback (D-28, D-62) ──
  useEffect(() => {
    if (session && session.guesses.length > 0 && isRevealing) {
      const wordLength = session.letterCount;
      const lastTileDelay = (wordLength - 1) * TILE_STAGGER_DELAY;

      // Base: stagger + flip + buffer
      let totalAnimationTime = lastTileDelay + TILE_FLIP_DURATION + ANIMATION_COMPLETION_BUFFER;

      // Account for correct tile bounce (D-28)
      const lastGuess = session.guesses[session.guesses.length - 1];
      const lastFeedback = session.feedback[session.feedback.length - 1];
      const hasCorrectTiles = lastFeedback?.some((f) => f.feedback === 'correct') ?? false;

      if (hasCorrectTiles) {
        totalAnimationTime += TILE_CORRECT_BOUNCE_EXTRA;
      }

      const timer = setTimeout(() => {
        setIsRevealing(false); // Unblock keyboard input
        flushPendingInputs(); // Process queued inputs (D-66)

        // Haptic on reveal completion (D-18)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

        // Check for game over and persist result
        const currentSession = useGameStore.getState().session;
        if (currentSession && (currentSession.status === 'won' || currentSession.status === 'lost')) {
          clearActiveGame();

          // If daily mode, mark length as completed (D-40, D-41)
          if (currentSession.mode === 'daily') {
            markDailyCompleted(getDailyDateString(), currentSession.letterCount);
          }

          // If endless mode, update streak (D-47)
          if (currentSession.mode === 'endless') {
            const streak = getEndlessStreak();
            persistEndlessStreak(currentSession.status === 'won' ? streak + 1 : 0);
          }
        }
      }, totalAnimationTime);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.guesses.length, isRevealing]);

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
