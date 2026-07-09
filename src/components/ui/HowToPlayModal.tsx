import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { typography } from '../../constants/typography';

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ visible, onClose }: HowToPlayModalProps) {
  const colors = useColors();
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
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 24,
          alignItems: 'center',
          maxWidth: '85%',
          minWidth: 280,
        },
        title: {
          fontSize: 22,
          fontWeight: '700',
          color: colors.textPrimary,
          marginBottom: 20,
        },
        examplesRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 20,
        },
        exampleItem: {
          alignItems: 'center',
          width: 80,
        },
        exampleTile: {
          width: 48,
          height: 48,
          borderRadius: 6,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 6,
        },
        exampleTileText: {
          fontSize: 24,
          fontWeight: '700',
          color: colors.textInverse,
        },
        exampleTileTextDark: {
          color: '#1a1a2e',
        },
        exampleLabel: {
          fontSize: 11,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 14,
        },
        rulesText: {
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginBottom: 20,
          lineHeight: 20,
        },
        gotItButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 14,
          paddingHorizontal: 40,
          width: '100%',
          alignItems: 'center',
        },
        gotItText: {
          color: colors.textInverse,
          fontSize: 16,
          fontWeight: '600',
        },
      }),
    [colors],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessible={true}
        accessibilityLabel="How to Play"
      >
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>How to Play</Text>

          {/* Tile examples row */}
          <View style={styles.examplesRow}>
            {/* Correct tile */}
            <View style={styles.exampleItem}>
              <View style={[styles.exampleTile, { backgroundColor: colors.tileCorrect }]}>
                <Text style={styles.exampleTileText}>A</Text>
              </View>
              <Text style={styles.exampleLabel}>Correct letter, right spot</Text>
            </View>
            {/* Present tile */}
            <View style={styles.exampleItem}>
              <View style={[styles.exampleTile, { backgroundColor: colors.tilePresent }]}>
                <Text style={[styles.exampleTileText, styles.exampleTileTextDark]}>B</Text>
              </View>
              <Text style={styles.exampleLabel}>Correct letter, wrong spot</Text>
            </View>
            {/* Absent tile */}
            <View style={styles.exampleItem}>
              <View style={[styles.exampleTile, { backgroundColor: colors.tileAbsent }]}>
                <Text style={styles.exampleTileText}>C</Text>
              </View>
              <Text style={styles.exampleLabel}>Letter not in word</Text>
            </View>
          </View>

          {/* Rules text */}
          <Text style={styles.rulesText}>
            Guess the word in 6 tries. Each guess must be a valid word.
          </Text>

          {/* Got it button */}
          <TouchableOpacity
            style={styles.gotItButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Got it"
          >
            <Text style={styles.gotItText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
