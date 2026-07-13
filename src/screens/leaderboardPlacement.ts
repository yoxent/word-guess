import { LEADERBOARD_TOP_N } from '../constants/leaderboard';

/**
 * Placement bands for ranks beyond the visible top N.
 * Rank 1–20 → "#N" (handled by caller / formatPlacementLabel).
 * Higher ranks → "outside top {breakpoint}".
 */
const OUTSIDE_BREAKPOINTS = [20, 50, 100, 250, 500, 1000] as const;

export { LEADERBOARD_TOP_N };

/**
 * Human-readable placement for an absolute rank.
 * Pass score ≤ 0 (or omit rank) for players who haven't scored yet.
 * @example formatPlacementLabel(7) → "#7"
 * @example formatPlacementLabel(51) → "outside top 50"
 * @example formatPlacementLabel(null, 0) → "Unranked"
 */
export function formatPlacementLabel(
  rank: number | null | undefined,
  score?: number,
): string {
  if (typeof score === 'number' && score <= 0) {
    return 'Unranked';
  }
  if (rank == null || !Number.isFinite(rank) || rank < 1) {
    return 'Unranked';
  }
  if (rank <= LEADERBOARD_TOP_N) {
    return `#${rank}`;
  }

  // Pick the largest breakpoint strictly below this rank.
  let label = `outside top ${OUTSIDE_BREAKPOINTS[0]}`;
  for (const bp of OUTSIDE_BREAKPOINTS) {
    if (rank > bp) {
      label = `outside top ${bp}`;
    }
  }
  return label;
}
