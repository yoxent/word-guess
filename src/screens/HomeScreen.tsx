import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Switch, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, GameMode } from '../types';
import { colors } from '../constants/colors';
import { HOME_STAGGER_DELAY, HOME_STAGGER_DURATION } from '../constants/animations';
import { Button, HowToPlayModal } from '../components/ui';
import { LengthPickerModal } from '../components/game';
import { useSettingsStore } from '../stores';
import {
  getDailyDateString,
  getDailyCompletedLengths,
  getActiveGame,
  clearActiveGame,
} from '../services';

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();

  const insets = useSafeAreaInsets();

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<GameMode>('daily');
  const [completedDailyLengths, setCompletedDailyLengths] = useState<number[]>([]);
  const [continueModal, setContinueModal] = useState<{ mode: GameMode; length: number } | null>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // D-176: Stagger entrance animation refs (D-175-D-177)
  const titleAnim = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;
  const buttonAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
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

  // D-176: Stagger entrance animation — title (0ms) → buttons (80ms each) → icons (after last)
  useEffect(() => {
    if (reduceMotion) {
      titleAnim.setValue(1);
      subtitleAnim.setValue(1);
      buttonAnims.forEach(a => a.setValue(1));
      iconAnim.setValue(1);
      return;
    }

    // Title (0ms delay)
    Animated.timing(titleAnim, {
      toValue: 1,
      duration: HOME_STAGGER_DURATION,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();

    // Subtitle (50ms after title start per UI spec)
    const subtitleTimer = setTimeout(() => {
      Animated.timing(subtitleAnim, {
        toValue: 1,
        duration: HOME_STAGGER_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    }, 50);

    // Buttons (80ms stagger per button — D-176)
    Animated.stagger(HOME_STAGGER_DELAY, buttonAnims.map(anim =>
      Animated.timing(anim, {
        toValue: 1,
        duration: HOME_STAGGER_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      })
    )).start();

    // Icon bar (starts after last button animation completes)
    const lastButtonDelay = HOME_STAGGER_DELAY * 3 + HOME_STAGGER_DURATION;
    const iconTimer = setTimeout(() => {
      Animated.timing(iconAnim, {
        toValue: 1,
        duration: HOME_STAGGER_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }).start();
    }, lastButtonDelay);

    return () => {
      clearTimeout(subtitleTimer);
      clearTimeout(iconTimer);
    };
  }, [reduceMotion, titleAnim, subtitleAnim, buttonAnims, iconAnim]);

  // ── Check for saved game and prompt to continue or start fresh ──
  const navigateWithContinueCheck = (mode: GameMode, length: number) => {
    const saved = getActiveGame();
    if (saved && saved.mode === mode && saved.letterCount === length && saved.status === 'playing') {
      // Daily: auto-continue without prompt
      if (mode === 'daily') {
        navigation.navigate('Game', { mode, letterCount: length });
        return;
      }
      // Non-daily: show continue modal
      setContinueModal({ mode, length });
    } else {
      navigation.navigate('Game', { mode, letterCount: length });
    }
  };

  const handleContinue = () => {
    if (!continueModal) return;
    navigation.navigate('Game', { mode: continueModal.mode, letterCount: continueModal.length });
    setContinueModal(null);
  };

  const handleNewGame = () => {
    if (!continueModal) return;
    clearActiveGame();
    navigation.navigate('Game', { mode: continueModal.mode, letterCount: continueModal.length });
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

  // Build staggered translate+opacity style
  const fadeSlide = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  });

  return (
    <View style={[styles.container, { paddingBottom: 24 + insets.bottom }]}>
      {/* Top bar with icons (offset for status bar) */}
      <Animated.View
        style={[
          styles.topBar,
          { top: insets.top, paddingRight: insets.right },
          fadeSlide(iconAnim),
        ]}
      >
        <View />
        <View style={styles.topBarIcons}>
          {/* D-194: ? icon for How to Play — leftmost per UI spec */}
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => setShowHowToPlay(true)}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="How to Play"
          >
            <MaterialIcons name="help-outline" size={26} color={colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Stats')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Statistics"
          >
            <MaterialIcons name="emoji-events" size={26} color={colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Leaderboard"
          >
            <MaterialIcons name="leaderboard" size={26} color={colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <MaterialIcons name="settings" size={26} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View style={fadeSlide(titleAnim)}>
        <Text style={styles.title}>Word Guess</Text>
      </Animated.View>
      <Animated.View style={fadeSlide(subtitleAnim)}>
        <Text style={styles.subtitle}>Choose a mode to play</Text>
      </Animated.View>

      <View style={styles.modes}>
        <Animated.View style={fadeSlide(buttonAnims[0])}>
          <Button title="Daily Challenge" onPress={handleDaily} />
        </Animated.View>
        <View style={styles.spacer} />
        <Animated.View style={fadeSlide(buttonAnims[1])}>
          <Button title="Endless" onPress={handleEndless} />
        </Animated.View>
        <View style={styles.spacer} />
        <Animated.View style={fadeSlide(buttonAnims[2])}>
          <Button title="Random" onPress={handleRandom} />
        </Animated.View>
      </View>

      <View style={styles.hardModeRow}>
        <Text style={styles.hardModeLabel}>Hard Mode</Text>
        <Switch
          value={hardMode}
          onValueChange={toggleHardMode}
          trackColor={{ false: colors.tileBorder, true: colors.accent }}
          thumbColor={hardMode ? colors.accentDark : colors.tileBorder}
        />
      </View>

      <LengthPickerModal
        visible={showPicker}
        mode={pickerMode}
        onSelect={handleLengthSelect}
        onClose={() => setShowPicker(false)}
        completedLengths={pickerMode === 'daily' ? completedDailyLengths : []}
      />

      <HowToPlayModal
        visible={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      <Modal visible={continueModal !== null} transparent animationType="fade">
        <View style={styles.modalOverlay} onTouchEnd={handleCancelContinue}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Continue Game?</Text>
            <Text style={styles.modalMessage}>
              You have an unfinished {continueModal?.mode} {continueModal?.length}-letter game.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonContinue} onPress={handleContinue} activeOpacity={0.7}>
                <Text style={styles.modalButtonContinueText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonNew} onPress={handleNewGame} activeOpacity={0.7}>
                <Text style={styles.modalButtonNewText}>New Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 40,
  },
  modes: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 32,
  },
  spacer: {
    height: 12,
  },
  hardModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  hardModeLabel: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
  },
  topBarIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  topIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '85%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    width: '100%',
    gap: 8,
  },
  modalButtonContinue: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  modalButtonContinueText: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonNew: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  modalButtonNewText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '600',
  },
});
