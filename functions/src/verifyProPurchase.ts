import { createHash } from 'crypto';

export const PLAY_PACKAGE_NAME = 'com.vorithstudio.wordguess';
export const PRO_PRODUCT_ID = 'word_guess_pro';

/** Play `purchases.products.get` purchaseState: 0 purchased, 1 canceled, 2 pending. */
export const PLAY_PURCHASE_STATE_PURCHASED = 0;

export type EntitlementState = 'purchased' | 'none';

export type EntitlementRecord = {
  productId: string;
  state: EntitlementState;
  purchaseTokenHash: string;
  verifiedAt: string;
};

export type PlayProductLookup = (args: {
  packageName: string;
  productId: string;
  token: string;
}) => Promise<{ purchaseState?: number | null }>;

export type VerifyProPurchaseDeps = {
  getProduct: PlayProductLookup;
  saveEntitlement: (uid: string, record: EntitlementRecord) => Promise<void>;
  packageName: string;
  expectedProductId: string;
};

export function hashPurchaseToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function verifyProPurchase(
  input: { uid: string; purchaseToken: string; productId: string },
  deps: VerifyProPurchaseDeps,
): Promise<{ state: EntitlementState }> {
  if (input.productId !== deps.expectedProductId) {
    throw new Error('INVALID_PRODUCT');
  }
  const token = input.purchaseToken.trim();
  if (token.length === 0) {
    throw new Error('MISSING_TOKEN');
  }

  const play = await deps.getProduct({
    packageName: deps.packageName,
    productId: input.productId,
    token,
  });

  const state: EntitlementState =
    play.purchaseState === PLAY_PURCHASE_STATE_PURCHASED ? 'purchased' : 'none';

  await deps.saveEntitlement(input.uid, {
    productId: input.productId,
    state,
    purchaseTokenHash: hashPurchaseToken(token),
    verifiedAt: new Date().toISOString(),
  });

  return { state };
}
