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
  /** Win/loss decided on submit but applied after tile-reveal animation (Fabric safety). */
  pendingStatus?: 'won' | 'lost';
  /** Keyboard colors computed on submit but applied after reveal (Wordle timing + Fabric safety). */
  pendingKeyColors?: Record<string, TileFeedback>;
  hardMode: boolean;
  extraGuessesUsed: number;
  letterHintUsed: boolean;
  /** Persisted ghost letter for the active row after a rewarded letter hint. */
  hintTile?: { index: number; letter: string } | null;
  maxAttempts: number;
  startedAt: string;
  completedAt?: string;
  /** Isolated onboarding session — no stats, ads, or continue-save. */
  isTutorial?: boolean;
}
