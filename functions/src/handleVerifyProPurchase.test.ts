import { HttpsError } from 'firebase-functions/v2/https';
import { handleVerifyProPurchase } from './handleVerifyProPurchase';
import * as play from './playAndroidPublisher';
import * as store from './entitlementStore';

jest.mock('./playAndroidPublisher', () => ({
  getPlayProduct: jest.fn(),
}));

jest.mock('./entitlementStore', () => ({
  saveEntitlement: jest.fn(),
}));

const getPlayProduct = play.getPlayProduct as jest.Mock;
const saveEntitlement = store.saveEntitlement as jest.Mock;

describe('handleVerifyProPurchase', () => {
  beforeEach(() => {
    getPlayProduct.mockReset();
    saveEntitlement.mockReset();
    saveEntitlement.mockResolvedValue(undefined);
  });

  it('rejects unsigned-in callers', async () => {
    await expect(
      handleVerifyProPurchase({
        auth: undefined,
        data: { purchaseToken: 'tok', productId: 'word_guess_pro' },
      }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('maps Play failures to unavailable so the client can fail-open', async () => {
    getPlayProduct.mockRejectedValue(new Error('403'));

    await expect(
      handleVerifyProPurchase({
        auth: { uid: 'u1' },
        data: { purchaseToken: 'tok', productId: 'word_guess_pro' },
      }),
    ).rejects.toBeInstanceOf(HttpsError);

    await expect(
      handleVerifyProPurchase({
        auth: { uid: 'u1' },
        data: { purchaseToken: 'tok', productId: 'word_guess_pro' },
      }),
    ).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('maps a missing token to invalid-argument', async () => {
    await expect(
      handleVerifyProPurchase({
        auth: { uid: 'u1' },
        data: { purchaseToken: '  ', productId: 'word_guess_pro' },
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(getPlayProduct).not.toHaveBeenCalled();
  });

  it('returns purchased when Play confirms the token', async () => {
    getPlayProduct.mockResolvedValue({ purchaseState: 0 });

    await expect(
      handleVerifyProPurchase({
        auth: { uid: 'u1' },
        data: { purchaseToken: 'tok', productId: 'word_guess_pro' },
      }),
    ).resolves.toEqual({ state: 'purchased' });
  });
});
