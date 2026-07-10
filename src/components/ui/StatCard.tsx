import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import { layout } from '../../constants/layout';

interface StatCardProps {
  title: string;
  children: React.ReactNode;
  accentColor?: string;
  style?: ViewStyle;
}

/**
 * Card container for stat sections. Rounded corners, soft shadow,
 * optional left accent border strip.
 */
export function StatCard({ title, children, accentColor, style }: StatCardProps) {
  const theme = useTheme();
  const accent = accentColor ?? theme.colors.brand.primary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.cardBorderRadius,
          padding: 20,
          marginBottom: 16,
          // Soft colored shadow instead of generic black
          shadowColor: accent,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 3,
          // Left accent border strip
          borderLeftWidth: 4,
          borderLeftColor: accent,
        },
        title: {
          ...typography.cardTitle,
          color: theme.colors.text.primary,
          marginBottom: 12,
        },
      }),
    [theme, accent],
  );

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}
