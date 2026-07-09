import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';

export function LoadingScreen() {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          marginBottom: 24,
        },
        spinner: {
          transform: [{ scale: 1.5 }],
        },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Word Guess</Text>
      <Text style={styles.subtitle}>Loading dictionary...</Text>
      <ActivityIndicator size="large" color={colors.accent} style={styles.spinner} />
    </View>
  );
}
