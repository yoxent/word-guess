import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import type { GameMode } from '../../types';
import { useTheme } from '../../hooks/useTheme';

const LENGTHS = [5, 6, 7, 8, 9, 10];

interface LengthPickerModalProps {
  visible: boolean;
  mode: GameMode;
  onSelect: (length: number) => void;
  onClose: () => void;
  completedLengths: number[];
}

function getTitle(mode: GameMode): string {
  switch (mode) {
    case 'daily':
      return 'Daily Challenge';
    case 'endless':
      return 'Endless — Choose length';
    default:
      return 'Choose word length';
  }
}

export function LengthPickerModal({
  visible,
  mode,
  onSelect,
  onClose,
  completedLengths,
}: LengthPickerModalProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        card: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: 20,
          padding: 24,
          alignItems: 'center',
          maxWidth: 340,
          width: '85%',
        },
        title: {
          fontSize: 20,
          fontWeight: '700',
          color: theme.colors.text.primary,
          marginBottom: 4,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: 14,
          color: theme.colors.text.secondary,
          marginBottom: 8,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 12,
          marginTop: 16,
          marginBottom: 20,
        },
        lengthButton: {
          width: 130,
          height: 85,
          borderRadius: 12,
          backgroundColor: theme.colors.surface.card,
          borderWidth: 1,
          borderColor: theme.colors.tile.border,
          justifyContent: 'center',
          alignItems: 'center',
        },
        lengthButtonCompleted: {
          backgroundColor: 'rgba(120,124,126,0.3)',
          borderColor: theme.colors.tile.absent,
        },
        lengthButtonContent: {
          alignItems: 'center',
          position: 'relative',
        },
        lengthNumber: {
          fontSize: 28,
          fontWeight: '700',
          color: theme.colors.text.primary,
        },
        lengthNumberCompleted: {
          // Keep high contrast on the translucent overlay — tileAbsent failed
          // WCAG AA on rgba(120,124,126,0.3) in light theme.
          color: theme.colors.text.primary,
          opacity: 0.5,
        },
        lengthSubtitle: {
          fontSize: 12,
          color: theme.colors.text.secondary,
          marginTop: 2,
        },
        lengthSubtitleCompleted: {
          color: theme.colors.text.primary,
          opacity: 0.5,
        },
        checkmarkContainer: {
          position: 'absolute',
          top: -28,
          right: -28,
        },
        checkmark: {
          fontSize: 20,
          color: theme.colors.status.success,
          fontWeight: '700',
        },
        cancelButton: {
          paddingVertical: 10,
          paddingHorizontal: 20,
        },
        cancelText: {
          fontSize: 16,
          color: theme.colors.text.secondary,
          fontWeight: '600',
        },
      }),
    [theme],
  );

  const isDaily = mode === 'daily';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{getTitle(mode)}</Text>

          {isDaily && (
            <Text style={styles.subtitle}>Complete all 6 lengths!</Text>
          )}

          <View style={styles.grid}>
            {LENGTHS.map((length) => {
              const isCompleted = completedLengths.includes(length);
              return (
                <TouchableOpacity
                  key={length}
                  style={[
                    styles.lengthButton,
                    isCompleted && styles.lengthButtonCompleted,
                  ]}
                  onPress={() => {
                    if (!isCompleted) {
                      onSelect(length);
                    }
                  }}
                  disabled={isCompleted}
                  activeOpacity={0.7}
                >
                  <View style={styles.lengthButtonContent}>
                    <Text
                      style={[
                        styles.lengthNumber,
                        isCompleted && styles.lengthNumberCompleted,
                      ]}
                    >
                      {length}
                    </Text>
                    <Text
                      style={[
                        styles.lengthSubtitle,
                        isCompleted && styles.lengthSubtitleCompleted,
                      ]}
                    >
                      {length} letters
                    </Text>
                    {isCompleted && (
                      <View style={styles.checkmarkContainer}>
                        <Text style={styles.checkmark}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
