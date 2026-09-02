import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Modal,
  Pressable,
  TouchableOpacity,
  Animated,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography, noFontScaling } from '../../constants/typography';
import { layout } from '../../constants/layout';
import { AppText } from './AppText';

interface HowToPlayModalProps {
  visible: boolean;
  onClose: () => void;
  onPlayTutorial?: () => void;
}

export function HowToPlayModal({ visible, onClose, onPlayTutorial }: HowToPlayModalProps) {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: 'rgba(13, 27, 42, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 24,
          paddingHorizontal: 16,
        },
        backdrop: {
          ...StyleSheet.absoluteFillObject,
        },
        card: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.modalBorderRadius,
          width: '100%',
          maxWidth: 360,
          maxHeight: '100%',
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 8,
        },
        scroll: {
          flexGrow: 0,
        },
        scrollContent: {
          padding: 24,
          alignItems: 'center',
        },
        title: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 20,
          textAlign: 'center',
        },
        examplesRow: {
          flexDirection: 'row',
          width: '100%',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 20,
        },
        exampleItem: {
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
        },
        exampleTile: {
          width: 52,
          height: 52,
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 8,
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
          marginBottom: 16,
        },
        hardModeCard: {
          width: '100%',
          backgroundColor: theme.colors.mode === 'dark' ? '#2A1F12' : '#FFF3E0',
          borderRadius: 14,
          borderWidth: 2,
          borderColor: theme.colors.brand.secondary,
          paddingVertical: 12,
          paddingHorizontal: 14,
          marginBottom: 20,
        },
        hardModeTitleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 6,
        },
        hardModeIcon: {
          fontSize: 16,
        },
        hardModeTitle: {
          ...typography.caption,
          fontWeight: '700',
          color: theme.colors.brand.secondary,
          textAlign: 'center',
        },
        hardModeText: {
          ...typography.small,
          color: theme.colors.brand.secondary,
          textAlign: 'center',
        },
        gotItButton: {
          backgroundColor: theme.colors.brand.primary,
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 48,
          width: '100%',
          alignItems: 'center',
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
        tutorialButton: {
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 48,
          width: '100%',
          alignItems: 'center',
          marginBottom: 10,
          borderWidth: 2,
          borderColor: theme.colors.brand.primary,
        },
        tutorialButtonText: {
          ...typography.button,
          color: theme.colors.brand.primary,
        },
      }),
    [theme],
  );

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
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessible
          accessibilityLabel="How to Play"
        />
        <Animated.View
          style={[styles.card, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            <AppText style={styles.title}>How to Play</AppText>

            <View style={styles.examplesRow}>
              <View style={styles.exampleItem}>
                <View style={[styles.exampleTile, { backgroundColor: theme.colors.tile.correct }]}>
                  <AppText {...noFontScaling} style={styles.exampleTileText}>A</AppText>
                </View>
                <AppText {...noFontScaling} style={styles.exampleLabel}>
                  Right letter,{'\n'}right spot
                </AppText>
              </View>
              <View style={styles.exampleItem}>
                <View style={[styles.exampleTile, { backgroundColor: theme.colors.tile.present }]}>
                  <AppText
                    {...noFontScaling}
                    style={[styles.exampleTileText, styles.exampleTileTextDark]}
                  >
                    B
                  </AppText>
                </View>
                <AppText {...noFontScaling} style={styles.exampleLabel}>
                  Right letter,{'\n'}wrong spot
                </AppText>
              </View>
              <View style={styles.exampleItem}>
                <View style={[styles.exampleTile, { backgroundColor: theme.colors.tile.absent }]}>
                  <AppText {...noFontScaling} style={styles.exampleTileText}>C</AppText>
                </View>
                <AppText {...noFontScaling} style={styles.exampleLabel}>
                  Letter not{'\n'}in word
                </AppText>
              </View>
            </View>

            <AppText style={styles.rulesText}>
              Guess the word before you run out of tries. Each guess must be a valid word.
            </AppText>

            <View
              style={styles.hardModeCard}
              accessible
              accessibilityLabel="Hard Mode rules"
            >
              <View style={styles.hardModeTitleRow}>
                <AppText {...noFontScaling} style={styles.hardModeIcon}>🔥</AppText>
                <AppText {...noFontScaling} style={styles.hardModeTitle}>Hard Mode</AppText>
              </View>
              <AppText style={styles.hardModeText}>
                Turn it on from the Home screen. Every new guess must keep green letters in the same spots and include all revealed yellow letters somewhere in the word.
              </AppText>
            </View>

            {onPlayTutorial ? (
              <TouchableOpacity
                style={styles.tutorialButton}
                onPress={onPlayTutorial}
                activeOpacity={0.8}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Play Tutorial"
              >
                <AppText style={styles.tutorialButtonText} numberOfLines={1}>
                  Play Tutorial
                </AppText>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.gotItButton}
              onPress={onClose}
              activeOpacity={0.8}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Got it"
            >
              <AppText style={styles.gotItText} numberOfLines={1}>Got it!</AppText>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
