import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, GameMode } from '../types';
import { colors } from '../constants/colors';
import { Button } from '../components/ui';
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

  const hardMode = useSettingsStore((s) => s.hardModeEnabled);
  const toggleHardMode = useSettingsStore((s) => s.toggleHardMode);

  // Read daily completed lengths on mount
  useEffect(() => {
    const dateStr = getDailyDateString();
    const completed = getDailyCompletedLengths(dateStr);
    setCompletedDailyLengths(completed);
  }, []);

  // ── Check for saved game and prompt to continue or start fresh ──
  const navigateWithContinueCheck = (mode: GameMode, length: number) => {
    const saved = getActiveGame();
    if (saved && saved.mode === mode && saved.letterCount === length && saved.status === 'playing') {
      Alert.alert(
        'Continue Game?',
        `You have an unfinished ${mode} ${length}-letter game.`, [
        {
          text: 'New Game',
          style: 'destructive',
          onPress: () => {
            clearActiveGame();
            navigation.navigate('Game', { mode, letterCount: length });
          },
        },
        {
          text: 'Continue',
          style: 'default',
          onPress: () => navigation.navigate('Game', { mode, letterCount: length }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      navigation.navigate('Game', { mode, letterCount: length });
    }
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

  return (
    <View style={[styles.container, { paddingBottom: 24 + insets.bottom }]}>
      {/* Top bar with icons (offset for status bar) */}
      <View style={[styles.topBar, { top: insets.top, paddingRight: insets.right }]}>
        <View />
        <View style={styles.topBarIcons}>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Stats')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="emoji-events" size={26} color={colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Leaderboard')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="leaderboard" size={26} color={colors.headerText} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topIconButton}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.7}
          >
            <MaterialIcons name="settings" size={26} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.title}>Word Guess</Text>
      <Text style={styles.subtitle}>Choose a mode to play</Text>

      <View style={styles.modes}>
        <Button title="Daily Challenge" onPress={handleDaily} />
        <View style={styles.spacer} />
        <Button title="Endless" onPress={handleEndless} />
        <View style={styles.spacer} />
        <Button title="Random" onPress={handleRandom} />
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
});
