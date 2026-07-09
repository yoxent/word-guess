import React, { useMemo } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import type { SettingsRowConfig } from '../../config/ui';
import { VOLUME_OPTIONS } from '../../config/ui';
import { useSettingsStore, type VolumeLevel } from '../../stores/settingsStore';
import { setBgmVolume, setSfxVolume } from '../../services';

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
    case 'volumeSelector':
      return <VolumeSelectorRow config={config} />;
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
      case 'hapticEnabled': return s.toggleHaptic;
      case 'colorBlindMode': return s.toggleColorBlindMode;
      case 'reduceMotion': return s.toggleReduceMotion;
      default: return () => {};
    }
  });

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

/**
 * 3-position volume slider for BGM and SFX. Each option corresponds to a
 * discrete numeric value (0 / 0.75 / 1). Changing the value calls the
 * appropriate sound service function (setBgmVolume / setSfxVolume) so the
 * audio players update immediately.
 */
function VolumeSelectorRow({
  config,
}: {
  config: SettingsRowConfig & { type: 'volumeSelector' };
}) {
  const theme = useTheme();
  const styles = useStyles(theme);
  const value = useSettingsStore((s) => s[config.storeKey]);
  const setBgm = useSettingsStore((s) => s.setBgmVolume);
  const setSfx = useSettingsStore((s) => s.setSfxVolume);

  const handleSelect = (v: VolumeLevel) => {
    if (config.storeKey === 'bgmVolume') {
      setBgm(v);
      setBgmVolume(v);
    } else {
      setSfx(v);
      setSfxVolume(v);
    }
  };

  return (
    <View style={styles.volumeRow}>
      <View style={styles.volumeHeader}>
        <Text style={styles.label}>{config.label}</Text>
        {config.description && (
          <Text style={styles.volumeDescription}>{config.description}</Text>
        )}
      </View>
      <View style={styles.segmentedControlFullWidth}>
        {VOLUME_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segment,
              styles.segmentFlex,
              value === opt.value && styles.segmentActive,
            ]}
            onPress={() => handleSelect(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === opt.value }}
            accessibilityLabel={`${config.label} ${opt.label}`}
          >
            <Text
              style={[
                styles.segmentText,
                value === opt.value && styles.segmentTextActive,
              ]}
            >
              {opt.label}
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
        segmentFlex: { flex: 1 },
        segmentedControlFullWidth: {
          flexDirection: 'row',
          backgroundColor: c.tile.empty,
          borderRadius: 8,
          padding: 2,
        },
        segmentActive: {
          backgroundColor: c.surface.card,
          borderWidth: 0.5,
          borderColor: c.tile.border,
        },
        segmentText: {
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
        // Volume row gets a stacked layout (label on top, slider below) since
        // the segmented control is wider than the label.
        volumeRow: {
          paddingVertical: 8,
        },
        volumeHeader: {
          marginBottom: 8,
        },
        volumeDescription: {
          ...typography.statLabel,
          color: c.text.secondary,
          marginTop: 2,
        },
      }),
    [theme],
  );
}
