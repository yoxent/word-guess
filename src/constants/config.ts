export const config = {
  appName: 'Word Guess',
  appVersion: '1.0.3',
  minWordLength: 5,
  maxWordLength: 10,
  baseAttempts: (letterCount: number) => letterCount + 1,
  maxExtraGuessesFree: 2,
  /** Ad-earned extra attempts while Pro (same cap as free; Pro also gets a free row). */
  maxExtraGuessesPro: 2,
  /** Instant extra board row while Pro is active (not ad-earned). */
  proBonusAttempts: 1,
  dictionaryPath: 'assets/dictionary',
  dailyPuzzle: {
    resetHourUTC: 0,
    maxClockSkewMinutes: 30,
  },
  /** Play Console one-time product ID (app package is com.vorithstudio.wordguess). */
  proProductId: 'word_guess_pro',
  /** Canonical hosted privacy policy (Play listing + in-app Settings). */
  privacyPolicyUrl: 'https://yoxent.github.io/word-guess/privacy',
  databaseName: 'wordguess.db',
  storageKeys: {
    settings: 'wordguess.settings',
    activeGame: 'wordguess.activeGame',
    authToken: 'wordguess.authToken',
    lastDailyDate: 'wordguess.lastDailyDate',
  },
} as const;

/**
 * Board size: base attempts + Pro bonus row (if entitled) + ad-earned extras used.
 */
export function computeTargetMaxAttempts(
  letterCount: number,
  extraGuessesUsed: number,
  isPro: boolean,
): number {
  return (
    config.baseAttempts(letterCount) +
    (isPro ? config.proBonusAttempts : 0) +
    extraGuessesUsed
  );
}
