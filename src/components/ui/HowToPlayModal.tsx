import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import { layout } from '../../constants/layout';

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ visible, onClose }: HowToPlayModalProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(13, 27, 42, 0.6)', // dark navy overlay, softer than pure black
          justifyContent: 'center',
          alignItems: 'center',
        },
        card: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.modalBorderRadius,
          padding: 24,
          alignItems: 'center',
          maxWidth: '85%',
          minWidth: 280,
          // Soft shadow with brand color tint
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 8,
        },
        title: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 20,
        },
        examplesRow: {
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 20,
        },
        exampleItem: {
          alignItems: 'center',
          width: 85,
        },
        exampleTile: {
          width: 52,
          height: 52,
          borderRadius: 10, // more rounded than game tiles
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
          // Soft shadow on each example tile
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        },
        exampleTileText: {
          fontSize: 24,
          fontWeight: '700',
          color: theme.colors.text.inverse,
        },
        exampleTileTextDark: {
          color: theme.colors.text.onPresent,
        },
        exampleLabel: {
          ...typography.small,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          lineHeight: 16,
        },
        rulesText: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 22,
        },
        gotItButton: {
          backgroundColor: theme.colors.brand.primary,
          borderRadius: 20, // pill shape
          paddingVertical: 14,
          paddingHorizontal: 48,
          width: '100%',
          alignItems: 'center',
          // Soft shadow
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        gotItText: {
          ...typography.button,
          color: '#FFFFFF',
        },
      }),
    [theme],
  );

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
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
        accessible
        accessibilityLabel="How to Play"
      >
        <Animated.View
          style={[styles.card, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={styles.title}>How to Play</Text>

          {/* Tile examples row */}
          <View style={styles.examplesRow}>
            {/* Correct tile */}
            <View style={styles.exampleItem}>
              <View style={[styles.exampleTile, { backgroundColor: theme.colors.tile.correct }]}>
                <Text style={styles.exampleTileText}>A</Text>
              </View>
              <Text style={styles.exampleLabel}>Right letter,{'\n'}right spot</Text>
            </View>
            {/* Present tile */}
            <View style={styles.exampleItem}>
              <View style={[styles.exampleTile, { backgroundColor: theme.colors.tile.present }]}>
                <Text style={[styles.exampleTileText, styles.exampleTileTextDark]}>B</Text>
              </View>
              <Text style={styles.exampleLabel}>Right letter,{'\n'}wrong spot</Text>
            </View>
            {/* Absent tile */}
            <View style={styles.exampleItem}>
              <View style={[styles.exampleTile, { backgroundColor: theme.colors.tile.absent }]}>
                <Text style={styles.exampleTileText}>C</Text>
              </View>
              <Text style={styles.exampleLabel}>Letter not{'\n'}in word</Text>
            </View>
          </View>

          {/* Rules text */}
          <Text style={styles.rulesText}>
            Guess the word in {6} tries. Each guess must be a valid word.
          </Text>

          {/* Got it button */}
          <TouchableOpacity
            style={styles.gotItButton}
            onPress={onClose}
            activeOpacity={0.8}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Got it"
          >
            <Text style={styles.gotItText}>Got it!</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
