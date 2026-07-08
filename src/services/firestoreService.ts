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
  serverTimestamp,
} from '@react-native-firebase/firestore';
import type { PlayerStats, LeaderboardData, LeaderboardEntry } from '../types';

// ── Types ──

export type LeaderboardType = 'daily_streak' | 'endless_streak' | 'endless_total';

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
): Promise<boolean> {
  try {
    await setDoc(
      doc(collection(db, PLAYER_STATS_COLLECTION), playerId),
      {
        playerId,
        playerName,
        ...stats,
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
 * Fetch a player's stats document from Firestore.
 * Returns null if not found or if Firestore is unavailable.
 */
export async function getPlayerStats(
  playerId: string,
): Promise<PlayerStats | null> {
  try {
    const docSnap = await getDoc(
      doc(collection(db, PLAYER_STATS_COLLECTION), playerId),
    );

    if (!docSnap.exists) return null;

    const data = docSnap.data();
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
    await setDoc(
      doc(leaderboardRef(type), playerId),
      {
        playerId,
        playerName,
        score,
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
 * Query top 50 entries from a leaderboard collection.
 * Ordered by score descending, limited to 50 (D-132).
 *
 * Returns LeaderboardData with entries array, or empty data on error.
 */
export async function getLeaderboard(
  type: LeaderboardType,
): Promise<LeaderboardData> {
  try {
    const snapshot = await getDocs(
      query(leaderboardRef(type), orderBy('score', 'desc'), limit(50)),
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
  } catch {
    return {
      type,
      entries: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}
