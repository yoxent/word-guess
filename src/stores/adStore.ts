import { create } from 'zustand';
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {
  getInterstitialAdId,
  getRewardedAdId,
  PRODUCTION_INTERSTITIAL_ID,
  PRODUCTION_REWARDED_ID,
} from '../services/remoteConfig';

function resolveInterstitialUnitId(): string {
  const id = getInterstitialAdId().trim();
  // Never fall back to Google test ads in release — that is what made
  // Play Store builds still show "Test Ad" creatives.
  return id || PRODUCTION_INTERSTITIAL_ID;
}

function resolveRewardedUnitId(): string {
  const id = getRewardedAdId().trim();
  return id || PRODUCTION_REWARDED_ID;
}

// ---------------------------------------------------------------------------
// Module-level ad instances — stored outside Zustand (not serializable)
// ---------------------------------------------------------------------------
let interstitialAd: InterstitialAd | null = null;
let rewardedAd: RewardedAd | null = null;

// Unsubscribe closures so we can clean up listeners on re-preload
let interstitialUnsubscribe: (() => void) | null = null;
let rewardedUnsubscribe: (() => void) | null = null;

let interstitialRetryTimer: ReturnType<typeof setTimeout> | null = null;
let rewardedRetryTimer: ReturnType<typeof setTimeout> | null = null;
let interstitialLoadWatchdog: ReturnType<typeof setTimeout> | null = null;
let rewardedLoadWatchdog: ReturnType<typeof setTimeout> | null = null;

const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;
const LOAD_TIMEOUT_MS = 30_000;

let interstitialRetryAttempt = 0;
let rewardedRetryAttempt = 0;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function cleanupInterstitial(): void {
  if (interstitialUnsubscribe) {
    interstitialUnsubscribe();
    interstitialUnsubscribe = null;
  }
  if (interstitialLoadWatchdog) {
    clearTimeout(interstitialLoadWatchdog);
    interstitialLoadWatchdog = null;
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
  if (rewardedLoadWatchdog) {
    clearTimeout(rewardedLoadWatchdog);
    rewardedLoadWatchdog = null;
  }
  if (rewardedAd) {
    rewardedAd.removeAllListeners();
    rewardedAd = null;
  }
}

function clearInterstitialRetry(): void {
  if (interstitialRetryTimer) {
    clearTimeout(interstitialRetryTimer);
    interstitialRetryTimer = null;
  }
}

function clearRewardedRetry(): void {
  if (rewardedRetryTimer) {
    clearTimeout(rewardedRetryTimer);
    rewardedRetryTimer = null;
  }
}

function retryDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
}

function scheduleInterstitialRetry(): void {
  clearInterstitialRetry();
  const delay = retryDelayMs(interstitialRetryAttempt);
  interstitialRetryAttempt += 1;
  interstitialRetryTimer = setTimeout(() => {
    interstitialRetryTimer = null;
    void useAdStore.getState().preloadInterstitial();
  }, delay);
}

function scheduleRewardedRetry(): void {
  clearRewardedRetry();
  const delay = retryDelayMs(rewardedRetryAttempt);
  rewardedRetryAttempt += 1;
  rewardedRetryTimer = setTimeout(() => {
    rewardedRetryTimer = null;
    void useAdStore.getState().preloadRewarded();
  }, delay);
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
  /** Force a rewarded reload even if a prior load appears stuck. */
  ensureRewardedReady: () => void;
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

    const adUnitId = resolveInterstitialUnitId();
    interstitialAd = InterstitialAd.createForAdRequest(adUnitId);

    interstitialUnsubscribe = interstitialAd.addAdEventListener(
      AdEventType.LOADED,
      () => {
        interstitialRetryAttempt = 0;
        clearInterstitialRetry();
        if (interstitialLoadWatchdog) {
          clearTimeout(interstitialLoadWatchdog);
          interstitialLoadWatchdog = null;
        }
        set({ interstitialLoaded: true, interstitialLoading: false });
      },
    );

    interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
      if (interstitialLoadWatchdog) {
        clearTimeout(interstitialLoadWatchdog);
        interstitialLoadWatchdog = null;
      }
      set({ interstitialLoaded: false, interstitialLoading: false });
      scheduleInterstitialRetry();
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      // Ad was dismissed — mark as not loaded so the next show() call
      // will need to preload first
      set({ interstitialLoaded: false });
      // Lazily preload the next interstitial
      get().preloadInterstitial();
    });

    interstitialLoadWatchdog = setTimeout(() => {
      interstitialLoadWatchdog = null;
      if (get().interstitialLoading && !get().interstitialLoaded) {
        set({ interstitialLoading: false, interstitialLoaded: false });
        scheduleInterstitialRetry();
      }
    }, LOAD_TIMEOUT_MS);

    interstitialAd.load();
  },

  preloadRewarded: async () => {
    // Don't re-load if already loaded or already loading
    if (get().rewardedLoaded || get().rewardedLoading) return;

    set({ rewardedLoading: true, rewardedLoaded: false });

    // Clean up any previous ad instance
    cleanupRewarded();

    const adUnitId = resolveRewardedUnitId();
    rewardedAd = RewardedAd.createForAdRequest(adUnitId);

    rewardedUnsubscribe = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        rewardedRetryAttempt = 0;
        clearRewardedRetry();
        if (rewardedLoadWatchdog) {
          clearTimeout(rewardedLoadWatchdog);
          rewardedLoadWatchdog = null;
        }
        set({ rewardedLoaded: true, rewardedLoading: false });
      },
    );

    rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
      if (rewardedLoadWatchdog) {
        clearTimeout(rewardedLoadWatchdog);
        rewardedLoadWatchdog = null;
      }
      set({ rewardedLoaded: false, rewardedLoading: false });
      scheduleRewardedRetry();
    });

    rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      set({ rewardedLoaded: false });
      // Lazily preload the next rewarded ad
      get().preloadRewarded();
    });

    rewardedLoadWatchdog = setTimeout(() => {
      rewardedLoadWatchdog = null;
      if (get().rewardedLoading && !get().rewardedLoaded) {
        set({ rewardedLoading: false, rewardedLoaded: false });
        scheduleRewardedRetry();
      }
    }, LOAD_TIMEOUT_MS);

    rewardedAd.load();
  },

  showInterstitial: async () => {
    if (!get().interstitialLoaded || !interstitialAd) return false;

    try {
      await interstitialAd.show();
      return true;
    } catch {
      set({ interstitialLoaded: false, interstitialLoading: false });
      void get().preloadInterstitial();
      return false;
    }
  },

  showRewarded: async (onRewarded: () => void) => {
    if (!get().rewardedLoaded || !rewardedAd) return false;

    const ad = rewardedAd;
    let rewardEarned = false;

    // Attach EARNED_REWARD listener
    const earnedUnsubscribe = ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        rewardEarned = true;
        onRewarded();
      },
    );

    // Attach CLOSED listener for cleanup
    const closedUnsubscribe = ad.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        earnedUnsubscribe();
        closedUnsubscribe();
        set({ rewardedLoaded: false });
        get().preloadRewarded();
      },
    );

    try {
      await ad.show();
      return true;
    } catch {
      earnedUnsubscribe();
      closedUnsubscribe();
      set({ rewardedLoaded: false, rewardedLoading: false });
      // Show can fail without CLOSED — recover so buttons do not stay inert.
      void get().preloadRewarded();
      return false;
    }
  },

  incrementGamesSinceLastAd: () => {
    set((s) => ({ gamesSinceLastAd: s.gamesSinceLastAd + 1 }));
  },

  resetGamesSinceLastAd: () => {
    set({ gamesSinceLastAd: 0 });
  },

  ensureRewardedReady: () => {
    const { rewardedLoaded, rewardedLoading } = get();
    if (rewardedLoaded) return;
    if (rewardedLoading) {
      // A prior load may be stuck with loading=true and no callback.
      // Clear the gate and try again.
      set({ rewardedLoading: false });
      cleanupRewarded();
    }
    clearRewardedRetry();
    void get().preloadRewarded();
  },

  reset: () => {
    clearInterstitialRetry();
    clearRewardedRetry();
    cleanupInterstitial();
    cleanupRewarded();
    interstitialRetryAttempt = 0;
    rewardedRetryAttempt = 0;
    set({
      interstitialLoaded: false,
      interstitialLoading: false,
      rewardedLoaded: false,
      rewardedLoading: false,
      gamesSinceLastAd: 0,
    });
  },
}));
