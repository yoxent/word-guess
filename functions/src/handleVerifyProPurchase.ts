import { HttpsError } from 'firebase-functions/v2/https';
import {
  PLAY_PACKAGE_NAME,
  PRO_PRODUCT_ID,
  verifyProPurchase,
} from './verifyProPurchase';
import { getPlayProduct } from './playAndroidPublisher';
import { saveEntitlement } from './entitlementStore';

export type VerifyProPurchaseCall = {
  auth?: { uid: string } | null;
  data: unknown;
};

export async function handleVerifyProPurchase(
  request: VerifyProPurchaseCall,
): Promise<{ state: 'purchased' | 'none' }> {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }

  const data = request.data as { purchaseToken?: unknown; productId?: unknown };
  const purchaseToken =
    typeof data?.purchaseToken === 'string' ? data.purchaseToken : '';
  const productId = typeof data?.productId === 'string' ? data.productId : '';

  try {
    return await verifyProPurchase(
      { uid, purchaseToken, productId },
      {
        getProduct: getPlayProduct,
        saveEntitlement,
        packageName: PLAY_PACKAGE_NAME,
        expectedProductId: PRO_PRODUCT_ID,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN';
    if (message === 'INVALID_PRODUCT' || message === 'MISSING_TOKEN') {
      throw new HttpsError('invalid-argument', message);
    }
    throw new HttpsError('unavailable', 'Play verification failed');
  }
}
