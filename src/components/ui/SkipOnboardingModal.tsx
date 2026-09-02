import React, { useMemo } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import { layout } from '../../constants/layout';
import { AppText } from './AppText';

export interface SkipOnboardingModalProps {
  visible: boolean;
  onCancel: () => void;
  onSkip: () => void;
}

export function SkipOnboardingModal({
  visible,
  onCancel,
  onSkip,
}: SkipOnboardingModalProps) {
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
          maxWidth: '85%',
          minWidth: 280,
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 24,
          elevation: 8,
        },
        title: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 12,
          textAlign: 'center',
        },
        body: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 22,
        },
        keepButton: {
          backgroundColor: theme.colors.button.primary.bg,
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 14,
          paddingHorizontal: 28,
          alignSelf: 'stretch',
          alignItems: 'center',
          marginBottom: 12,
        },
        keepText: {
          ...typography.body,
          fontWeight: '700',
          color: theme.colors.button.primary.fg,
        },
        skipButton: {
          paddingVertical: 10,
          paddingHorizontal: 16,
        },
        skipText: {
          ...typography.body,
          color: theme.colors.text.secondary,
        },
      }),
    [theme],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={styles.card}
          accessible
          accessibilityRole="summary"
          accessibilityLabel="Skip tutorial?"
        >
          <AppText style={styles.title}>Skip tutorial?</AppText>
          <AppText style={styles.body}>
            You can replay it anytime from How to Play.
          </AppText>
          <TouchableOpacity
            style={styles.keepButton}
            onPress={onCancel}
            activeOpacity={0.85}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Keep going"
          >
            <AppText style={styles.keepText} numberOfLines={1}>Keep going</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Skip tutorial"
          >
            <AppText style={styles.skipText} numberOfLines={1}>Skip</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
