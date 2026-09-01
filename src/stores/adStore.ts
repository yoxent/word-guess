import { create } from 'zustand';
import {
  LevelPlay,
  LevelPlayInitRequest,
  LevelPlayInterstitialAd,
  LevelPlayPrivacySettings,
  LevelPlayRewardedAd,
} from 'unity-levelplay-mediation';
import type {
  LevelPlayInterstitialAdListener,
  LevelPlayRewardedAdListener,
} from 'unity-levelplay-mediation';
import {
  getInterstitialAdId,
  getLevelPlayAppKey,
  getRewardedExtraRowsAdId,
  getRewardedLetterHintAdId,
  PRODUCTION_INTERSTITIAL_ID,
  PRODUCTION_LEVELPLAY_APP_KEY,
  PRODUCTION_REWARDED_EXTRA_ROWS_ID,
  PRODUCTION_REWARDED_LETTER_HINT_ID,
} from '../services/remoteConfig';
import type { HelperAdFormat } from '../utils/adFormat';

function resolveInterstitialUnitId(): string {
  return getInterstitialAdId().trim() || PRODUCTION_INTERSTITIAL_ID;
}

function resolveExtraAttemptUnitId(): string {
  return getRewardedExtraRowsAdId().trim() || PRODUCTION_REWARDED_EXTRA_ROWS_ID;
}

function resolveLetterHintUnitId(): string {
  return getRewardedLetterHintAdId().trim() || PRODUCTION_REWARDED_LETTER_HINT_ID;
}

// ---------------------------------------------------------------------------
// Module-level ad instances — stored outside Zustand (not serializable)
// ---------------------------------------------------------------------------
let interstitialAd: LevelPlayInterstitialAd | null = null;
let extraAttemptAd: LevelPlayRewardedAd | null = null;
let letterHintAd: LevelPlayRewardedAd | null = null;

let interstitialRetryTimer: ReturnType<typeof setTimeout> | null = null;
let extraAttemptRetryTimer: ReturnType<typeof setTimeout> | null = null;
let letterHintRetryTimer: ReturnType<typeof setTimeout> | null = null;
let interstitialLoadWatchdog: ReturnType<typeof setTimeout> | null = null;
let extraAttemptLoadWatchdog: ReturnType<typeof setTimeout> | null = null;
let letterHintLoadWatchdog: ReturnType<typeof setTimeout> | null = null;

const RETRY_BASE_MS = 2_000;
const RETRY_MAX_MS = 30_000;
const LOAD_TIMEOUT_MS = 30_000;

let interstitialRetryAttempt = 0;
let extraAttemptRetryAttempt = 0;
let letterHintRetryAttempt = 0;

let pendingExtraAttemptReward: (() => void) | null = null;
let pendingLetterHintReward: (() => void) | null = null;

let sdkReady = false;
let initInFlight: Promise<boolean> | null = null;

function retryDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
}

function clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
  if (timer) clearTimeout(timer);
}

async function destroyAd(
  ad: LevelPlayInterstitialAd | LevelPlayRewardedAd | null,
): Promise<void> {
  if (!ad) return;
  try {
    await ad.remove();
  } catch {
    // ignore native teardown errors
  }
}

function clearInterstitialRetry(): void {
  clearTimer(interstitialRetryTimer);
  interstitialRetryTimer = null;
}

function clearExtraAttemptRetry(): void {
  clearTimer(extraAttemptRetryTimer);
  extraAttemptRetryTimer = null;
}

function clearLetterHintRetry(): void {
  clearTimer(letterHintRetryTimer);
  letterHintRetryTimer = null;
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

function scheduleExtraAttemptRetry(): void {
  clearExtraAttemptRetry();
  const delay = retryDelayMs(extraAttemptRetryAttempt);
  extraAttemptRetryAttempt += 1;
  extraAttemptRetryTimer = setTimeout(() => {
    extraAttemptRetryTimer = null;
    void useAdStore.getState().preloadExtraAttempt();
  }, delay);
}

function scheduleLetterHintRetry(): void {
  clearLetterHintRetry();
  const delay = retryDelayMs(letterHintRetryAttempt);
  letterHintRetryAttempt += 1;
  letterHintRetryTimer = setTimeout(() => {
    letterHintRetryTimer = null;
    void useAdStore.getState().preloadLetterHint();
  }, delay);
}

async function ensureSdkReady(): Promise<boolean> {
  if (sdkReady) return true;
  if (initInFlight) return initInFlight;

  initInFlight = (async () => {
    try {
      // COPPA must be set before init. App is 13+.
      await LevelPlayPrivacySettings.setCOPPA(false);
      if (__DEV__) {
        await LevelPlay.setAdaptersDebug(true);
      }

      const appKey = getLevelPlayAppKey().trim() || PRODUCTION_LEVELPLAY_APP_KEY;
      if (__DEV__) {
        console.log('[ads] LevelPlay init starting', {
          appKey,
          interstitial: resolveInterstitialUnitId(),
          extraAttempt: resolveExtraAttemptUnitId(),
          letterHint: resolveLetterHintUnitId(),
        });
      }
      const initRequest = LevelPlayInitRequest.builder(appKey).build();

      await new Promise<void>((resolve, reject) => {
        const initTimeout = setTimeout(() => {
          reject(new Error('LevelPlay init timed out after 20s'));
        }, 20_000);
        void LevelPlay.init(initRequest, {
          onInitSuccess: (configuration) => {
            clearTimeout(initTimeout);
            if (__DEV__) {
              console.log('[ads] LevelPlay init success', configuration);
              void LevelPlay.validateIntegration();
            }
            resolve();
          },
          onInitFailed: (error) => {
            clearTimeout(initTimeout);
            reject(
              new Error(
                error.errorMessage ||
                  `LevelPlay init failed (${error.errorCode ?? 'unknown'})`,
              ),
            );
          },
        }).catch((error) => {
          clearTimeout(initTimeout);
          reject(error);
        });
      });

      sdkReady = true;
      return true;
    } catch (error) {
      if (__DEV__) {
        console.warn('[ads] LevelPlay init failed', error);
      }
      initInFlight = null;
      return false;
    }
  })();

  return initInFlight;
}

function interstitialListener(): LevelPlayInterstitialAdListener {
  return {
    onAdLoaded: () => {
      interstitialRetryAttempt = 0;
      clearInterstitialRetry();
      if (interstitialLoadWatchdog) {
        clearTimeout(interstitialLoadWatchdog);
        interstitialLoadWatchdog = null;
      }
      useAdStore.setState({
        interstitialLoaded: true,
        interstitialLoading: false,
      });
    },
    onAdLoadFailed: (error) => {
      if (__DEV__) {
        console.warn(
          '[ads] interstitial load failed',
          error.errorCode,
          error.errorMessage,
        );
      }
      if (interstitialLoadWatchdog) {
        clearTimeout(interstitialLoadWatchdog);
        interstitialLoadWatchdog = null;
      }
      useAdStore.setState({
        interstitialLoaded: false,
        interstitialLoading: false,
      });
      scheduleInterstitialRetry();
    },
    onAdDisplayed: () => {},
    onAdDisplayFailed: () => {
      useAdStore.setState({
        interstitialLoaded: false,
        interstitialLoading: false,
      });
      void useAdStore.getState().preloadInterstitial();
    },
    onAdClosed: () => {
      useAdStore.setState({ interstitialLoaded: false });
      void useAdStore.getState().preloadInterstitial();
    },
  };
}

function extraAttemptListener(): LevelPlayRewardedAdListener {
  return {
    onAdLoaded: () => {
      extraAttemptRetryAttempt = 0;
      clearExtraAttemptRetry();
      if (extraAttemptLoadWatchdog) {
        clearTimeout(extraAttemptLoadWatchdog);
        extraAttemptLoadWatchdog = null;
      }
      useAdStore.setState({
        extraAttemptLoaded: true,
        extraAttemptLoading: false,
      });
      if (__DEV__) {
        console.log('[ads] extra-attempt loaded');
      }
    },
    onAdLoadFailed: (error) => {
      if (__DEV__) {
        console.warn(
          '[ads] extra-attempt load failed',
          error.errorCode,
          error.errorMessage,
        );
      }
      if (extraAttemptLoadWatchdog) {
        clearTimeout(extraAttemptLoadWatchdog);
        extraAttemptLoadWatchdog = null;
      }
      useAdStore.setState({
        extraAttemptLoaded: false,
        extraAttemptLoading: false,
      });
      scheduleExtraAttemptRetry();
    },
    onAdDisplayed: () => {},
    onAdRewarded: () => {
      pendingExtraAttemptReward?.();
      pendingExtraAttemptReward = null;
    },
    onAdDisplayFailed: () => {
      pendingExtraAttemptReward = null;
      useAdStore.setState({
        extraAttemptLoaded: false,
        extraAttemptLoading: false,
      });
      void useAdStore.getState().preloadExtraAttempt();
    },
    onAdClosed: () => {
      useAdStore.setState({ extraAttemptLoaded: false });
      void useAdStore.getState().preloadExtraAttempt();
    },
  };
}

function letterHintListener(): LevelPlayRewardedAdListener {
  return {
    onAdLoaded: () => {
      letterHintRetryAttempt = 0;
      clearLetterHintRetry();
      if (letterHintLoadWatchdog) {
        clearTimeout(letterHintLoadWatchdog);
        letterHintLoadWatchdog = null;
      }
      useAdStore.setState({
        letterHintLoaded: true,
        letterHintLoading: false,
      });
      if (__DEV__) {
        console.log('[ads] letter-hint loaded');
      }
    },
    onAdLoadFailed: (error) => {
      if (__DEV__) {
        console.warn(
          '[ads] letter-hint load failed',
          error.errorCode,
          error.errorMessage,
        );
      }
      if (letterHintLoadWatchdog) {
        clearTimeout(letterHintLoadWatchdog);
        letterHintLoadWatchdog = null;
      }
      useAdStore.setState({
        letterHintLoaded: false,
        letterHintLoading: false,
      });
      scheduleLetterHintRetry();
    },
    onAdDisplayed: () => {},
    onAdRewarded: () => {
      pendingLetterHintReward?.();
      pendingLetterHintReward = null;
    },
    onAdDisplayFailed: () => {
      pendingLetterHintReward = null;
      useAdStore.setState({
        letterHintLoaded: false,
        letterHintLoading: false,
      });
      void useAdStore.getState().preloadLetterHint();
    },
    onAdClosed: () => {
      useAdStore.setState({ letterHintLoaded: false });
      void useAdStore.getState().preloadLetterHint();
    },
  };
}

export interface AdStoreState {
  interstitialLoaded: boolean;
  interstitialLoading: boolean;
  extraAttemptLoaded: boolean;
  extraAttemptLoading: boolean;
  letterHintLoaded: boolean;
  letterHintLoading: boolean;
  gamesSinceLastAd: number;

  initAds: () => Promise<void>;
  preloadInterstitial: () => Promise<void>;
  preloadExtraAttempt: () => Promise<void>;
  preloadLetterHint: () => Promise<void>;
  showInterstitial: () => Promise<boolean>;
  showExtraAttempt: (onRewarded: () => void) => Promise<boolean>;
  showLetterHint: (onRewarded: () => void) => Promise<boolean>;
  showHelperAd: (
    format: HelperAdFormat,
    onRewarded: () => void,
  ) => Promise<boolean>;
  isHelperAdReady: (format: HelperAdFormat) => boolean;
  incrementGamesSinceLastAd: () => void;
  resetGamesSinceLastAd: () => void;
  ensureExtraAttemptReady: () => void;
  ensureLetterHintReady: () => void;
  ensureHelperAdsReady: () => void;
  reset: () => void;
}

export const useAdStore = create<AdStoreState>()((set, get) => ({
  interstitialLoaded: false,
  interstitialLoading: false,
  extraAttemptLoaded: false,
  extraAttemptLoading: false,
  letterHintLoaded: false,
  letterHintLoading: false,
  gamesSinceLastAd: 0,

  initAds: async () => {
    const ready = await ensureSdkReady();
    if (!ready) return;
    void get().preloadInterstitial();
    void get().preloadExtraAttempt();
    void get().preloadLetterHint();
  },

  preloadInterstitial: async () => {
    if (get().interstitialLoaded || get().interstitialLoading) return;
    const ready = await ensureSdkReady();
    if (!ready) {
      scheduleInterstitialRetry();
      return;
    }
    if (get().interstitialLoaded || get().interstitialLoading) return;

    set({ interstitialLoading: true, interstitialLoaded: false });

    await destroyAd(interstitialAd);
    interstitialAd = new LevelPlayInterstitialAd(resolveInterstitialUnitId());
    interstitialAd.setListener(interstitialListener());

    if (interstitialLoadWatchdog) {
      clearTimeout(interstitialLoadWatchdog);
    }
    interstitialLoadWatchdog = setTimeout(() => {
      interstitialLoadWatchdog = null;
      if (get().interstitialLoading && !get().interstitialLoaded) {
        if (__DEV__) {
          console.warn(
            '[ads] interstitial load timed out',
            resolveInterstitialUnitId(),
          );
        }
        set({ interstitialLoading: false, interstitialLoaded: false });
        scheduleInterstitialRetry();
      }
    }, LOAD_TIMEOUT_MS);

    try {
      if (__DEV__) {
        console.log('[ads] interstitial load start', resolveInterstitialUnitId());
      }
      await interstitialAd.loadAd();
    } catch {
      if (interstitialLoadWatchdog) {
        clearTimeout(interstitialLoadWatchdog);
        interstitialLoadWatchdog = null;
      }
      set({ interstitialLoading: false, interstitialLoaded: false });
      scheduleInterstitialRetry();
    }
  },

  preloadExtraAttempt: async () => {
    if (get().extraAttemptLoaded || get().extraAttemptLoading) return;
    const ready = await ensureSdkReady();
    if (!ready) {
      scheduleExtraAttemptRetry();
      return;
    }
    if (get().extraAttemptLoaded || get().extraAttemptLoading) return;

    set({ extraAttemptLoading: true, extraAttemptLoaded: false });

    await destroyAd(extraAttemptAd);
    extraAttemptAd = new LevelPlayRewardedAd(resolveExtraAttemptUnitId());
    extraAttemptAd.setListener(extraAttemptListener());

    if (extraAttemptLoadWatchdog) {
      clearTimeout(extraAttemptLoadWatchdog);
    }
    extraAttemptLoadWatchdog = setTimeout(() => {
      extraAttemptLoadWatchdog = null;
      if (get().extraAttemptLoading && !get().extraAttemptLoaded) {
        if (__DEV__) {
          console.warn(
            '[ads] extra-attempt load timed out',
            resolveExtraAttemptUnitId(),
          );
        }
        set({ extraAttemptLoading: false, extraAttemptLoaded: false });
        scheduleExtraAttemptRetry();
      }
    }, LOAD_TIMEOUT_MS);

    try {
      if (__DEV__) {
        console.log('[ads] extra-attempt load start', resolveExtraAttemptUnitId());
      }
      await extraAttemptAd.loadAd();
    } catch {
      if (extraAttemptLoadWatchdog) {
        clearTimeout(extraAttemptLoadWatchdog);
        extraAttemptLoadWatchdog = null;
      }
      set({ extraAttemptLoading: false, extraAttemptLoaded: false });
      scheduleExtraAttemptRetry();
    }
  },

  preloadLetterHint: async () => {
    if (get().letterHintLoaded || get().letterHintLoading) return;
    const ready = await ensureSdkReady();
    if (!ready) {
      scheduleLetterHintRetry();
      return;
    }
    if (get().letterHintLoaded || get().letterHintLoading) return;

    set({ letterHintLoading: true, letterHintLoaded: false });

    await destroyAd(letterHintAd);
    letterHintAd = new LevelPlayRewardedAd(resolveLetterHintUnitId());
    letterHintAd.setListener(letterHintListener());

    if (letterHintLoadWatchdog) {
      clearTimeout(letterHintLoadWatchdog);
    }
    letterHintLoadWatchdog = setTimeout(() => {
      letterHintLoadWatchdog = null;
      if (get().letterHintLoading && !get().letterHintLoaded) {
        if (__DEV__) {
          console.warn(
            '[ads] letter-hint load timed out',
            resolveLetterHintUnitId(),
          );
        }
        set({ letterHintLoading: false, letterHintLoaded: false });
        scheduleLetterHintRetry();
      }
    }, LOAD_TIMEOUT_MS);

    try {
      if (__DEV__) {
        console.log('[ads] letter-hint load start', resolveLetterHintUnitId());
      }
      await letterHintAd.loadAd();
    } catch {
      if (letterHintLoadWatchdog) {
        clearTimeout(letterHintLoadWatchdog);
        letterHintLoadWatchdog = null;
      }
      set({ letterHintLoading: false, letterHintLoaded: false });
      scheduleLetterHintRetry();
    }
  },

  showInterstitial: async () => {
    if (!get().interstitialLoaded || !interstitialAd) return false;
    try {
      if (!(await interstitialAd.isAdReady())) return false;
      await interstitialAd.showAd();
      return true;
    } catch {
      set({ interstitialLoaded: false, interstitialLoading: false });
      void get().preloadInterstitial();
      return false;
    }
  },

  showExtraAttempt: async (onRewarded) => {
    if (!get().extraAttemptLoaded || !extraAttemptAd) return false;
    try {
      if (!(await extraAttemptAd.isAdReady())) return false;
      pendingExtraAttemptReward = onRewarded;
      await extraAttemptAd.showAd();
      return true;
    } catch {
      pendingExtraAttemptReward = null;
      set({ extraAttemptLoaded: false, extraAttemptLoading: false });
      void get().preloadExtraAttempt();
      return false;
    }
  },

  showLetterHint: async (onRewarded) => {
    if (!get().letterHintLoaded || !letterHintAd) return false;
    try {
      if (!(await letterHintAd.isAdReady())) return false;
      pendingLetterHintReward = onRewarded;
      await letterHintAd.showAd();
      return true;
    } catch {
      pendingLetterHintReward = null;
      set({ letterHintLoaded: false, letterHintLoading: false });
      void get().preloadLetterHint();
      return false;
    }
  },

  isHelperAdReady: (format) => {
    if (format === 'extra_attempt') return get().extraAttemptLoaded;
    return get().letterHintLoaded;
  },

  showHelperAd: async (format, onRewarded) => {
    if (format === 'extra_attempt') {
      return get().showExtraAttempt(onRewarded);
    }
    return get().showLetterHint(onRewarded);
  },

  incrementGamesSinceLastAd: () => {
    set((s) => ({ gamesSinceLastAd: s.gamesSinceLastAd + 1 }));
  },

  resetGamesSinceLastAd: () => {
    set({ gamesSinceLastAd: 0 });
  },

  ensureExtraAttemptReady: () => {
    // Do not tear down an in-flight load — GameScreen mount and AppState
    // resume run this while initAds preloads are still waiting on onAdLoaded.
    void get().preloadExtraAttempt();
  },

  ensureLetterHintReady: () => {
    void get().preloadLetterHint();
  },

  ensureHelperAdsReady: () => {
    get().ensureExtraAttemptReady();
    get().ensureLetterHintReady();
  },

  reset: () => {
    clearInterstitialRetry();
    clearExtraAttemptRetry();
    clearLetterHintRetry();
    if (interstitialLoadWatchdog) {
      clearTimeout(interstitialLoadWatchdog);
      interstitialLoadWatchdog = null;
    }
    if (extraAttemptLoadWatchdog) {
      clearTimeout(extraAttemptLoadWatchdog);
      extraAttemptLoadWatchdog = null;
    }
    if (letterHintLoadWatchdog) {
      clearTimeout(letterHintLoadWatchdog);
      letterHintLoadWatchdog = null;
    }
    void destroyAd(interstitialAd);
    void destroyAd(extraAttemptAd);
    void destroyAd(letterHintAd);
    interstitialAd = null;
    extraAttemptAd = null;
    letterHintAd = null;
    pendingExtraAttemptReward = null;
    pendingLetterHintReward = null;
    interstitialRetryAttempt = 0;
    extraAttemptRetryAttempt = 0;
    letterHintRetryAttempt = 0;
    set({
      interstitialLoaded: false,
      interstitialLoading: false,
      extraAttemptLoaded: false,
      extraAttemptLoading: false,
      letterHintLoaded: false,
      letterHintLoading: false,
      gamesSinceLastAd: 0,
    });
  },
}));
