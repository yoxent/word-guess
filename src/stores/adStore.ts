import { create } from 'zustand';
import {
  InterstitialAd,
  RewardedAd,
  TestIds,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { getInterstitialAdId, getRewardedAdId } from '../services/remoteConfig';

// ---------------------------------------------------------------------------
// Module-level ad instances — stored outside Zustand (not serializable)
// ---------------------------------------------------------------------------
let interstitialAd: InterstitialAd | null = null;
let rewardedAd: RewardedAd | null = null;

// Unsubscribe closures so we can clean up listeners on re-preload
let interstitialUnsubscribe: (() => void) | null = null;
let rewardedUnsubscribe: (() => void) | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function cleanupInterstitial(): void {
  if (interstitialUnsubscribe) {
    interstitialUnsubscribe();
    interstitialUnsubscribe = null;
  }
  if (interstitialAd) {
    interstitialAd.removeAllListeners();
    interstitialAd = null;
  }
}

function cleanupRewarded(): void {
  if (rewardedUnsubscribe) {
    rewardedUnsubscribe();
    rewardedUnsubscribe = null;
  }
  if (rewardedAd) {
    rewardedAd.removeAllListeners();
    rewardedAd = null;
  }
}

// ---------------------------------------------------------------------------
// Store state interface
// ---------------------------------------------------------------------------

export interface AdStoreState {
  interstitialLoaded: boolean;
  interstitialLoading: boolean;
  rewardedLoaded: boolean;
  rewardedLoading: boolean;
  gamesSinceLastAd: number;

  preloadInterstitial: () => Promise<void>;
  preloadRewarded: () => Promise<void>;
  showInterstitial: () => Promise<boolean>;
  showRewarded: (onRewarded: () => void) => Promise<boolean>;
  incrementGamesSinceLastAd: () => void;
  resetGamesSinceLastAd: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

export const useAdStore = create<AdStoreState>()((set, get) => ({
  interstitialLoaded: false,
  interstitialLoading: false,
  rewardedLoaded: false,
  rewardedLoading: false,
  gamesSinceLastAd: 0,

  preloadInterstitial: async () => {
    // Don't re-load if already loaded or already loading
    if (get().interstitialLoaded || get().interstitialLoading) return;

    set({ interstitialLoading: true, interstitialLoaded: false });

    // Clean up any previous ad instance
    cleanupInterstitial();

    const adUnitId = getInterstitialAdId() || TestIds.INTERSTITIAL;
    interstitialAd = InterstitialAd.createForAdRequest(adUnitId);

    interstitialUnsubscribe = interstitialAd.addAdEventListener(
      AdEventType.LOADED,
      () => {
        set({ interstitialLoaded: true, interstitialLoading: false });
      },
    );

    interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
      set({ interstitialLoaded: false, interstitialLoading: false });
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      // Ad was dismissed — mark as not loaded so the next show() call
      // will need to preload first
      set({ interstitialLoaded: false });
      // Lazily preload the next interstitial
      get().preloadInterstitial();
    });

    interstitialAd.load();
  },

  preloadRewarded: async () => {
    // Don't re-load if already loaded or already loading
    if (get().rewardedLoaded || get().rewardedLoading) return;

    set({ rewardedLoading: true, rewardedLoaded: false });

    // Clean up any previous ad instance
    cleanupRewarded();

    const adUnitId = getRewardedAdId() || TestIds.REWARDED;
    rewardedAd = RewardedAd.createForAdRequest(adUnitId);

    rewardedUnsubscribe = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        set({ rewardedLoaded: true, rewardedLoading: false });
      },
    );

    rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
      set({ rewardedLoaded: false, rewardedLoading: false });
    });

    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      set({ rewardedLoaded: false });
      // Lazily preload the next rewarded ad
      get().preloadRewarded();
    });

    rewardedAd.load();
  },

  showInterstitial: async () => {
    if (!get().interstitialLoaded || !interstitialAd) return false;

    try {
      await interstitialAd.show();
      return true;
    } catch {
      set({ interstitialLoaded: false });
      return false;
    }
  },

  showRewarded: async (onRewarded: () => void) => {
    if (!get().rewardedLoaded || !rewardedAd) return false;

    // Attach the EARNED_REWARD listener just before showing
    const earnedUnsubscribe = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        onRewarded();
      },
    );

    try {
      await rewardedAd.show();
      // Clean up the one-shot EARNED_REWARD listener after showing
      earnedUnsubscribe();
      return true;
    } catch {
      earnedUnsubscribe();
      set({ rewardedLoaded: false });
      return false;
    }
  },

  incrementGamesSinceLastAd: () => {
    set((s) => ({ gamesSinceLastAd: s.gamesSinceLastAd + 1 }));
  },

  resetGamesSinceLastAd: () => {
    set({ gamesSinceLastAd: 0 });
  },

  reset: () => {
    cleanupInterstitial();
    cleanupRewarded();
    set({
      interstitialLoaded: false,
      interstitialLoading: false,
      rewardedLoaded: false,
      rewardedLoading: false,
      gamesSinceLastAd: 0,
    });
  },
}));
