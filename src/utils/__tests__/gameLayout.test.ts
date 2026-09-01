import { computeLetterKeyWidth, computeTileSize } from '../gameLayout';

describe('computeLetterKeyWidth', () => {
  it('splits full keyboard width across the longest row', () => {
    expect(computeLetterKeyWidth(320, 10, 4)).toBe(28.4);
  });

  it('returns 0 when width is not laid out yet', () => {
    expect(computeLetterKeyWidth(0, 10, 4)).toBe(0);
  });
});

describe('computeTileSize', () => {
  const base = {
    screenWidth: 360,
    wordLength: 5,
    maxAttempts: 6,
    tileGap: 4,
    horizontalPadding: 40,
    minTile: 32,
    maxTile: 56,
    attemptsLabelBlock: 22,
  };

  it('uses width when board area is unknown', () => {
    expect(computeTileSize({ ...base, boardAreaHeight: 0 })).toBe(56);
  });

  it('uses height when the board area is too short for width-sized tiles', () => {
    expect(computeTileSize({ ...base, boardAreaHeight: 200 })).toBe(32);
  });

  it('gives leftover height to shorter-word tiles up to maxTile', () => {
    expect(computeTileSize({ ...base, boardAreaHeight: 500 })).toBe(56);
  });

  it('keeps 10-letter tiles at the width floor', () => {
    expect(
      computeTileSize({ ...base, wordLength: 10, maxAttempts: 11, boardAreaHeight: 500 }),
    ).toBe(32);
  });
});
