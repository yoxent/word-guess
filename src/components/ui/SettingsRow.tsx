import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  LayoutChangeEvent,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import type { SettingsRowConfig } from '../../config/ui';
import { useSettingsStore, snapVolume } from '../../stores/settingsStore';
import { setBgmVolume, setSfxVolume } from '../../services';
import { getSignInButtonLabel } from '../../services/authService';
import { HelpTooltip } from './HelpTooltip';

interface SettingsRowProps {
  config: SettingsRowConfig;
  onRestore?: () => Promise<void>;
  onPurchase?: (productId: string) => Promise<void>;
  isPurchasing?: boolean;
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  isLoggedIn?: boolean;
  playerName?: string | null;
  playerPhoto?: string | null;
  isAuthPending?: boolean;
}

export function SettingsRow({
  config,
  onRestore,
  onPurchase,
  isPurchasing,
  onSignIn,
  onSignOut,
  isLoggedIn,
  playerName,
  playerPhoto,
  isAuthPending,
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
      return <PurchaseRow config={config} onPurchase={onPurchase} isPurchasing={isPurchasing} />;
    case 'signInButton':
      return (
        <SignInButtonRow
          config={config}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          isLoggedIn={isLoggedIn}
          playerName={playerName}
          playerPhoto={playerPhoto}
          isAuthPending={isAuthPending}
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
      <View style={styles.labelRow}>
        <Text style={styles.labelInline}>{config.label}</Text>
        {config.helpText ? (
          <HelpTooltip label={config.label} helpText={config.helpText} />
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
      style={styles.row}
      onPress={onRestore}
      activeOpacity={0.7}
    >
      <Text style={styles.label} numberOfLines={1}>
        {config.label}
      </Text>
      <View style={styles.chevron}>
        <MaterialIcons name="chevron-right" size={22} color={theme.colors.icon.muted} />
      </View>
    </TouchableOpacity>
  );
}

function PurchaseRow({
  config,
  onPurchase,
  isPurchasing,
}: {
  config: SettingsRowConfig & { type: 'purchase' };
  onPurchase?: (productId: string) => Promise<void>;
  isPurchasing?: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles(theme);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        if (isPurchasing) return;
        onPurchase?.(config.productId);
      }}
      activeOpacity={0.7}
      disabled={isPurchasing}
      accessibilityState={{ disabled: !!isPurchasing, busy: !!isPurchasing }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={[styles.labelInline, { color: theme.colors.brand.primary }]}>
          {config.label}
        </Text>
        {config.description && <Text style={styles.purchaseDescription}>{config.description}</Text>}
      </View>
      <View style={styles.buyBadge}>
        {isPurchasing ? (
          <ActivityIndicator size="small" color={theme.colors.brand.primary} />
        ) : (
          <Text style={styles.buyBadgeText}>Buy</Text>
        )}
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
  playerPhoto,
  isAuthPending,
}: {
  config: SettingsRowConfig & { type: 'signInButton' };
  onSignIn?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  isLoggedIn?: boolean;
  playerName?: string | null;
  playerPhoto?: string | null;
  isAuthPending?: boolean;
}) {
  const theme = useTheme();
  const styles = useStyles(theme);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [playerPhoto]);

  const showPhoto =
    typeof playerPhoto === 'string' &&
    playerPhoto.length > 0 &&
    !photoFailed;

  if (isLoggedIn) {
    return (
      <View style={styles.row}>
        <View style={styles.signInInfo}>
          <View style={styles.avatarCircle}>
            {showPhoto ? (
              <Image
                source={{ uri: playerPhoto }}
                style={styles.avatarImage}
                onError={() => setPhotoFailed(true)}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <MaterialIcons
                name="person"
                size={18}
                color={theme.colors.icon.inverse}
              />
            )}
          </View>
          <Text style={styles.playerNameLabel} numberOfLines={1} ellipsizeMode="tail">
            {playerName ?? 'Player'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={onSignOut}
          activeOpacity={0.7}
          disabled={isAuthPending}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isAuthPending ? (
            <ActivityIndicator size="small" color={theme.colors.text.secondary} />
          ) : (
            <Text style={styles.signOutText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onSignIn}
      activeOpacity={0.7}
      disabled={isAuthPending}
    >
      <View style={styles.signInInfo}>
        {isAuthPending ? (
          <ActivityIndicator size="small" color={theme.colors.brand.primary} />
        ) : (
          <MaterialIcons name="login" size={20} color={theme.colors.brand.primary} />
        )}
        <Text style={styles.signInLabel}>
          {isAuthPending ? 'Signing in…' : getSignInButtonLabel()}
        </Text>
      </View>
      {!isAuthPending && (
        <View style={styles.chevron}>
          <MaterialIcons name="chevron-right" size={22} color={theme.colors.icon.muted} />
        </View>
      )}
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
      <View style={styles.sliderInset}>
        <VolumeSlider
          value={value}
          onChange={(v) => handleChangeRef.current(v)}
          accessibilityLabel={config.label}
        />
      </View>
    </View>
  );
}

const THUMB_SIZE = 26; // visual thumb size
const THUMB_HIT_SIZE = 52; // invisible grab target around the thumb
const TRACK_HEIGHT = 8; // thicker track
const TOUCH_HEIGHT = Math.max(56, THUMB_HIT_SIZE); // full-track vertical hit area

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
  const containerRef = useRef<View>(null);
  const widthRef = useRef(INITIAL_WIDTH_ESTIMATE);
  const trackPageXRef = useRef(0);
  const grantValueRef = useRef(value);
  const grantPageXRef = useRef(0);
  const movedRef = useRef(false);
  const draggingRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Local visual value while dragging. Driving the thumb from the store
  // `value` prop on every onChange (controlled) races the async bridge /
  // parent re-render and flickers.
  const [visual, setVisual] = useState(value);
  const visualRef = useRef(value);

  useEffect(() => {
    if (!draggingRef.current) {
      visualRef.current = value;
      setVisual(value);
    }
  }, [value]);

  const commit = (ratio: number) => {
    if (!Number.isFinite(ratio)) return;
    const snapped = snapVolume(Math.max(0, Math.min(1, ratio)));
    if (snapped === visualRef.current) return;
    visualRef.current = snapped;
    setVisual(snapped);
    onChangeRef.current(snapped);
  };

  const endDrag = () => {
    draggingRef.current = false;
    movedRef.current = false;
  };

  const measureTrack = () => {
    containerRef.current?.measureInWindow((x, _y, width) => {
      if (Number.isFinite(x)) trackPageXRef.current = x;
      if (width > 0 && Number.isFinite(width)) widthRef.current = width;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Keep the gesture — parent ScrollView steal → terminate → re-grant
      // can flash the thumb when locationX is misread.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        draggingRef.current = true;
        movedRef.current = false;
        // Never seek on grant. locationX is relative to the *touched child*
        // (often the thumb), so locationX/trackWidth ≈ 0 and the thumb
        // jumps to 0% just from holding it. Drag from the current value;
        // tap-to-seek happens on release via pageX.
        grantValueRef.current = visualRef.current;
        grantPageXRef.current = e.nativeEvent.pageX;
        measureTrack();
      },
      onPanResponderMove: (_e, gestureState) => {
        const w = widthRef.current;
        if (w <= 0) return;
        if (Math.abs(gestureState.dx) > 2) movedRef.current = true;
        commit(grantValueRef.current + gestureState.dx / w);
      },
      onPanResponderRelease: (_e, gestureState) => {
        const w = widthRef.current;
        // Tap on track (no drag): seek using pageX, which is window-stable
        // and not relative to the thumb child.
        if (!movedRef.current && Math.abs(gestureState.dx) < 2 && w > 0) {
          commit((grantPageXRef.current - trackPageXRef.current) / w);
        }
        endDrag();
      },
      onPanResponderTerminate: endDrag,
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Number.isFinite(w)) {
      widthRef.current = w;
    }
    measureTrack();
  };

  const fillPercent = `${visual * 100}%`;
  const thumbPercent = `${visual * 100}%`;

  return (
    <View
      ref={containerRef}
      style={styles.sliderTouchArea}
      onLayout={onLayout}
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(visual * 100) }}
    >
      <View style={styles.sliderTrack} pointerEvents="none">
        <View style={[styles.sliderFill, { width: fillPercent as `${number}%` }]} />
      </View>
      <View
        style={[
          styles.thumbHitArea,
          {
            left: thumbPercent as `${number}%`,
            transform: [{ translateX: -THUMB_HIT_SIZE / 2 }],
          },
        ]}
      >
        <View pointerEvents="none" style={styles.sliderThumb} />
      </View>
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
          minHeight: 48,
          paddingVertical: 12,
        },
        label: {
          ...typography.settingsRow,
          color: c.text.primary,
          flexShrink: 1,
          minWidth: 0,
          marginRight: 12,
          includeFontPadding: false,
        },
        labelInline: {
          ...typography.settingsRow,
          color: c.text.primary,
          includeFontPadding: false,
        },
        labelRow: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          marginRight: 12,
        },
        chevron: {
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
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
          flex: 1,
          flexShrink: 1,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginRight: 12,
        },
        avatarCircle: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: c.brand.primary,
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        },
        avatarImage: {
          width: 32,
          height: 32,
          borderRadius: 16,
        },
        signInLabel: {
          ...typography.settingsRow,
          color: c.brand.primary,
          fontWeight: '500',
          includeFontPadding: false,
        },
        playerNameLabel: {
          ...typography.settingsRow,
          color: c.text.primary,
          flexShrink: 1,
          minWidth: 0,
          includeFontPadding: false,
        },
        signOutButton: {
          flexShrink: 0,
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
          paddingVertical: 12,
        },
        volumeHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 24,
        },
        volumeDescription: {
          ...typography.small,
          color: c.text.secondary,
          marginTop: 2,
          includeFontPadding: false,
        },
        sliderSpacer: {
          height: 12,
        },
        sliderInset: {
          // Room for the thumb at 0% / 100% — keep ≥ THUMB_SIZE/2 so it doesn't clip.
          paddingHorizontal: Math.ceil(THUMB_SIZE / 2) + 4,
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
        thumbHitArea: {
          position: 'absolute',
          width: THUMB_HIT_SIZE,
          height: THUMB_HIT_SIZE,
          top: (TOUCH_HEIGHT - THUMB_HIT_SIZE) / 2,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sliderThumb: {
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: THUMB_SIZE / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: 2,
          borderColor: c.brand.primary,
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
