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
import {
  leaderboardChecksum,
  type LeaderboardChecksumClaimed,
} from './leaderboardChecksum';
import {
  callSubmitLeaderboardGame,
  type LeaderboardGamePayload,
} from './submitLeaderboardGame';
import {
  buildDemoLeaderboard,
  isDemoLeaderboardEnabled,
} from './leaderboardDemoData';
import type { LeaderboardData, LeaderboardEntry, GameSession } from '../types';

/** Prevent GameScreen + ResultModal from double-submitting one session. */
const syncedSessionIds = new Set<string>();

function withCareerClaimed(
  claimed: LeaderboardChecksumClaimed,
  metrics: { bestStreak: number; sharpshooter: number },
): LeaderboardChecksumClaimed {
  const next = { ...claimed };
  if (metrics.bestStreak > 0) next.bestStreak = metrics.bestStreak;
  if (metrics.sharpshooter > 0) next.sharpshooter = metrics.sharpshooter;
  return next;
}

function buildPayload(
  session: Pick<GameSession, 'id' | 'mode' | 'status' | 'completedAt'>,
  claimed: LeaderboardChecksumClaimed,
  playerName: string,
): LeaderboardGamePayload {
  const completedAt = session.completedAt ?? new Date().toISOString();
  const won = session.status === 'won';
  return {
    sessionId: session.id,
    completedAt,
    mode: session.mode,
    won,
    playerName,
    claimed,
    checksum: leaderboardChecksum({
      sessionId: session.id,
      completedAt,
      mode: session.mode,
      won,
      claimed,
    }),
  };
}

async function publishLeaderboardGame(
  payload: LeaderboardGamePayload,
): Promise<void> {
  const authState = useAuthStore.getState();
  if (!authState.isLoggedIn || !authState.playerId) {
    await syncQueue.enqueueEvent('leaderboard_game', payload);
    return;
  }

  const result = await callSubmitLeaderboardGame(payload);
  if (result === 'retry') {
    await syncQueue.enqueueEvent('leaderboard_game', payload);
  }
}

/**
 * Drain a queued `leaderboard_game`. Returns true to drop the event
 * (`ok` or poison `drop`); false to retry.
 */
export async function drainLeaderboardGameEvent(event: {
  data: Record<string, unknown>;
}): Promise<boolean> {
  const sessionId = event.data.sessionId;
  const checksum = event.data.checksum;
  if (typeof sessionId !== 'string' || typeof checksum !== 'string') {
    return true;
  }
  const result = await callSubmitLeaderboardGame(
    event.data as LeaderboardGamePayload,
  );
  return result === 'ok' || result === 'drop';
}

/**
 * Single entry-point for end-of-game leaderboard sync (deduped per session).
 * Safe to call from GameScreen and ResultModal.
 */
export async function syncLeaderboardForSession(
  session: Pick<
    GameSession,
    'id' | 'mode' | 'status' | 'hardMode' | 'completedAt' | 'isTutorial'
  >,
): Promise<void> {
  if (session.isTutorial) return;
  if (session.status !== 'won' && session.status !== 'lost') return;
  if (syncedSessionIds.has(session.id)) return;
  syncedSessionIds.add(session.id);

  const playerName =
    useAuthStore.getState().playerName ?? 'Player';

  try {
    if (session.mode === 'daily' && session.status === 'won') {
      const stats =
        (await getStats()) ?? useStatsStore.getState().stats;
      const metrics = getLeaderboardMetrics(stats);
      const dailyStreak = resolveDailyLeaderboardScore(
        true,
        metrics.dailyStreak > 0 ? metrics.dailyStreak : undefined,
      );
      const claimed = withCareerClaimed(
        { dailyStreak: dailyStreak ?? 1 },
        metrics,
      );
      await publishLeaderboardGame(buildPayload(session, claimed, playerName));
      return;
    }

    if (session.mode === 'daily' && session.status === 'lost') {
      const stats =
        (await getStats()) ?? useStatsStore.getState().stats;
      const metrics = getLeaderboardMetrics(stats);
      const claimed = withCareerClaimed({ dailyStreak: 0 }, metrics);
      await publishLeaderboardGame(buildPayload(session, claimed, playerName));
      return;
    }

    if (session.mode === 'endless') {
      const endless = applyEndlessEndCounters({
        sessionId: session.id,
        won: session.status === 'won',
        hardMode: session.hardMode,
      });
      const stats =
        (await getStats()) ?? useStatsStore.getState().stats;
      const metrics = getLeaderboardMetrics(stats);
      const claimed: LeaderboardChecksumClaimed = {};
      if (session.status === 'won') {
        if (endless.endlessStreak > 0) {
          claimed.endlessStreak = endless.endlessStreak;
        }
        if (endless.endlessTotalWords > 0) {
          claimed.endlessTotalWords = endless.endlessTotalWords;
        }
      }
      await publishLeaderboardGame(
        buildPayload(session, withCareerClaimed(claimed, metrics), playerName),
      );
      return;
    }

    const stats = (await getStats()) ?? useStatsStore.getState().stats;
    const metrics = getLeaderboardMetrics(stats);
    await publishLeaderboardGame(
      buildPayload(session, withCareerClaimed({}, metrics), playerName),
    );
  } catch (err) {
    syncedSessionIds.delete(session.id);
    if (__DEV__) {
      console.warn('[leaderboard] syncLeaderboardForSession failed', err);
    }
  }
}

/**
 * Opening the board must not push local totals (no jump without a receipt).
 */
export async function reconcileLocalLeaderboardScores(): Promise<void> {
  return;
}

/**
 * Fetch leaderboard data for a specific type.
 * In __DEV__, returns a populated demo board unless
 * EXPO_PUBLIC_DEMO_LEADERBOARDS=0.
 */
export async function getLeaderboardData(
  type: LeaderboardType,
): Promise<LeaderboardData> {
  const authState = useAuthStore.getState();

  if (isDemoLeaderboardEnabled()) {
    const stats =
      useStatsStore.getState().stats ?? (await getStats());
    const metrics = getLeaderboardMetrics(stats);
    const localScore =
      type === 'daily_streak'
        ? metrics.dailyStreak
        : type === 'endless_streak'
          ? metrics.endlessStreak
          : type === 'endless_total'
            ? metrics.endlessTotalWords
            : type === 'best_streak'
              ? metrics.bestStreak
              : metrics.sharpshooter;

    return buildDemoLeaderboard(
      type,
      authState.playerId && localScore > 0
        ? {
            playerId: authState.playerId,
            playerName: authState.playerName ?? 'You',
            score: localScore,
          }
        : null,
    );
  }

  const data = await firestoreService.getLeaderboard(type);

  if (!authState.playerId) {
    return data;
  }

  const markedEntries: LeaderboardEntry[] = data.entries.map(
    (entry: LeaderboardEntry) => ({
      ...entry,
      isCurrentPlayer: entry.playerId === authState.playerId,
    }),
  );

  const inTop = markedEntries.find((e) => e.isCurrentPlayer);
  let currentPlayerRank: number | null = inTop?.rank ?? null;

  if (currentPlayerRank == null) {
    const stats =
      useStatsStore.getState().stats ?? (await getStats());
    const metrics = getLeaderboardMetrics(stats);
    const localScore =
      type === 'daily_streak'
        ? metrics.dailyStreak
        : type === 'endless_streak'
          ? metrics.endlessStreak
          : type === 'endless_total'
            ? metrics.endlessTotalWords
            : type === 'best_streak'
              ? metrics.bestStreak
              : metrics.sharpshooter;
    if (localScore > 0) {
      currentPlayerRank = await firestoreService.getLeaderboardRank(
        type,
        localScore,
      );
    }
  }

  return {
    ...data,
    entries: markedEntries,
    currentPlayerRank,
  };
}
