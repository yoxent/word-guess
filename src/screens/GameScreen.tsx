import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ScreenProps } from '@/types';
import { colors } from '@/constants/colors';

type Props = ScreenProps<'Game'>;

export function GameScreen({ route }: Props) {
  const { mode, letterCount } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game</Text>
      <Text style={styles.info}>
        Mode: {mode}
        {letterCount ? ` | Letters: ${letterCount}` : ''}
      </Text>
      <Text style={styles.placeholder}>
        Game board will render here (Phase 2)
      </Text>
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
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  info: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
