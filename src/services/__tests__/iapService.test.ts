const mockInitConnection = jest.fn(async () => true);
const mockEndConnection = jest.fn(async () => {});
const mockFetchProducts = jest.fn(async (_opts?: unknown) => [] as { id: string }[]);
const mockRequestPurchase = jest.fn(async (_opts?: unknown) => {});
const mockGetAvailablePurchases = jest.fn(
  async (): Promise<{ productId: string; purchaseToken?: string }[]> => [],
);
const mockFinishTransaction = jest.fn(async (_opts?: unknown) => {});
const mockSetPro = jest.fn();
const mockApplyServerProVerification = jest.fn(
  async (_purchase?: unknown): Promise<'skipped' | 'none' | 'purchased' | 'failed'> =>
    'skipped',
);

let updateListener: ((purchase: {
  productId: string;
  purchaseToken?: string;
}) => Promise<void> | void) | null = null;
let errorListener: ((error: { code?: string; message?: string }) => Promise<void> | void) | null = null;

jest.mock('react-native-iap', () => ({
  initConnection: () => mockInitConnection(),
  endConnection: () => mockEndConnection(),
  fetchProducts: (opts: unknown) => mockFetchProducts(opts),
  requestPurchase: (opts: unknown) => mockRequestPurchase(opts),
  getAvailablePurchases: () => mockGetAvailablePurchases(),
  finishTransaction: (opts: unknown) => mockFinishTransaction(opts),
  purchaseUpdatedListener: (cb: typeof updateListener) => {
    updateListener = cb;
    return { remove: jest.fn() };
  },
  purchaseErrorListener: (cb: typeof errorListener) => {
    errorListener = cb;
    return { remove: jest.fn() };
  },
  ErrorCode: {
    UserCancelled: 'user-cancelled',
    AlreadyOwned: 'already-owned',
  },
  isUserCancelledError: () => false,
}));

jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      setPro: mockSetPro,
    }),
  },
}));

jest.mock('../proPurchaseVerify', () => ({
  applyServerProVerification: (purchase: unknown) =>
    mockApplyServerProVerification(purchase),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import {
  initIap,
  isIapActive,
  purchasePro,
  syncProFromStore,
  teardownIap,
} from '../iapService';
import { ErrorCode } from 'react-native-iap';

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

describe('iapService purchase activity', () => {
  beforeEach(async () => {
    mockInitConnection.mockResolvedValue(true);
    mockFetchProducts.mockResolvedValue([{ id: 'word_guess_pro' }]);
    mockRequestPurchase.mockResolvedValue(undefined);
    mockSetPro.mockReset();
    mockApplyServerProVerification.mockReset();
    mockApplyServerProVerification.mockResolvedValue('skipped');
    mockGetAvailablePurchases.mockResolvedValue([]);
    updateListener = null;
    errorListener = null;
    await teardownIap();
  });

  afterEach(async () => {
    await teardownIap();
  });

  it('is inactive before a purchase starts', () => {
    expect(isIapActive()).toBe(false);
  });

  it('marks IAP active while the Play purchase sheet is open', async () => {
    await purchasePro();
    expect(isIapActive()).toBe(true);
  });

  it('clears the flag when the purchase succeeds', async () => {
    await purchasePro();
    expect(isIapActive()).toBe(true);

    await updateListener?.({ productId: 'word_guess_pro' });
    await flush();

    expect(isIapActive()).toBe(false);
  });

  it('clears the flag when the user cancels', async () => {
    await initIap();
    await purchasePro();

    await errorListener?.({ code: ErrorCode.UserCancelled, message: 'cancelled' });
    await flush();

    expect(isIapActive()).toBe(false);
  });

  it('does not mark IAP active when the product catalog is empty', async () => {
    mockFetchProducts.mockResolvedValueOnce([]);
    await expect(purchasePro()).rejects.toThrow('PRODUCT_UNAVAILABLE');
    expect(isIapActive()).toBe(false);
  });

  it('clears the flag if requestPurchase throws', async () => {
    mockRequestPurchase.mockRejectedValueOnce(new Error('sheet failed'));
    await expect(purchasePro()).rejects.toThrow('sheet failed');
    expect(isIapActive()).toBe(false);
  });

  it('clears the flag on teardown', async () => {
    await purchasePro();
    await teardownIap();
    expect(isIapActive()).toBe(false);
  });

  it('verifies a finished Pro purchase with the server', async () => {
    await purchasePro();
    await updateListener?.({
      productId: 'word_guess_pro',
      purchaseToken: 'tok-1',
    });
    await flush();

    expect(mockApplyServerProVerification).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'word_guess_pro',
        purchaseToken: 'tok-1',
      }),
    );
  });

  it('verifies restored Play purchases with the server', async () => {
    mockGetAvailablePurchases.mockResolvedValueOnce([
      { productId: 'word_guess_pro', purchaseToken: 'tok-2' },
    ]);

    await expect(syncProFromStore()).resolves.toBe(true);
    expect(mockApplyServerProVerification).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseToken: 'tok-2' }),
    );
  });

  it('reports no Pro when the server says the token is none', async () => {
    mockGetAvailablePurchases.mockResolvedValueOnce([
      { productId: 'word_guess_pro', purchaseToken: 'tok-3' },
    ]);
    mockApplyServerProVerification.mockResolvedValueOnce('none');

    await expect(syncProFromStore()).resolves.toBe(false);
  });
});
