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
  toActiveGameSlot,
  activeGameSlotFromSession,
} from '../services/storage';
import { getDailyDateString } from '../services/dailySeed';
import { syncLeaderboardForSession } from '../services/leaderboardService';
import { updatePlayerStats } from '../services/firestoreService';
import { enqueueEvent } from '../services/syncQueue';
import { useAuthStore } from '../stores/authStore';
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
import { HowToPlayModal, HintAdButton, RewardedInterstitialIntroModal, SkipOnboardingModal, TutorialCoach } from '../components/ui';
import type { GameMode, GameSession } from '../types';
import { shouldRestoreActiveGame } from '../utils/activeGame';
import type { HelperAdFormat } from '../utils/adFormat';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { hasSignedInPlayer } from '../utils/authState';
import { useTutorialStore } from '../stores/tutorialStore';
import { TUTORIAL_ANSWER, TUTORIAL_LETTER_COUNT } from '../services/tutorialScript';

type Props = ScreenProps<'Game'>;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function randomLength(): number {
  return 5 + Math.floor(Math.random() * 6);
}

function formatExtraAttemptLabel(remaining: number): string {
  const base = '+1 Row';
  return remaining > 1 ? `${base} (${remaining} left)` : base;
}

const LETTER_HINT_AD_LABEL = 'Letter Hint';

/** Wait for current frame + paint so Fabric can finish Animated tile → StaticTile swap. */
function runAfterUiSettle(callback: () => void): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(callback);
  });
}

function recordEndGameSideEffects(currentSession: GameSession): void {
  if (currentSession.isTutorial) return;

  clearActiveGame(activeGameSlotFromSession(currentSession));

  if (currentSession.mode === 'daily') {
    markDailyCompleted(getDailyDateString(), currentSession.letterCount);
  }

  const persistAndSync = async () => {
    try {
      await useStatsStore.getState().recordGameIfNeeded({
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
    } catch (err) {
      if (__DEV__) {
        console.warn('[stats] recordGame failed', err);
      }
    }

    useAdStore.getState().incrementGamesSinceLastAd();
    useAdStore.getState().preloadInterstitial();

    const stats = useStatsStore.getState().stats;

    void syncLeaderboardForSession(currentSession);

    const authState = useAuthStore.getState();
    if (hasSignedInPlayer(authState) && stats) {
      void updatePlayerStats(
        authState.playerId,
        authState.playerName ?? 'Player',
        stats,
      );
    } else if (stats) {
      void enqueueEvent('game_result', {
        playerName: 'Player',
        stats,
      });
    }
  };

  void persistAndSync();
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
        headerLeft: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          minWidth: 0,
          marginRight: 8,
        },
        backButton: {
          justifyContent: 'center',
          alignItems: 'center',
          padding: 8,
        },
        helpButton: {
          justifyContent: 'center',
          alignItems: 'center',
          padding: 8,
          flexShrink: 0,
        },
        headerActions: {
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
        },
        headerTitle: {
          ...typography.cardTitle,
          color: '#FFFFFF',
          marginLeft: 8,
          flexShrink: 1,
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
          flexShrink: 0,
        },
        hardModeBadgeText: {
          ...typography.small,
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
        tutorialOverlay: {
          position: 'absolute',
          left: 0,
          right: 0,
          justifyContent: 'center',
          alignItems: 'center',
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
          ...typography.small,
          color: theme.colors.text.inverse,
          fontSize: 14,
        },
        // ── Hint Buttons ──
        hintButtonsContainer: {
          flexDirection: 'row',
          alignSelf: 'stretch',
          gap: 10,
          marginBottom: layout.adKeyboardGap,
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
  const { mode, letterCount, tutorial: isTutorialRoute } = route.params;
  const headerColor = MODE_HEADER_COLORS[mode];
  const session = useGameStore((s) => s.session);
  const skipConfirmVisible = useTutorialStore((s) => s.skipConfirmVisible);
  const startGame = useGameStore((s) => s.startGame);
  const restoreSession = useGameStore((s) => s.restoreSession);
  const error = useGameStore((s) => s.error);
  const isRevealing = useGameStore((s) => s.isRevealing);
  const setIsRevealing = useGameStore((s) => s.setIsRevealing);
  const finalizeRevealOutcome = useGameStore((s) => s.finalizeRevealOutcome);
  const flushPendingInputs = useGameStore((s) => s.flushPendingInputs);
  const insets = useSafeAreaInsets();
  const [initializing, setInitializing] = useState(true);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [boardAreaHeight, setBoardAreaHeight] = useState(0);
  const [adIntro, setAdIntro] = useState<{
    format: HelperAdFormat;
    rewardLabel: string;
    onRewarded: () => void;
  } | null>(null);
  const [boardContentBottom, setBoardContentBottom] = useState(0);
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
    if (isTutorialRoute) {
      useTutorialStore.getState().start();
      startGame('random', TUTORIAL_ANSWER, TUTORIAL_LETTER_COUNT, false, true);
      setInitializing(false);
      return;
    }

    useTutorialStore.getState().stop();

    const hardMode = useSettingsStore.getState().hardModeEnabled;
    const len = letterCount ?? randomLength();
    const slot = toActiveGameSlot(mode, len, hardMode);
    const saved = getActiveGame(slot);
    const shouldRestoreSaved = shouldRestoreActiveGame(saved, mode, len, hardMode);

    if (shouldRestoreSaved) {
      restoreSession(saved);
      setInitializing(false);
      return;
    }

    clearActiveGame(slot);

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
    useAdStore.getState().ensureHelperAdsReady();
    void useAdStore.getState().preloadInterstitial();
    setInitializing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── AppState persistence (D-55, D-56, D-57) ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextState.match(/inactive|background/)) {
        const currentSession = useGameStore.getState().session;
        if (currentSession && currentSession.status === 'playing' && !currentSession.isTutorial) {
          saveActiveGame(currentSession);
        }
      }

      if (nextState === 'active' && appState.current.match(/inactive|background/)) {
        const currentSession = useGameStore.getState().session;
        if (!currentSession || currentSession.status !== 'playing') {
          const hardMode = useSettingsStore.getState().hardModeEnabled;
          const len = letterCount ?? currentSession?.letterCount ?? randomLength();
          const slot = toActiveGameSlot(mode, len, hardMode);
          const saved = getActiveGame(slot);
          if (shouldRestoreActiveGame(saved, mode, len, hardMode)) {
            useGameStore.getState().restoreSession(saved);
          } else if (saved) {
            clearActiveGame(slot);
          }
        }
        // Ads can fail/expire while backgrounded — nudge a reload so hint
        // buttons do not stay dim forever.
        useAdStore.getState().ensureHelperAdsReady();
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [mode, letterCount]);

  // ── Persist stats when game ends (backup — ResultModal is primary for all modes) ──
  useEffect(() => {
    if (!session || isRevealing) return;
    if (session.status !== 'won' && session.status !== 'lost') return;
    recordEndGameSideEffects(session);
  }, [session?.id, session?.status, isRevealing]);

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
        // Play outcome SFX *before* promoting status / mounting ResultModal.
        // Win/lose used to wait until after finalize + modal mount; that batch
        // (modal, confetti, leaderboard sync) often starved Android audio so
        // only short keypress SFX still seemed to work.
        const pendingOutcome = useGameStore.getState().session?.pendingStatus;
        if (pendingOutcome === 'won') {
          sound.playWin();
        } else if (pendingOutcome === 'lost') {
          sound.playLoss();
        } else {
          sound.playReveal();
        }

        // Phase 1: stop flip animations (Animated Tile → StaticTile swap).
        setIsRevealing(false);
        flushPendingInputs();

        // Phase 2 (next paint): status + keyboard colors + ResultModal mount.
        runAfterUiSettle(() => {
          finalizeRevealOutcome();

          if (useGameStore.getState().session?.isTutorial) {
            useTutorialStore.getState().advanceAfterReveal();
          }

          if (useSettingsStore.getState().hapticEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
        });
      }, totalAnimationTime);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.guesses.length, isRevealing]);

  // ── Back navigation ──
  const handleBack = useCallback(() => {
    const currentSession = useGameStore.getState().session;
    if (currentSession?.isTutorial) {
      useTutorialStore.getState().requestSkip();
      return;
    }
    if (currentSession && currentSession.status === 'playing') {
      saveActiveGame(currentSession);
    }
    navigation.goBack();
  }, [navigation]);

  const handleFinishTutorial = useCallback(() => {
    useTutorialStore.getState().finish();
    useGameStore.getState().resetGame();
    navigation.goBack();
  }, [navigation]);

  const handleCancelSkipTutorial = useCallback(() => {
    useTutorialStore.getState().cancelSkip();
  }, []);

  const handleConfirmSkipTutorial = useCallback(() => {
    useTutorialStore.getState().skip();
    useGameStore.getState().resetGame();
    navigation.goBack();
  }, [navigation]);

  useEffect(() => {
    return () => {
      const currentSession = useGameStore.getState().session;
      if (currentSession && currentSession.status === 'playing' && !currentSession.isTutorial) {
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

  // Hint buttons: watch a rewarded ad for extra attempt or letter hint
  const isPro = useSettingsStore((s) => s.isPro);
  const maxExtra = isPro ? config.maxExtraGuessesPro : config.maxExtraGuessesFree;
  const extraAttemptReady = useAdStore((s) => s.extraAttemptLoaded);
  const letterHintReady = useAdStore((s) => s.letterHintLoaded);
  const extraAttemptsRemaining = session
    ? maxExtra - session.extraGuessesUsed
    : 0;
  const extraAttemptFormat: HelperAdFormat = 'extra_attempt';
  const letterHintFormat: HelperAdFormat = 'letter_hint';

  const grantExtraAttempt = useCallback(() => {
    setTimeout(() => {
      useGameStore.getState().addExtraGuess();
    }, 100);
  }, []);

  const grantLetterHint = useCallback(() => {
    setTimeout(() => {
      useGameStore.getState().useLetterHint();
    }, 100);
  }, []);

  const playHelperAd = useCallback(
    async (
      format: HelperAdFormat,
      rewardLabel: string,
      onRewarded: () => void,
    ) => {
      const adStore = useAdStore.getState();
      if (!adStore.isHelperAdReady(format)) {
        adStore.ensureHelperAdsReady();
        return;
      }

      // Confirm before rewarded helpers to reduce accidental watches.
      setAdIntro({ format, rewardLabel, onRewarded });
    },
    [],
  );

  const handleWatchAd = useCallback(async () => {
    await playHelperAd(extraAttemptFormat, '+1 Row', grantExtraAttempt);
  }, [playHelperAd, extraAttemptFormat, grantExtraAttempt]);

  const handleLetterHint = useCallback(async () => {
    await playHelperAd(letterHintFormat, 'a Letter Hint', grantLetterHint);
  }, [playHelperAd, letterHintFormat, grantLetterHint]);

  const handleAdIntroWatch = useCallback(async () => {
    const pending = adIntro;
    setAdIntro(null);
    if (!pending) return;
    await useAdStore.getState().showHelperAd(
      pending.format,
      pending.onRewarded,
    );
  }, [adIntro]);

  const handleAdIntroSkip = useCallback(() => {
    setAdIntro(null);
  }, []);

  if (initializing || !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.status.accent} />
        <SkipOnboardingModal
          visible={skipConfirmVisible}
          onCancel={handleCancelSkipTutorial}
          onSkip={handleConfirmSkipTutorial}
        />
      </View>
    );
  }

  const modeLabel = capitalize(session.mode);
  const headerBg = headerColor;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom, paddingHorizontal: layout.screenPadding },
      ]}
    >
      {/* ── Header — mode-colored bg, plain back icon ── */}
      <View style={[styles.header, { paddingTop: insets.top + 6, marginHorizontal: -layout.screenPadding, backgroundColor: headerBg }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
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
            <Text style={styles.headerTitle} numberOfLines={1}>
              {session.isTutorial
                ? `${session.letterCount} Letters`
                : `${modeLabel} · ${session.letterCount} Letters`}
            </Text>
            {hardModeEnabled && session.status === 'playing' && !session.isTutorial && (
              <View style={styles.hardModeBadge}>
                <Text style={styles.hardModeBadgeText}>🔥 Hard</Text>
              </View>
            )}
          </View>
          <View style={styles.headerActions}>
            {!session.isTutorial ? (
              <>
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => setShowHowToPlay(true)}
                  activeOpacity={0.7}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="How to Play"
                >
                  <MaterialIcons name="help-outline" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => navigation.navigate('Settings', { fromGame: true })}
                  activeOpacity={0.7}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                >
                  <MaterialIcons name="settings" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Board area + error toast overlay ── */}
      <View
        style={styles.boardArea}
        onLayout={(event) => {
          const next = event.nativeEvent.layout.height;
          setBoardAreaHeight((prev) => (prev === next ? prev : next));
        }}
      >
        <GameBoard
          boardAreaHeight={boardAreaHeight}
          onContentLayout={({ y, height }) => setBoardContentBottom(y + height)}
        />
        {session.isTutorial ? (
          <View
            style={[
              styles.tutorialOverlay,
              boardContentBottom > 0
                ? { top: boardContentBottom, bottom: 0 }
                : StyleSheet.absoluteFill,
            ]}
            pointerEvents="box-none"
          >
            <TutorialCoach onFinish={handleFinishTutorial} />
          </View>
        ) : null}
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
      {session.status === 'playing' && !session.isTutorial && (
        <View style={styles.hintButtonsContainer}>
          {session.extraGuessesUsed < maxExtra && (
            <HintAdButton
              icon="play"
              label={formatExtraAttemptLabel(extraAttemptsRemaining)}
              backgroundColor={theme.colors.brand.primary}
              onPress={handleWatchAd}
              disabled={!extraAttemptReady}
              accessibilityLabel="Watch ad for an extra row"
            />
          )}
          {!session.letterHintUsed && (
            <HintAdButton
              icon="hint"
              label={LETTER_HINT_AD_LABEL}
              backgroundColor={theme.colors.brand.secondary}
              onPress={handleLetterHint}
              disabled={!letterHintReady}
              accessibilityLabel="Watch ad for a letter hint"
            />
          )}
        </View>
      )}

      {/* ── Keyboard ── */}
      <View style={styles.keyboardArea}>
        <Keyboard />
      </View>

      {/* ── Result Modal ── */}
      <ResultModal />

      <HowToPlayModal
        visible={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      <RewardedInterstitialIntroModal
        visible={adIntro !== null}
        rewardLabel={adIntro?.rewardLabel ?? ''}
        onWatch={() => {
          void handleAdIntroWatch();
        }}
        onSkip={handleAdIntroSkip}
      />

      <SkipOnboardingModal
        visible={skipConfirmVisible}
        onCancel={handleCancelSkipTutorial}
        onSkip={handleConfirmSkipTutorial}
      />
    </View>
  );
}
