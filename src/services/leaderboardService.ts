/**
 * Leaderboard service — coordinates score submission with offline/deferred queue support.
 *
 * Exports three public functions:
 *   submitScore(type, score)    — submits to Firestore if signed in, enqueues otherwise
 *   updateLeaderboardAfterGame(params) — mode-aware dispatcher for game completion
 *   getLeaderboardData(type)    — fetches leaderboard data with current-player highlighting
 *
 * @see D-141 through D-144
 */

import * as firestoreService from './firestoreService';
import type { LeaderboardType } from './firestoreService';
import * as syncQueue from './syncQueue';
import { useAuthStore } from '../stores/authStore';
import type { LeaderboardData, LeaderboardEntry } from '../types';

// ── Public API ──

/**
 * Submit a score to a specific leaderboard.
 *
 * Tries Firestore directly if signed in. Falls back to sync queue if offline or not signed in.
 * The `forceQueue` parameter bypasses direct submission (used for deferred pre-auth scores).
 *
 * @returns 'submitted' | 'queued' | 'failed'
 */
export async function submitScore(
  type: LeaderboardType,
  score: number,
): Promise<'submitted' | 'queued' | 'failed'> {
  try {
    const authState = useAuthStore.getState();

    if (!authState.isLoggedIn || !authState.playerId) {
      // Not signed in — enqueue for deferred submission (D-146)
      await syncQueue.enqueueEvent('leaderboard_score', {
        type,
        score,
        playerId: 'deferred',
        playerName: 'Player',
      });
      return 'queued';
    }

    // Signed in — try Firestore directly (D-142)
    const success = await firestoreService.submitLeaderboardScore(
      type,
      authState.playerId,
      authState.playerName ?? 'Player',
      score,
    );

    if (success) {
      return 'submitted';
    }

    // Firestore failed (offline/error) — enqueue for later retry
    await syncQueue.enqueueEvent('leaderboard_score', {
      type,
      score,
      playerId: authState.playerId,
      playerName: authState.playerName ?? 'Player',
    });
    return 'queued';
  } catch {
    return 'failed';
  }
}

/**
 * Called after a game completes. Determines which leaderboard(s) to update
 * based on game mode and outcome, then calls submitScore for each.
 *
 * For Daily Challenge win: submits daily streak (perModeStreaks.daily.current)
 * For Endless win: submits endless streak + endless total words
 * For Endless loss: submits final streak (may be 0) + endless total words
 *
 * Fire-and-forget — never await in calling context (D-154).
 */
export async function updateLeaderboardAfterGame(params: {
  mode: string;
  won: boolean;
  dailyStreak?: number;
  endlessStreak?: number;
  endlessTotalWords?: number;
}): Promise<void> {
  if (params.mode === 'daily' && params.won) {
    // Daily Challenge win — submit daily streak (D-144)
    await submitScore('daily_streak', params.dailyStreak ?? 0);
  }

  if (params.mode === 'endless') {
    // Endless mode — submit streak + total words (D-144)
    await submitScore('endless_streak', params.endlessStreak ?? 0);
    await submitScore('endless_total', params.endlessTotalWords ?? 0);
  }
}

/**
 * Fetch leaderboard data for a specific type.
 *
 * Delegates to firestoreService.getLeaderboard() with error fallback.
 * Returns LeaderboardData with the signed-in player marked (isCurrentPlayer).
 */
export async function getLeaderboardData(
  type: LeaderboardType,
): Promise<LeaderboardData> {
  try {
    const data = await firestoreService.getLeaderboard(type);
    const authState = useAuthStore.getState();

    if (!authState.playerId) {
      return data;
    }

    // Mark current player entries (D-150)
    const markedEntries: LeaderboardEntry[] = data.entries.map((entry: LeaderboardEntry) => ({
      ...entry,
      isCurrentPlayer: entry.playerId === authState.playerId,
    }));

    return {
      ...data,
      entries: markedEntries,
    };
  } catch {
    // Return fallback on any error
    return {
      type,
      entries: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
