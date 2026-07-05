import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, GameMode } from '../types';
import { colors } from '../constants/colors';
import { Button } from '../components/ui';
import { LengthPickerModal } from '../components/game';
import { useSettingsStore } from '../stores';
import { getDailyDateString, getDailyCompletedLengths } from '../services';

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<GameMode>('free');
  const [completedDailyLengths, setCompletedDailyLengths] = useState<number[]>([]);

  const hardMode = useSettingsStore((s) => s.hardModeEnabled);
  const toggleHardMode = useSettingsStore((s) => s.toggleHardMode);

  // Read daily completed lengths on mount
  useEffect(() => {
    const dateStr = getDailyDateString();
    const completed = getDailyCompletedLengths(dateStr);
    setCompletedDailyLengths(completed);
  }, []);

  const handleFreePlay = () => {
    setPickerMode('free');
    setShowPicker(true);
  };

  const handleRandom = () => {
    const length = Math.floor(Math.random() * 6) + 5;
    navigation.navigate('Game', { mode: 'random', letterCount: length });
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
    navigation.navigate('Game', { mode: pickerMode, letterCount: length });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Word Guess</Text>
      <Text style={styles.subtitle}>Choose a mode to play</Text>

      <View style={styles.modes}>
        <Button title="Free Play" onPress={handleFreePlay} />
        <View style={styles.spacer} />
        <Button title="Random" onPress={handleRandom} />
        <View style={styles.spacer} />
        <Button title="Daily Challenge" onPress={handleDaily} />
        <View style={styles.spacer} />
        <Button title="Endless" onPress={handleEndless} />
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

      <View style={styles.navRow}>
        <Button
          title="Stats"
          variant="secondary"
          onPress={() => navigation.navigate('Stats')}
        />
        <View style={{ width: 12 }} />
        <Button
          title="Settings"
          variant="secondary"
          onPress={() => navigation.navigate('Settings')}
        />
        <View style={{ width: 12 }} />
        <Button
          title="Leaderboard"
          variant="secondary"
          onPress={() => navigation.navigate('Leaderboard')}
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
  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
