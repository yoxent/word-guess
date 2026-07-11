import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as sound from '../services/sound';
import type { ScreenProps } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useGameStore, useDictionaryStore, useStatsStore } from '../stores';
import { useSettingsStore } from '../stores/settingsStore';
import { useAdStore } from '../stores/adStore';
import { config } from '../constants/config';
import {
  getActiveGame,
  saveActiveGame,
  clearActiveGame,
  markDailyCompleted,
} from '../services/storage';
import { getDailyDateString } from '../services/dailySeed';
import {
  TILE_FLIP_DURATION,
  TILE_STAGGER_DELAY,
  ANIMATION_COMPLETION_BUFFER,
  TILE_CORRECT_BOUNCE_EXTRA,
} from '../constants/animations';
import { layout } from '../constants/layout';
import { typography } from '../constants/typography';
import { GameBoard } from '../components/game/GameBoard';
import { Keyboard } from '../components/game/Keyboard';
import { ResultModal } from '../components/game/ResultModal';
import type { GameMode, GameSession } from '../types';
import { shouldRestoreActiveGame } from '../utils/activeGame';
import { useNavigation } from '@react-navigation/native';import { GRADIENTS } from '../components/home/ModeCard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

type Props = ScreenProps<'Game'>;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function randomLength(): number {
  return 5 + Math.floor(Math.random() * 6);
}

function formatExtraAttemptLabel(remaining: number): string {
  const base = 'Watch Ad · +1 Attempt';
  return remaining > 1 ? `${base} (${remaining} left)` : base;
}

const LETTER_HINT_AD_LABEL = 'Watch Ad · Letter Hint';

/** Wait for current frame + paint so Fabric can finish Animated tile → StaticTile swap. */
function runAfterUiSettle(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function recordEndGameSideEffects(currentSession: GameSession): void {
  clearActiveGame(currentSession.hardMode);

  if (currentSession.mode === 'daily') {
    markDailyCompleted(getDailyDateString(), currentSession.letterCount);
  }

  if (__DEV__) {
    console.time('stats-write');
  }
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
  if (__DEV__) {
    console.timeEnd('stats-write');
  }

  useAdStore.getState().incrementGamesSinceLastAd();
  useAdStore.getState().preloadInterstitial();

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
    const dailyKey = 'daily_' + (currentSession.hardMode ? 'hard' : 'normal');
    const baseStreak = stats.perModeStreaks?.[dailyKey]?.current ?? 0;
    leaderboardParams.dailyStreak = baseStreak + 1;
  }

  if (currentSession.mode === 'endless') {
    const { getEndlessStreak, getEndlessTotalWords } = require('../services/storage');
    leaderboardParams.endlessStreak = getEndlessStreak(currentSession.hardMode);
    leaderboardParams.endlessTotalWords = getEndlessTotalWords();
  }

  import('../services/leaderboardService').then(({ updateLeaderboardAfterGame }) => {
    updateLeaderboardAfterGame(leaderboardParams);
  });

  import('../stores/authStore').then(({ useAuthStore: authStoreRef }) => {
    const authState = authStoreRef.getState();
    if (authState.isLoggedIn && stats) {
      import('../services/firestoreService').then(({ updatePlayerStats }) => {
        updatePlayerStats(authState.playerId!, authState.playerName ?? 'Player', stats);
      });
    } else if (stats) {
      import('../services/syncQueue').then(({ enqueueEvent }) => {
        enqueueEvent('game_result', {
          playerName: 'Player',
          stats,
        });
      });
    }
  });
}

export function GameScreen({ route }: Props) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
        },
        loadingContainer: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
          justifyContent: 'center',
          alignItems: 'center',
        },
        // ── Header — sky blue background (Phase 4A) ──
        header: {
          paddingLeft: layout.screenPadding,
          paddingRight: layout.screenPadding,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          height: 52,
        },
        backButton: {
          justifyContent: 'center',
          alignItems: 'center',
          padding: 8,
        },
        headerTitle: {
          ...typography.cardTitle,
          color: '#FFFFFF',
          marginLeft: 8,
        },
        hardModeBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          backgroundColor: '#FFA726', // orange
          borderRadius: 10,
          paddingVertical: 2,
          paddingHorizontal: 8,
          marginLeft: 8,
        },
        hardModeBadgeText: {
          fontSize: 11,
          fontWeight: '700',
          color: '#FFFFFF',
        },
        // ── Board & Keyboard ──
        keyboardArea: {
          position: 'relative',
        },
        boardArea: {
          flex: 1,
          justifyContent: 'center',
          position: 'relative',
        },
        // ── Error Toast — coral bg, rounded, slide-in, overlaid over board ──
        errorToast: {
          position: 'absolute',
          bottom: 0,
          alignSelf: 'center',
          backgroundColor: theme.colors.status.danger,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 18,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
          // Soft shadow
          shadowColor: theme.colors.status.danger,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
        },
        errorIcon: {
          marginRight: 2,
        },
        errorText: {
          color: theme.colors.text.inverse,
          fontSize: 14,
          fontWeight: '600',
        },
        // ── Hint Buttons ──
        hintButtonsContainer: {
          flexDirection: 'row',
          alignSelf: 'stretch',
          gap: 10,
          marginTop: 8,
          marginBottom: 10,
        },
        hintButton: {
          flex: 1,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          backgroundColor: theme.colors.brand.primary,
          borderRadius: 20,
          paddingVertical: 10,
          paddingHorizontal: 12,
          // Soft shadow
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        letterHintButton: {
          backgroundColor: theme.colors.brand.secondary,
          shadowColor: theme.colors.brand.secondary,
        },
        hintButtonDisabled: {
          opacity: 0.5,
        },
        hintButtonText: {
          ...typography.button,
          fontSize: 13,
          color: '#FFFFFF',
          flexShrink: 1,
          textAlign: 'center',
        },
      }),
    [theme],
  );

  // Mode-based header color (matches ModeCard gradients)
  const MODE_HEADER_COLORS: Record<GameMode, string> = {
    daily: '#42A5F5',
    endless: '#66BB6A',
    random: '#FFA726',
    free: '#42A5F5',
  };

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { mode, letterCount } = route.params;
  const headerColor = MODE_HEADER_COLORS[mode];
  const session = useGameStore((s) => s.session);
  const startGame = useGameStore((s) => s.startGame);
  const restoreSession = useGameStore((s) => s.restoreSession);
  const error = useGameStore((s) => s.error);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const setIsRevealing = useGameStore((s) => s.setIsRevealing);
  const finalizeRevealOutcome = useGameStore((s) => s.finalizeRevealOutcome);
  const flushPendingInputs = useGameStore((s) => s.flushPendingInputs);
  const insets = useSafeAreaInsets();
  const [initializing, setInitializing] = useState(true);
  const appState = useRef(AppState.currentState);

  // ── Back button spring animation ──
  const backScale = useRef(new Animated.Value(1)).current;

  // ── Error toast slide-in animation ──
  const toastSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (error) {
      toastSlide.setValue(0);
      Animated.spring(toastSlide, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 60,
      }).start();
    } else {
      toastSlide.setValue(0);
    }
  }, [error, toastSlide]);

  // ── Game initialization ──
  useEffect(() => {
    const hardMode = useSettingsStore.getState().hardModeEnabled;
    const saved = getActiveGame(hardMode);
    const len = letterCount ?? randomLength();
    const shouldRestoreSaved = shouldRestoreActiveGame(saved, mode, len, hardMode);

    if (shouldRestoreSaved) {
      restoreSession(saved);
      setInitializing(false);
      return;
    }

    clearActiveGame(hardMode);

    const dictStore = useDictionaryStore.getState();

    let word: string;

    if (mode === 'daily') {
      const dailyWords = dictStore.getTodayDailyWords();
      word = dailyWords.words[len];
      if (!word) {
        word = dictStore.getRandomWord(len);
      }
    } else {
      word = dictStore.getRandomWord(len);
    }

    startGame(mode, word, len, hardMode);
    useAdStore.getState().preloadInterstitial();
    useAdStore.getState().preloadRewarded();
    setInitializing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── AppState persistence (D-55, D-56, D-57) ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextState.match(/inactive|background/)) {
        const currentSession = useGameStore.getState().session;
        if (currentSession && currentSession.status === 'playing') {
          saveActiveGame(currentSession);
        }
      }

      if (nextState === 'active' && appState.current.match(/inactive|background/)) {
        const currentSession = useGameStore.getState().session;
        if (!currentSession || currentSession.status !== 'playing') {
          const hardMode = useSettingsStore.getState().hardModeEnabled;
          const saved = getActiveGame(hardMode);
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

      let totalAnimationTime = lastTileDelay + TILE_FLIP_DURATION + ANIMATION_COMPLETION_BUFFER;

      const lastGuess = session.guesses[session.guesses.length - 1];
      const lastFeedback = session.feedback[session.feedback.length - 1];
      const hasCorrectTiles = lastFeedback?.some((f) => f.feedback === 'correct') ?? false;

      if (hasCorrectTiles) {
        totalAnimationTime += TILE_CORRECT_BOUNCE_EXTRA;
      }

      const timer = setTimeout(() => {
        // Phase 1: stop flip animations (Animated Tile → StaticTile swap).
        setIsRevealing(false);
        flushPendingInputs();

        // Phase 2 (next paint): status + keyboard colors + ResultModal mount.
        runAfterUiSettle(() => {
          finalizeRevealOutcome();

          // Phase 3 (+50ms): audio/haptics — separate from Fabric commit batch.
          setTimeout(() => {
            const currentSession = useGameStore.getState().session;
            if (currentSession?.status === 'won') {
              sound.playWin();
            } else if (currentSession?.status === 'lost') {
              sound.playLoss();
            } else {
              sound.playReveal();
            }

            if (useSettingsStore.getState().hapticEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }
          }, 50);

          // Phase 4 (+100ms): stats, ads, leaderboard — heavy JS off critical path.
          setTimeout(() => {
            const currentSession = useGameStore.getState().session;
            if (
              currentSession &&
              (currentSession.status === 'won' || currentSession.status === 'lost')
            ) {
              recordEndGameSideEffects(currentSession);
            }
          }, 100);
        });
      }, totalAnimationTime);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.guesses.length, isRevealing]);

  // ── Back navigation ──
  const handleBack = useCallback(() => {
    const currentSession = useGameStore.getState().session;
    if (currentSession && currentSession.status === 'playing') {
      saveActiveGame(currentSession);
    }
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    return () => {
      const currentSession = useGameStore.getState().session;
      if (currentSession && currentSession.status === 'playing') {
        saveActiveGame(currentSession);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Back button press animation ──
  const onBackPressIn = () => {
    Animated.spring(backScale, {
      toValue: 0.9,
      useNativeDriver: true,
      friction: 4,
      tension: 50,
    }).start();
  };

  const onBackPressOut = () => {
    Animated.spring(backScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 50,
    }).start();
  };

  // Hard mode indicator
  const hardModeEnabled = useSettingsStore((s) => s.hardModeEnabled);

  // Hint buttons: watch ad for extra attempt or letter hint
  const isPro = useSettingsStore((s) => s.isPro);
  const maxExtra = isPro ? config.maxExtraGuessesPro : config.maxExtraGuessesFree;
  const rewardedLoaded = useAdStore((s) => s.rewardedLoaded);
  const extraAttemptsRemaining = session ? maxExtra - session.extraGuessesUsed : 0;

  const handleWatchAd = useCallback(async () => {
    const adStore = useAdStore.getState();
    await adStore.showRewarded(() => {
      // Defer state update to avoid Fabric crash from rapid view updates
      setTimeout(() => {
        useGameStore.getState().addExtraGuess();
      }, 100);
    });
  }, []);

  const handleLetterHint = useCallback(async () => {
    const adStore = useAdStore.getState();
    await adStore.showRewarded(() => {
      // Defer state update to avoid Fabric crash from rapid view updates
      setTimeout(() => {
        useGameStore.getState().useLetterHint();
      }, 100);
    });
  }, []);

  if (initializing || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.status.accent} />
      </View>
    );
  }

  const modeLabel = capitalize(session.mode);

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom, paddingHorizontal: layout.screenPadding },
      ]}
    >
      {/* ── Header — mode-colored bg, plain back icon ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6, marginHorizontal: -layout.screenPadding, backgroundColor: headerColor }]}>
        <View style={styles.headerRow}>
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <TouchableOpacity
              onPress={handleBack}
              onPressIn={onBackPressIn}
              onPressOut={onBackPressOut}
              style={styles.backButton}
              activeOpacity={1}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialIcons name="arrow-back-ios" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.headerTitle}>
            {modeLabel} · {session.letterCount} Letters
          </Text>
          {hardModeEnabled && session.status === 'playing' && (
            <View style={styles.hardModeBadge}>
              <Text style={styles.hardModeBadgeText}>🔥 Hard</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Board area + error toast overlay ── */}
      <View style={styles.boardArea}>
        <GameBoard />
        {error !== null && (
          <Animated.View
            style={[
              styles.errorToast,
              {
                opacity: toastSlide,
                transform: [
                  {
                    translateY: toastSlide.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <MaterialIcons
              name="warning"
              size={18}
              color="#FFFFFF"
              style={styles.errorIcon}
            />
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}
      </View>

      {/* ── Hint Buttons ── */}
      {session.status === 'playing' && (
        <View style={styles.hintButtonsContainer}>
          {/* Rewarded ad: extra attempt */}
          {session.extraGuessesUsed < maxExtra && (
            <TouchableOpacity
              style={[styles.hintButton, !rewardedLoaded && styles.hintButtonDisabled]}
              onPress={handleWatchAd}
              disabled={!rewardedLoaded}
              activeOpacity={0.8}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Watch ad for an extra attempt"
            >
              <MaterialIcons
                name="play-circle-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text
                style={styles.hintButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {formatExtraAttemptLabel(extraAttemptsRemaining)}
              </Text>
            </TouchableOpacity>
          )}

          {/* Rewarded ad: letter hint */}
          {!session.letterHintUsed && (
            <TouchableOpacity
              style={[styles.hintButton, styles.letterHintButton, !rewardedLoaded && styles.hintButtonDisabled]}
              onPress={handleLetterHint}
              disabled={!rewardedLoaded}
              activeOpacity={0.8}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Watch ad for a letter hint"
            >
              <MaterialIcons
                name="lightbulb-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text
                style={styles.hintButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {LETTER_HINT_AD_LABEL}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Keyboard ── */}
      <View style={styles.keyboardArea}>
        <Keyboard />
      </View>

      {/* ── Result Modal ── */}
      <ResultModal />
    </View>
  );
}
