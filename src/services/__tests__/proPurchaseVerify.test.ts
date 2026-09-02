const mockCallable = jest.fn();
const mockSetPro = jest.fn();
const mockGetCurrentUser = jest.fn();

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockCallable),
}));

jest.mock('../../stores/settingsStore', () => ({
  useSettingsStore: {
    getState: () => ({
      setPro: mockSetPro,
    }),
  },
}));

jest.mock('../authService', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getApp } from '@react-native-firebase/app';
import {
  applyServerProVerification,
  purchaseTokenFromPurchase,
} from '../proPurchaseVerify';

describe('purchaseTokenFromPurchase', () => {
  it('returns a trimmed token', () => {
    expect(purchaseTokenFromPurchase({ purchaseToken: '  tok  ' })).toBe('tok');
  });

  it('returns null when the token is missing', () => {
    expect(purchaseTokenFromPurchase({})).toBeNull();
    expect(purchaseTokenFromPurchase({ purchaseToken: '  ' })).toBeNull();
  });

  it('falls back to purchaseTokenAndroid', () => {
    expect(
      purchaseTokenFromPurchase({ purchaseTokenAndroid: 'android-tok' }),
    ).toBe('android-tok');
  });
});

describe('applyServerProVerification', () => {
  beforeEach(() => {
    mockCallable.mockReset();
    mockSetPro.mockReset();
    mockGetCurrentUser.mockReset();
    mockGetCurrentUser.mockReturnValue({ user: { id: 'u1' } });
  });

  it('skips when the user is signed out', async () => {
    mockGetCurrentUser.mockReturnValue(null);

    await expect(
      applyServerProVerification({
        productId: 'word_guess_pro',
        purchaseToken: 'tok',
      }),
    ).resolves.toBe('skipped');

    expect(mockCallable).not.toHaveBeenCalled();
    expect(mockSetPro).not.toHaveBeenCalled();
  });

  it('skips when the purchase has no token', async () => {
    await expect(
      applyServerProVerification({ productId: 'word_guess_pro' }),
    ).resolves.toBe('skipped');

    expect(mockCallable).not.toHaveBeenCalled();
  });

  it('clears local Pro when the server returns none', async () => {
    mockCallable.mockResolvedValue({ data: { state: 'none' } });

    await expect(
      applyServerProVerification({
        productId: 'word_guess_pro',
        purchaseToken: 'tok',
      }),
    ).resolves.toBe('none');

    expect(getFunctions).toHaveBeenCalledWith(getApp(), 'us-central1');
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'verifyProPurchase');
    expect(mockCallable).toHaveBeenCalledWith({
      purchaseToken: 'tok',
      productId: 'word_guess_pro',
    });
    expect(mockSetPro).toHaveBeenCalledWith(false);
  });

  it('keeps local Pro when the callable throws (fail-open)', async () => {
    mockCallable.mockRejectedValue(new Error('unavailable'));

    await expect(
      applyServerProVerification({
        productId: 'word_guess_pro',
        purchaseToken: 'tok',
      }),
    ).resolves.toBe('failed');

    expect(mockSetPro).not.toHaveBeenCalled();
  });

  it('does not clear Pro when the server confirms purchased', async () => {
    mockCallable.mockResolvedValue({ data: { state: 'purchased' } });

    await expect(
      applyServerProVerification({
        productId: 'word_guess_pro',
        purchaseToken: 'tok',
      }),
    ).resolves.toBe('purchased');

    expect(mockSetPro).not.toHaveBeenCalled();
  });
});
