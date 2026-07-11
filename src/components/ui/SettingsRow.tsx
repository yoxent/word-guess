import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import type { SettingsRowConfig } from '../../config/ui';
import { useSettingsStore, snapVolume } from '../../stores/settingsStore';
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
    case 'volumeSlider':
      return <VolumeSliderRow config={config} />;
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

function SettingsHelpButton({ label, helpText }: { label: string; helpText: string }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={() => Alert.alert(label, helpText)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`About ${label}`}
    >
      <MaterialIcons name="help-outline" size={18} color={theme.colors.icon.muted} />
    </TouchableOpacity>
  );
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
      <View style={styles.labelRow}>
        <Text style={styles.label}>{config.label}</Text>
        {config.helpText ? (
          <SettingsHelpButton label={config.label} helpText={config.helpText} />
        ) : null}
      </View>
      <Switch
        value={!!value}
        onValueChange={toggleAction}
        trackColor={{
          false: theme.colors.toggle.trackInactive,
          true: theme.colors.toggle.trackActive,
        }}
        thumbColor={theme.colors.toggle.thumb}
        ios_backgroundColor={theme.colors.toggle.trackInactive}
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
    <TouchableOpacity
      style={[styles.row, styles.pressableRow]}
      onPress={onRestore}
      activeOpacity={0.7}
    >
      <Text style={styles.label}>{config.label}</Text>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.icon.muted} />
    </TouchableOpacity>
  );
}

function PurchaseRow({ config, onPurchase }: { config: SettingsRowConfig & { type: 'purchase' }; onPurchase?: (productId: string) => Promise<void> }) {
  const theme = useTheme();
  const styles = useStyles(theme);
  return (
    <TouchableOpacity
      style={[styles.row, styles.pressableRow]}
      onPress={() => onPurchase?.(config.productId)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: theme.colors.brand.primary }]}>{config.label}</Text>
        {config.description && <Text style={styles.purchaseDescription}>{config.description}</Text>}
      </View>
      <View style={styles.buyBadge}>
        <Text style={styles.buyBadgeText}>Buy</Text>
      </View>
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
    return (
      <View style={styles.row}>
        <View style={styles.signInInfo}>
          <View style={styles.avatarCircle}>
            <MaterialIcons name="person" size={18} color={theme.colors.icon.inverse} />
          </View>
          <Text style={styles.playerNameLabel}>{playerName ?? 'Player'}</Text>
        </View>
        <TouchableOpacity onPress={onSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.row, styles.pressableRow]}
      onPress={onSignIn}
      activeOpacity={0.7}
    >
      <View style={styles.signInInfo}>
        <MaterialIcons name="login" size={20} color={theme.colors.brand.primary} />
        <Text style={styles.signInLabel}>Sign in with Google</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.icon.muted} />
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

// ── Volume Slider ──

function VolumeSliderRow({
  config,
}: {
  config: SettingsRowConfig & { type: 'volumeSlider' };
}) {
  const theme = useTheme();
  const styles = useStyles(theme);
  const value = useSettingsStore((s) => s[config.storeKey]);
  const setBgm = useSettingsStore((s) => s.setBgmVolume);
  const setSfx = useSettingsStore((s) => s.setSfxVolume);

  const handleChangeRef = useRef<(v: number) => void>(() => {});
  handleChangeRef.current = (v: number) => {
    if (config.storeKey === 'bgmVolume') {
      setBgm(v);
      setBgmVolume(v);
    } else {
      setSfx(v);
      setSfxVolume(v);
    }
  };

  const percent = Math.round(value * 100);

  return (
    <View style={styles.volumeRow}>
      <View style={styles.volumeHeader}>
        <Text style={styles.label}>
          {config.label} · {percent}%
        </Text>
      </View>
      {config.description && (
        <Text style={styles.volumeDescription}>{config.description}</Text>
      )}
      <View style={styles.sliderSpacer} />
      <VolumeSlider
        value={value}
        onChange={(v) => handleChangeRef.current(v)}
        accessibilityLabel={config.label}
      />
    </View>
  );
}

const THUMB_SIZE = 26; // slightly larger for easier grab
const TRACK_HEIGHT = 8; // thicker track
const TOUCH_HEIGHT = 44; // larger touch area

const SCREEN_WIDTH = Dimensions.get('window').width;
const INITIAL_WIDTH_ESTIMATE = SCREEN_WIDTH - 2 * 20;

function VolumeSlider({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const styles = useStyles(theme);
  const widthRef = useRef(INITIAL_WIDTH_ESTIMATE);
  const valueRef = useRef(value);
  const grantValueRef = useRef(value);
  valueRef.current = value;

  const updateFromRatio = (ratio: number) => {
    if (!Number.isFinite(ratio)) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    onChange(snapVolume(clamped));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        const w = widthRef.current;
        if (w > 0) {
          const snapped = snapVolume(e.nativeEvent.locationX / w);
          grantValueRef.current = snapped;
          onChange(snapped);
        } else {
          grantValueRef.current = valueRef.current;
        }
      },
      onPanResponderMove: (_e, gestureState) => {
        const w = widthRef.current;
        if (w <= 0) return;
        // Use dx from grant — locationX can jump to 0 mid-drag on Android.
        updateFromRatio(grantValueRef.current + gestureState.dx / w);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Number.isFinite(w)) {
      widthRef.current = w;
    }
  };

  const fillPercent = `${value * 100}%`;
  const thumbPercent = `${value * 100}%`;

  return (
    <View
      style={styles.sliderTouchArea}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
    >
      <View style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: fillPercent }]} />
      </View>
      <View
        style={[
          styles.sliderThumb,
          {
            left: thumbPercent,
            transform: [{ translateX: -THUMB_SIZE / 2 }],
          },
        ]}
      />
    </View>
  );
}

// Shared color-aware styles
function useStyles(theme: ReturnType<typeof useTheme>) {
  const c = theme.colors;
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 10,
        },
        pressableRow: {
          paddingVertical: 12,
        },
        label: {
          ...typography.settingsRow,
          color: c.text.primary,
          flex: 1,
        },
        labelRow: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginRight: 12,
        },
        comingSoon: {
          ...typography.small,
          color: c.text.secondary,
        },
        value: {
          ...typography.body,
          color: c.text.secondary,
        },
        purchaseDescription: {
          ...typography.small,
          color: c.text.secondary,
          marginTop: 2,
        },
        buyBadge: {
          backgroundColor: c.brand.primary,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 6,
        },
        buyBadgeText: {
          ...typography.small,
          color: '#FFFFFF',
          fontWeight: '700',
        },
        signInInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        avatarCircle: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: c.brand.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        signInLabel: {
          ...typography.settingsRow,
          color: c.brand.primary,
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
          backgroundColor: c.surface.muted,
          borderRadius: 12, // pill segments
          padding: 3,
          marginLeft: 12,
        },
        segment: {
          paddingVertical: 7,
          paddingHorizontal: 14,
          borderRadius: 10,
          alignItems: 'center',
        },
        segmentActive: {
          backgroundColor: c.brand.primary,
          // No border — filled pill
        },
        segmentText: {
          ...typography.small,
          color: c.text.secondary,
          fontWeight: '500',
        },
        segmentTextActive: {
          color: '#FFFFFF',
          fontWeight: '700',
        },
        volumeRow: {
          paddingVertical: 10,
        },
        volumeHeader: {
          flexDirection: 'row',
          alignItems: 'baseline',
        },
        volumeDescription: {
          ...typography.small,
          color: c.text.secondary,
          marginTop: 2,
        },
        sliderSpacer: {
          height: 12,
        },
        sliderTouchArea: {
          height: TOUCH_HEIGHT,
          justifyContent: 'center',
        },
        sliderTrack: {
          height: TRACK_HEIGHT,
          backgroundColor: c.surface.muted,
          borderRadius: TRACK_HEIGHT / 2,
          overflow: 'hidden',
        },
        sliderFill: {
          height: '100%',
          backgroundColor: c.brand.primary,
          borderRadius: TRACK_HEIGHT / 2,
        },
        sliderThumb: {
          position: 'absolute',
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: c.brand.primary,
          top: (TOUCH_HEIGHT - THUMB_SIZE) / 2,
          shadowColor: c.brand.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 4,
        },
      }),
    [theme],
  );
}
