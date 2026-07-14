import { getApp } from '@react-native-firebase/app';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  getCountFromServer,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import type { PlayerStats, LeaderboardData, LeaderboardEntry } from '../types';
import { shouldWriteLeaderboardScore } from './leaderboardWritePolicy';
import { LEADERBOARD_TOP_N } from '../constants/leaderboard';
import { getEndlessStreak, getEndlessTotalWords } from './storage';
import type { EndlessCounters } from './mergePlayerStats';

// ── Types ──

export type LeaderboardType =
  | 'daily_streak'
  | 'endless_streak'
  | 'endless_total'
  | 'best_streak'
  | 'sharpshooter';

export type CloudPlayerProfile = {
  stats: PlayerStats;
  endless: EndlessCounters;
  updatedAtMs: number;
  playerName?: string;
};

export type GetPlayerStatsResult =
  | { kind: 'found'; profile: CloudPlayerProfile }
  | { kind: 'missing' }
  | { kind: 'error' };

function isTransientFirestoreError(err: unknown): boolean {
  const anyErr = err as { code?: string; message?: string } | null;
  const haystack = `${anyErr?.code ?? ''} ${anyErr?.message ?? err}`.toLowerCase();
  return (
    haystack.includes('unavailable') ||
    haystack.includes('deadline-exceeded') ||
    haystack.includes('resource-exhausted') ||
    haystack.includes('network')
  );
}


// ── Initialisation (modular API) ──

const PLAYER_STATS_COLLECTION = 'playerStats';
const LEADERBOARDS_COLLECTION = 'leaderboards';

/** Initialise Firestore with offline persistence once at module load. */
let fsInitialised = false;
function ensureFirestore(): ReturnType<typeof getFirestore> {
  if (!fsInitialised) {
    initializeFirestore(getApp(), { persistence: true });
    fsInitialised = true;
  }
  return getFirestore();
}

const db = ensureFirestore();

/** Helper: leaderboard sub-collection reference */
function leaderboardRef(type: string) {
  return collection(db, LEADERBOARDS_COLLECTION, type, 'scores');
}

// ── Functions ──

/**
 * Update a player's stats document in Firestore.
 * Uses { merge: true } for idempotent incremental updates (D-131).
 * Returns false if Firestore is not available (no crash).
 */
export async function updatePlayerStats(
  playerId: string,
  playerName: string,
  stats: PlayerStats,
  endless?: EndlessCounters,
): Promise<boolean> {
  try {
    // No explicit endless payload (legacy call sites) → mirror current MMKV
    // counters so the cloud doc never regresses to missing endless fields.
    const endlessPayload: EndlessCounters = endless ?? {
      endlessTotalWords: getEndlessTotalWords(),
      endlessStreakNormal: getEndlessStreak(false),
      endlessStreakHard: getEndlessStreak(true),
    };

    await setDoc(
      doc(collection(db, PLAYER_STATS_COLLECTION), playerId),
      {
        playerId,
        playerName,
        ...stats,
        ...endlessPayload,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch a player's stats document from Firestore, distinguishing "not found"
 * from "read failed" so callers (e.g. merge/restore flow) don't mistake a
 * transient error for a brand-new player.
 */
export async function getPlayerStatsResult(
  playerId: string,
): Promise<GetPlayerStatsResult> {
  try {
    const docSnap = await getDoc(
      doc(collection(db, PLAYER_STATS_COLLECTION), playerId),
    );

    if (!docSnap.exists) return { kind: 'missing' };

    const data = docSnap.data();
    if (!data) return { kind: 'missing' };

    const {
      playerId: _pid,
      playerName,
      updatedAt,
      endlessTotalWords,
      endlessStreakNormal,
      endlessStreakHard,
      ...stats
    } = data as Record<string, unknown>;

    const updatedAtMs =
      updatedAt != null && typeof (updatedAt as { toMillis?: () => number }).toMillis === 'function'
        ? (updatedAt as { toMillis: () => number }).toMillis()
        : 0;

    return {
      kind: 'found',
      profile: {
        stats: stats as unknown as PlayerStats,
        endless: {
          endlessTotalWords: typeof endlessTotalWords === 'number' ? endlessTotalWords : 0,
          endlessStreakNormal: typeof endlessStreakNormal === 'number' ? endlessStreakNormal : 0,
          endlessStreakHard: typeof endlessStreakHard === 'number' ? endlessStreakHard : 0,
        },
        updatedAtMs,
        playerName: typeof playerName === 'string' ? playerName : undefined,
      },
    };
  } catch {
    return { kind: 'error' };
  }
}

/**
 * Fetch a player's stats document from Firestore.
 * Returns null if not found or if Firestore is unavailable.
 * @deprecated Prefer `getPlayerStatsResult` in new sync code — it
 * distinguishes "missing" from "error" and includes endless + updatedAtMs.
 */
export async function getPlayerStats(
  playerId: string,
): Promise<PlayerStats | null> {
  const result = await getPlayerStatsResult(playerId);
  return result.kind === 'found' ? result.profile.stats : null;
}

/**
 * Submit or update a leaderboard score for a player.
 * Uses { merge: true } for upsert — duplicate game completions overwrite
 * with latest score.
 *
 * Collection path: leaderboards/{type}/scores/{playerId}
 * Document fields: { playerId, playerName, score, updatedAt }
 *
 * Returns false on failure (network error, not configured).
 */
export async function submitLeaderboardScore(
  type: LeaderboardType,
  playerId: string,
  playerName: string,
  score: number,
): Promise<boolean> {
  try {
    const scoreRef = doc(leaderboardRef(type), playerId);
    const existing = await getDoc(scoreRef);
    const existingScore = existing.data()?.score;
    const numericExisting =
      typeof existingScore === 'number' ? existingScore : undefined;

    if (!shouldWriteLeaderboardScore(type, score, numericExisting)) {
      // shouldWrite only returns false when an existing numeric score is higher.
      if (typeof numericExisting !== 'number') {
        return true;
      }
      // Always include `score` so rules that require it succeed on merge.
      await setDoc(
        scoreRef,
        {
          playerId,
          playerName,
          score: numericExisting,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      return true;
    }

    await setDoc(
      scoreRef,
      {
        playerId,
        playerName,
        score,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (err) {
    if (__DEV__) {
      if (isTransientFirestoreError(err)) {
        // Expected while offline / Firebase briefly unreachable — caller queues + retries.
        console.log('[firestore] submitLeaderboardScore deferred (transient)', type);
      } else {
        console.warn('[firestore] submitLeaderboardScore failed', type, err);
      }
    }
    return false;
  }
}

/**
 * Query top N entries from a leaderboard collection.
 * Ordered by score descending (visible board size = LEADERBOARD_TOP_N).
 *
 * Throws on read failure so the screen can show an error instead of
 * incorrectly rendering a network problem as "No entries yet".
 */
export async function getLeaderboard(
  type: LeaderboardType,
): Promise<LeaderboardData> {
  try {
    const snapshot = await getDocs(
      query(
        leaderboardRef(type),
        orderBy('score', 'desc'),
        limit(LEADERBOARD_TOP_N),
      ),
    );

    const entries: LeaderboardEntry[] = snapshot.docs.map((docSnap, index) => {
      const data = docSnap.data();
      return {
        rank: index + 1,
        playerId: data.playerId ?? docSnap.id,
        playerName: data.playerName ?? 'Unknown',
        score: data.score ?? 0,
      };
    });

    return {
      type,
      entries,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    if (__DEV__) {
      console.warn('[firestore] getLeaderboard failed', type, err);
    }
    throw err;
  }
}

/**
 * Absolute 1-based rank: 1 + number of players with a strictly higher score.
 * Returns null if the query fails.
 */
export async function getLeaderboardRank(
  type: LeaderboardType,
  score: number,
): Promise<number | null> {
  if (score <= 0) return null;
  try {
    const snapshot = await getCountFromServer(
      query(leaderboardRef(type), where('score', '>', score)),
    );
    return snapshot.data().count + 1;
  } catch (err) {
    if (__DEV__) {
      console.warn('[firestore] getLeaderboardRank failed', type, err);
    }
    return null;
  }
}
