import React, { useRef, useMemo } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';

/**
 * Gradient presets for each game mode.
 * Each is a 2-stop gradient (start → end) for a subtle, not garish look.
 */
const GRADIENTS = {
  daily: ['#42A5F5', '#29B6F6'],      // sky blue
  endless: ['#66BB6A', '#4CAF50'],     // bright green
  random: ['#FFA726', '#FF9800'],      // orange
} as const;

/** Matches title text on the gradient card. */
const TITLE_COLOR = '#FFFFFF';

type ModeGradient = keyof typeof GRADIENTS;
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

interface ModeCardProps {
  /** Mode identifier — determines gradient color. */
  mode: ModeGradient;
  /** MaterialIcons name (same icons as LengthPickerModal). */
  icon: MaterialIconName;
  /** Mode title (e.g. "Daily Challenge"). */
  title: string;
  /** Subtitle or status text (e.g. "6 puzzles today"). */
  subtitle: string;
  /** Optional progress bar fraction (0-1). Shows progress bar when provided. */
  progress?: number;
  /** Optional progress label (e.g. "3/6 complete"). */
  progressLabel?: string;
  /** Press handler. */
  onPress: () => void;
  /** If true, the card is visually disabled. */
  disabled?: boolean;
}

/**
 * Mode Card — a large tappable card with gradient background, icon,
 * title, subtitle, and optional progress bar. Replaces flat buttons
 * on the home screen.
 *
 * Uses spring press animation (scale 0.98) and soft shadow.
 * Minimum height: 80px for large touch targets.
 */
export function ModeCard({
  mode,
  icon,
  title,
  subtitle,
  progress,
  progressLabel,
  onPress,
  disabled = false,
}: ModeCardProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const gradient = GRADIENTS[mode];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          borderRadius: 20,
          shadowColor: gradient[0],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        },
        disabled: {
          shadowOpacity: 0.1,
          elevation: 2,
        },
        gradient: {
          borderRadius: 20,
          paddingHorizontal: 20,
          paddingVertical: 18,
          minHeight: 80,
          justifyContent: 'center',
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        },
        icon: {
          width: 36,
          height: 36,
          justifyContent: 'center',
          alignItems: 'center',
        },
        titleText: {
          ...typography.cardTitle,
          color: TITLE_COLOR,
          flex: 1,
        },
        subtitleText: {
          ...typography.small,
          color: 'rgba(255,255,255,0.85)',
          marginTop: 2,
        },
        progressSection: {
          marginTop: 10,
        },
        progressBarBg: {
          height: 6,
          borderRadius: 3,
          backgroundColor: 'rgba(255,255,255,0.3)',
          overflow: 'hidden',
        },
        progressBarFill: {
          height: 6,
          borderRadius: 3,
          backgroundColor: '#FFFFFF',
        },
        progressLabel: {
          ...typography.small,
          color: 'rgba(255,255,255,0.8)',
          marginTop: 4,
        },
      }),
    [gradient],
  );

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.outer,
        disabled && styles.disabled,
        { transform: [{ scale }], opacity: disabled ? 0.6 : 1 },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        activeOpacity={1}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${subtitle}`}
        accessibilityState={{ disabled }}
      >
        <LinearGradient
          colors={[gradient[0], gradient[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <Text style={styles.titleText}>{title}</Text>
            <View style={styles.icon}>
              <MaterialIcons name={icon} size={28} color={TITLE_COLOR} />
            </View>
          </View>
          <Text style={styles.subtitleText}>{subtitle}</Text>

          {progress !== undefined && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
              {progressLabel && (
                <Text style={styles.progressLabel}>{progressLabel}</Text>
              )}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}
