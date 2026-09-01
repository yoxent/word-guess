import {
  getRemoteConfig,
  fetchAndActivate,
  getValue,
} from '@react-native-firebase/remote-config';
import { isVersionBelow } from '../utils/semver';

/**
 * Production LevelPlay app key + ad unit IDs.
 * Compiled in — not read from Firebase Remote Config. RC is only used for
 * `min_supported_version`.
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
 * Fetch and activate Remote Config (soft-update floor). Ad unit IDs are
 * compiled in and do not wait on this fetch.
 */
export async function fetchAdUnitIds(): Promise<void> {
  try {
    await fetchAndActivate(rc);
  } catch {
    // Keep DEFAULT_MIN_SUPPORTED_VERSION
  }
}

export function getLevelPlayAppKey(): string {
  return PRODUCTION_LEVELPLAY_APP_KEY;
}

export function getInterstitialAdId(): string {
  return PRODUCTION_INTERSTITIAL_ID;
}

export function getRewardedExtraRowsAdId(): string {
  return PRODUCTION_REWARDED_EXTRA_ROWS_ID;
}

export function getRewardedLetterHintAdId(): string {
  return PRODUCTION_REWARDED_LETTER_HINT_ID;
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
