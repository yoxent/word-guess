import React, { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

export function LoadingScreen() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        },
        title: {
          fontSize: 36,
          fontWeight: '800',
          color: theme.colors.text.primary,
          marginBottom: 8,
        },
        subtitle: {
          fontSize: 16,
          color: theme.colors.text.secondary,
          marginBottom: 24,
        },
        spinner: {
          transform: [{ scale: 1.5 }],
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Word Guess</Text>
      <Text style={styles.subtitle}>Loading dictionary...</Text>
      <ActivityIndicator size="large" color={theme.colors.status.accent} style={styles.spinner} />
    </View>
  );
}
