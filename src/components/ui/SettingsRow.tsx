import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { typography } from '../../constants/typography';
import type { SettingsRowConfig } from '../../config/ui';
import { useSettingsStore } from '../../stores/settingsStore';

interface SettingsRowProps {
  config: SettingsRowConfig;
  onRestore?: () => Promise<void>;
  onPurchase?: (productId: string) => Promise<void>;
}

export function SettingsRow({ config, onRestore, onPurchase }: SettingsRowProps) {
  switch (config.type) {
    case 'toggle':
      return <ToggleRow config={config} />;
    case 'placeholder':
      return <PlaceholderRow config={config} />;
    case 'info':
      return <InfoRow config={config} />;
    case 'restore':
      return <RestoreRow config={config} onRestore={onRestore} />;
    case 'purchase':
      return <PurchaseRow config={config} onPurchase={onPurchase} />;
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

function RestoreRow({ config, onRestore }: { config: SettingsRowConfig & { type: 'restore' }; onRestore?: () => Promise<void> }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onRestore} activeOpacity={0.7}>
      <Text style={styles.label}>{config.label}</Text>
    </TouchableOpacity>
  );
}

function PurchaseRow({ config, onPurchase }: { config: SettingsRowConfig & { type: 'purchase' }; onPurchase?: (productId: string) => Promise<void> }) {
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPurchase?.(config.productId)} activeOpacity={0.7}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{config.label}</Text>
        {config.description && <Text style={styles.purchaseDescription}>{config.description}</Text>}
      </View>
      <Text style={styles.purchasePrice}>Buy</Text>
    </TouchableOpacity>
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
  purchaseDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  purchasePrice: {
    ...typography.settingsRow,
    color: colors.accent,
    fontWeight: '600',
  },
});
