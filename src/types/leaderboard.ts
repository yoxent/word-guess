export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  isCurrentPlayer?: boolean;
}

export type LeaderboardDataType =
  | 'daily_streak'
  | 'endless_streak'
  | 'endless_total'
  | 'best_streak'
  | 'sharpshooter';

export interface LeaderboardData {
  type: LeaderboardDataType;
  entries: LeaderboardEntry[];
  lastUpdated: string;
  /** Absolute rank of the signed-in player when known (1-based). */
  currentPlayerRank?: number | null;
}
