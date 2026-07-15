export const config = {
  appName: 'Word Guess',
  appVersion: '1.0.0',
  minWordLength: 5,
  maxWordLength: 10,
  baseAttempts: (letterCount: number) => letterCount + 1,
  maxExtraGuessesFree: 2,
  maxExtraGuessesPro: 3,
  dictionaryPath: 'assets/dictionary',
  dailyPuzzle: {
    resetHourUTC: 0,
    maxClockSkewMinutes: 30,
  },
  /** Play Console one-time product ID (app package is com.vorithstudio.wordguess). */
  proProductId: 'word_guess_pro',
  databaseName: 'wordguess.db',
  storageKeys: {
    settings: 'wordguess.settings',
    activeGame: 'wordguess.activeGame',
    authToken: 'wordguess.authToken',
    lastDailyDate: 'wordguess.lastDailyDate',
  },
} as const;
