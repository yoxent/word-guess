import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';

interface StatCardProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function StatCard({ title, children, style }: StatCardProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: 12,
          padding: 24,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
        title: {
          ...typography.cardTitle,
          color: theme.colors.text.primary,
          marginBottom: 12,
        },
      }),
    [theme],
  );

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}
