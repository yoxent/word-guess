jest.mock('../../services/remoteConfig', () => ({
  getInterstitialAdId: () => 'interstitial',
  getLevelPlayAppKey: () => 'app-key',
  getRewardedExtraRowsAdId: () => 'extra-attempt',
  getRewardedLetterHintAdId: () => 'letter-hint',
  PRODUCTION_INTERSTITIAL_ID: 'interstitial',
  PRODUCTION_LEVELPLAY_APP_KEY: 'app-key',
  PRODUCTION_REWARDED_EXTRA_ROWS_ID: 'extra-attempt',
  PRODUCTION_REWARDED_LETTER_HINT_ID: 'letter-hint',
}));

import * as LevelPlay from 'unity-levelplay-mediation';
import { useAdStore } from '../adStore';

type FakeAd = {
  adUnitId: string;
  listener: {
    onAdLoaded?: (info?: unknown) => void;
    onAdLoadFailed?: (error?: unknown) => void;
    onAdDisplayed?: () => void;
    onAdDisplayFailed?: () => void;
    onAdClosed?: () => void;
  } | null;
  removed: boolean;
  ready: boolean;
  showError: Error | null;
};

const mediation = LevelPlay as typeof LevelPlay & {
  __testRewardedAds: FakeAd[];
  __testInterstitialAds: FakeAd[];
  __resetTestRewardedAds: () => void;
};

async function flushPreloads(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

describe('adStore helper loads', () => {
  beforeEach(() => {
    mediation.__resetTestRewardedAds();
    useAdStore.getState().reset();
  });

  afterEach(() => {
    useAdStore.getState().reset();
    mediation.__resetTestRewardedAds();
  });

  it('does not abort in-flight helper ads when entering play', async () => {
    await useAdStore.getState().initAds();
    await flushPreloads();

    expect(mediation.__testRewardedAds).toHaveLength(2);
    expect(useAdStore.getState().extraAttemptLoading).toBe(true);
    expect(useAdStore.getState().letterHintLoading).toBe(true);

    // GameScreen mount / AppState resume currently calls this while
    // initAds preloads are still waiting for onAdLoaded.
    useAdStore.getState().ensureHelperAdsReady();
    await flushPreloads();

    expect(mediation.__testRewardedAds).toHaveLength(2);
    expect(mediation.__testRewardedAds.every((ad) => !ad.removed)).toBe(true);

    for (const ad of mediation.__testRewardedAds) {
      ad.listener?.onAdLoaded?.({});
    }

    expect(useAdStore.getState().extraAttemptLoaded).toBe(true);
    expect(useAdStore.getState().letterHintLoaded).toBe(true);
  });

  it('starts helper loads when none are in flight', async () => {
    useAdStore.getState().ensureHelperAdsReady();
    await flushPreloads();

    expect(mediation.__testRewardedAds).toHaveLength(2);
    expect(useAdStore.getState().extraAttemptLoading).toBe(true);
    expect(useAdStore.getState().letterHintLoading).toBe(true);
  });
});

describe('adStore isAdShowing', () => {
  beforeEach(() => {
    mediation.__resetTestRewardedAds();
    useAdStore.getState().reset();
  });

  afterEach(() => {
    useAdStore.getState().reset();
    mediation.__resetTestRewardedAds();
  });

  async function loadInterstitial(): Promise<FakeAd> {
    await useAdStore.getState().initAds();
    await flushPreloads();
    const ad = mediation.__testInterstitialAds[0];
    ad.ready = true;
    ad.listener?.onAdLoaded?.({});
    return ad;
  }

  async function loadExtraAttempt(): Promise<FakeAd> {
    await useAdStore.getState().initAds();
    await flushPreloads();
    const ad = mediation.__testRewardedAds.find((item) => item.adUnitId === 'extra-attempt');
    if (!ad) throw new Error('extra-attempt ad missing');
    ad.ready = true;
    ad.listener?.onAdLoaded?.({});
    return ad;
  }

  it('starts idle', () => {
    expect(useAdStore.getState().isAdShowing).toBe(false);
  });

  it('is true after interstitial showAd and false after close', async () => {
    const ad = await loadInterstitial();
    const shown = await useAdStore.getState().showInterstitial();
    expect(shown).toBe(true);
    expect(useAdStore.getState().isAdShowing).toBe(true);

    ad.listener?.onAdClosed?.();
    expect(useAdStore.getState().isAdShowing).toBe(false);
  });

  it('is true after rewarded showAd and false after close', async () => {
    const ad = await loadExtraAttempt();
    const shown = await useAdStore.getState().showExtraAttempt(() => {});
    expect(shown).toBe(true);
    expect(useAdStore.getState().isAdShowing).toBe(true);

    ad.listener?.onAdClosed?.();
    expect(useAdStore.getState().isAdShowing).toBe(false);
  });

  it('clears when display fails', async () => {
    const ad = await loadInterstitial();
    await useAdStore.getState().showInterstitial();
    ad.listener?.onAdDisplayFailed?.();
    expect(useAdStore.getState().isAdShowing).toBe(false);
  });

  it('clears when showAd throws', async () => {
    const ad = await loadInterstitial();
    ad.showError = new Error('show failed');
    const shown = await useAdStore.getState().showInterstitial();
    expect(shown).toBe(false);
    expect(useAdStore.getState().isAdShowing).toBe(false);
  });

  it('stays idle when the ad is not ready', async () => {
    await useAdStore.getState().initAds();
    await flushPreloads();
    const ad = mediation.__testInterstitialAds[0];
    ad.ready = false;
    ad.listener?.onAdLoaded?.({});
    const shown = await useAdStore.getState().showInterstitial();
    expect(shown).toBe(false);
    expect(useAdStore.getState().isAdShowing).toBe(false);
  });
});
