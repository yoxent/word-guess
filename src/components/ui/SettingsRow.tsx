import React, { useEffect, useMemo } from 'react';
import { setSoundEnabled } from '../../services';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
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
  const theme = useTheme();
  const styles = useStyles(theme);
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
        trackColor={{ false: theme.colors.toggle.trackInactive, true: theme.colors.toggle.trackActive }}
        thumbColor={theme.colors.toggle.thumb}
      />
    </View>
  );
}

function PlaceholderRow({ config }: { config: SettingsRowConfig & { type: 'placeholder' } }) {
  const theme = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{config.label}</Text>
      <Text style={styles.comingSoon}>{config.description}</Text>
    </View>
  );
}

function InfoRow({ config }: { config: SettingsRowConfig & { type: 'info' } }) {
  const theme = useTheme();
  const styles = useStyles(theme);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{config.label}</Text>
      <Text style={styles.value}>{config.value}</Text>
    </View>
  );
}

function RestoreRow({ config, onRestore }: { config: SettingsRowConfig & { type: 'restore' }; onRestore?: () => Promise<void> }) {
  const theme = useTheme();
  const styles = useStyles(theme);
  return (
    <TouchableOpacity style={styles.row} onPress={onRestore} activeOpacity={0.7}>
      <Text style={styles.label}>{config.label}</Text>
    </TouchableOpacity>
  );
}

function PurchaseRow({ config, onPurchase }: { config: SettingsRowConfig & { type: 'purchase' }; onPurchase?: (productId: string) => Promise<void> }) {
  const theme = useTheme();
  const styles = useStyles(theme);
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
  const theme = useTheme();
  const styles = useStyles(theme);
  if (isLoggedIn) {
    // Signed in: show player name + sign out button
    return (
      <View style={styles.row}>
        <View style={styles.signInInfo}>
          <MaterialIcons name="person" size={20} color={theme.colors.icon.accent} />
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
        <MaterialIcons name="login" size={20} color={theme.colors.icon.accent} />
        <Text style={styles.signInLabel}>Sign in with Google</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={theme.colors.icon.muted} />
    </TouchableOpacity>
  );
}

function ThemeSelectorRow({ config: _config }: { config: SettingsRowConfig & { type: 'themeSelector' } }) {
  const theme = useTheme();
  const styles = useStyles(theme);
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
function useStyles(theme: ReturnType<typeof useTheme>) {
  const c = theme.colors;
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
          color: c.text.primary,
          flex: 1,
        },
        comingSoon: {
          ...typography.statLabel,
          color: c.text.secondary,
        },
        value: {
          ...typography.body,
          color: c.text.secondary,
        },
        purchaseDescription: {
          ...typography.body,
          color: c.text.secondary,
          marginTop: 2,
        },
        purchasePrice: {
          ...typography.settingsRow,
          color: c.status.accent,
          fontWeight: '600',
        },
        signInInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        signInLabel: {
          ...typography.settingsRow,
          color: c.status.accent,
          fontWeight: '500',
        },
        playerNameLabel: {
          ...typography.settingsRow,
          color: c.text.primary,
          flex: 1,
        },
        signOutText: {
          ...typography.settingsRow,
          color: c.status.danger,
          fontWeight: '500',
        },
        segmentedControl: {
          flexDirection: 'row',
          backgroundColor: c.tile.empty,
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
          backgroundColor: c.surface.card,
          // Subtle border in dark theme so the active segment is visually distinct
          // from the surrounding surface (which has the same color as the card behind it).
          borderWidth: 0.5,
          borderColor: c.tile.border,
        },
        segmentText: {
          // Use textPrimary (not textSecondary) for the inactive label so it stays
          // readable on the tileEmpty track. textSecondary was 1.4:1 on tileEmpty
          // in light theme (fails WCAG AA).
          fontSize: 13,
          fontWeight: '500',
          color: c.text.primary,
          opacity: 0.65,
        },
        segmentTextActive: {
          color: c.text.primary,
          fontWeight: '600',
          opacity: 1,
        },
      }),
    [theme],
  );
}
