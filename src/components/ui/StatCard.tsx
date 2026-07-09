import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { typography } from '../../constants/typography';

interface StatCardProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function StatCard({ title, children, style }: StatCardProps) {
  const colors = useColors();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
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
          color: colors.textPrimary,
          marginBottom: 12,
        },
      }),
    [colors],
  );

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}
