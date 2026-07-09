import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, AppState, AppStateStatus, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as sound from '../services/sound';
import type { ScreenProps } from '../types';
import { useColors } from '../hooks/useColors';
import { useGameStore, useDictionaryStore, useStatsStore } from '../stores';
import {
  getActiveGame,
  saveActiveGame,
  clearActiveGame,
  markDailyCompleted,
  getEndlessStreak,
  setEndlessStreak as persistEndlessStreak,
} from '../services/storage';
import { getDailyDateString } from '../services/dailySeed';
import {
  TILE_FLIP_DURATION,
  TILE_STAGGER_DELAY,
  ANIMATION_COMPLETION_BUFFER,
  TILE_CORRECT_BOUNCE_EXTRA,
} from '../constants/animations';
import { GameBoard } from '../components/game/GameBoard';
import { Keyboard } from '../components/game/Keyboard';
import { ResultModal } from '../components/game/ResultModal';
import type { GameMode } from '../types';
import { useNavigation } from '@react-navigation/native';
import { useAdStore } from '../stores/adStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = ScreenProps<'Game'>;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function randomLength(): number {
  return 5 + Math.floor(Math.random() * 6);
}

export function GameScreen({ route }: Props) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          backgroundColor: colors.headerBackground,
          paddingLeft: 20,
          paddingRight: 20,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 48,
        },
        backButton: {
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerTitle: {
          fontSize: 17,
          color: colors.headerText,
          fontWeight: '600',
        },

        keyboardArea: {
          position: 'relative',
        },
        boardArea: {
          flex: 1,
          justifyContent: 'center',
        },
        errorToast: {
          position: 'absolute',
          bottom: '100%',
          marginBottom: 6,
          left: 0,
          right: 0,
          backgroundColor: colors.danger,
          borderRadius: 8,
          paddingVertical: 8,
          paddingHorizontal: 16,
          alignItems: 'center',
          zIndex: 10,
        },
        errorText: {
          color: colors.textInverse,
          fontSize: 14,
          fontWeight: '600',
        },
      }),
    [colors],
  );

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { mode, letterCount } = route.params;
  const session = useGameStore((s) => s.session);
  const startGame = useGameStore((s) => s.startGame);
  const restoreSession = useGameStore((s) => s.restoreSession);
  const error = useGameStore((s) => s.error);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const setIsRevealing = useGameStore((s) => s.setIsRevealing);
  const flushPendingInputs = useGameStore((s) => s.flushPendingInputs);
  const insets = useSafeAreaInsets();
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
    // Preload interstitial for end-of-game
    useAdStore.getState().preloadInterstitial();
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

        // Play tile reveal sound before haptic (D-181)
        sound.playReveal();

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

          // Record game result for stats tracking (Phase 3 — STAT-01, D-72)
          useStatsStore.getState().recordGame({
            id: currentSession.id,
            mode: currentSession.mode,
            word: currentSession.word,
            letterCount: currentSession.letterCount,
            guesses: currentSession.guesses.length,
            won: currentSession.status === 'won',
            hardMode: currentSession.hardMode,
            extraGuessesUsed: currentSession.extraGuessesUsed,
            completedAt: currentSession.completedAt || new Date().toISOString(),
            feedback: currentSession.feedback,
          });

          // Increment interstitial frequency counter
          useAdStore.getState().incrementGamesSinceLastAd();
          // Preload next interstitial
          useAdStore.getState().preloadInterstitial();

          // ── Phase 5: Submit leaderboard scores and sync stats (D-153, D-154) ──
          const statsStore = useStatsStore.getState();
          const stats = statsStore.stats;

          const leaderboardParams: {
            mode: string;
            won: boolean;
            dailyStreak?: number;
            endlessStreak?: number;
            endlessTotalWords?: number;
          } = {
            mode: currentSession.mode,
            won: currentSession.status === 'won',
          };

          if (currentSession.mode === 'daily' && currentSession.status === 'won' && stats) {
            // Daily win: compute adjusted streak (recordGame may not have completed yet)
            const baseStreak = stats.perModeStreaks?.daily?.current ?? 0;
            leaderboardParams.dailyStreak = baseStreak + 1;
          }

          if (currentSession.mode === 'endless') {
            // Endless mode: read current streak + total words from MMKV (already persisted by ResultModal)
            const { getEndlessStreak, getEndlessTotalWords } = require('../services/storage');
            leaderboardParams.endlessStreak = getEndlessStreak();
            leaderboardParams.endlessTotalWords = getEndlessTotalWords();
          }

          // Fire-and-forget: never blocks the UI transition (D-154)
          import('../services/leaderboardService').then(
            ({ updateLeaderboardAfterGame }) => {
              updateLeaderboardAfterGame(leaderboardParams);
            },
          );

          // Sync player stats to Firestore or queue (fire-and-forget)
          import('../stores/authStore').then(({ useAuthStore: authStoreRef }) => {
            const authState = authStoreRef.getState();
            if (authState.isLoggedIn && stats) {
              import('../services/firestoreService').then(
                ({ updatePlayerStats }) => {
                  updatePlayerStats(
                    authState.playerId!,
                    authState.playerName ?? 'Player',
                    stats,
                  );
                },
              );
            } else if (stats) {
              import('../services/syncQueue').then(
                ({ enqueueEvent }) => {
                  enqueueEvent('game_result', {
                    playerName: 'Player',
                    stats,
                  });
                },
              );
            }
          });
        }
      }, totalAnimationTime);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.guesses.length, isRevealing]);

  // ── Save game on back navigation (D-57) ──
  const handleBack = useCallback(() => {
    const currentSession = useGameStore.getState().session;
    if (currentSession && currentSession.status === 'playing') {
      saveActiveGame(currentSession);
    }
    navigation.goBack();
  }, [navigation]);

  // ── Save game on unmount (back gesture / hardware back) ──
  useEffect(() => {
    return () => {
      const currentSession = useGameStore.getState().session;
      if (currentSession && currentSession.status === 'playing') {
        saveActiveGame(currentSession);
      }
    };
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, paddingHorizontal: 20 }]}>
      {/* Header (matches home page top bar padding) */}
      <View style={[styles.header, { paddingTop: insets.top, marginHorizontal: -20 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back-ios" size={22} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {modeLabel} · {session.letterCount} Letters
          </Text>
        </View>
      </View>

      {/* Board area */}
      <View style={styles.boardArea}>
        <GameBoard />
      </View>

      {/* Keyboard + overlay toast */}
      <View style={styles.keyboardArea}>
        {error !== null && (
          <View style={styles.errorToast}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        <Keyboard />
      </View>

      {/* Result Modal */}
      <ResultModal />
    </View>
  );
}
