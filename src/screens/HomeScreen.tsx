import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, GameMode } from '../types';
import { useTheme } from '../hooks/useTheme';
import {
  HOME_STAGGER_DELAY,
  HOME_STAGGER_DURATION,
} from '../constants/animations';
import { layout } from '../constants/layout';
import { typography } from '../constants/typography';
import { HowToPlayModal, HomeBackground } from '../components/ui';
import { LengthPickerModal } from '../components/game';
import { ModeCard, DailyPreview, HardModePill } from '../components/home';
import { useSettingsStore } from '../stores';
import {
  getDailyDateString,
  getDailyCompletedLengths,
  getActiveGame,
  clearActiveGame,
} from '../services';
import { shouldOfferContinue } from '../utils/activeGame';

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HOME_TOP_BAR_INSET = 8;
const HOME_TOP_ICON_SIZE = 44;
/** Space between the icon row and the title block. */
const HOME_CONTENT_TOP_GAP = 36;

function homeScrollPaddingTop(insetTop: number): number {
  return insetTop + HOME_TOP_BAR_INSET + HOME_TOP_ICON_SIZE + HOME_CONTENT_TOP_GAP;
}

export function HomeScreen() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
        },
        overlay: {
          ...StyleSheet.absoluteFill,
        },
        scroll: {
          flex: 1,
          backgroundColor: 'transparent',
        },
        scrollContent: {
          flexGrow: 1,
          alignItems: 'center',
          paddingHorizontal: layout.screenPadding,
          paddingBottom: layout.screenPadding + 40,
        },
        // ── Top Bar ──
        topBar: {
          position: 'absolute',
          left: 0,
          right: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: layout.screenPadding,
          paddingRight: layout.screenPadding,
          zIndex: 10,
        },
        topBarIcons: {
          flexDirection: 'row',
          gap: 6,
        },
        topIconButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.surface.card,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
          elevation: 2,
        },
        // ── Title & Branding ──
        titleSection: {
          alignItems: 'center',
          marginBottom: 36,
        },
        title: {
          ...typography.display,
          color: theme.colors.text.primary,
          marginBottom: 4,
        },
        subtitle: {
          ...typography.body,
          color: theme.colors.text.secondary,
        },
        // ── Mode Cards ──
        modesSection: {
          width: '100%',
          maxWidth: 340,
          gap: 14,
          marginBottom: 8,
        },
        // ── Hard Mode ──
        hardModeSection: {
          alignItems: 'center',
          marginTop: 16,
          marginBottom: 8,
        },
        // ── Continue Modal ──
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        modalCard: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.modalBorderRadius,
          padding: 28,
          alignItems: 'center',
          minWidth: 280,
          maxWidth: '85%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 8,
        },
        modalTitle: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 8,
        },
        modalMessage: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 22,
        },
        modalButtons: {
          width: '100%',
          gap: 10,
        },
        modalButtonContinue: {
          backgroundColor: theme.colors.button.primary.bg,
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
          minHeight: 54,
        },
        modalButtonContinueText: {
          ...typography.button,
          color: theme.colors.button.primary.fg,
        },
        modalButtonNew: {
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
          minHeight: 54,
          borderWidth: 1.5,
          borderColor: theme.colors.status.danger,
        },
        modalButtonNewText: {
          ...typography.button,
          color: theme.colors.status.danger,
        },
      }),
    [theme],
  );

  const navigation = useNavigation<HomeNav>();
  const insets = useSafeAreaInsets();

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<GameMode>('daily');
  const [completedDailyLengths, setCompletedDailyLengths] = useState<number[]>(
    [],
  );
  const [continueModal, setContinueModal] = useState<{
    mode: GameMode;
    length: number;
  } | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // ── Stagger entrance animation refs ──
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const previewAnim = useRef(new Animated.Value(0)).current;
  const hardModeAnim = useRef(new Animated.Value(0)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  const hardMode = useSettingsStore((s) => s.hardModeEnabled);
  const toggleHardMode = useSettingsStore((s) => s.toggleHardMode);

  // Read daily completed lengths on mount
  useEffect(() => {
    const dateStr = getDailyDateString();
    const completed = getDailyCompletedLengths(dateStr);
    setCompletedDailyLengths(completed);
  }, []);

  // ── Daily progress ──
  const dailyProgress = useMemo(() => {
    const total = 6; // lengths 5-10
    const done = completedDailyLengths.length;
    return { done, total, fraction: done / total };
  }, [completedDailyLengths]);

  // ── Stagger entrance animation ──
  useEffect(() => {
    if (reduceMotion) {
      titleAnim.setValue(1);
      subtitleAnim.setValue(1);
      cardAnims.forEach((a) => a.setValue(1));
      previewAnim.setValue(1);
      hardModeAnim.setValue(1);
      iconAnim.setValue(1);
      return;
    }

    const fade = (anim: Animated.Value, delay: number) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: HOME_STAGGER_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
        delay,
      });

    Animated.sequence([
      fade(titleAnim, 0),
      Animated.parallel([
        fade(subtitleAnim, 0),
        fade(iconAnim, 0),
      ]),
      Animated.stagger(HOME_STAGGER_DELAY, cardAnims.map((a) => fade(a, 0))),
      fade(previewAnim, 40),
      fade(hardModeAnim, 40),
    ]).start();
  }, [
    reduceMotion,
    titleAnim,
    subtitleAnim,
    cardAnims,
    previewAnim,
    hardModeAnim,
    iconAnim,
  ]);

  // ── Fade+slide helper ──
  const fadeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  });

  // ── Navigation with continue check ──
  const navigateWithContinueCheck = (mode: GameMode, length: number) => {
    const hardMode = useSettingsStore.getState().hardModeEnabled;
    const saved = getActiveGame(hardMode);
    const hasProgress = shouldOfferContinue(saved, mode, length, hardMode);
    if (hasProgress) {
      if (mode === 'daily') {
        navigation.navigate('Game', { mode, letterCount: length });
        return;
      }
      const continueLength = mode === 'random' ? saved.letterCount : length;
      setContinueModal({ mode, length: continueLength });
    } else {
      clearActiveGame(hardMode);
      navigation.navigate('Game', { mode, letterCount: length });
    }
  };

  const handleContinue = () => {
    if (!continueModal) return;
    navigation.navigate('Game', {
      mode: continueModal.mode,
      letterCount: continueModal.length,
    });
    setContinueModal(null);
  };

  const handleNewGame = () => {
    if (!continueModal) return;
    clearActiveGame(useSettingsStore.getState().hardModeEnabled);
    const length =
      continueModal.mode === 'random'
        ? Math.floor(Math.random() * 6) + 5
        : continueModal.length;
    navigation.navigate('Game', {
      mode: continueModal.mode,
      letterCount: length,
    });
    setContinueModal(null);
  };

  const handleCancelContinue = () => {
    setContinueModal(null);
  };

  const handleRandom = () => {
    const length = Math.floor(Math.random() * 6) + 5;
    navigateWithContinueCheck('random', length);
  };

  const handleDaily = () => {
    setPickerMode('daily');
    setShowPicker(true);
  };

  const handleEndless = () => {
    setPickerMode('endless');
    setShowPicker(true);
  };

  const handleLengthSelect = (length: number) => {
    setShowPicker(false);
    navigateWithContinueCheck(pickerMode, length);
  };

  // ── Build daily subtitle with progress hint ──
  const dailySubtitle = useMemo(() => {
    const remaining = 6 - completedDailyLengths.length;
    if (remaining === 0) return 'All done for today! 🎉';
    return `${remaining} puzzle${remaining === 1 ? '' : 's'} remaining`;
  }, [completedDailyLengths]);

  return (
    <View style={styles.container}>
      <HomeBackground />

      <View style={styles.overlay} pointerEvents="box-none">
      {/* ── Top Bar ── */}
      <Animated.View
        style={[
          styles.topBar,
          {
            top: insets.top + 8,
            paddingRight: Math.max(layout.screenPadding, insets.right),
          },
          fadeSlide(iconAnim),
        ]}
      >
        <View />
        <View style={styles.topBarIcons}>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => setShowHowToPlay(true)}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel="How to Play"
          >
            <MaterialIcons
              name="help-outline"
              size={24}
              color={theme.colors.icon.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Stats')}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Statistics"
          >
            <MaterialIcons
              name="emoji-events"
              size={24}
              color={theme.colors.icon.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Leaderboard"
          >
            <MaterialIcons
              name="leaderboard"
              size={24}
              color={theme.colors.icon.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <MaterialIcons
              name="settings"
              size={24}
              color={theme.colors.icon.primary}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: homeScrollPaddingTop(insets.top) },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Title & Branding ── */}
        <View style={styles.titleSection}>
          <Animated.View style={fadeSlide(titleAnim)}>
            <Text style={styles.title}>Word Guess</Text>
          </Animated.View>
          <Animated.View style={fadeSlide(subtitleAnim)}>
            <Text style={styles.subtitle}>Guess the word!</Text>
          </Animated.View>
        </View>

        {/* ── Mode Cards ── */}
        <View style={styles.modesSection}>
          <Animated.View style={fadeSlide(cardAnims[0])}>
            <ModeCard
              mode="daily"
              icon="🌅"
              title="Daily Challenge"
              subtitle={dailySubtitle}
              progress={dailyProgress.fraction}
              progressLabel={`${dailyProgress.done}/${dailyProgress.total} complete`}
              onPress={handleDaily}
            />
          </Animated.View>
          <Animated.View style={fadeSlide(cardAnims[1])}>
            <ModeCard
              mode="endless"
              icon="🔄"
              title="Endless"
              subtitle="Keep guessing, build your streak"
              onPress={handleEndless}
            />
          </Animated.View>
          <Animated.View style={fadeSlide(cardAnims[2])}>
            <ModeCard
              mode="random"
              icon="🎲"
              title="Random"
              subtitle="Surprise word length"
              onPress={handleRandom}
            />
          </Animated.View>
        </View>

        {/* ── Hard Mode Toggle ── */}
        <Animated.View style={[styles.hardModeSection, fadeSlide(hardModeAnim)]}>
          <HardModePill enabled={hardMode} onToggle={toggleHardMode} />
        </Animated.View>

        {/* ── Daily Preview ── */}
        <Animated.View style={fadeSlide(previewAnim)}>
          <DailyPreview completedLengths={completedDailyLengths} />
        </Animated.View>
      </ScrollView>
      </View>

      {/* ── Modals ── */}
      <LengthPickerModal
        visible={showPicker}
        mode={pickerMode}
        onSelect={handleLengthSelect}
        onClose={() => setShowPicker(false)}
        completedLengths={
          pickerMode === 'daily' ? completedDailyLengths : []
        }
      />

      <HowToPlayModal
        visible={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      <Modal
        visible={continueModal !== null}
        transparent
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancelContinue}>
          <View
            style={styles.modalCard}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Continue Game?</Text>
            <Text style={styles.modalMessage}>
              You have an unfinished {continueModal?.mode}{' '}
              {continueModal?.length}-letter game.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonContinue}
                onPress={handleContinue}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonContinueText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonNew}
                onPress={handleNewGame}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonNewText}>New Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
