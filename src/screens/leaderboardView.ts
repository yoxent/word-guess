import type { LeaderboardData } from '../types';
import type { LeaderboardType } from '../services/firestoreService';

export type LeaderboardViewState = 'loading' | 'error' | 'empty' | 'list';

/**
 * Decide which content surface to show for the active leaderboard tab.
 * When switching tabs we clear data and show loading — never keep the
 * previous tab's entries on screen.
 */
export function resolveLeaderboardView(args: {
  isLoading: boolean;
  error: string | null;
  data: LeaderboardData | null;
}): LeaderboardViewState {
  if (args.isLoading) return 'loading';
  if (args.error) return 'error';
  if (!args.data || args.data.entries.length === 0) return 'empty';
  return 'list';
}

/** True when an in-flight fetch still matches the latest requested tab. */
export function shouldApplyLeaderboardResult(
  requestId: number,
  latestRequestId: number,
  requestedType: LeaderboardType,
  activeType: LeaderboardType,
): boolean {
  return requestId === latestRequestId && requestedType === activeType;
}
