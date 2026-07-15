import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ErrorCode,
  isUserCancelledError,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { config } from '../constants/config';
import { useSettingsStore } from '../stores/settingsStore';

type IapUiHandlers = {
  onPurchaseSuccess?: () => void;
  onPurchaseError?: (message: string) => void;
  onPurchaseCancelled?: () => void;
};

let connected = false;
let initPromise: Promise<boolean> | null = null;
let updateSub: { remove: () => void } | null = null;
let errorSub: { remove: () => void } | null = null;
let uiHandlers: IapUiHandlers = {};

/** Register Settings-level toast callbacks (optional; Pro unlock still applied globally). */
export function setIapUiHandlers(handlers: IapUiHandlers): void {
  uiHandlers = handlers;
}

export function isProSku(productId: string | null | undefined): boolean {
  return productId === config.proProductId;
}

async function acknowledgeProPurchase(purchase: Purchase): Promise<void> {
  if (!isProSku(purchase.productId)) return;

  await finishTransaction({ purchase, isConsumable: false });
  useSettingsStore.getState().setPro(true);
  uiHandlers.onPurchaseSuccess?.();
}

/**
 * Connect to Play Billing, attach listeners, and sync existing Pro ownership.
 * Safe to call multiple times — subsequent calls await the same init.
 */
export async function initIap(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (connected) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await initConnection();
      connected = true;

      updateSub?.remove();
      errorSub?.remove();

      updateSub = purchaseUpdatedListener(async (purchase) => {
        try {
          await acknowledgeProPurchase(purchase);
        } catch (error) {
          console.warn('[iap] Failed to finish purchase', error);
          uiHandlers.onPurchaseError?.('Purchase verification failed.');
        }
      });

      errorSub = purchaseErrorListener((error: PurchaseError) => {
        if (error.code === ErrorCode.UserCancelled || isUserCancelledError(error)) {
          uiHandlers.onPurchaseCancelled?.();
          return;
        }
        if (error.code === ErrorCode.AlreadyOwned) {
          useSettingsStore.getState().setPro(true);
          uiHandlers.onPurchaseSuccess?.();
          return;
        }
        console.warn('[iap] Purchase error', error.code, error.message);
        uiHandlers.onPurchaseError?.(
          error.message || 'Purchase failed. Please try again.',
        );
      });

      return true;
    } catch (error) {
      console.warn('[iap] initConnection failed', error);
      connected = false;
      return false;
    } finally {
      if (!connected) {
        initPromise = null;
      }
    }
  })();

  return initPromise;
}

/** Check owned purchases and mirror Play ownership into settingsStore.isPro. */
export async function syncProFromStore(): Promise<boolean> {
  try {
    const purchases = await getAvailablePurchases();
    const hasPro = purchases.some((p) => isProSku(p.productId));
    useSettingsStore.getState().setPro(hasPro);
    return hasPro;
  } catch (error) {
    console.warn('[iap] getAvailablePurchases failed', error);
    return false;
  }
}

/** Drop local Pro perks when the game account session ends. */
export function clearProEntitlementForSignOut(): void {
  useSettingsStore.getState().setPro(false);
}

/**
 * Apply Pro for the current session: signed-out users never keep Pro locally;
 * signed-in users re-sync from Play Billing.
 */
export async function applyProEntitlementForSession(signedIn: boolean): Promise<boolean> {
  if (!signedIn) {
    clearProEntitlementForSignOut();
    return false;
  }
  const ready = await initIap();
  if (!ready) return false;
  return syncProFromStore();
}

/**
 * Fetch the catalog entry then launch the Play purchase sheet for Pro.
 * Throws on hard failures (unavailable / billing not ready).
 */
export async function purchasePro(): Promise<void> {
  const ready = await initIap();
  if (!ready) {
    throw new Error('BILLING_UNAVAILABLE');
  }

  const skus = [config.proProductId];
  const products = await fetchProducts({ skus, type: 'in-app' });
  if (!products || products.length === 0) {
    throw new Error('PRODUCT_UNAVAILABLE');
  }

  await requestPurchase({
    request: {
      google: { skus },
      apple: { sku: config.proProductId },
    },
    type: 'in-app',
  });
}

/** Explicit restore from Settings. Returns whether Pro was found. */
export async function restorePro(): Promise<boolean> {
  const ready = await initIap();
  if (!ready) {
    throw new Error('BILLING_UNAVAILABLE');
  }
  return syncProFromStore();
}

export function isUserCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (isUserCancelledError(error as PurchaseError)) return true;
  const code = (error as { code?: string }).code;
  return code === ErrorCode.UserCancelled || code === 'E_USER_CANCELLED';
}

export async function teardownIap(): Promise<void> {
  updateSub?.remove();
  errorSub?.remove();
  updateSub = null;
  errorSub = null;
  uiHandlers = {};
  if (connected) {
    try {
      await endConnection();
    } catch (error) {
      console.warn('[iap] endConnection failed', error);
    }
  }
  connected = false;
  initPromise = null;
}
