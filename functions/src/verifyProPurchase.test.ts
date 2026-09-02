import { createHash } from 'crypto';
import { verifyProPurchase } from './verifyProPurchase';

const PACKAGE = 'com.vorithstudio.wordguess';
const SKU = 'word_guess_pro';

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

describe('verifyProPurchase', () => {
  const uid = 'firebase-uid-1';
  const purchaseToken = 'play-purchase-token';

  it('writes purchased when Play reports purchaseState 0', async () => {
    const saveEntitlement = jest.fn().mockResolvedValue(undefined);
    const getProduct = jest.fn().mockResolvedValue({ purchaseState: 0 });

    const result = await verifyProPurchase(
      { uid, purchaseToken, productId: SKU },
      {
        getProduct,
        saveEntitlement,
        packageName: PACKAGE,
        expectedProductId: SKU,
      },
    );

    expect(result).toEqual({ state: 'purchased' });
    expect(getProduct).toHaveBeenCalledWith({
      packageName: PACKAGE,
      productId: SKU,
      token: purchaseToken,
    });
    expect(saveEntitlement).toHaveBeenCalledWith(uid, {
      productId: SKU,
      state: 'purchased',
      purchaseTokenHash: tokenHash(purchaseToken),
      verifiedAt: expect.any(String),
    });
  });

  it('writes none when Play reports canceled', async () => {
    const saveEntitlement = jest.fn().mockResolvedValue(undefined);
    const getProduct = jest.fn().mockResolvedValue({ purchaseState: 1 });

    const result = await verifyProPurchase(
      { uid, purchaseToken, productId: SKU },
      {
        getProduct,
        saveEntitlement,
        packageName: PACKAGE,
        expectedProductId: SKU,
      },
    );

    expect(result).toEqual({ state: 'none' });
    expect(saveEntitlement).toHaveBeenCalledWith(
      uid,
      expect.objectContaining({ state: 'none', productId: SKU }),
    );
  });

  it('writes none when Play reports pending', async () => {
    const saveEntitlement = jest.fn().mockResolvedValue(undefined);
    const getProduct = jest.fn().mockResolvedValue({ purchaseState: 2 });

    const result = await verifyProPurchase(
      { uid, purchaseToken, productId: SKU },
      {
        getProduct,
        saveEntitlement,
        packageName: PACKAGE,
        expectedProductId: SKU,
      },
    );

    expect(result.state).toBe('none');
  });

  it('does not call Play when productId is not Pro', async () => {
    const saveEntitlement = jest.fn();
    const getProduct = jest.fn();

    await expect(
      verifyProPurchase(
        { uid, purchaseToken, productId: 'other_sku' },
        {
          getProduct,
          saveEntitlement,
          packageName: PACKAGE,
          expectedProductId: SKU,
        },
      ),
    ).rejects.toThrow('INVALID_PRODUCT');

    expect(getProduct).not.toHaveBeenCalled();
    expect(saveEntitlement).not.toHaveBeenCalled();
  });

  it('does not call Play when the token is empty', async () => {
    const saveEntitlement = jest.fn();
    const getProduct = jest.fn();

    await expect(
      verifyProPurchase(
        { uid, purchaseToken: '  ', productId: SKU },
        {
          getProduct,
          saveEntitlement,
          packageName: PACKAGE,
          expectedProductId: SKU,
        },
      ),
    ).rejects.toThrow('MISSING_TOKEN');

    expect(getProduct).not.toHaveBeenCalled();
  });

  it('does not write entitlement when Play API fails', async () => {
    const saveEntitlement = jest.fn();
    const getProduct = jest.fn().mockRejectedValue(new Error('Play 403'));

    await expect(
      verifyProPurchase(
        { uid, purchaseToken, productId: SKU },
        {
          getProduct,
          saveEntitlement,
          packageName: PACKAGE,
          expectedProductId: SKU,
        },
      ),
    ).rejects.toThrow('Play 403');

    expect(saveEntitlement).not.toHaveBeenCalled();
  });
});
