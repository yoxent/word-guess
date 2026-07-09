import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import type { SettingsRowConfig } from '../../config/ui';
import { useSettingsStore } from '../../stores/settingsStore';
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

// ── Volume Slider (continuous, 0..1) ──

/**
 * Continuous horizontal volume slider built with PanResponder (no native
 * dep). User can tap anywhere on the track to jump, or drag the thumb.
 *
 * Value is rounded to 2 decimal places to avoid float noise in the
 * persisted store (a continuous drag could otherwise write dozens of
 * distinct floats per second).
 */
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

  // Stable callback via ref. The slider's PanResponder was created once
  // on first render; without this ref it would capture the first
  // handleChange and miss any later changes to the closure.
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
        <Text style={styles.label}>{config.label}</Text>
        <Text style={styles.volumePercent}>{percent}%</Text>
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

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;
const TOUCH_HEIGHT = 40;

// Initial width estimate so the slider renders with the correct fill
// position on the first frame. Without this, width starts at 0 and
// the fill+thumb 'pop in' once onLayout fires (visible blink on
// mount). The estimate is screen-width minus standard padding — close
// enough to the actual measured width that the brief onLayout
// adjustment is imperceptible.
const SCREEN_WIDTH = Dimensions.get('window').width;
const INITIAL_WIDTH_ESTIMATE = SCREEN_WIDTH - 2 * 20; // matches layout.screenPadding (20)

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
  // Width starts at the screen-width estimate so the first render
  // already shows the slider in its final position. onLayout refines
  // it to the actual measured width on the first layout pass.
  const [width, setWidth] = useState(INITIAL_WIDTH_ESTIMATE);
  const widthRef = useRef(INITIAL_WIDTH_ESTIMATE);

  const updateFromX = (x: number) => {
    const w = widthRef.current;
    if (w <= 0 || !Number.isFinite(w)) return;
    const ratio = x / w;
    if (!Number.isFinite(ratio)) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    onChange(Math.round(clamped * 100) / 100);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Claim the move before any parent ScrollView can. Without this,
      // the parent ScrollView sometimes wins the gesture race on
      // Android and the slider stops responding mid-drag.
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        updateFromX(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => {
        updateFromX(e.nativeEvent.locationX);
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Number.isFinite(w)) {
      widthRef.current = w;
      // Only update state if the measured width differs meaningfully
      // from the current — avoids a re-render just to set the same
      // value (which could itself cause visible jitter).
      if (Math.abs(w - width) > 0.5) {
        setWidth(w);
      }
    }
  };

  const thumbLeft = value * width - THUMB_SIZE / 2;
  const fillWidth = value * width;

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
        <View style={[styles.sliderFill, { width: fillWidth }]} />
      </View>
      <View style={[styles.sliderThumb, { left: thumbLeft }]} />
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
        // Volume row: stacked layout (header, optional description, slider)
        volumeRow: {
          paddingVertical: 8,
        },
        volumeHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        },
        volumePercent: {
          ...typography.settingsRow,
          color: c.text.secondary,
          fontVariant: ['tabular-nums'],
          marginLeft: 12,
        },
        volumeDescription: {
          ...typography.statLabel,
          color: c.text.secondary,
          marginTop: 2,
        },
        sliderSpacer: {
          height: 12,
        },
        // Touch area is taller than the visual track so the slider is
        // easy to grab. The visual track is absolutely positioned inside.
        sliderTouchArea: {
          height: TOUCH_HEIGHT,
          justifyContent: 'center',
        },
        sliderTrack: {
          height: TRACK_HEIGHT,
          backgroundColor: c.tile.empty,
          borderRadius: TRACK_HEIGHT / 2,
          overflow: 'hidden',
        },
        sliderFill: {
          height: '100%',
          backgroundColor: c.status.accent,
          borderRadius: TRACK_HEIGHT / 2,
        },
        sliderThumb: {
          position: 'absolute',
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: c.surface.card,
          borderWidth: 2,
          borderColor: c.status.accent,
          // Center vertically in the TOUCH_HEIGHT container
          top: (TOUCH_HEIGHT - THUMB_SIZE) / 2,
          // Subtle shadow for the floating thumb
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2,
          elevation: 3,
        },
      }),
    [theme],
  );
}
