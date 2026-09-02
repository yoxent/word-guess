import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { config } from '../constants/config';
import { useSettingsStore } from '../stores/settingsStore';
import { getCurrentUser } from './authService';

export type ServerProVerifyOutcome = 'purchased' | 'none' | 'skipped' | 'failed';

type PurchaseTokenSource = {
  productId?: string | null;
  purchaseToken?: string | null;
  purchaseTokenAndroid?: string | null;
};

export function purchaseTokenFromPurchase(
  purchase: PurchaseTokenSource,
): string | null {
  const token = (purchase.purchaseToken ?? purchase.purchaseTokenAndroid)?.trim();
  return token && token.length > 0 ? token : null;
}

export async function verifyProPurchaseWithServer(args: {
  purchaseToken: string;
  productId: string;
}): Promise<{ state: 'purchased' | 'none' }> {
  const callable = httpsCallable(
    getFunctions(getApp(), 'us-central1'),
    'verifyProPurchase',
  );
  const result = await callable({
    purchaseToken: args.purchaseToken,
    productId: args.productId,
  });
  const state = (result.data as { state?: unknown } | undefined)?.state;
  if (state !== 'purchased' && state !== 'none') {
    throw new Error('INVALID_VERIFY_RESPONSE');
  }
  return { state };
}

/**
 * Confirm Play ownership with Cloud Functions. Fail-open on network/Play
 * errors so a Functions outage does not strip a real purchase. Explicit
 * `none` (refunded / invalid token) clears local Pro.
 */
export async function applyServerProVerification(
  purchase: PurchaseTokenSource,
): Promise<ServerProVerifyOutcome> {
  if (!getCurrentUser()) return 'skipped';

  const purchaseToken = purchaseTokenFromPurchase(purchase);
  if (!purchaseToken) {
    console.warn('[iap] Missing purchase token; skipping server verify');
    return 'skipped';
  }

  const productId = purchase.productId ?? config.proProductId;
  try {
    const { state } = await verifyProPurchaseWithServer({
      purchaseToken,
      productId,
    });
    if (state === 'none') {
      useSettingsStore.getState().setPro(false);
    }
    return state;
  } catch (error) {
    console.warn('[iap] Server Pro verify failed (fail-open)', error);
    return 'failed';
  }
}
