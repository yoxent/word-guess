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

type FakeRewarded = {
  adUnitId: string;
  listener: {
    onAdLoaded?: (info?: unknown) => void;
    onAdLoadFailed?: (error?: unknown) => void;
  } | null;
  removed: boolean;
};

const mediation = LevelPlay as typeof LevelPlay & {
  __testRewardedAds: FakeRewarded[];
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
