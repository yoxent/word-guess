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
 *   2. All confirmed letters from **all** previous guesses must appear
 *      in the new guess. The required count per letter is the **maximum**
 *      number of times it was revealed as 'present' or 'correct' in any
 *      single feedback row. This is NOT a cumulative sum across rows —
 *      re-confirming the same letter across multiple guesses does not
 *      increase the required count.
 *   3. Duplicate letter edge cases: if a letter was marked correct in
 *      one position and present in another from the SAME guess, the
 *      user must provide that many instances (the row maximum captures
 *      this correctly).
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

  // Rule 2: Confirmed letters (present + correct) from ALL previous guesses
  // must appear in the new guess. The required count per letter is the
  // MAXIMUM number of times it appears as 'present' or 'correct' in any
  // SINGLE feedback row (NYT Wordle behavior).
  //
  // Previously this was a cumulative sum across all rows, which incorrectly
  // over-counted letters that appeared yellow in multiple separate guesses
  // (e.g., S[yellow] in guess 2 AND guess 3 would require S×2, when the
  // word only has one S — the user already satisfied the constraint in
  // guess 2, guess 3 just rediscovered it).
  const requiredCounts: Record<string, number> = {};
  for (const feedbackRow of previousFeedback) {
    const rowCounts: Record<string, number> = {};
    for (const fb of feedbackRow) {
      if (fb.feedback === 'present' || fb.feedback === 'correct') {
        rowCounts[fb.letter] = (rowCounts[fb.letter] || 0) + 1;
      }
    }
    // Take the max for each letter across all rows
    for (const [letter, count] of Object.entries(rowCounts)) {
      if (count > (requiredCounts[letter] || 0)) {
        requiredCounts[letter] = count;
      }
    }
  }

  // Count how many times each letter appears in the new guess
  const guessLetterCounts: Record<string, number> = {};
  for (const ch of upperGuess) {
    guessLetterCounts[ch] = (guessLetterCounts[ch] || 0) + 1;
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
