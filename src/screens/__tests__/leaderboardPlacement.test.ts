import {
  LEADERBOARD_TOP_N,
  formatPlacementLabel,
} from '../leaderboardPlacement';

describe('formatPlacementLabel', () => {
  it('shows #N inside the visible top', () => {
    expect(formatPlacementLabel(1)).toBe('#1');
    expect(formatPlacementLabel(20)).toBe('#20');
    expect(LEADERBOARD_TOP_N).toBe(20);
  });

  it('uses outside-top breakpoints for deeper ranks', () => {
    expect(formatPlacementLabel(21)).toBe('outside top 20');
    expect(formatPlacementLabel(50)).toBe('outside top 20');
    expect(formatPlacementLabel(51)).toBe('outside top 50');
    expect(formatPlacementLabel(105)).toBe('outside top 100');
    expect(formatPlacementLabel(255)).toBe('outside top 250');
    expect(formatPlacementLabel(566)).toBe('outside top 500');
    expect(formatPlacementLabel(914)).toBe('outside top 500');
    expect(formatPlacementLabel(1001)).toBe('outside top 1000');
  });

  it('shows Unranked when there is no score', () => {
    expect(formatPlacementLabel(null, 0)).toBe('Unranked');
    expect(formatPlacementLabel(12, 0)).toBe('Unranked');
    expect(formatPlacementLabel(undefined)).toBe('Unranked');
  });
});
