import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { getAvailablePurchases, requestPurchase, purchaseUpdatedListener, finishTransaction } from 'react-native-iap';
import { colors } from '../constants/colors';
import { typography } from '../constants/typography';
import { settingsConfig } from '../config/ui';
import { SettingsRow } from '../components/ui/SettingsRow';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';

export function SettingsScreen() {
  const isPro = useSettingsStore(s => s.isPro);
  const [toast, setToast] = useState<{ message: string; isSuccess: boolean } | null>(null);

  // Auth state
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const playerName = useAuthStore(s => s.playerName);
  const googleSignIn = useAuthStore(s => s.googleSignIn);
  const googleSignOut = useAuthStore(s => s.googleSignOut);
  const isAuthPending = useAuthStore(s => s.isAuthPending);

  const showToast = useCallback((message: string, isSuccess: boolean) => {
    setToast({ message, isSuccess });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    const success = await googleSignIn();
    if (success) {
      showToast('Signed in successfully!', true);
    } else {
      const error = useAuthStore.getState().authError;
      showToast(error ?? 'Sign-in failed.', false);
    }
  }, [googleSignIn, showToast]);

  const handleGoogleSignOut = useCallback(async () => {
    await googleSignOut();
    showToast('Signed out', true);
  }, [googleSignOut, showToast]);

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
                    onSignIn={row.type === 'signInButton' ? handleGoogleSignIn : undefined}
                    onSignOut={row.type === 'signInButton' ? handleGoogleSignOut : undefined}
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
        <View style={[styles.toast, { backgroundColor: toast.isSuccess ? colors.tileCorrect : colors.danger }]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...typography.cardTitle,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  divider: {
    height: 1,
    backgroundColor: colors.tileEmpty,
    marginVertical: 4,
  },
  toast: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  toastText: {
    ...typography.body,
    color: colors.textInverse,
    fontWeight: '600',
  },
});
