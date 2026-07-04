export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  isCurrentPlayer?: boolean;
}

export interface LeaderboardData {
  type: 'daily_streak' | 'endless_streak' | 'endless_total';
  entries: LeaderboardEntry[];
  lastUpdated: string;
}
