import { TestIds } from 'react-native-google-mobile-ads';
import remoteConfig from '@react-native-firebase/remote-config';

// Default test IDs used when Remote Config fetch fails or in dev (D-108)
const DEFAULT_INTERSTITIAL_ID = __DEV__ ? TestIds.INTERSTITIAL : '';
const DEFAULT_REWARDED_ID = __DEV__ ? TestIds.REWARDED : '';

let fetched = false;

/**
 * Fetch and activate Remote Config values from Firebase.
 * Fire-and-forget — call on app launch, does not block startup.
 * Falls back silently to compiled-in test IDs on failure (D-108).
 */
export async function fetchAdUnitIds(): Promise<void> {
  try {
    await remoteConfig().fetchAndActivate();
    fetched = true;
  } catch {
    // Fallback to test IDs on failure (D-108)
    fetched = false;
  }
}

/**
 * Returns the interstitial ad unit ID.
 * - In development (`__DEV__`): always uses Google test ad ID
 * - In production: reads from Remote Config key `admob_interstitial_id`
 * - Falls back to empty string if Remote Config fetch hasn't completed
 */
export function getInterstitialAdId(): string {
  if (__DEV__) return TestIds.INTERSTITIAL;
  if (!fetched) return DEFAULT_INTERSTITIAL_ID;
  try {
    return (
      remoteConfig().getValue('admob_interstitial_id').asString() ||
      DEFAULT_INTERSTITIAL_ID
    );
  } catch {
    return DEFAULT_INTERSTITIAL_ID;
  }
}

/**
 * Returns the rewarded ad unit ID.
 * - In development (`__DEV__`): always uses Google test ad ID
 * - In production: reads from Remote Config key `admob_rewarded_id`
 * - Falls back to empty string if Remote Config fetch hasn't completed
 */
export function getRewardedAdId(): string {
  if (__DEV__) return TestIds.REWARDED;
  if (!fetched) return DEFAULT_REWARDED_ID;
  try {
    return (
      remoteConfig().getValue('admob_rewarded_id').asString() ||
      DEFAULT_REWARDED_ID
    );
  } catch {
    return DEFAULT_REWARDED_ID;
  }
}
