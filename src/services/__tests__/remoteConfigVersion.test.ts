jest.mock('react-native-google-mobile-ads', () => ({
  TestIds: { INTERSTITIAL: 'test-interstitial', REWARDED: 'test-rewarded' },
}));

const mockGetValue = jest.fn();

jest.mock('@react-native-firebase/remote-config', () => ({
  getRemoteConfig: jest.fn(() => ({})),
  fetchAndActivate: jest.fn(),
  getValue: (...args: unknown[]) => mockGetValue(...args),
}));

import {
  DEFAULT_MIN_SUPPORTED_VERSION,
  getMinSupportedVersion,
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
