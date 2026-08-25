export interface AdState {
  interstitialLoaded: boolean;
  interstitialLoading: boolean;
  extraAttemptLoaded: boolean;
  extraAttemptLoading: boolean;
  letterHintLoaded: boolean;
  letterHintLoading: boolean;
  gamesSinceLastAd: number;
}

export type RestoreResult =
  | { success: true; message: string }
  | { success: false; message: string };
