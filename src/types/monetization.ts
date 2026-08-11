export interface AdState {
  interstitialLoaded: boolean;
  interstitialLoading: boolean;
  rewardedLoaded: boolean;
  rewardedLoading: boolean;
  rewardedInterstitialLoaded: boolean;
  rewardedInterstitialLoading: boolean;
  gamesSinceLastAd: number;
}

export type RestoreResult =
  | { success: true; message: string }
  | { success: false; message: string };
