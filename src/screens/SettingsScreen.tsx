import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getAvailablePurchases, requestPurchase, purchaseUpdatedListener, finishTransaction } from 'react-native-iap';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../constants/typography';
import { layout } from '../constants/layout';
import { settingsConfig } from '../config/ui';
import { SettingsRow } from '../components/ui/SettingsRow';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';

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
      }),
    [theme],
  );

  const isPro = useSettingsStore(s => s.isPro);
  const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null);

  // Auth state
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const playerName = useAuthStore(s => s.playerName);
  const signIn = useAuthStore(s => s.signIn);
  const signOutAccount = useAuthStore(s => s.signOutAccount);
  const isAuthPending = useAuthStore(s => s.isAuthPending);

  const showToast = useCallback((message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSignIn = useCallback(async () => {
    const success = await signIn();
    if (success) {
      showToast('Signed in successfully!', true);
    } else {
      const error = useAuthStore.getState().authError;
      showToast(error ?? 'Sign-in failed.', false);
    }
  }, [signIn, showToast]);

  const handleSignOut = useCallback(async () => {
    await signOutAccount();
    showToast('Signed out', true);
  }, [signOutAccount, showToast]);

  const handleRestore = useCallback(async () => {
    try {
      const purchases = await getAvailablePurchases();
      const hasPro = purchases.some(p => p.productId === 'com.vorithstudio.wordguess.pro');
      if (hasPro) {
        useSettingsStore.getState().setPro(true);
        showToast('Pro restored!', true);
      } else {
        showToast('No purchases found to restore', false);
      }
    } catch {
      showToast('No purchases found to restore', false);
    }
  }, [showToast]);

  const handlePurchase = useCallback(async (productId: string) => {
    try {
      await requestPurchase({
        request: {
          google: { skus: [productId] },
          apple: { sku: productId },
        },
        type: 'in-app',
      });
    } catch {
      showToast('Purchase failed. Please try again.', false);
    }
  }, [showToast]);

  useEffect(() => {
    const subscription = purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId === 'com.vorithstudio.wordguess.pro') {
        try {
          await finishTransaction({ purchase, isConsumable: false });
          useSettingsStore.getState().setPro(true);
          showToast('Welcome to Pro!', true);
        } catch {
          showToast('Purchase verification failed.', false);
        }
      }
    });
    return () => subscription.remove();
  }, [showToast]);

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
        if (row.type === 'restore' && row.id === 'restorePurchases' && isPro) return false;
        if (row.type === 'purchase' && row.id === 'removeAds' && isPro) return false;
        return true;
      }),
    }));
  }, [isPro]);

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
                    onSignIn={row.type === 'signInButton' ? handleSignIn : undefined}
                    onSignOut={row.type === 'signInButton' ? handleSignOut : undefined}
                    isLoggedIn={row.type === 'signInButton' ? isLoggedIn : undefined}
                    playerName={row.type === 'signInButton' ? playerName : undefined}
                  />
                  {i < section.rows.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
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
