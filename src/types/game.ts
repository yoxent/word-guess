export type GameMode = 'free' | 'random' | 'daily' | 'endless';

export type TileFeedback = 'correct' | 'present' | 'absent' | 'empty';

export interface GuessFeedback {
  letter: string;
  feedback: TileFeedback;
}

export interface GameSession {
  id: string;
  mode: GameMode;
  word: string;
  letterCount: number;
  guesses: string[];
  feedback: GuessFeedback[][];
  keyColors: Record<string, TileFeedback>;
  status: 'playing' | 'won' | 'lost';
  hardMode: boolean;
  extraGuessesUsed: number;
  letterHintUsed: boolean;
  maxAttempts: number;
  startedAt: string;
  completedAt?: string;
}
