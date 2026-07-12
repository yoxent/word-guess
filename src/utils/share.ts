import type { GameMode, GuessFeedback } from '../types/game';

export interface GameResultForShare {
  mode: GameMode;
  word: string;
  letterCount: number;
  attempts: number;
  won: boolean;
  maxAttempts: number;
  guesses: GuessFeedback[][];
  date: string;
}

const TILE_EMOJI: Record<string, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬛',
};

const MODE_NAMES: Record<GameMode, string> = {
  free: 'Free Play',
  random: 'Random',
  daily: 'Daily Challenge',
  endless: 'Endless',
};

export function generateShareText(result: GameResultForShare): string {
  const modeName = MODE_NAMES[result.mode] || 'Word Guess';
  const lengthLabel = `${result.letterCount}-letter`;
  const dateFormatted = result.date.split('T')[0];
  const lines: string[] = [];

  // Header — brand, then mode + word length on the next line
  lines.push('Word Guess');
  lines.push(`${modeName} · ${lengthLabel}`);
  lines.push(dateFormatted);
  lines.push('');

  // Emoji rows
  for (const guess of result.guesses) {
    const row = guess.map((f) => TILE_EMOJI[f.feedback] || '⬛').join('');
    lines.push(row);
  }

  // Attempt counter
  if (result.won) {
    lines.push(`${result.attempts}/${result.maxAttempts}`);
  } else {
    lines.push(`X/${result.maxAttempts}`);
  }

  // Footer
  lines.push('');
  lines.push('Play Word Guess!');

  return lines.join('\n');
}
