/**
 * Leaderboard service — coordinates score submission with offline/deferred queue support.
 *
 * @see D-141 through D-144
 */

import * as firestoreService from './firestoreService';
import type { LeaderboardType } from './firestoreService';
import * as syncQueue from './syncQueue';
import { useAuthStore } from '../stores/authStore';
import { useStatsStore } from '../stores/statsStore';
import { getStats } from './storage';
import {
  applyEndlessEndCounters,
  resolveDailyLeaderboardScore,
} from './endlessLeaderboardCounters';
import { getLeaderboardMetrics } from './leaderboardMetrics';
import { resolveLeaderboardWritePlayer } from './leaderboardWritePolicy';
import type { LeaderboardData, LeaderboardEntry, GameSession } from '../types';

/** Prevent GameScreen + ResultModal from double-submitting one session. */
const syncedSessionIds = new Set<string>();

/**
 * Submit a score to a specific leaderboard.
 * Falls back to sync queue if offline or not signed in.
 */
export async function submitScore(
  type: LeaderboardType,
  score: number,
  sessionId?: string,
): Promise<'submitted' | 'queued' | 'failed'> {
  try {
    const authState = useAuthStore.getState();

    if (!authState.isLoggedIn || !authState.playerId) {
      await syncQueue.enqueueEvent('leaderboard_score', {
        type,
        score,
        playerId: 'deferred',
        playerName: 'Player',
        sessionId: sessionId ?? `${type}:${score}`,
      });
      return 'queued';
    }

    const success = await firestoreService.submitLeaderboardScore(
      type,
      authState.playerId,
      authState.playerName ?? 'Player',
      score,
    );

    if (success) {
      return 'submitted';
    }

    await syncQueue.enqueueEvent('leaderboard_score', {
      type,
      score,
      playerId: authState.playerId,
      playerName: authState.playerName ?? 'Player',
      sessionId: sessionId ?? `${type}:${score}:${Date.now()}`,
    });
    return 'queued';
  } catch {
    return 'failed';
  }
}

/**
 * Shared drain helper — always writes as the signed-in user, never as "deferred".
 */
export async function drainLeaderboardScoreEvent(event: {
  data: Record<string, unknown>;
}): Promise<boolean> {
  const authState = useAuthStore.getState();
  if (!authState.isLoggedIn) return false;

  const resolved = resolveLeaderboardWritePlayer({
    queuedPlayerId: event.data.playerId as string | undefined,
    queuedPlayerName: event.data.playerName as string | undefined,
    authPlayerId: authState.playerId,
    authPlayerName: authState.playerName,
  });
  if (!resolved) return false;

  const type = event.data.type as LeaderboardType;
  const score = Number(event.data.score);
  if (!type || Number.isNaN(score)) return false;

  return firestoreService.submitLeaderboardScore(
    type,
    resolved.playerId,
    resolved.playerName,
    score,
  );
}

/**
 * Mode-aware dispatcher after a game completes.
 */
export async function updateLeaderboardAfterGame(params: {
  mode: string;
  won: boolean;
  sessionId?: string;
  dailyStreak?: number;
  endlessStreak?: number;
  endlessTotalWords?: number;
}): Promise<void> {
  if (params.mode === 'daily' && params.won) {
    const streak =
      params.dailyStreak && params.dailyStreak > 0 ? params.dailyStreak : 1;
    await submitScore('daily_streak', streak, params.sessionId);
  }

  if (params.mode === 'endless') {
    await submitScore(
      'endless_streak',
      params.endlessStreak ?? 0,
      params.sessionId ? `${params.sessionId}:streak` : undefined,
    );
    const total = params.endlessTotalWords ?? 0;
    if (total > 0) {
      await submitScore(
        'endless_total',
        total,
        params.sessionId ? `${params.sessionId}:total` : undefined,
      );
    }
  }
}

/**
 * Single entry-point for end-of-game leaderboard sync (deduped per session).
 * Safe to call from GameScreen and ResultModal.
 */
export async function syncLeaderboardForSession(
  session: Pick<GameSession, 'id' | 'mode' | 'status' | 'hardMode'>,
): Promise<void> {
  if (session.status !== 'won' && session.status !== 'lost') return;
  if (syncedSessionIds.has(session.id)) return;
  syncedSessionIds.add(session.id);

  try {
    if (session.mode === 'daily' && session.status === 'won') {
      // Prefer refreshed stats after recordGame; fall back to store/storage.
      const stats =
        (await getStats()) ?? useStatsStore.getState().stats;
      const metrics = getLeaderboardMetrics(stats);
      const dailyStreak = resolveDailyLeaderboardScore(
        true,
        metrics.dailyStreak > 0 ? metrics.dailyStreak : undefined,
      );
      await updateLeaderboardAfterGame({
        mode: 'daily',
        won: true,
        sessionId: session.id,
        dailyStreak,
      });
      return;
    }

    if (session.mode === 'endless') {
      // Mutate Endless counters once; then read metrics for publish.
      applyEndlessEndCounters({
        sessionId: session.id,
        won: session.status === 'won',
        hardMode: session.hardMode,
      });
      const stats =
        (await getStats()) ?? useStatsStore.getState().stats;
      const metrics = getLeaderboardMetrics(stats);
      await updateLeaderboardAfterGame({
        mode: 'endless',
        won: session.status === 'won',
        sessionId: session.id,
        endlessStreak: metrics.endlessStreak,
        endlessTotalWords: metrics.endlessTotalWords,
      });
    }
  } catch (err) {
    // Allow a later caller to retry if this attempt failed before any write.
    syncedSessionIds.delete(session.id);
    if (__DEV__) {
      console.warn('[leaderboard] syncLeaderboardForSession failed', err);
    }
  }
}

/**
 * Push local streak/total counters to Firestore when opening the leaderboard.
 * Heals stale cloud rows (e.g. Daily stuck at 0) without requiring another game.
 */
export async function reconcileLocalLeaderboardScores(): Promise<void> {
  const authState = useAuthStore.getState();
  if (!authState.isLoggedIn || !authState.playerId) return;

  try {
    const stats =
      useStatsStore.getState().stats ?? (await getStats());
    const metrics = getLeaderboardMetrics(stats);

    if (metrics.dailyStreak > 0) {
      await submitScore(
        'daily_streak',
        metrics.dailyStreak,
        `reconcile:daily:${metrics.dailyStreak}`,
      );
    }

    if (metrics.endlessStreak > 0) {
      await submitScore(
        'endless_streak',
        metrics.endlessStreak,
        `reconcile:streak:${metrics.endlessStreak}`,
      );
    }

    if (metrics.endlessTotalWords > 0) {
      await submitScore(
        'endless_total',
        metrics.endlessTotalWords,
        `reconcile:total:${metrics.endlessTotalWords}`,
      );
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[leaderboard] reconcileLocalLeaderboardScores failed', err);
    }
  }
}

/**
 * Fetch leaderboard data for a specific type.
 */
export async function getLeaderboardData(
  type: LeaderboardType,
): Promise<LeaderboardData> {
  const data = await firestoreService.getLeaderboard(type);
  const authState = useAuthStore.getState();

  if (!authState.playerId) {
    return data;
  }

  const markedEntries: LeaderboardEntry[] = data.entries.map(
    (entry: LeaderboardEntry) => ({
      ...entry,
      isCurrentPlayer: entry.playerId === authState.playerId,
    }),
  );

  return {
    ...data,
    entries: markedEntries,
  };
}
