export interface PlayerStats {
  totalGames: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  gamesByLength: Record<number, { played: number; won: number }>;
  lastGameDate: string;
  completedDailyChallenges: string[];
}
