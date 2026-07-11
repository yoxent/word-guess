import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { GameMode } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import { layout } from '../../constants/layout';

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
      return 'Endless — Pick a length';
    default:
      return 'Choose word length';
  }
}

function getIcon(mode: GameMode): string {
  switch (mode) {
    case 'daily':
      return 'wb-sunny';
    case 'endless':
      return 'all-inclusive';
    default:
      return 'casino';
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
          backgroundColor: 'rgba(13, 27, 42, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        card: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.modalBorderRadius,
          padding: 24,
          alignItems: 'center',
          maxWidth: 360,
          width: '85%',
          // Soft shadow with brand color
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 8,
        },
        iconContainer: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.colors.surface.muted,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 12,
        },
        title: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 4,
          textAlign: 'center',
        },
        subtitle: {
          ...typography.body,
          color: theme.colors.text.secondary,
          marginBottom: 8,
        },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 10,
          marginTop: 16,
          marginBottom: 8,
        },
        lengthButton: {
          width: 100,
          height: 80,
          borderRadius: 16, // more rounded
          backgroundColor: theme.colors.surface.muted,
          borderWidth: 2,
          borderColor: theme.colors.tile.border,
          justifyContent: 'center',
          alignItems: 'center',
          // Soft shadow
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 1,
        },
        lengthButtonCompleted: {
          borderColor: `${theme.colors.status.success}60`, // green at 40% opacity
        },
        lengthButtonContent: {
          alignItems: 'center',
          position: 'relative',
        },
        lengthNumber: {
          ...typography.statValue,
          color: theme.colors.text.primary,
          fontSize: 28,
        },
        lengthNumberCompleted: {
          color: theme.colors.status.success,
          opacity: 0.6,
        },
        lengthSubtitle: {
          ...typography.small,
          color: theme.colors.text.secondary,
          marginTop: 2,
        },
        lengthSubtitleCompleted: {
          color: theme.colors.status.success,
          opacity: 0.6,
        },
        checkmarkContainer: {
          position: 'absolute',
          top: -4,
          right: -16,
        },
      }),
    [theme],
  );

  const isDaily = mode === 'daily';

  // ── Scale+fade open animation (Phase 7D) ──
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      cardScale.setValue(0.9);
      cardOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(cardScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 50,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, cardScale, cardOpacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View
          style={[styles.card, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Mode icon */}
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={getIcon(mode) as any}
              size={28}
              color={theme.colors.brand.primary}
            />
          </View>

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
                      letters
                    </Text>
                    {isCompleted && (
                      <View style={styles.checkmarkContainer}>
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={theme.colors.status.success}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
