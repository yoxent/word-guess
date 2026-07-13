import { getPodiumTitle } from '../leaderboardFlair';

describe('getPodiumTitle', () => {
  it('returns distinct titles for ranks 1–3', () => {
    expect(getPodiumTitle(1)).toBe('Champion');
    expect(getPodiumTitle(2)).toBe('Runner-up');
    expect(getPodiumTitle(3)).toBe('Podium finish');
    expect(getPodiumTitle(1)).not.toBe(getPodiumTitle(2));
    expect(getPodiumTitle(2)).not.toBe(getPodiumTitle(3));
  });

  it('returns null for rank 4 and below', () => {
    expect(getPodiumTitle(4)).toBeNull();
    expect(getPodiumTitle(50)).toBeNull();
    expect(getPodiumTitle(0)).toBeNull();
  });
});
