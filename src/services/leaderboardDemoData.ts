import type { LeaderboardData, LeaderboardEntry } from '../types';
import type { LeaderboardType } from './firestoreService';
import { LEADERBOARD_TOP_N } from '../constants/leaderboard';

/**
 * Dev-only fake leaderboard rows so UI (podium, list, flair, footer) can be
 * reviewed with a full board. Not written to Firestore.
 *
 * Toggle: set EXPO_PUBLIC_DEMO_LEADERBOARDS=0 to disable in __DEV__.
 */
export function isDemoLeaderboardEnabled(): boolean {
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return false;
  }
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  const flag = process.env.EXPO_PUBLIC_DEMO_LEADERBOARDS;
  if (flag === '0' || flag === 'false') return false;
  return true;
}

const DEMO_NAMES = [
  'Aria Vale',
  'Blake Moss',
  'Casey Quinn',
  'Drew Hale',
  'Eden Park',
  'Finley Cruz',
  'Gray Nolan',
  'Harper Lee',
  'Indie Shaw',
  'Jules Remy',
  'Kai Brooks',
  'Lane Ortiz',
  'Morgan Pate',
  'Noa Ellis',
  'Oakley Jin',
  'Parker West',
  'Quinn Adler',
  'Reese Daley',
  'Sage Monroe',
  'Tatum Cole',
  'Uma Bright',
  'Vesper Lin',
  'Wren Soto',
  'Xander Pell',
];

/** Base high scores per board — then step down for ranks. */
const SCORE_PLAN: Record<
  LeaderboardType,
  { top: number; step: number; floor: number }
> = {
  daily_streak: { top: 28, step: 1, floor: 1 },
  endless_streak: { top: 42, step: 2, floor: 1 },
  endless_total: { top: 260, step: 11, floor: 5 },
  best_streak: { top: 35, step: 1, floor: 2 },
  sharpshooter: { top: 48, step: 2, floor: 1 },
};

/** Large enough demo pool to exercise placement bands past top 20. */
const DEMO_POOL_SIZE = 1200;

function scoreForRank(type: LeaderboardType, rank: number): number {
  const plan = SCORE_PLAN[type];
  return Math.max(plan.floor, plan.top - (rank - 1) * plan.step);
}

export type DemoLeaderboardYou = {
  playerId: string;
  playerName: string;
  score: number;
};

/**
 * Builds top-N demo entries from a larger virtual pool.
 * Sets `currentPlayerRank` to the absolute rank when `you` is provided.
 */
export function buildDemoLeaderboard(
  type: LeaderboardType,
  you?: DemoLeaderboardYou | null,
): LeaderboardData {
  const rows: Array<{ playerId: string; playerName: string; score: number }> =
    [];

  for (let i = 0; i < DEMO_POOL_SIZE; i++) {
    rows.push({
      playerId: `demo_${type}_${i + 1}`,
      playerName: DEMO_NAMES[i % DEMO_NAMES.length],
      score: scoreForRank(type, i + 1),
    });
  }

  let currentPlayerRank: number | null = null;

  if (you && you.playerId && you.score > 0) {
    const withoutClash = rows.filter((r) => r.playerId !== you.playerId);
    withoutClash.push({
      playerId: you.playerId,
      playerName: you.playerName || 'You',
      score: you.score,
    });
    withoutClash.sort((a, b) => b.score - a.score);
    rows.length = 0;
    rows.push(...withoutClash);
    currentPlayerRank =
      rows.findIndex((r) => r.playerId === you.playerId) + 1 || null;
  }

  const top = rows.slice(0, LEADERBOARD_TOP_N);
  const entries: LeaderboardEntry[] = top.map((row, index) => ({
    rank: index + 1,
    playerId: row.playerId,
    playerName: row.playerName,
    score: row.score,
    isCurrentPlayer: you ? row.playerId === you.playerId : false,
  }));

  return {
    type,
    entries,
    lastUpdated: new Date().toISOString(),
    currentPlayerRank,
  };
}
