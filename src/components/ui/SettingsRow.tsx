import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import type { SettingsRowConfig } from '../../config/ui';
import { useSettingsStore } from '../../stores/settingsStore';

interface SettingsRowProps {
  config: SettingsRowConfig;
}

export function SettingsRow({ config }: SettingsRowProps) {
  switch (config.type) {
    case 'toggle':
      return <ToggleRow config={config} />;
    case 'placeholder':
      return <PlaceholderRow config={config} />;
    case 'info':
      return <InfoRow config={config} />;
    default:
      return null;
  }
}

function ToggleRow({ config }: { config: SettingsRowConfig & { type: 'toggle' } }) {
  const value = useSettingsStore((s) => s[config.storeKey]);
  const toggleAction = useSettingsStore((s) => {
    switch (config.storeKey) {
      case 'hardModeEnabled': return s.toggleHardMode;
      case 'soundEnabled': return s.toggleSound;
      case 'hapticEnabled': return s.toggleHaptic;
      default: return () => {};
    }
  });

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{config.label}</Text>
      <Switch
        value={!!value}
        onValueChange={toggleAction}
        trackColor={{ false: colors.tileEmpty, true: colors.accent }}
        thumbColor={colors.textInverse}
      />
    </View>
  );
}

function PlaceholderRow({ config }: { config: SettingsRowConfig & { type: 'placeholder' } }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{config.label}</Text>
      <Text style={styles.comingSoon}>{config.description}</Text>
    </View>
  );
}

function InfoRow({ config }: { config: SettingsRowConfig & { type: 'info' } }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{config.label}</Text>
      <Text style={styles.value}>{config.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    ...typography.settingsRow,
    flex: 1,
  },
  comingSoon: {
    ...typography.statLabel,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
