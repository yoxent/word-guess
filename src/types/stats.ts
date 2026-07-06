export interface PlayerStats {
  totalGames: number;
  wins: number;
  winRate: number;
  currentStreak: number;   // last-played mode's current streak (D-76)
  maxStreak: number;       // max of all per-mode max streaks
  guessDistribution: number[];   // index=attempt number, value=wins at that attempt count
  gamesByLength: Record<number, { played: number; won: number }>;
  lastGameDate: string;
  perModeStreaks: Record<string, { current: number; max: number }>;
  // Keys: 'daily', 'endless', 'non-daily' (free+random share, D-74)
}
