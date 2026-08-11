import { create } from 'zustand';
import {
  InterstitialAd,
  RewardedAd,
  RewardedInterstitialAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {
  getInterstitialAdId,
  getRewardedAdId,
  getRewardedInterstitialAdId,
  PRODUCTION_INTERSTITIAL_ID,
  PRODUCTION_REWARDED_ID,
  PRODUCTION_REWARDED_INTERSTITIAL_ID,
} from '../services/remoteConfig';
import type { HelperAdFormat } from '../utils/adFormat';

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

function resolveRewardedInterstitialUnitId(): string {
  const id = getRewardedInterstitialAdId().trim();
  return id || PRODUCTION_REWARDED_INTERSTITIAL_ID;
}

// ---------------------------------------------------------------------------
// Module-level ad instances — stored outside Zustand (not serializable)
// ---------------------------------------------------------------------------
let interstitialAd: InterstitialAd | null = null;
let rewardedAd: RewardedAd | null = null;
let rewardedInterstitialAd: RewardedInterstitialAd | null = null;

// Unsubscribe closures so we can clean up listeners on re-preload
let interstitialUnsubscribe: (() => void) | null = null;
let rewardedUnsubscribe: (() => void) | null = null;
let rewardedInterstitialUnsubscribe: (() => void) | null = null;

let interstitialRetryTimer: ReturnType<typeof setTimeout> | null = null;
let rewardedRetryTimer: ReturnType<typeof setTimeout> | null = null;
let rewardedInterstitialRetryTimer: ReturnType<typeof setTimeout> | null = null;
let interstitialLoadWatchdog: ReturnType<typeof setTimeout> | null = null;
let rewardedLoadWatchdog: ReturnType<typeof setTimeout> | null = null;
let rewardedInterstitialLoadWatchdog: ReturnType<typeof setTimeout> | null =
  null;

const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;
const LOAD_TIMEOUT_MS = 30_000;

let interstitialRetryAttempt = 0;
let rewardedRetryAttempt = 0;
let rewardedInterstitialRetryAttempt = 0;

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

function cleanupRewardedInterstitial(): void {
  if (rewardedInterstitialUnsubscribe) {
    rewardedInterstitialUnsubscribe();
    rewardedInterstitialUnsubscribe = null;
  }
  if (rewardedInterstitialLoadWatchdog) {
    clearTimeout(rewardedInterstitialLoadWatchdog);
    rewardedInterstitialLoadWatchdog = null;
  }
  if (rewardedInterstitialAd) {
    rewardedInterstitialAd.removeAllListeners();
    rewardedInterstitialAd = null;
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

function clearRewardedInterstitialRetry(): void {
  if (rewardedInterstitialRetryTimer) {
    clearTimeout(rewardedInterstitialRetryTimer);
    rewardedInterstitialRetryTimer = null;
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

function scheduleRewardedInterstitialRetry(): void {
  clearRewardedInterstitialRetry();
  const delay = retryDelayMs(rewardedInterstitialRetryAttempt);
  rewardedInterstitialRetryAttempt += 1;
  rewardedInterstitialRetryTimer = setTimeout(() => {
    rewardedInterstitialRetryTimer = null;
    void useAdStore.getState().preloadRewardedInterstitial();
  }, delay);
}

async function showLoadedRewarded(
  ad: RewardedAd | RewardedInterstitialAd,
  onRewarded: () => void,
  onClosed: () => void,
  onShowFailed: () => void,
): Promise<boolean> {
  const earnedUnsubscribe = ad.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    () => {
      onRewarded();
    },
  );

  const closedUnsubscribe = ad.addAdEventListener(AdEventType.CLOSED, () => {
    earnedUnsubscribe();
    closedUnsubscribe();
    onClosed();
  });

  try {
    await ad.show();
    return true;
  } catch {
    earnedUnsubscribe();
    closedUnsubscribe();
    onShowFailed();
    return false;
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
  rewardedInterstitialLoaded: boolean;
  rewardedInterstitialLoading: boolean;
  gamesSinceLastAd: number;

  preloadInterstitial: () => Promise<void>;
  preloadRewarded: () => Promise<void>;
  preloadRewardedInterstitial: () => Promise<void>;
  showInterstitial: () => Promise<boolean>;
  showRewarded: (onRewarded: () => void) => Promise<boolean>;
  showRewardedInterstitial: (onRewarded: () => void) => Promise<boolean>;
  /**
   * Show the preferred helper format; RI falls back to RV when RI is not loaded (D-195).
   * Returns whether an ad was shown (not whether reward was earned).
   */
  showHelperAd: (
    format: HelperAdFormat,
    onRewarded: () => void,
  ) => Promise<boolean>;
  /** True when a show path for this format is available (RI may use RV fallback). */
  isHelperAdReady: (format: HelperAdFormat) => boolean;
  incrementGamesSinceLastAd: () => void;
  resetGamesSinceLastAd: () => void;
  /** Force a rewarded reload even if a prior load appears stuck. */
  ensureRewardedReady: () => void;
  ensureRewardedInterstitialReady: () => void;
  /** Nudge both helper formats after background / on game entry. */
  ensureHelperAdsReady: () => void;
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
  rewardedInterstitialLoaded: false,
  rewardedInterstitialLoading: false,
  gamesSinceLastAd: 0,

  preloadInterstitial: async () => {
    if (get().interstitialLoaded || get().interstitialLoading) return;

    set({ interstitialLoading: true, interstitialLoaded: false });

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
      set({ interstitialLoaded: false });
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
    if (get().rewardedLoaded || get().rewardedLoading) return;

    set({ rewardedLoading: true, rewardedLoaded: false });

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

  preloadRewardedInterstitial: async () => {
    if (
      get().rewardedInterstitialLoaded ||
      get().rewardedInterstitialLoading
    ) {
      return;
    }

    set({
      rewardedInterstitialLoading: true,
      rewardedInterstitialLoaded: false,
    });

    cleanupRewardedInterstitial();

    const adUnitId = resolveRewardedInterstitialUnitId();
    rewardedInterstitialAd =
      RewardedInterstitialAd.createForAdRequest(adUnitId);

    rewardedInterstitialUnsubscribe =
      rewardedInterstitialAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          rewardedInterstitialRetryAttempt = 0;
          clearRewardedInterstitialRetry();
          if (rewardedInterstitialLoadWatchdog) {
            clearTimeout(rewardedInterstitialLoadWatchdog);
            rewardedInterstitialLoadWatchdog = null;
          }
          set({
            rewardedInterstitialLoaded: true,
            rewardedInterstitialLoading: false,
          });
        },
      );

    rewardedInterstitialAd.addAdEventListener(AdEventType.ERROR, () => {
      if (rewardedInterstitialLoadWatchdog) {
        clearTimeout(rewardedInterstitialLoadWatchdog);
        rewardedInterstitialLoadWatchdog = null;
      }
      set({
        rewardedInterstitialLoaded: false,
        rewardedInterstitialLoading: false,
      });
      scheduleRewardedInterstitialRetry();
    });

    rewardedInterstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      set({ rewardedInterstitialLoaded: false });
      get().preloadRewardedInterstitial();
    });

    rewardedInterstitialLoadWatchdog = setTimeout(() => {
      rewardedInterstitialLoadWatchdog = null;
      if (
        get().rewardedInterstitialLoading &&
        !get().rewardedInterstitialLoaded
      ) {
        set({
          rewardedInterstitialLoading: false,
          rewardedInterstitialLoaded: false,
        });
        scheduleRewardedInterstitialRetry();
      }
    }, LOAD_TIMEOUT_MS);

    rewardedInterstitialAd.load();
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
    return showLoadedRewarded(
      ad,
      onRewarded,
      () => {
        set({ rewardedLoaded: false });
        get().preloadRewarded();
      },
      () => {
        set({ rewardedLoaded: false, rewardedLoading: false });
        void get().preloadRewarded();
      },
    );
  },

  showRewardedInterstitial: async (onRewarded: () => void) => {
    if (!get().rewardedInterstitialLoaded || !rewardedInterstitialAd) {
      return false;
    }

    const ad = rewardedInterstitialAd;
    return showLoadedRewarded(
      ad,
      onRewarded,
      () => {
        set({ rewardedInterstitialLoaded: false });
        get().preloadRewardedInterstitial();
      },
      () => {
        set({
          rewardedInterstitialLoaded: false,
          rewardedInterstitialLoading: false,
        });
        void get().preloadRewardedInterstitial();
      },
    );
  },

  isHelperAdReady: (format: HelperAdFormat) => {
    const { rewardedLoaded, rewardedInterstitialLoaded } = get();
    if (format === 'rewarded') return rewardedLoaded;
    return rewardedInterstitialLoaded || rewardedLoaded;
  },

  showHelperAd: async (format, onRewarded) => {
    if (format === 'rewarded') {
      return get().showRewarded(onRewarded);
    }

    if (get().rewardedInterstitialLoaded) {
      return get().showRewardedInterstitial(onRewarded);
    }

    // D-195: RI fill miss → fall back to RV so helpers do not soft-lock
    if (get().rewardedLoaded) {
      return get().showRewarded(onRewarded);
    }

    return false;
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
      set({ rewardedLoading: false });
      cleanupRewarded();
    }
    clearRewardedRetry();
    void get().preloadRewarded();
  },

  ensureRewardedInterstitialReady: () => {
    const { rewardedInterstitialLoaded, rewardedInterstitialLoading } = get();
    if (rewardedInterstitialLoaded) return;
    if (rewardedInterstitialLoading) {
      set({ rewardedInterstitialLoading: false });
      cleanupRewardedInterstitial();
    }
    clearRewardedInterstitialRetry();
    void get().preloadRewardedInterstitial();
  },

  ensureHelperAdsReady: () => {
    get().ensureRewardedReady();
    get().ensureRewardedInterstitialReady();
  },

  reset: () => {
    clearInterstitialRetry();
    clearRewardedRetry();
    clearRewardedInterstitialRetry();
    cleanupInterstitial();
    cleanupRewarded();
    cleanupRewardedInterstitial();
    interstitialRetryAttempt = 0;
    rewardedRetryAttempt = 0;
    rewardedInterstitialRetryAttempt = 0;
    set({
      interstitialLoaded: false,
      interstitialLoading: false,
      rewardedLoaded: false,
      rewardedLoading: false,
      rewardedInterstitialLoaded: false,
      rewardedInterstitialLoading: false,
      gamesSinceLastAd: 0,
    });
  },
}));
