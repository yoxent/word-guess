import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';

const ALL_LENGTHS = [5, 6, 7, 8, 9, 10];

interface DailyPreviewProps {
  /** Array of word lengths already completed today (e.g. [5, 6, 7]). */
  completedLengths: number[];
}

/**
 * Daily Preview — shows today's progress across all 6 word lengths (5–10).
 * Each length is a pill badge: green checkmark for completed, outline for
 * incomplete. Shown below mode cards on the home screen. Pills stay on one
 * row (including "10") via nowrap + equal flex shrink.
 */
export function DailyPreview({ completedLengths }: DailyPreviewProps) {
  const theme = useTheme();
  const completedSet = useMemo(
    () => new Set(completedLengths),
    [completedLengths],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: '100%',
          marginTop: 28,
        },
        label: {
          ...typography.small,
          color: theme.colors.text.secondary,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 10,
          textAlign: 'center',
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'nowrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 6,
          width: '100%',
        },
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: 20,
          minHeight: 34,
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 0,
          minWidth: 0,
        },
        pillCompleted: {
          backgroundColor: theme.colors.status.success,
        },
        pillIncomplete: {
          backgroundColor: theme.colors.surface.card,
          borderWidth: 1.5,
          borderColor: theme.colors.text.secondary + '60',
        },
        pillText: {
          ...typography.small,
          fontWeight: '600',
        },
        pillTextCompleted: {
          color: '#FFFFFF',
        },
        pillTextIncomplete: {
          color: theme.colors.text.secondary,
        },
        checkIcon: {
          marginLeft: 2,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Today's Challenge</Text>
      <View style={styles.grid}>
        {ALL_LENGTHS.map((length) => {
          const done = completedSet.has(length);
          return (
            <View
              key={length}
              style={[styles.pill, done ? styles.pillCompleted : styles.pillIncomplete]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${length} letters${done ? ', completed' : ', not started'}`}
            >
              <Text
                style={[
                  styles.pillText,
                  done ? styles.pillTextCompleted : styles.pillTextIncomplete,
                ]}
              >
                {length}
              </Text>
              {done && (
                <MaterialIcons
                  name="check"
                  size={14}
                  color="#FFFFFF"
                  style={styles.checkIcon}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
