import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';

interface ProgressRingProps {
  /** Progress fraction (0–1). */
  progress: number;
  /** Ring diameter in px. */
  size?: number;
  /** Ring stroke width. */
  strokeWidth?: number;
  /** Color override — defaults to theme success color. */
  color?: string;
  /** Optional label below the ring. */
  label?: string;
  /** If true, shows percentage text inside the ring. */
  showPercent?: boolean;
}

/**
 * Circular progress ring — SVG-based, used for win rate on Stats screen.
 * Shows a filled arc proportional to `progress` with an optional
 * percentage label inside and a text label below.
 */
export function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  color,
  label,
  showPercent = true,
}: ProgressRingProps) {
  const theme = useTheme();
  const ringColor = color ?? theme.colors.status.success;

  const { radius, circumference, strokeDashoffset } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, progress));
    const offset = c * (1 - clamped);
    return { radius: r, circumference: c, strokeDashoffset: offset };
  }, [size, strokeWidth, progress]);

  const center = size / 2;
  const percent = Math.round(progress * 100);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignItems: 'center',
        },
        svgContainer: {
          alignItems: 'center',
          justifyContent: 'center',
        },
        percentText: {
          ...typography.statValue,
          fontSize: Math.round(size * 0.28),
          color: theme.colors.text.primary,
          position: 'absolute',
        },
        label: {
          ...typography.small,
          color: theme.colors.text.secondary,
          marginTop: 6,
          textAlign: 'center',
        },
      }),
    [theme, size],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.svgContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={theme.colors.tile.empty}
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        {showPercent && (
          <Text style={styles.percentText}>{percent}%</Text>
        )}
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}
