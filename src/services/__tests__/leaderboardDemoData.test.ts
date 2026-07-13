import { buildDemoLeaderboard, isDemoLeaderboardEnabled } from '../leaderboardDemoData';
import { LEADERBOARD_TOP_N } from '../../constants/leaderboard';

describe('leaderboardDemoData', () => {
  it(`builds exactly ${LEADERBOARD_TOP_N} ranked entries`, () => {
    const data = buildDemoLeaderboard('daily_streak');
    expect(data.entries.length).toBe(LEADERBOARD_TOP_N);
    expect(data.entries[0].rank).toBe(1);
    expect(data.entries[0].score).toBeGreaterThanOrEqual(
      data.entries[data.entries.length - 1].score,
    );
  });

  it('inserts the signed-in player by score and sets absolute rank', () => {
    const data = buildDemoLeaderboard('sharpshooter', {
      playerId: 'uid-me',
      playerName: 'Tester',
      score: 45,
    });
    const you = data.entries.find((e) => e.playerId === 'uid-me');
    expect(you).toBeDefined();
    expect(you?.isCurrentPlayer).toBe(true);
    expect(you!.rank).toBeLessThanOrEqual(3);
    expect(data.currentPlayerRank).toBe(you!.rank);
  });

  it('reports absolute rank outside the visible top', () => {
    const data = buildDemoLeaderboard('daily_streak', {
      playerId: 'uid-deep',
      playerName: 'Deep',
      score: 1,
    });
    expect(data.entries.every((e) => e.playerId !== 'uid-deep')).toBe(true);
    expect(data.currentPlayerRank).toBeGreaterThan(LEADERBOARD_TOP_N);
  });

  it('is disabled under Jest (NODE_ENV=test)', () => {
    expect(isDemoLeaderboardEnabled()).toBe(false);
  });
});
