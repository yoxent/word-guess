import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';

interface HardModePillProps {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * Hard Mode pill toggle — a single tappable pill that shows current
 * state. Orange when active (signals difficulty), muted when inactive.
 * Replaces the raw Switch + label row on the home screen.
 */
export function HardModePill({ enabled, onToggle }: HardModePillProps) {
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 10,
          paddingHorizontal: 18,
          borderRadius: 20,
          borderWidth: 1.5,
        },
        pillActive: {
          backgroundColor: theme.colors.brand.secondary + '20', // 12% opacity orange
          borderColor: theme.colors.brand.secondary,
        },
        pillInactive: {
          backgroundColor: 'transparent',
          borderColor: theme.colors.text.secondary + '40', // 25% opacity
        },
        icon: {
          fontSize: 16,
        },
        label: {
          ...typography.small,
          fontWeight: '600',
        },
        labelActive: {
          color: theme.colors.brand.secondary,
        },
        labelInactive: {
          color: theme.colors.text.secondary,
        },
      }),
    [theme],
  );

  return (
    <TouchableOpacity
      style={[styles.pill, enabled ? styles.pillActive : styles.pillInactive]}
      onPress={onToggle}
      activeOpacity={0.7}
      accessible
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={`Hard mode ${enabled ? 'on' : 'off'}`}
    >
      <Text style={styles.icon}>{enabled ? '🔥' : '⚡'}</Text>
      <Text
        style={[
          styles.label,
          enabled ? styles.labelActive : styles.labelInactive,
        ]}
      >
        Hard Mode
      </Text>
    </TouchableOpacity>
  );
}
