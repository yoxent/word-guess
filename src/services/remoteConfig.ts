import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
} from '@react-native-firebase/remote-config';
import { isVersionBelow } from '../utils/semver';

/**
 * Production LevelPlay app key + ad unit IDs (also published in Firebase Remote Config).
 * Baked in so release builds never fall through to empty IDs when
 * Remote Config has not finished fetching yet.
 */
export const PRODUCTION_LEVELPLAY_APP_KEY = '27c77ea8d';
export const PRODUCTION_INTERSTITIAL_ID = 's30cnanav91qppyc';
export const PRODUCTION_REWARDED_EXTRA_ROWS_ID = 'hcokdlvoiili0xya';
export const PRODUCTION_REWARDED_LETTER_HINT_ID = 'yz51hy84w8m16lbc';

/** In-app default when RC key missing/empty — never prompts for real versions. */
export const DEFAULT_MIN_SUPPORTED_VERSION = '0.0.0';

const rc = getRemoteConfig();

function readRcString(key: string): string {
  try {
    return getValue(rc, key).asString()?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Fetch and activate Remote Config values from Firebase.
 * Call before initializing ads. Getters always have live production
 * fallbacks even if this fetch fails.
 */
export async function fetchAdUnitIds(): Promise<void> {
  try {
    await fetchAndActivate(rc);
  } catch {
    // Keep compiled-in production IDs
  }
}

/**
 * LevelPlay app key.
 * Remote Config key `levelplay_app_key`, else live default.
 */
export function getLevelPlayAppKey(): string {
  return readRcString('levelplay_app_key') || PRODUCTION_LEVELPLAY_APP_KEY;
}

/**
 * Interstitial ad unit ID for free-tier game-over ads.
 * Remote Config key `levelplay_interstitial_id`, else live default.
 */
export function getInterstitialAdId(): string {
  return readRcString('levelplay_interstitial_id') || PRODUCTION_INTERSTITIAL_ID;
}

/**
 * Rewarded ad unit ID for extra attempt rows.
 * Remote Config key `levelplay_rewarded_extra_rows_id`, else live default.
 */
export function getRewardedExtraRowsAdId(): string {
  return (
    readRcString('levelplay_rewarded_extra_rows_id') ||
    PRODUCTION_REWARDED_EXTRA_ROWS_ID
  );
}

/**
 * Rewarded ad unit ID for the letter hint helper.
 * Remote Config key `levelplay_rewarded_letter_hint_id`, else live default.
 */
export function getRewardedLetterHintAdId(): string {
  return (
    readRcString('levelplay_rewarded_letter_hint_id') ||
    PRODUCTION_REWARDED_LETTER_HINT_ID
  );
}

/**
 * Minimum supported app version from Remote Config (`min_supported_version`).
 * Empty / missing → `0.0.0` (fail-open: no update prompt for normal versions).
 */
export function getMinSupportedVersion(): string {
  return readRcString('min_supported_version') || DEFAULT_MIN_SUPPORTED_VERSION;
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
