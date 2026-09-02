import React, { useMemo } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import { layout } from '../../constants/layout';
import { AppText } from './AppText';

export interface RewardedInterstitialIntroModalProps {
  visible: boolean;
  /** Short reward line, e.g. "+1 Row" or "a Letter Hint" */
  rewardLabel: string;
  onWatch: () => void;
  onSkip: () => void;
}

/**
 * Pre-ad confirm shown before helper rewarded ads
 * to reduce accidental watch taps.
 */
export function RewardedInterstitialIntroModal({
  visible,
  rewardLabel,
  onWatch,
  onSkip,
}: RewardedInterstitialIntroModalProps) {
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
        watchButton: {
          backgroundColor: theme.colors.brand.primary,
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 14,
          paddingHorizontal: 28,
          alignSelf: 'stretch',
          alignItems: 'center',
          marginBottom: 12,
        },
        watchText: {
          ...typography.body,
          fontWeight: '700',
          color: theme.colors.text.inverse,
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
      onRequestClose={onSkip}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          style={styles.card}
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`Watch a short ad for ${rewardLabel}`}
        >
          <AppText style={styles.title}>Watch a short ad?</AppText>
          <AppText style={styles.body}>
            Watch now to earn {rewardLabel}. You can skip if you prefer not to
            watch.
          </AppText>
          <TouchableOpacity
            style={styles.watchButton}
            onPress={onWatch}
            activeOpacity={0.85}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Watch ad for ${rewardLabel}`}
          >
            <AppText style={styles.watchText} numberOfLines={1}>Watch</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.7}
            accessible
            accessibilityRole="button"
            accessibilityLabel="No thanks, skip the ad"
          >
            <AppText style={styles.skipText} numberOfLines={1}>No thanks</AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
