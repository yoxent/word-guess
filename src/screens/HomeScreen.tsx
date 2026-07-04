import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, GameMode } from '@/types';
import { colors } from '@/constants/colors';
import { Button } from '@/components/ui';

type HomeNav = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNav>();

  const startGame = (mode: GameMode, letterCount?: number) => {
    navigation.navigate('Game', { mode, letterCount });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Word Guess</Text>
      <Text style={styles.subtitle}>Choose a mode to play</Text>

      <View style={styles.modes}>
        <Button title="Free Play" onPress={() => startGame('free', 5)} />
        <View style={styles.spacer} />
        <Button title="Random" onPress={() => startGame('random')} />
        <View style={styles.spacer} />
        <Button title="Daily Challenge" onPress={() => startGame('daily', 5)} />
        <View style={styles.spacer} />
        <Button title="Endless" onPress={() => startGame('endless', 5)} />
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
    marginBottom: 48,
  },
  spacer: {
    height: 12,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
