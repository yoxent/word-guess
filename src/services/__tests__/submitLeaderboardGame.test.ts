jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => jest.fn()),
}));

import { classifyLeaderboardGameResult } from '../submitLeaderboardGame';

describe('classifyLeaderboardGameResult', () => {
  it('treats ok and duplicate as done', () => {
    expect(classifyLeaderboardGameResult({ ok: true })).toBe('ok');
    expect(
      classifyLeaderboardGameResult({ ok: true, reason: 'duplicate' }),
    ).toBe('ok');
  });

  it('retries fuse limits', () => {
    expect(
      classifyLeaderboardGameResult({ ok: false, reason: 'too_soon' }),
    ).toBe('retry');
    expect(
      classifyLeaderboardGameResult({ ok: false, reason: 'day_cap' }),
    ).toBe('retry');
  });

  it('drops poison payloads', () => {
    expect(
      classifyLeaderboardGameResult({ ok: false, reason: 'checksum' }),
    ).toBe('drop');
    expect(
      classifyLeaderboardGameResult({ ok: false, reason: 'invalid' }),
    ).toBe('drop');
    expect(
      classifyLeaderboardGameResult({ ok: false, reason: 'future' }),
    ).toBe('drop');
    expect(
      classifyLeaderboardGameResult({ ok: false, reason: 'daily_date' }),
    ).toBe('drop');
  });

  it('retries thrown transport / unauthenticated', () => {
    expect(classifyLeaderboardGameResult({ throwCode: 'unavailable' })).toBe(
      'retry',
    );
    expect(classifyLeaderboardGameResult({ throwCode: 'unauthenticated' })).toBe(
      'retry',
    );
  });
});
