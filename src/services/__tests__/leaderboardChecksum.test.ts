import {
  leaderboardCanonicalString,
  leaderboardChecksum,
} from '../leaderboardChecksum';

const dailyWin: Parameters<typeof leaderboardCanonicalString>[0] = {
  sessionId: 's1',
  completedAt: '2026-09-03T00:00:00.000Z',
  mode: 'daily',
  won: true,
  claimed: { dailyStreak: 1 },
};

describe('leaderboardCanonicalString', () => {
  it('uses 1/0 for won and empty slots for missing claimed numbers', () => {
    expect(leaderboardCanonicalString(dailyWin)).toBe(
      's1|2026-09-03T00:00:00.000Z|daily|1|1||||',
    );
  });

  it('treats claimed 0 as the character 0, not missing', () => {
    expect(
      leaderboardCanonicalString({
        ...dailyWin,
        won: false,
        claimed: { dailyStreak: 0 },
      }),
    ).toBe('s1|2026-09-03T00:00:00.000Z|daily|0|0||||');
  });
});

describe('leaderboardChecksum', () => {
  it('matches the locked SHA-256 fixture', () => {
    expect(leaderboardChecksum(dailyWin)).toBe(
      '727b507e354338fd19c52132021ba0188d1d8007a2a6c91556ab1aa92f2b11e2',
    );
  });
});
