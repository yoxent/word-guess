const mockGetValue = jest.fn();

jest.mock('@react-native-firebase/remote-config', () => ({
  getRemoteConfig: jest.fn(() => ({})),
  fetchAndActivate: jest.fn(),
  getValue: (...args: unknown[]) => mockGetValue(...args),
}));

import {
  DEFAULT_MIN_SUPPORTED_VERSION,
  PRODUCTION_INTERSTITIAL_ID,
  PRODUCTION_LEVELPLAY_APP_KEY,
  PRODUCTION_REWARDED_EXTRA_ROWS_ID,
  PRODUCTION_REWARDED_LETTER_HINT_ID,
  getInterstitialAdId,
  getLevelPlayAppKey,
  getMinSupportedVersion,
  getRewardedExtraRowsAdId,
  getRewardedLetterHintAdId,
  isUpdateRequired,
} from '../remoteConfig';

describe('remoteConfig version helpers', () => {
  beforeEach(() => {
    mockGetValue.mockReset();
  });

  function mockMinVersion(value: string) {
    mockGetValue.mockImplementation((_rc: unknown, key: string) => ({
      asString: () => (key === 'min_supported_version' ? value : ''),
    }));
  }

  it('defaults min version when RC is empty', () => {
    mockMinVersion('');
    expect(getMinSupportedVersion()).toBe(DEFAULT_MIN_SUPPORTED_VERSION);
    expect(isUpdateRequired('1.0.0')).toBe(false);
  });

  it('requires update when installed is below RC floor', () => {
    mockMinVersion('1.0.2');
    expect(isUpdateRequired('1.0.1')).toBe(true);
    expect(isUpdateRequired('1.0.2')).toBe(false);
    expect(isUpdateRequired('1.0.3')).toBe(false);
  });

  it('fails open when installed version is missing', () => {
    mockMinVersion('9.9.9');
    expect(isUpdateRequired(null)).toBe(false);
    expect(isUpdateRequired(undefined)).toBe(false);
    expect(isUpdateRequired('')).toBe(false);
    expect(isUpdateRequired('   ')).toBe(false);
  });

  it('fails open when getValue throws', () => {
    mockGetValue.mockImplementation(() => {
      throw new Error('rc unavailable');
    });
    expect(getMinSupportedVersion()).toBe(DEFAULT_MIN_SUPPORTED_VERSION);
    expect(isUpdateRequired('1.0.0')).toBe(false);
  });
});

describe('LevelPlay ad IDs are compiled in', () => {
  beforeEach(() => {
    mockGetValue.mockReset();
  });

  function mockKeys(values: Record<string, string>) {
    mockGetValue.mockImplementation((_rc: unknown, key: string) => ({
      asString: () => values[key] ?? '',
    }));
  }

  it('uses compiled-in LevelPlay IDs even when RC has other values', () => {
    mockKeys({
      levelplay_app_key: 'app-from-rc',
      levelplay_interstitial_id: 'int-from-rc',
      levelplay_rewarded_extra_rows_id: 'rows-from-rc',
      levelplay_rewarded_letter_hint_id: 'hint-from-rc',
    });
    expect(getLevelPlayAppKey()).toBe(PRODUCTION_LEVELPLAY_APP_KEY);
    expect(getInterstitialAdId()).toBe(PRODUCTION_INTERSTITIAL_ID);
    expect(getRewardedExtraRowsAdId()).toBe(PRODUCTION_REWARDED_EXTRA_ROWS_ID);
    expect(getRewardedLetterHintAdId()).toBe(PRODUCTION_REWARDED_LETTER_HINT_ID);
  });
});
