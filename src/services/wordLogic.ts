/**
 * Pure game logic for Wordle-style word guessing.
 *
 * All functions are stateless — no side effects, no RN/expo imports,
 * trivially testable in any JS environment.
 *
 * @see brain/wiki/game-modes.md
 * @see brain/wiki/architecture.md
 */

import type { GuessFeedback, TileFeedback } from '../types';

/**
 * Evaluates a guess against the target word using Wordle duplicate-letter rules.
 *
 * Algorithm (two-pass):
 *   1. First pass: mark exact matches as `correct` (green). Decrement
 *      the remaining count for that letter in the target.
 *   2. Second pass: for non-exact-match positions, if the letter still has
 *      remaining count > 0, mark `present` (yellow) and decrement.
 *      Otherwise mark `absent` (slate).
 *
 * This correctly handles duplicate letters: if the guess has 3 'O's but
 * the target has 1, only the first matching 'O' (non-green) gets yellow;
 * the rest are slate.
 *
 * @param target - The target word (uppercase)
 * @param guess  - The player's guess (uppercase)
 * @returns Array of GuessFeedback with same length as guess, or [] for invalid input
 *
 * @example
 * evaluateGuess('HELLO', 'HALOS')
 * // → [{ letter:'H', feedback:'correct' },
 * //     { letter:'A', feedback:'absent'  },
 * //     { letter:'L', feedback:'present' },
 * //     { letter:'O', feedback:'present' },
 * //     { letter:'S', feedback:'absent'  }]
 */
export function evaluateGuess(target: string, guess: string): GuessFeedback[] {
  if (!target || !guess || target.length !== guess.length || target.length === 0) {
    return [];
  }

  const len = target.length;
  const result: GuessFeedback[] = new Array(len);

  // Count remaining target letter occurrences (decremented as we match)
  const remaining: Record<string, number> = {};
  for (let i = 0; i < len; i++) {
    const letter = target[i];
    remaining[letter] = (remaining[letter] || 0) + 1;
  }

  // First pass: mark correct (exact matches)
  for (let i = 0; i < len; i++) {
    if (guess[i] === target[i]) {
      result[i] = { letter: guess[i], feedback: 'correct' as TileFeedback };
      remaining[guess[i]]--;
    }
  }

  // Second pass: mark present (in word but wrong position) or absent
  for (let i = 0; i < len; i++) {
    if (result[i]) continue; // already marked correct
    const letter = guess[i];
    if (remaining[letter] && remaining[letter] > 0) {
      result[i] = { letter, feedback: 'present' as TileFeedback };
      remaining[letter]--;
    } else {
      result[i] = { letter, feedback: 'absent' as TileFeedback };
    }
  }

  return result;
}

/**
 * Validates a new guess against Hard Mode rules per NYT Wordle.
 *
 * Rules:
 *   1. All green (correct) tiles from the **most recent** guess must
 *      appear in the same positions in the new guess.
 *   2. All yellow (present) tiles from **all** previous guesses must
 *      appear somewhere in the new guess.
 *   3. Duplicate letter edge cases: if a letter was marked yellow once,
 *      it must appear at least once in the new guess. If a letter was
 *      green in one position and yellow in another from the same
 *      previous guess, both constraints apply independently.
 *
 * @param previousFeedback - Array of feedback arrays from all previous guesses
 * @param newGuess         - The player's new guess (uppercase)
 * @returns Object with valid flag and optional reason string
 */
export function validateHardMode(
  previousFeedback: GuessFeedback[][],
  newGuess: string
): { valid: boolean; reason?: string } {
  if (!previousFeedback || previousFeedback.length === 0) {
    return { valid: true };
  }

  const upperGuess = newGuess.toUpperCase();

  // Rule 1: Green tiles from the MOST RECENT guess must be in same positions
  const lastFeedback = previousFeedback[previousFeedback.length - 1];
  for (let i = 0; i < lastFeedback.length; i++) {
    if (lastFeedback[i].feedback === 'correct') {
      if (i >= upperGuess.length || upperGuess[i] !== lastFeedback[i].letter) {
        return {
          valid: false,
          reason: 'Must reuse confirmed tiles',
        };
      }
    }
  }

  // Rule 2: Yellow tiles from ALL previous guesses must appear somewhere
  // Build a set of required letters from yellow feedback
  const requiredYellowLetters: string[] = [];
  for (const feedbackRow of previousFeedback) {
    for (const fb of feedbackRow) {
      if (fb.feedback === 'present') {
        requiredYellowLetters.push(fb.letter);
      }
    }
  }

  // For each yellow letter, check it appears at least once in new guess
  // Track which letters we've already satisfied
  const guessLetterCounts: Record<string, number> = {};
  for (const ch of upperGuess) {
    guessLetterCounts[ch] = (guessLetterCounts[ch] || 0) + 1;
  }

  // Count how many times each letter is required as yellow
  const requiredCounts: Record<string, number> = {};
  for (const letter of requiredYellowLetters) {
    requiredCounts[letter] = (requiredCounts[letter] || 0) + 1;
  }

  for (const [letter, count] of Object.entries(requiredCounts)) {
    const available = guessLetterCounts[letter] || 0;
    if (available < count) {
      return {
        valid: false,
        reason: 'Must reuse confirmed tiles',
      };
    }
  }

  return { valid: true };
}

/**
 * Checks if a word exists in the valid word list (case-insensitive).
 *
 * @param word          - The word to check
 * @param validWordList - Array of valid words (lowercase or uppercase)
 * @returns true if the word is found in the list
 */
export function isValidGuess(word: string, validWordList: string[]): boolean {
  if (!word || !validWordList || validWordList.length === 0) {
    return false;
  }
  const wordSet = new Set(validWordList.map((w) => w.toUpperCase()));
  return wordSet.has(word.toUpperCase());
}
