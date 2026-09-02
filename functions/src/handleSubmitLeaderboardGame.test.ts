import { handleSubmitLeaderboardGame } from './handleSubmitLeaderboardGame';
import * as store from './leaderboardStore';
import { leaderboardChecksum } from './leaderboardChecksum';

jest.mock('./leaderboardStore', () => ({
  loadLeaderboardSubmitState: jest.fn(),
  applyLeaderboardOps: jest.fn(),
}));

const load = store.loadLeaderboardSubmitState as jest.Mock;
const apply = store.applyLeaderboardOps as jest.Mock;

const payload = {
  sessionId: 's1',
  completedAt: new Date(Date.now() - 60_000).toISOString(),
  mode: 'daily' as const,
  won: true,
  playerName: 'Ada',
  claimed: { dailyStreak: 1 },
  checksum: '',
};
payload.checksum = leaderboardChecksum(payload);

describe('handleSubmitLeaderboardGame', () => {
  beforeEach(() => {
    load.mockReset();
    apply.mockReset();
    apply.mockResolvedValue(undefined);
    load.mockResolvedValue({
      receiptExists: false,
      rate: null,
      existingScores: {},
    });
  });

  it('throws unauthenticated when uid is missing', async () => {
    await expect(
      handleSubmitLeaderboardGame({ auth: null, data: payload }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('returns checksum without writing when the hash is wrong', async () => {
    await expect(
      handleSubmitLeaderboardGame({
        auth: { uid: 'u1' },
        data: { ...payload, checksum: '0'.repeat(64) },
      }),
    ).resolves.toEqual({ ok: false, reason: 'checksum' });
    expect(apply).not.toHaveBeenCalled();
  });

  it('applies ops and returns ok on a valid daily win', async () => {
    await expect(
      handleSubmitLeaderboardGame({
        auth: { uid: 'u1', token: { name: 'Ada' } },
        data: payload,
      }),
    ).resolves.toEqual({ ok: true });
    expect(apply).toHaveBeenCalled();
  });
});
