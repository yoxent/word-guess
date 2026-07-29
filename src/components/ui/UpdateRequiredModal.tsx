import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Linking,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { typography } from '../../constants/typography';
import { layout } from '../../constants/layout';
import {
  PLAY_STORE_HTTPS_URL,
  PLAY_STORE_MARKET_URL,
} from '../../constants/store';

interface UpdateRequiredModalProps {
  visible: boolean;
  onLater: () => void;
}

export async function openPlayStore(): Promise<void> {
  try {
    await Linking.openURL(PLAY_STORE_MARKET_URL);
  } catch {
    await Linking.openURL(PLAY_STORE_HTTPS_URL);
  }
}

export function UpdateRequiredModal({
  visible,
  onLater,
}: UpdateRequiredModalProps) {
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
        primaryButton: {
          backgroundColor: theme.colors.brand.primary,
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 48,
          width: '100%',
          alignItems: 'center',
          marginBottom: 12,
          shadowColor: theme.colors.brand.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        primaryText: {
          ...typography.button,
          color: '#FFFFFF',
        },
        secondaryButton: {
          paddingVertical: 10,
          paddingHorizontal: 24,
          alignItems: 'center',
        },
        secondaryText: {
          ...typography.button,
          color: theme.colors.text.secondary,
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onLater}
    >
      <View style={styles.overlay} accessible accessibilityLabel="Update available">
        <Animated.View
          style={[
            styles.card,
            { transform: [{ scale: cardScale }], opacity: cardOpacity },
          ]}
        >
          <Text style={styles.title}>Update available</Text>
          <Text style={styles.body}>
            A newer version is available on the Play Store.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              void openPlayStore();
            }}
            activeOpacity={0.8}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Update"
          >
            <Text style={styles.primaryText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onLater}
            activeOpacity={0.8}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Later"
          >
            <Text style={styles.secondaryText}>Later</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
