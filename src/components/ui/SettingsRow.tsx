import React, { useEffect, useMemo } from 'react';
import { setSoundEnabled } from '../../services';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { typography } from '../../constants/typography';
import type { SettingsRowConfig } from '../../config/ui';
import { useSettingsStore } from '../../stores/settingsStore';

interface SettingsRowProps {
  config: SettingsRowConfig;
  onRestore?: () => Promise<void>;
  onPurchase?: (productId: string) => Promise<void>;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  isLoggedIn?: boolean;
  playerName?: string | null;
}

export function SettingsRow({
  config,
  onRestore,
  onPurchase,
  onSignIn,
  onSignOut,
  isLoggedIn,
  playerName,
}: SettingsRowProps) {
  switch (config.type) {
    case 'toggle':
      return <ToggleRow config={config} />;
    case 'themeSelector':
      return <ThemeSelectorRow config={config} />;
    case 'placeholder':
      return <PlaceholderRow config={config} />;
    case 'info':
      return <InfoRow config={config} />;
    case 'restore':
      return <RestoreRow config={config} onRestore={onRestore} />;
    case 'purchase':
      return <PurchaseRow config={config} onPurchase={onPurchase} />;
    case 'signInButton':
      return (
        <SignInButtonRow
          config={config}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          isLoggedIn={isLoggedIn}
          playerName={playerName}
        />
      );
    default:
      return null;
  }
}

function ToggleRow({ config }: { config: SettingsRowConfig & { type: 'toggle' } }) {
  const colors = useColors();
  const value = useSettingsStore((s) => s[config.storeKey]);
  const toggleAction = useSettingsStore((s) => {
    switch (config.storeKey) {
      case 'hardModeEnabled': return s.toggleHardMode;
      case 'soundEnabled': return s.toggleSound;
      case 'hapticEnabled': return s.toggleHaptic;
      case 'colorBlindMode': return s.toggleColorBlindMode;
      case 'reduceMotion': return s.toggleReduceMotion;
      default: return () => {};
    }
  });

  // Side effects for toggles that need to apply changes outside the store
  useEffect(() => {
    if (config.storeKey === 'soundEnabled') {
      setSoundEnabled(!!value);
    }
  }, [value, config.storeKey]);

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
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{config.label}</Text>
      <Text style={styles.comingSoon}>{config.description}</Text>
    </View>
  );
}

function InfoRow({ config }: { config: SettingsRowConfig & { type: 'info' } }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{config.label}</Text>
      <Text style={styles.value}>{config.value}</Text>
    </View>
  );
}

function RestoreRow({ config, onRestore }: { config: SettingsRowConfig & { type: 'restore' }; onRestore?: () => Promise<void> }) {
  const colors = useColors();
  const styles = useStyles(colors);
  return (
    <TouchableOpacity style={styles.row} onPress={onRestore} activeOpacity={0.7}>
      <Text style={styles.label}>{config.label}</Text>
    </TouchableOpacity>
  );
}

function PurchaseRow({ config, onPurchase }: { config: SettingsRowConfig & { type: 'purchase' }; onPurchase?: (productId: string) => Promise<void> }) {
  const colors = useColors();
  const styles = useStyles(colors);
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

function SignInButtonRow({
  config: _config,
  onSignIn,
  onSignOut,
  isLoggedIn,
  playerName,
}: {
  config: SettingsRowConfig & { type: 'signInButton' };
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  isLoggedIn?: boolean;
  playerName?: string | null;
}) {
  const colors = useColors();
  const styles = useStyles(colors);
  if (isLoggedIn) {
    // Signed in: show player name + sign out button
    return (
      <View style={styles.row}>
        <View style={styles.signInInfo}>
          <MaterialIcons name="person" size={20} color={colors.accent} />
          <Text style={styles.playerNameLabel}>{playerName ?? 'Player'}</Text>
        </View>
        <TouchableOpacity onPress={onSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Not signed in: show sign-in button
  return (
    <TouchableOpacity style={styles.row} onPress={onSignIn} activeOpacity={0.7}>
      <View style={styles.signInInfo}>
        <MaterialIcons name="login" size={20} color={colors.accent} />
        <Text style={styles.signInLabel}>Sign in with Google</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function ThemeSelectorRow({ config: _config }: { config: SettingsRowConfig & { type: 'themeSelector' } }) {
  const colors = useColors();
  const styles = useStyles(colors);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Theme</Text>
      <View style={styles.segmentedControl}>
        {(['light', 'dark', 'system'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.segment,
              themeMode === mode && styles.segmentActive,
            ]}
            onPress={() => setThemeMode(mode)}
            accessibilityRole="radio"
            accessibilityState={{ selected: themeMode === mode }}
            accessibilityLabel={mode === 'light' ? 'Light theme' : mode === 'dark' ? 'Dark theme' : 'System theme'}
          >
            <Text
              style={[
                styles.segmentText,
                themeMode === mode && styles.segmentTextActive,
              ]}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Shared color-aware styles, rebuilt whenever theme changes.
function useStyles(colors: ReturnType<typeof useColors>) {
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 8,
        },
        label: {
          ...typography.settingsRow,
          color: colors.textPrimary,
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
        signInInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        signInLabel: {
          ...typography.settingsRow,
          color: colors.accent,
          fontWeight: '500',
        },
        playerNameLabel: {
          ...typography.settingsRow,
          color: colors.textPrimary,
          flex: 1,
        },
        signOutText: {
          ...typography.settingsRow,
          color: colors.danger,
          fontWeight: '500',
        },
        segmentedControl: {
          flexDirection: 'row',
          backgroundColor: colors.tileEmpty,
          borderRadius: 8,
          padding: 2,
          marginLeft: 12,
        },
        segment: {
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 6,
          alignItems: 'center',
        },
        segmentActive: {
          backgroundColor: colors.surface,
        },
        segmentText: {
          fontSize: 13,
          fontWeight: '500',
          color: colors.textSecondary,
        },
        segmentTextActive: {
          color: colors.textPrimary,
          fontWeight: '600',
        },
      }),
    [colors],
  );
}

// Backwards-compatible alias for the original module-level styles export
// (used by ToggleRow above which reads styles.row/styles.label directly).
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
});
