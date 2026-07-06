import firestore from '@react-native-firebase/firestore';
import type { PlayerStats, LeaderboardData, LeaderboardEntry } from '../types';

// ── Types ──

export type LeaderboardType = 'daily_streak' | 'endless_streak' | 'endless_total';

// ── Collection path helpers ──

const PLAYER_STATS_COLLECTION = 'playerStats';
const LEADERBOARDS_COLLECTION = 'leaderboards';

/**
 * Enable Firestore offline persistence on first import.
 * Suppresses "settings() called multiple times" warnings via a guard.
 */
let persistenceEnabled = false;
function enablePersistenceOnce(): void {
  if (persistenceEnabled) return;
  try {
    firestore().settings({ persistence: true });
    persistenceEnabled = true;
  } catch {
    // Firestore SDK handles missing configuration gracefully
  }
}

// Warm-up call — safe to invoke at module load time.
enablePersistenceOnce();

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
): Promise<boolean> {
  try {
    await firestore()
      .collection(PLAYER_STATS_COLLECTION)
      .doc(playerId)
      .set(
        {
          playerId,
          playerName,
          ...stats,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch a player's stats document from Firestore.
 * Returns null if not found or if Firestore is unavailable.
 */
export async function getPlayerStats(
  playerId: string,
): Promise<PlayerStats | null> {
  try {
    const doc = await firestore()
      .collection(PLAYER_STATS_COLLECTION)
      .doc(playerId)
      .get();

    if (!doc.exists) return null;

    const data = doc.data();
    if (!data) return null;

    // Strip Firestore metadata fields before returning PlayerStats
    const { playerId: _pid, playerName: _pn, updatedAt: _ua, ...stats } = data;
    return stats as unknown as PlayerStats;
  } catch {
    return null;
  }
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
    await firestore()
      .collection(LEADERBOARDS_COLLECTION)
      .doc(type)
      .collection('scores')
      .doc(playerId)
      .set(
        {
          playerId,
          playerName,
          score,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    return true;
  } catch {
    return false;
  }
}

/**
 * Query top 50 entries from a leaderboard collection.
 * Ordered by score descending, limited to 50 (D-132).
 *
 * Returns LeaderboardData with entries array, or empty data on error.
 */
export async function getLeaderboard(
  type: LeaderboardType,
): Promise<LeaderboardData> {
  try {
    const snapshot = await firestore()
      .collection(LEADERBOARDS_COLLECTION)
      .doc(type)
      .collection('scores')
      .orderBy('score', 'desc')
      .limit(50)
      .get();

    const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        rank: index + 1,
        playerId: data.playerId ?? doc.id,
        playerName: data.playerName ?? 'Unknown',
        score: data.score ?? 0,
      };
    });

    return {
      type,
      entries,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return {
      type,
      entries: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
