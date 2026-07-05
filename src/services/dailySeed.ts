/**
 * Deterministic daily word index computation.
 *
 * Produces the same word index for all players on the same date + length,
 * without requiring a server or network. Works fully offline.
 *
 * Uses DJB2 hash (not crypto — Hermes-incompatible) seeded with a
 * constant APP_SEED + date + length.
 *
 * @see brain/wiki/daily-seed.md
 * @see D-25, D-26, D-27
 */

/**
 * App seed constant — fixed before first release. Changing it after
 * shipping shifts all daily words, breaking "same word for everyone".
 * Obfuscated via ProGuard/R8 minification in production builds.
 */
const APP_SEED = 'wg-v1-seed-2026';

/**
 * DJB2 hash function (32-bit integer).
 *
 * Selected over SHA256 because `crypto` is not available in React
 * Native's Hermes engine. DJB2 provides good distribution for our
 * use case (blocking casual cheating, not nation-state attacks).
 *
 * @param str - Input string to hash
 * @returns Non-negative 32-bit integer hash
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Returns the current UTC date as a YYYY-MM-DD string.
 *
 * Always uses Date.UTC() to normalize — never device local time.
 * This ensures the daily word is the same for all players worldwide
 * regardless of timezone.
 *
 * @param date - Optional Date object (defaults to now)
 * @returns UTC date string in YYYY-MM-DD format
 *
 * @example
 * getDailyDateString(new Date('2026-07-05T23:00:00Z'))
 * // → '2026-07-05'
 */
export function getDailyDateString(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes a deterministic word index for a given date, length, and
 * word list size.
 *
 * Algorithm:
 *   hashInput = APP_SEED + ':' + dateStr + ':' + length
 *   hash = DJB2(hashInput)
 *   index = Math.abs(hash) % wordCount
 *
 * @param dateStr   - UTC date string (YYYY-MM-DD) from getDailyDateString()
 * @param length    - Word length (5-10)
 * @param wordCount - Number of words in the target word list for this length
 * @returns Deterministic index in range [0, wordCount)
 *
 * @example
 * getDailyWordIndex('2026-07-05', 5, 2540)
 * // → 1234 (same result for all players on 2026-07-05)
 */
export function getDailyWordIndex(
  dateStr: string,
  length: number,
  wordCount: number
): number {
  if (wordCount <= 0) {
    return 0;
  }

  const hashInput = `${APP_SEED}:${dateStr}:${length}`;
  const hash = hashString(hashInput);
  return hash % wordCount;
}
