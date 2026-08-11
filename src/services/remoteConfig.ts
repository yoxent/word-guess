import { TestIds } from 'react-native-google-mobile-ads';
import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
} from '@react-native-firebase/remote-config';
import { isVersionBelow } from '../utils/semver';

/**
 * Production AdMob unit IDs (also published in Firebase Remote Config).
 * Baked in so release builds never fall through to Google test ads when
 * Remote Config has not finished fetching yet.
 */
export const PRODUCTION_INTERSTITIAL_ID =
  'ca-app-pub-4297882562709937/5589745315';
export const PRODUCTION_REWARDED_ID =
  'ca-app-pub-4297882562709937/8970431595';
/** D-195: letter hint + non-last extra attempts */
export const PRODUCTION_REWARDED_INTERSTITIAL_ID =
  'ca-app-pub-4297882562709937/6430297077';

const DEFAULT_INTERSTITIAL_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : PRODUCTION_INTERSTITIAL_ID;
const DEFAULT_REWARDED_ID = __DEV__
  ? TestIds.REWARDED
  : PRODUCTION_REWARDED_ID;
const DEFAULT_REWARDED_INTERSTITIAL_ID = __DEV__
  ? TestIds.REWARDED_INTERSTITIAL
  : PRODUCTION_REWARDED_INTERSTITIAL_ID;

/** In-app default when RC key missing/empty — never prompts for real versions. */
export const DEFAULT_MIN_SUPPORTED_VERSION = '0.0.0';

const rc = getRemoteConfig();

/**
 * Fetch and activate Remote Config values from Firebase.
 * Call before preloading ads. Getters always have live production
 * fallbacks even if this fetch fails.
 */
export async function fetchAdUnitIds(): Promise<void> {
  try {
    await fetchAndActivate(rc);
  } catch {
    // Keep compiled-in production IDs (D-108)
  }
}

/**
 * Returns the interstitial ad unit ID.
 * - In development (`__DEV__`): always uses Google test ad ID
 * - In production: Remote Config key `admob_interstitial_id`, else live default
 */
export function getInterstitialAdId(): string {
  if (__DEV__) return TestIds.INTERSTITIAL;
  try {
    const fromRc = getValue(rc, 'admob_interstitial_id').asString();
    if (fromRc) return fromRc;
  } catch {
    // fall through
  }
  return DEFAULT_INTERSTITIAL_ID;
}

/**
 * Returns the rewarded ad unit ID.
 * - In development (`__DEV__`): always uses Google test ad ID
 * - In production: Remote Config key `admob_rewarded_id`, else live default
 */
export function getRewardedAdId(): string {
  if (__DEV__) return TestIds.REWARDED;
  try {
    const fromRc = getValue(rc, 'admob_rewarded_id').asString();
    if (fromRc) return fromRc;
  } catch {
    // fall through
  }
  return DEFAULT_REWARDED_ID;
}

/**
 * Returns the rewarded interstitial ad unit ID (D-195).
 * - In development (`__DEV__`): always uses Google test ad ID
 * - In production: Remote Config key `admob_rewarded_interstitial_id`, else live default
 */
export function getRewardedInterstitialAdId(): string {
  if (__DEV__) return TestIds.REWARDED_INTERSTITIAL;
  try {
    const fromRc = getValue(rc, 'admob_rewarded_interstitial_id').asString();
    if (fromRc) return fromRc;
  } catch {
    // fall through
  }
  return DEFAULT_REWARDED_INTERSTITIAL_ID;
}

/**
 * Minimum supported app version from Remote Config (`min_supported_version`).
 * Empty / missing → `0.0.0` (fail-open: no update prompt for normal versions).
 */
export function getMinSupportedVersion(): string {
  try {
    const fromRc = getValue(rc, 'min_supported_version').asString()?.trim();
    if (fromRc) return fromRc;
  } catch {
    // fall through
  }
  return DEFAULT_MIN_SUPPORTED_VERSION;
}

/**
 * Whether the installed build is strictly below the Remote Config floor.
 * Fail-open: null/empty installed version → false (do not brick the app).
 */
export function isUpdateRequired(
  installedVersion: string | null | undefined,
): boolean {
  if (!installedVersion || !String(installedVersion).trim()) return false;
  return isVersionBelow(installedVersion, getMinSupportedVersion());
}
