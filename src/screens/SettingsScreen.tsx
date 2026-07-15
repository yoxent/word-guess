import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../constants/typography';
import { layout } from '../constants/layout';
import { settingsConfig } from '../config/ui';
import { SettingsRow } from '../components/ui/SettingsRow';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { hasSignedInPlayer } from '../utils/authState';
import {
  purchasePro,
  restorePro,
  setIapUiHandlers,
  isUserCancelled,
} from '../services/iapService';

export function SettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: theme.colors.surface.background,
        },
        scrollContent: {
          padding: layout.screenPadding,
        },
        section: {
          marginBottom: 24,
        },
        sectionTitle: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 10,
          paddingHorizontal: 4,
        },
        sectionCard: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.cardBorderRadius,
          paddingHorizontal: 16,
          paddingVertical: 4,
          marginBottom: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: theme.colors.tile.empty,
          marginHorizontal: 0,
        },
        toast: {
          position: 'absolute',
          bottom: 32,
          left: 24,
          right: 24,
          paddingVertical: 14,
          paddingHorizontal: 20,
          borderRadius: layout.buttonBorderRadius,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 6,
        },
        toastIcon: {
          marginRight: 4,
        },
        toastText: {
          ...typography.button,
          color: theme.colors.text.inverse,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          justifyContent: 'center',
          alignItems: 'center',
        },
        modalCard: {
          backgroundColor: theme.colors.surface.card,
          borderRadius: layout.modalBorderRadius,
          padding: 28,
          alignItems: 'center',
          minWidth: 280,
          maxWidth: '85%',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 8,
        },
        modalTitle: {
          ...typography.heading,
          color: theme.colors.text.primary,
          marginBottom: 8,
        },
        modalMessage: {
          ...typography.body,
          color: theme.colors.text.secondary,
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 22,
        },
        modalButtons: {
          width: '100%',
          gap: 10,
        },
        modalButtonCancel: {
          backgroundColor: theme.colors.button.primary.bg,
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
          minHeight: 54,
        },
        modalButtonCancelText: {
          ...typography.button,
          color: theme.colors.button.primary.fg,
        },
        modalButtonSignOut: {
          borderRadius: layout.buttonBorderRadius,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
          minHeight: 54,
          borderWidth: 1.5,
          borderColor: theme.colors.status.danger,
        },
        modalButtonSignOutText: {
          ...typography.button,
          color: theme.colors.status.danger,
        },
      }),
    [theme],
  );

  const isPro = useSettingsStore(s => s.isPro);
  const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Auth state
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const playerId = useAuthStore(s => s.playerId);
  const playerName = useAuthStore(s => s.playerName);
  const playerPhoto = useAuthStore(s => s.playerPhoto);
  const signIn = useAuthStore(s => s.signIn);
  const signOutAccount = useAuthStore(s => s.signOutAccount);
  const isAuthPending = useAuthStore(s => s.isAuthPending);
  const isSignedIn = hasSignedInPlayer({ isLoggedIn, playerId });

  const showToast = useCallback((message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    setIapUiHandlers({
      onPurchaseSuccess: () => {
        setIsPurchasing(false);
        showToast('Welcome to Pro!', true);
      },
      onPurchaseError: (message) => {
        setIsPurchasing(false);
        showToast(message, false);
      },
      onPurchaseCancelled: () => {
        setIsPurchasing(false);
      },
    });
    return () => setIapUiHandlers({});
  }, [showToast]);

  const handleSignIn = useCallback(async () => {
    // Store single-flight covers the race before isAuthPending re-renders;
    // skip if already pending so duplicate waiters don't stack failure toasts.
    if (useAuthStore.getState().isAuthPending) return;

    const success = await signIn();
    if (success) {
      showToast('Signed in successfully!', true);
    } else {
      const error = useAuthStore.getState().authError;
      showToast(error ?? 'Sign-in failed.', false);
    }
  }, [signIn, showToast]);

  const handleSignOutPress = useCallback((): Promise<void> => {
    if (useAuthStore.getState().isAuthPending) return Promise.resolve();
    setShowSignOutConfirm(true);
    return Promise.resolve();
  }, []);

  const handleCancelSignOut = useCallback(() => {
    setShowSignOutConfirm(false);
  }, []);

  const handleConfirmSignOut = useCallback(async () => {
    setShowSignOutConfirm(false);
    await signOutAccount();
    showToast('Signed out', true);
  }, [signOutAccount, showToast]);

  const handleRestore = useCallback(async () => {
    if (!hasSignedInPlayer(useAuthStore.getState())) return;
    try {
      const hasPro = await restorePro();
      if (hasPro) {
        showToast('Pro restored!', true);
      } else {
        showToast('No purchases found to restore', false);
      }
    } catch {
      showToast('No purchases found to restore', false);
    }
  }, [showToast]);

  const handlePurchase = useCallback(async (_productId: string) => {
    if (!hasSignedInPlayer(useAuthStore.getState())) return;
    if (isPurchasing) return;
    setIsPurchasing(true);
    try {
      await purchasePro();
      // Success toast comes from purchaseUpdatedListener via setIapUiHandlers.
      // Keep spinner until listener fires (or error / cancel).
    } catch (error) {
      setIsPurchasing(false);
      if (isUserCancelled(error)) return;
      const code = error instanceof Error ? error.message : '';
      if (code === 'PRODUCT_UNAVAILABLE') {
        showToast('Product unavailable. Please try again later.', false);
        return;
      }
      if (code === 'BILLING_UNAVAILABLE') {
        showToast('Billing is unavailable on this device.', false);
        return;
      }
      showToast('Purchase failed. Please try again.', false);
    }
  }, [isPurchasing, showToast]);

  const filteredConfig = useMemo(() => {
    return settingsConfig.map(section => ({
      ...section,
      rows: section.rows.map(row => {
        // Override pro status value dynamically
        if (row.type === 'info' && row.id === 'proStatus') {
          return { ...row, value: isPro ? 'Active' : '—' };
        }
        return row;
      }).filter(row => {
        // Pro status / buy / restore only while signed in — entitlement is
        // session-bound and Play ownership is confusing when signed out.
        if (row.type === 'info' && row.id === 'proStatus') {
          return isSignedIn;
        }
        if (row.type === 'purchase' && row.id === 'removeAds') {
          return isSignedIn && !isPro;
        }
        if (row.type === 'restore' && row.id === 'restorePurchases') {
          return isSignedIn && !isPro;
        }
        return true;
      }),
    }));
  }, [isPro, isSignedIn]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredConfig.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, i) => (
                <React.Fragment key={row.id}>
                  <SettingsRow
                    config={row}
                    onRestore={row.type === 'restore' ? handleRestore : undefined}
                    onPurchase={row.type === 'purchase' ? handlePurchase : undefined}
                    isPurchasing={row.type === 'purchase' ? isPurchasing : undefined}
                    onSignIn={row.type === 'signInButton' ? handleSignIn : undefined}
                    onSignOut={row.type === 'signInButton' ? handleSignOutPress : undefined}
                    isLoggedIn={row.type === 'signInButton' ? isLoggedIn : undefined}
                    playerName={row.type === 'signInButton' ? playerName : undefined}
                    playerPhoto={row.type === 'signInButton' ? playerPhoto : undefined}
                    isAuthPending={row.type === 'signInButton' ? isAuthPending : undefined}
                  />
                  {i < section.rows.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={showSignOutConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancelSignOut}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancelSignOut}>
          <View
            style={styles.modalCard}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>Sign Out?</Text>
            <Text style={styles.modalMessage}>
              Your progress stays on this device. Pro benefits will pause until
              you sign back in.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={handleCancelSignOut}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSignOut}
                onPress={handleConfirmSignOut}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {toast && (
        <View
          style={[
            styles.toast,
            {
              backgroundColor: toast.isSuccess
                ? theme.colors.status.success
                : theme.colors.status.danger,
            },
          ]}
        >
          <MaterialIcons
            name={toast.isSuccess ? 'check-circle' : 'error'}
            size={18}
            color="#FFFFFF"
            style={styles.toastIcon}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}
